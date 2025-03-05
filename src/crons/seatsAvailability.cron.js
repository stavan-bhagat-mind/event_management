
// // Install: npm install node-cron
// const cron = require('node-cron');
// const Models = require('../models/index');

// // Run every minute
// cron.schedule('* * * * *', async () => {
//   try {
//     const time = new Date(Date.now() - 15 * 60 * 1000);

//     // Find bookings that need to be expired
//     const pendingBookings = await Models.Booking.find({
//       status: 'PENDING',
//       createdAt: { $lt: time },
//     });

//     if (pendingBookings.length > 0) {
//       console.log(`Found ${pendingBookings.length} expired pending bookings`);

//       // Process each booking
//       for (const booking of pendingBookings) {
//         // Update booking status
//         booking.status = 'EXPIRED';
//         await booking.save();

//         // Update payment status
//         if (booking.payment) {
//           await Models.Payment.findByIdAndUpdate(booking.payment, {
//             $set: { status: 'FAILED' },
//           });

//           try {
//             const payment = await Models.Payment.findById(booking.payment);
//             if (payment && payment.paymentIntentId) {
//               // Cancel the Stripe payment intent if it exists and isn't already completed
//               const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//               await stripe.paymentIntents.cancel(payment.paymentIntentId);
//             }
//           } catch (stripeError) {
//             console.error(
//               `Could not cancel Stripe payment: ${stripeError.message}`
//             );
//           }
//         }

//         // Update event's seat count
//         await Models.Event.findByIdAndUpdate(booking.event, {
//           $inc: { 'seats.booked': -booking.seatsBooked },
//         });
//       }

//       console.log(
//         `Successfully processed ${pendingBookings.length} expired bookings`
//       );
//     }
//   } catch (error) {
//     console.error('Error in booking expiration job:', error);
//   }
// });

// console.log('Booking expiration job scheduled');
// ---------------------

const cron = require('node-cron');
const Models = require('../models/index');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Run every 5 minutes instead of every minute
cron.schedule('*/5 * * * *', async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const time = new Date(Date.now() - 15 * 60 * 1000);

    // Find bookings that need to be expired
    const pendingBookings = await Models.Booking.find({
      status: 'PENDING',
      createdAt: { $lt: time },
    }).session(session);

    if (pendingBookings.length > 0) {
      console.log(`Found ${pendingBookings.length} expired pending bookings`);

      const bulkOperations = [];
      const stripeOperations = [];

      for (const booking of pendingBookings) {
        // Prepare bulk write operations
        bulkOperations.push({
          updateOne: {
            filter: { _id: booking._id },
            update: { $set: { status: 'EXPIRED' } },
          },
        });

        // Prepare payment and event updates
        if (booking.payment) {
          bulkOperations.push({
            updateOne: {
              filter: { _id: booking.payment },
              update: { $set: { status: 'FAILED' } },
            },
          });

          // Collect Stripe payment intent cancellation
          stripeOperations.push(
            Models.Payment.findById(booking.payment).then(async (payment) => {
              if (payment && payment.paymentIntentId) {
                try {
                  await stripe.paymentIntents.cancel(payment.paymentIntentId);
                } catch (stripeError) {
                  console.error(
                    `Could not cancel Stripe payment: ${stripeError.message}`
                  );
                }
              }
            })
          );
        }

        // Prepare event seat count update
        bulkOperations.push({
          updateOne: {
            filter: { _id: booking.event },
            update: { $inc: { 'seats.booked': -booking.seatsBooked } },
          },
        });
      }

      // Perform bulk write operations
      if (bulkOperations.length > 0) {
        await Models.Booking.bulkWrite(bulkOperations, { session });
      }

      // Wait for all Stripe operations to complete
      await Promise.allSettled(stripeOperations);

      console.log(
        `Successfully processed ${pendingBookings.length} expired bookings`
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in booking expiration job:', error);
  } finally {
    session.endSession();
  }
});

console.log('Booking expiration job scheduled');
