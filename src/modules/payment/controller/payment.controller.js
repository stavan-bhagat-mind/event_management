const Models = require('../../../models/index');
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
  STATUS_CREATED,
} = require('../../../utils/common/constants');

// payment - ( intent creation )
async function paymentIntentCreationHandler(req, res) {
  try {
    const userId = req.userId;
    const { amount, currency, eventId, seatsBooked } = req.body;

    // 1. Validate event and seats
    const event = await Models.Event.findById(eventId);
    if (!event || !event.isPublished) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'Event')
      );
    }

    if (event.seats.booked + seatsBooked > event.seats.total) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_AVAILABLE.replace('##', 'Seats')
      );
    }
    if (event.price * seatsBooked !== Number(amount)) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.INVALID.replace('##', 'Amount')
      );
    }
    // 2. Create temporary booking
    const booking = new Models.Booking({
      eventId: eventId,
      userId: userId,
      seatsBooked,
      totalPrice: amount,
      status: 'PENDING',
    });
    await booking.save();

    // Add this block to update the event's seat count
    await Models.Event.findByIdAndUpdate(eventId, {
      $inc: { 'seats.booked': seatsBooked },
    });

    // 3. Create payment record
    const payment = await Models.Payment.create({
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

    return successResponseData(
      res,
      {
        clientSecret: paymentIntent.client_secret,
        bookingId: booking._id,
        paymentId: payment._id,
        paymentIntentId: paymentIntent.id,
      },
      STATUS_CREATED,
      COMMON_MSG.CREATED_SUCCESS.replace('##', 'Payment intent')
    );
  } catch (error) {
    console.error(`paymentIntentCreationHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Stripe payment response handler (called by stripe)
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
        console.log('--edo---', event.data.object);
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

// Successful payment function
const handleSuccessfulPayment = async (paymentIntent) => {
  const { bookingId, paymentId, eventId } = paymentIntent.metadata;

  try {
    // 1. Update payment status
    const result = await Models.Payment.findByIdAndUpdate(paymentId, {
      status: 'COMPLETED',
      transactionId: paymentIntent.id,
      updatedAt: new Date(),
    });

    // 2. Confirm booking
    const res = await Models.Booking.findByIdAndUpdate(bookingId, {
      status: 'CONFIRMED',
    });

    // 3. Generate QR code
    const qrCode = await generateQRCode(`${bookingId}-${Date.now()}`);
    await Models.Booking.findByIdAndUpdate(bookingId, { qrCode });

    // 4. Optional: Send confirmation email to user
    // const booking = await Models.Booking.findById(bookingId).populate('userId');
    // await sendConfirmationEmail(booking.userId.email, booking);
  } catch (error) {
    console.error('Successful payment handling error:', error);
    // Consider implementing a retry mechanism or alerting system
  }
};

// Failed payment function
const handleFailedPayment = async (paymentIntent) => {
  const { bookingId, paymentId, eventId } = paymentIntent.metadata;

  try {
    // 1. Update payment status with failure details
    await Models.Payment.findByIdAndUpdate(paymentId, {
      status: 'FAILED',
      transactionId: paymentIntent.id,
      updatedAt: new Date(),
      errorDetails: {
        error_code: paymentIntent.last_payment_error?.code,
        error_message: paymentIntent.last_payment_error?.message,
        failure_reason: paymentIntent.last_payment_error?.decline_code,
      },
    });

    // 2. Get booking to check seats before updating
    const booking = await Models.Booking.findById(bookingId);
    if (!booking) {
      console.error(`Booking not found: ${bookingId}`);
      return;
    }

    // 3. Update booking status to cancelled
    booking.status = 'CANCELLED';
    booking.cancellationReason = 'payment_failed';
    booking.cancelledAt = new Date();
    await booking.save();

    // 4. Release the held seats
    await Models.Event.findByIdAndUpdate(eventId, {
      $inc: { 'seats.booked': -booking.seatsBooked },
    });

    // 5. Optional: Notify user about payment failure
    // const user = await Models.User.findById(booking.userId);
    // await sendPaymentFailureEmail(user.email, booking);
  } catch (error) {
    console.error('Failed payment handling error:', error);
    // Implement alerting system for manual intervention
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

// test-----------------
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

// Example usage
// (async () => {
//   const paymentIntentId = await createPaymentIntent();
//   await confirmPaymentHandler(paymentIntentId);
// })();

module.exports = {
  paymentIntentCreationHandler,
  // handleIAPPaymentHandler,
  handleStripeWebhookHandler,
  confirmPaymentHandler,
};
