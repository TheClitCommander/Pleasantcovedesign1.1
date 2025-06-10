import express from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = express.Router();

// Configure R2 S3Client
const s3 = new S3Client({
  endpoint:    process.env.R2_ENDPOINT,
  region:      process.env.R2_REGION,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

// 1) Presign URL
router.get(
  '/api/public/project/:token/upload-url',
  async (req, res, next) => {
    try {
      const { filename, fileType } = req.query as any;
      if (!filename || !fileType) {
        return res.status(400).json({ error: 'filename & fileType required' });
      }
      // Optional: validate project token here
      const key = `${req.params.token}/${Date.now()}-${filename}`;
      const cmd = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key:    key,
        ContentType: fileType,
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
      res.json({ url, key });
    } catch (err) {
      next(err);
    }
  }
);

export default router; 