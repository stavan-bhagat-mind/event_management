// const Minio = require('minio');

// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT,
//   port: parseInt(process.env.MINIO_PORT),
//   useSSL: process.env.MINIO_USE_SSL === 'true',
//   accessKey: process.env.MINIO_ACCESS_KEY,
//   secretKey: process.env.MINIO_SECRET_KEY,
// });

// const ensureBucketExists = async (bucketName) => {
//   try {
//     const exists = await minioClient.bucketExists(bucketName);
//     if (!exists) {
//       await minioClient.makeBucket(bucketName, process.env.MINIO_REGION);
//       console.log(`Created MinIO bucket: ${bucketName}`);
//     }
//   } catch (error) {
//     console.error(`MinIO bucket initialization error: ${error.message}`);
//     throw new Error('Storage service unavailable');
//   }
// };

// module.exports = {
//   minioClient,
//   ensureBucketExists,
// };

const Minio = require('minio');

let minioClient = null;
let isMinioAvailable = false;

const initializeMinioClient = () => {
  try {
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    isMinioAvailable = true;
    console.log('MinIO client initialized successfully');
  } catch (error) {
    console.error(`MinIO client initialization error: ${error.message}`);
    isMinioAvailable = false;
  }
};

const ensureBucketExists = async (bucketName) => {
  if (!isMinioAvailable || !minioClient) {
    console.warn('MinIO service is not available. Skipping bucket creation.');
    return false;
  }

  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, process.env.MINIO_REGION);
      console.log(`Created MinIO bucket: ${bucketName}`);
    }
    return true;
  } catch (error) {
    console.error(`MinIO bucket initialization error: ${error.message}`);
    isMinioAvailable = false;
    return false;
  }
};

// Function to check if MinIO is available
const checkMinioAvailability = async () => {
  if (!minioClient) {
    return false;
  }

  try {
    // Try to list buckets as a health check
    await minioClient.listBuckets();
    isMinioAvailable = true;
    return true;
  } catch (error) {
    console.error(`MinIO availability check failed: ${error.message}`);
    isMinioAvailable = false;
    return false;
  }
};

// Function to get MinIO client with availability check
const getMinioClient = () => {
  if (!isMinioAvailable) {
    throw new Error('MinIO service is currently unavailable');
  }
  return minioClient;
};

// Initialize the client when the module is loaded
initializeMinioClient();

// Attempt to reconnect periodically
const RECONNECT_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(async () => {
  if (!isMinioAvailable) {
    console.log('Attempting to reconnect to MinIO...');
    initializeMinioClient();
    await checkMinioAvailability();
  }
}, RECONNECT_INTERVAL);

module.exports = {
  getMinioClient,
  ensureBucketExists,
  checkMinioAvailability,
  isMinioAvailable: () => isMinioAvailable,
};
