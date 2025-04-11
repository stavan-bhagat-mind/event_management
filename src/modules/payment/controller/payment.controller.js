const Models = require('../../../models/index');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();
const { generateQRCode } = require('../../../helpers/helper');
const {
  successResponseData,
  errorResponseData,
  errorResponseWithoutData,
  validationErrorResponseData,
  successResponseWithoutData,
} = require('../../../utils/response');
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
} = require('../../../utils/common/messages');
const {
  CATEGORY,
  ROLE,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
  STATUS_STATUS_CONFLICT,
  STATUS_CREATED,
} = require('../../../utils/common/constants');

// payment intent creation atomic update
async function paymentIntentCreationHandler(req, res) {
  // Start the session and begin transaction before any database operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const { amount, currency, eventId, seatsBooked } = req.body;
    console.log(req.body);
    // Generate a unique, deterministic idempotency key
    const idempotencyKey = `${userId}-${eventId}-${amount}-${seatsBooked}-${Date.now()}`;

    // 1. Find the event with the current version
    const event = await Models.Event.findById(eventId).session(session);
    if (!event || !event.isPublished) {
      throw new Error('Event not found or not published');
    }

    // 2. Check seat availability
    if (event.seats.booked + Number(seatsBooked) > event.seats.total) {
      throw new Error('not enough tickets available');
    }

    // 3. Atomic update with version check
    const updatedEvent = await Models.Event.findOneAndUpdate(
      {
        _id: eventId,
        version: event.version, // Ensure no concurrent modifications
      },
      {
        $inc: {
          'seats.booked': Number(seatsBooked),
          version: 1, // Increment version
        },
      },
      { new: true, session }
    );

    if (!updatedEvent) {
      throw new Error('Booking failed. Seats may have been taken.');
    }

    // 4. Verify price calculation
    if (event.price * seatsBooked !== Number(amount)) {
      throw new Error('Invalid booking amount');
    }

    // 5. Create booking with expiration
    const expiryTime = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes
    const booking = await Models.Booking.create(
      [
        {
          event: eventId,
          user: userId,
          seatsBooked: Number(seatsBooked),
          totalPrice: Number(amount),
          status: 'PENDING',
          expiresAt: expiryTime,
          idempotencyKey,
        },
      ],
      { session }
    );

    // 6. Create payment with unique key
    const payment = await Models.Payment.create(
      [
        {
          booking: booking[0]._id,
          amount: Number(amount),
          currency,
          paymentMethod: 'STRIPE',
          status: 'PENDING',
          idempotencyKey,
        },
      ],
      { session }
    );
    // Update booking with payment reference
    await Models.Booking.findByIdAndUpdate(
      booking[0]._id,
      { payment: payment[0]._id },
      { session }
    );
    // 7. Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Number(amount) * 100,
        currency,
        payment_method_types: ['card'],
        metadata: {
          bookingId: booking[0]._id.toString(),
          paymentId: payment[0]._id.toString(),
          userId: userId.toString(),
          eventId: eventId.toString(),
          seatsBooked: seatsBooked.toString(),
          uniqueIdentifier: idempotencyKey,
        },
      },
      {
        idempotencyKey,
      }
    );

    // 8. Update payment with intent ID
    await Models.Payment.findByIdAndUpdate(
      payment[0]._id,
      {
        paymentIntentId: paymentIntent.id,
        status: 'PROCESSING',
      },
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();

    return successResponseData(
      res,
      {
        clientSecret: paymentIntent.client_secret,
        booking: booking[0]._id,
        payment: payment[0]._id,
        paymentIntentId: paymentIntent.id,
        expiresAt: expiryTime,
        // uniqueIdentifier: idempotencyKey,
      },
      STATUS_CREATED,
      COMMON_MSG.CREATED_SUCCESS.replace('##', 'Payment intent')
    );
  } catch (error) {
    // Ensure transaction is aborted
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Transaction abort error:', abortError);
      }
    }

    // Handle specific error scenarios
    if (error.code === 11000) {
      return errorResponseWithoutData(
        res,
        STATUS_CONFLICT,
        'Duplicate booking attempt'
      );
    }

    console.error(`Payment intent error: ${error.message}`, error);

    // Send appropriate error response based on the error
    switch (error.message) {
      case 'Event not found or not published':
        return errorResponseWithoutData(res, STATUS_NOT_FOUND, error.message);
      case 'not enough tickets available':
        return errorResponseWithoutData(res, STATUS_BAD_REQUEST, error.message);
      case 'Booking failed. Seats may have been taken.':
        return errorResponseWithoutData(
          res,
          STATUS_STATUS_CONFLICT,
          error.message
        );
      case 'Invalid booking amount':
        return errorResponseWithoutData(res, STATUS_BAD_REQUEST, error.message);
      default:
        return errorResponseWithoutData(
          res,
          STATUS_INTERNAL_SERVER_ERROR,
          MSG_INTERNAL_SERVER_ERROR
        );
    }
  } finally {
    // Always end the session
    if (session) {
      try {
        session.endSession();
      } catch (sessionEndError) {
        console.error('Session end error:', sessionEndError);
      }
    }
  }
}

