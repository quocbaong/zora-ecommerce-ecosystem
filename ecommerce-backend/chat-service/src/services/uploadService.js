const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, S3_BUCKET } = require("../config/s3");
const { v4: uuidv4 } = require("uuid");

const uploadFile = async (file, conversationId) => {
  const timestamp = Date.now();
  const uuid = uuidv4();
  // Multer decodes the multipart filename header as latin1 by default (HTTP
  // header convention), so UTF-8 bytes for Vietnamese names arrive as
  // mojibake. Re-interpret the bytes as UTF-8 to recover the real filename.
  const originalNameUtf8 = Buffer.from(file.originalname, "latin1").toString("utf8");
  const filename = originalNameUtf8.replace(/\s+/g, "_");
  const key = `chat-media/${conversationId}/${timestamp}_${uuid}_${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${key}`;
  return url;
};

const deleteFile = async (fileUrl) => {
  try {
    console.log("[deleteFile] Attempting to delete S3 file, URL:", fileUrl);
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.slice(1)); // remove leading '/'
    console.log("[deleteFile] Parsed key:", key, "| Bucket:", S3_BUCKET);
    const result = await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
    console.log(
      "[deleteFile] S3 delete success, status:",
      result.$metadata?.httpStatusCode,
    );
  } catch (err) {
    console.error("[deleteFile] S3 delete FAILED:", err.message);
    console.error("[deleteFile] Full error:", JSON.stringify(err, null, 2));
    // Don't throw — recall should still succeed even if S3 delete fails
  }
};

module.exports = { uploadFile, deleteFile };
