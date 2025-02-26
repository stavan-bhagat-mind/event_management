// const cron = require('node-cron');
// const User = require('../model/user.model');

// cron.schedule('0 0 * * *', async () => {
//   try {
//     const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     await User.deleteMany({
//       verified: false,
//       createdAt: { $lt: expirationThreshold }
//     });
//     console.log('Cleanup completed: Unverified users older than 24 hours have been removed.');
//   } catch (error) {
//     console.error('Error during cleanup:', error);
//   }
// });

// Install: npm install node-cron
const cron = require('node-cron');
const Models = require('../models/index');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Find bookings that need to be expired
    const pendingBookings = await Models.Booking.find({
      status: 'PENDING',
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    if (pendingBookings.length > 0) {
      console.log(`Found ${pendingBookings.length} expired pending bookings`);
      
      // Process each booking
      for (const booking of pendingBookings) {
        // Update booking status
        booking.status = 'EXPIRED';
        await booking.save();
        
        // Update payment status
        if (booking.paymentId) {
          await Models.Payment.findByIdAndUpdate(
            booking.paymentId,
            { $set: { status: 'FAILED' } }
          );
          
          // If you're using Stripe and want to cancel the payment intent
          try {
            const payment = await Models.Payment.findById(booking.paymentId);
            if (payment && payment.paymentIntentId) {
              // Cancel the Stripe payment intent if it exists and isn't already completed
              const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
              await stripe.paymentIntents.cancel(payment.paymentIntentId);
            }
          } catch (stripeError) {
            // Log but don't stop the process if the Stripe cancellation fails
            console.error(`Could not cancel Stripe payment: ${stripeError.message}`);
          }
        }
        
        // Update event's seat count
        await Models.Event.findByIdAndUpdate(
          booking.eventId,
          { $inc: { 'seats.booked': -booking.seatsBooked } }
        );
      }
      
      console.log(`Successfully processed ${pendingBookings.length} expired bookings`);
    }
  } catch (error) {
    console.error('Error in booking expiration job:', error);
  }
});

console.log('Booking expiration job scheduled');