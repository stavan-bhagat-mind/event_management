const cronJobs = [
  require('./seatsAvailability.cron'),
  require('./unverifiedUser.cron'),
];
console.log('All cron jobs have been loaded.');
