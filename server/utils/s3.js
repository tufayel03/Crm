const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const isS3Configured = () => {
  return !!(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
};

const getS3Client = () => new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

const uploadToS3 = async ({ buffer, contentType, key }) => {
  if (!isS3Configured()) {
    throw new Error('S3 not configured. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
  }

  const client = getS3Client();
  const upload = new Upload({
    client,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }
  });

  await upload.done();

  const publicBase = process.env.S3_PUBLIC_URL;
  if (publicBase) {
    return { url: `${publicBase}/${key}`, key };
  }

  return { url: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`, key };
};

const deleteFromS3 = async (key) => {
  if (!isS3Configured() || !key) return;
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
};

module.exports = { uploadToS3, deleteFromS3, isS3Configured };
