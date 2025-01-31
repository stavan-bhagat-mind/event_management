const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const ensureBucketExists = async (bucketName) => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, process.env.MINIO_REGION);
      console.log(`Created MinIO bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error(`MinIO bucket initialization error: ${error.message}`);
    throw new Error('Storage service unavailable');
  }
};

module.exports = {
  minioClient,
  ensureBucketExists,
};
