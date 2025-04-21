const cron = require('node-cron');
cron.schedule('*/7 * * * *', async () => {
  try {
    const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes in milliseconds
    const serviceUrl =
      process.env.SERVICE_URL || 'https://event-management-p7iv.onrender.com';

    setInterval(async () => {
      try {
        console.log('Pinging self to prevent sleep...');
        await axios.get(`${serviceUrl}/home`);
        console.log('Self-ping successful');
      } catch (err) {
        console.error('Self-ping failed:', err.message);
      }
    }, PING_INTERVAL);
  } catch (error) {
    console.error('Error during keep alive cron:', error);
  }
});
