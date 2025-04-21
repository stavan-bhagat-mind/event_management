const cronJobs = [
  require('./seatsAvailability.cron'),
  require('./unverifiedUser.cron'),
  require('./keepAlive.cron'),
];
console.log('All cron jobs have been loaded.');