// webhooks handler
const handleStripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handleCanceledPayment(event.data.object);
        break;
      case 'payment_intent.created':
        console.log('Payment intent created:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

const handleCanceledPayment = async (paymentIntent) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId, paymentId, eventId, seatsBooked } =
      paymentIntent.metadata;

    // 1. Update payment status
    await Models.Payment.findByIdAndUpdate(
      paymentId,
      { status: 'CANCELLED' },
      { session }
    );

    // 2. Update booking status
    await Models.Booking.findByIdAndUpdate(
      bookingId,
      { status: 'CANCELLED' },
      { session }
    );

    // 3. Release seats
    await Models.Event.findByIdAndUpdate(
      eventId,
      { $inc: { 'seats.booked': -Number(seatsBooked) } },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Canceled payment handling error:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId, paymentId, eventId, seatsBooked, version } =
      paymentIntent.metadata;

    // 1. Find and verify booking status
    const booking = await Models.Booking.findById(bookingId).session(session);
    if (!booking || booking.status !== 'PENDING') {
      await session.abortTransaction();
      return;
    }

    // 2. Update payment status
    await Models.Payment.findByIdAndUpdate(
      paymentId,
      {
        status: 'COMPLETED',
        transactionId: paymentIntent.id,
        // updatedAt: new Date(),
      },
      { session }
    );

    // 3. Confirm booking
    await Models.Booking.findByIdAndUpdate(
      bookingId,
      { status: 'CONFIRMED', expiresAt: null },
      { session }
    );

    // 4. Create a simple URL for the QR code
    const verificationUrl = `${process.env.BASEURL}/event-management/booking/validate-qr/${bookingId}`;

    // Generate QR code with the verification URL
    const qrCode = await generateQRCode(verificationUrl);
    await Models.Booking.findByIdAndUpdate(bookingId, { qrCode }, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Successful payment handling error:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const handleFailedPayment = async (paymentIntent) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId, paymentId, eventId, seatsBooked } =
      paymentIntent.metadata;

    // 1. Update payment status
    await Models.Payment.findByIdAndUpdate(
      paymentId,
      { status: 'FAILED' },
      { session }
    );

    // 2. Update booking status
    await Models.Booking.findByIdAndUpdate(
      bookingId,
      { status: 'CANCELLED' },
      { session }
    );

    // 3. Release seats
    await Models.Event.findByIdAndUpdate(
      eventId,
      { $inc: { 'seats.booked': -Number(seatsBooked) } },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Failed payment handling error:', error);
    throw error;
  } finally {
    session.endSession();
  }
};
// in app purchase handler
// const handleIAPPaymentHandler = async (req, res) => {
//   try {
//     const { receipt, eventId, userId, seatsBooked, amount, productId } =
//       req.body;

//     // 1. Verify receipt with Apple
//     const verificationResult = await verifyIAPReceipt(receipt);
//     if (!verificationResult.valid) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid receipt',
//       });
//     }

//     // 2. Create booking and payment (similar to Stripe flow)
//     const booking = new Booking({
//       event: eventId,
//       user: userId,
//       seatsBooked,
//       totalPrice: amount,
//       status: 'PENDING',
//     });
//     await booking.save();

//     const payment = new Payment({
//       bookingId: booking._id,
//       amount,
//       currency: 'usd', // IAP is always in USD
//       paymentMethod: 'IAP',
//       status: 'PENDING',
//       transactionId: verificationResult.transactionId,
//       metadata: {
//         productId,
//         receipt,
//       },
//     });
//     await payment.save();

//     booking.paymentId = payment._id;
//     await booking.save();

//     // 3. Complete the transaction
//     await handleSuccessfulPayment({
//       metadata: {
//         bookingId: booking._id,
//         paymentId: payment._id,
//       },
//       id: verificationResult.transactionId,
//     });

//     res.status(200).json({
//       success: true,
//       booking,
//       payment,
//     });
//   } catch (error) {
//     console.error('IAP payment error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//     });
//   }
// }

// -------------for testing only -----------------
async function confirmPaymentHandler(req, res) {
  try {
    const paymentIntentId = req.body.paymentIntentId;
    // Use a test card number for confirmation

    // // Confirm the payment intent with the created payment method
    // const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    //   payment_method: paymentMethod.id,
    // });
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa', // Test payment method token
    });

    console.log('Payment Intent Confirmed:', paymentIntent);
    res.json({ success: true, paymentIntent });
  } catch (error) {
    console.error('Error confirming payment intent:', error);
  }
}

module.exports = {
  paymentIntentCreationHandler,
  // handleIAPPaymentHandler,
  handleStripeWebhookHandler,
  confirmPaymentHandler,
};
