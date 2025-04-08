const {
  getMinioClient,
  ensureBucketExists,
} = require('../config/minio.config');
const bucketName = process.env.MINIO_BUCKET;

// Initialize MinIO bucket
const initializeMinIO = async () => {
  try {
    await ensureBucketExists(bucketName);
    console.log('MinIO bucket initialized successfully');
  } catch (error) {
    console.error(`MinIO initialization failed: ${error.message}`);
    process.exit(1);
  }
};

const generateFolderPath = (options) => {
  const { category, subCategory } = options;

  if (!category) {
    throw new Error('Category is required');
  }

  let folderPath = `${category}`;
  if (subCategory) {
    folderPath += `/${subCategory}`;
  }
  return folderPath;
};

// Convert objectPath to full URL
const getFullUrl = (objectPath) => {
  return `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${objectPath}`;
};

// Extract objectPath from full URL
const getObjectPathFromUrl = (url) => {
  const baseUrl = `${process.env.MINIO_PUBLIC_URL}/${bucketName}/`;
  return url.replace(baseUrl, '');
};

// Upload a file to MinIO
const uploadFile = async (file, options = {}) => {
  try {
    const minioClient = getMinioClient();
    const folderPath = generateFolderPath(options);
    const objectPath = `${folderPath}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

    const metaData = {
      'Content-Type': file.mimetype,
      'Original-Name': file.originalname,
      Category: options.category || '',
      'Sub-Category': options.entityId || '',
      ID: options.id || '',
    };

    await minioClient.putObject(
      bucketName,
      objectPath,
      file.buffer,
      file.size,
      metaData
    );

    return {
      objectPath,
      url: getFullUrl(objectPath),
      size: file.size,
      mimetype: file.mimetype,
      path: folderPath,
    };
  } catch (error) {
    console.error(`File upload error: ${error}`);
    throw new Error('Failed to upload file');
  }
};

// Delete file from MinIO
const deleteFile = async (objectPath) => {
  try {
    const minioClient = getMinioClient();
    await minioClient.removeObject(bucketName, objectPath);
    return true;
  } catch (error) {
    console.error(`File deletion error: ${error}`);
    throw new Error('Failed to delete file');
  }
};

// Check if file exists in MinIO
const fileExists = async (objectPath) => {
  try {
    const minioClient = getMinioClient();
    await minioClient.statObject(bucketName, objectPath);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

module.exports = {
  initializeMinIO,
  uploadFile,
  deleteFile,
  getFullUrl,
  getObjectPathFromUrl,
  fileExists,
};
