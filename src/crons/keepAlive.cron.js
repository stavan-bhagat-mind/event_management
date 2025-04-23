const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const serviceUrl =
  process.env.SERVICE_URL || 'https://event-management-p7iv.onrender.com';

// Schedule pings every 10 minutes
cron.schedule('*/4 * * * *', async () => {
  try {
    console.log(
      `[${new Date().toISOString()}] Pinging ${serviceUrl}/home`
    );
    const response = await axios.get(`${serviceUrl}/home`);
    console.log('Keep-alive successful:', response.data);
  } catch (error) {
    console.error('Keep-alive failed:', error.message);

    // Attempt a second try if first fails
    try {
      await axios.get(`${serviceUrl}/home`);
      console.log('Second attempt succeeded');
    } catch (retryError) {
      console.error('Retry also failed:', retryError.message);
      // Consider sending an alert here
    }
  }
});

console.log('Keep-alive scheduler started');
