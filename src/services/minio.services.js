const minioClient = require('../config/minio');
const crypto = require('crypto');
const path = require('path');

const bucketName = process.env.MINIO_BUCKET || 'my-bucket';

const initializeBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
    }
  } catch (error) {
    throw new Error(`Bucket initialization failed: ${error.message}`);
  }
};

const generateFileName = (originalname) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalname);
  return `${timestamp}-${randomString}${extension}`;
};

const uploadToMinio = async (file) => {
  try {
    const fileName = generateFileName(file.originalname);

    await minioClient.putObject(
      bucketName,
      fileName,
      file.buffer,
      file.buffer.length,
      file.mimetype
    );

    const fileUrl = await minioClient.presignedGetObject(
      bucketName,
      fileName,
      24 * 60 * 60 // 24 hours
    );

    return {
      fileName,
      fileUrl,
    };
  } catch (error) {
    throw new Error(`File upload to MinIO failed: ${error.message}`);
  }
};

const deleteFromMinio = async (fileName) => {
  try {
    await minioClient.removeObject(bucketName, fileName);
    return true;
  } catch (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

module.exports = {
  initializeBucket,
  uploadToMinio,
  deleteFromMinio,
};
