const cron = require('node-cron');
const User = require('../model/user.model');

cron.schedule('0 0 * * *', async () => {
  try {
    const expirationThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await User.deleteMany({
      verified: false,
      createdAt: { $lt: expirationThreshold }
    });
    console.log('Cleanup completed: Unverified users older than 24 hours have been removed.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});