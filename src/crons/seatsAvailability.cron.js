const cron = require('node-cron');
const Models = require('../models/index');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');

// Run every 7 minutes
cron.schedule('*/7 * * * *', async () => {
  console.log('Starting seat expiration cron job...');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const time = new Date(Date.now() - 7 * 60 * 1000);
    // Find bookings that need to be expired
    const pendingBookings = await Models.Booking.find({
      status: 'PENDING',
      createdAt: { $lt: time },
    }).session(session);

    console.log(`Found ${pendingBookings.length} expired pending bookings`);

    if (pendingBookings.length > 0) {
      // Separate bulk operations by model
      const bookingUpdates = [];
      const paymentUpdates = [];
      const eventUpdates = [];
      const stripeOperations = [];

      for (const booking of pendingBookings) {
        // 1. Prepare Booking update
        bookingUpdates.push({
          updateOne: {
            filter: { _id: booking._id },
            update: { $set: { status: 'EXPIRED' } },
          },
        });

        // 2. Prepare Payment update (if payment exists)
        if (booking.payment) {
          paymentUpdates.push({
            updateOne: {
              filter: { _id: booking.payment },
              update: { $set: { status: 'FAILED' } },
            },
          });

          // 3. Prepare Stripe payment intent cancellation
          stripeOperations.push(
            Models.Payment.findById(booking.payment).then(async (payment) => {
              if (payment && payment.paymentIntentId) {
                try {
                  await stripe.paymentIntents.cancel(payment.paymentIntentId);
                  console.log(
                    `Cancelled Stripe payment intent: ${payment.paymentIntentId}`
                  );
                } catch (stripeError) {
                  console.error(
                    `Could not cancel Stripe payment: ${stripeError.message}`
                  );
                }
              }
            })
          );
        }

        // 4. Prepare Event seat count update
        eventUpdates.push({
          updateOne: {
            filter: { _id: booking.event },
            update: { $inc: { 'seats.booked': -booking.seatsBooked } },
          },
        });
      }

      // Execute bulk operations in sequence
      if (bookingUpdates.length > 0) {
        console.log('Updating bookings...');
        await Models.Booking.bulkWrite(bookingUpdates, { session });
      }

      if (paymentUpdates.length > 0) {
        console.log('Updating payments...');
        await Models.Payment.bulkWrite(paymentUpdates, { session });
      }

      if (eventUpdates.length > 0) {
        console.log('Updating event seats...');
        await Models.Event.bulkWrite(eventUpdates, { session });
      }

      // Wait for all Stripe operations to complete
      console.log('Processing Stripe cancellations...');
      await Promise.allSettled(stripeOperations);

      console.log(
        `Successfully processed ${pendingBookings.length} expired bookings`
      );
    }

    await session.commitTransaction();
    console.log('Transaction committed successfully');
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in booking expiration job:', error);
  } finally {
    session.endSession();
    console.log('Cron job session ended');
  }
});

console.log('Booking expiration job scheduled');
