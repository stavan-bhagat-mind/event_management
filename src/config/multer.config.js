const multer = require('multer');
const path = require('path');

// Memory storage for direct streaming to MinIO
const storage = multer.memoryStorage();

// File validation
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'),
      false
    );
  }

  if (file.size > maxSize) {
    return cb(new Error('File size exceeds 5MB limit'), false);
  }

  cb(null, true);
};

// Configure Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  singleUpload: (fieldName) => upload.single(fieldName),
  multipleUpload: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  fieldsUpload: (fields) => upload.fields(fields),
};
