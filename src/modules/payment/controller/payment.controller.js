const Models = require('../../../models/index');
require('dotenv').config();
const { generateQRCode } = require('../../../helpers/helper');
const { COMMON_MSG } = require('../../../utils/common/messages');

const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  INACTIVE_USER,
  MSG_NO_CHANGES_MADE,
} = require('../../../utils/common/messages');
const {
  CATEGORY,
  ROLE,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
} = require('../../../utils/common/constants');

// payment - ( intent creation )
exports.paymentIntentCreationHandler = async (req, res) => {
  try {
    const { amount, currency, eventId, seatsBooked, userId } = req.body;

    // 1. Validate event and seats first
    const event = await Models.Event.findById(eventId);
    if (!event || !event.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Event not found or not published',
      });
    }

    if (event.seats.booked + seatsBooked > event.seats.total) {
      return res.status(400).json({
        success: false,
        message: 'Not enough seats available',
      });
    }

    // 2. Create temporary booking
    const booking = new Models.Booking({
      event: eventId,
      user: userId,
      seatsBooked,
      totalPrice: amount,
      status: 'PENDING',
    });
    await booking.save();

    // 3. Create payment record
    const payment = new Models.Payment({
      bookingId: booking._id,
      amount,
      currency,
      paymentMethod: 'STRIPE',
      status: 'PENDING',
      metadata: {
        userId,
        eventId,
        seatsBooked: seatsBooked.toString(),
      },
    });
    await payment.save();

    // 4. Update booking with payment reference
    booking.paymentId = payment._id;
    await booking.save();

    // 5. Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency,
      payment_method_types: ['card'],
      metadata: {
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
        userId,
        eventId,
      },
    });

    // 6. Update payment record with intent ID
    payment.paymentIntentId = paymentIntent.id;
    await payment.save();

    res.status(STATUS_SUCCESS).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      bookingId: booking._id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error(`paymentIntentCreationHandler error: ${error.message}`);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
};

//stripe payment response handler( called by stripe )
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
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// successful payment function
const handleSuccessfulPayment = async (paymentIntent) => {
  const { bookingId, paymentId } = paymentIntent.metadata;

  // 1. Update payment status
  await Payment.findByIdAndUpdate(paymentId, {
    status: 'COMPLETED',
    transactionId: paymentIntent.id,
    updatedAt: new Date(),
  });

  // 2. Confirm booking
  await Booking.findByIdAndUpdate(bookingId, {
    status: 'CONFIRMED',
  });

  // 3. Generate QR code
  const qrCode = await generateQRCode(`${bookingId}-${Date.now()}`);
  await Booking.findByIdAndUpdate(bookingId, { qrCode });
};

// failed payment function
const handleFailedPayment = async (paymentIntent) => {
  const { bookingId, paymentId } = paymentIntent.metadata;

  try {
    // 1. Update payment status with failure details
    await Models.Payment.findByIdAndUpdate(paymentId, {
      status: 'FAILED',
      transactionId: paymentIntent.id,
      updatedAt: new Date(),
      metadata: {
        error_code: paymentIntent.last_payment_error?.code,
        error_message: paymentIntent.last_payment_error?.message,
        failure_reason: paymentIntent.last_payment_error?.decline_code,
      },
    });

    // 2. Update booking status to failed/cancelled
    await Models.Booking.findByIdAndUpdate(bookingId, {
      status: 'CANCELLED',
      metadata: {
        cancellation_reason: 'payment_failed',
        cancelled_at: new Date(),
      },
    });

    // 3. Release the held seats
    const booking = await Models.Booking.findById(bookingId).populate('event');
    if (booking && booking.event) {
      booking.event.seats.booked -= booking.seatsBooked;
      await booking.event.save();
    }

    // Optional: Notify user about payment failure
  } catch (error) {
    console.error('Failed payment handling error:', error);
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

module.exports = {
  paymentIntentCreationHandler,
  handleIAPPaymentHandler,
  handleStripeWebhookHandler,
};
