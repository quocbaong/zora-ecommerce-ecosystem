const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

const uploadFile = async (file, conversationId) => {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const filename = file.originalname.replace(/\s+/g, '_');
  const key = `chat-media/${conversationId}/${timestamp}_${uuid}_${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${key}`;
  return url;
};

module.exports = { uploadFile };
