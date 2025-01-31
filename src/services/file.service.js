const { minioClient, ensureBucketExists } = require('../config/minio.config');

const bucketName = process.env.MINIO_BUCKET;

// Initialize MinIO bucket (run this once when the app starts)
const initializeMinIO = async () => {
  try {
    await ensureBucketExists(bucketName);
    console.log('MinIO bucket initialized successfully');
  } catch (error) {
    console.error(`MinIO initialization failed: ${error.message}`);
    process.exit(1); // Exit the app if MinIO initialization fails
  }
};

// Upload a file to MinIO
const uploadFile = async (file) => {
  try {
    const objectName = `${Date.now()}-${file.originalname}`;
    const metaData = {
      'Content-Type': file.mimetype,
      'Original-Name': file.originalname,
    };

    await minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      metaData
    );

    return {
      url: `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${objectName}`,
      objectName,
      size: file.size,
      mimetype: file.mimetype,
    };
  } catch (error) {
    console.error(`File upload error: ${error}`);
    throw new Error('Failed to upload file');
  }
};

module.exports = {
  initializeMinIO,
  uploadFile,
};
