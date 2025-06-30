import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime-types';

const router = express.Router();

// Check if R2 is properly configured
const useR2Storage = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

// Configure R2 S3Client only if credentials are available
let s3: S3Client | null = null;

if (useR2Storage) {
  s3 = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  console.log('📦 R2 upload routes configured successfully');
} else {
  console.log('⚠️ R2 not configured - using local file storage');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const token = req.params.token || 'unknown';
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${token}-${timestamp}-${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Allow common file types - check extension only
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.zip'];
    const allowedMimeTypes = /^(image\/(jpeg|jpg|png|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain|application\/zip)$/i;
    
    const extAllowed = allowedExtensions.includes(ext);
    const mimeAllowed = allowedMimeTypes.test(file.mimetype);
    
    console.log('🔍 [FILE_FILTER] Checking file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: ext,
      extensionAllowed: extAllowed,
      mimetypeAllowed: mimeAllowed
    });
    
    // Accept if either extension OR mimetype is valid (more permissive)
    if (extAllowed || mimeAllowed) {
      console.log('✅ [FILE_FILTER] File accepted:', file.originalname);
      return cb(null, true);
    } else {
      console.log('❌ [FILE_FILTER] File rejected:', file.originalname, 'ext:', ext, 'mime:', file.mimetype);
      cb(new Error('Invalid file type'));
    }
  }
});

// 1) Get presigned URL (for R2) or return upload endpoint (for local)
router.get(
  '/api/public/project/:token/upload-url',
  async (req, res, next) => {
    try {
      const { filename, fileType } = req.query as any;
      if (!filename || !fileType) {
        return res.status(400).json({ error: 'filename & fileType required' });
      }
      
      // If R2 is configured, use it
      if (useR2Storage && s3) {
        const key = `${req.params.token}/${Date.now()}-${filename}`;
        const cmd = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          ContentType: fileType,
        });
        
        const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
        return res.json({ url, key, storage: 'r2' });
      }
      
      // For local storage, return our upload endpoint
      const uploadEndpoint = `/api/public/project/${req.params.token}/upload`;
      console.log('📁 Using local file storage for:', filename);
      
      res.json({ 
        url: uploadEndpoint,
        key: `local-${Date.now()}-${filename}`,
        storage: 'local',
        method: 'POST'
      });
      
    } catch (err) {
      console.error('❌ Upload URL generation failed:', err);
      res.status(500).json({ error: 'Upload preparation failed' });
    }
  }
);

// 2) Handle direct file upload (for local storage)
router.post(
  '/api/public/project/:token/upload',
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.debug('[API] Received upload', { filename: req.file.originalname });
      
      const fileUrl = `/uploads/${req.file.filename}`;
      const fileKey = req.file.filename;
      const savePath = path.join(uploadsDir, req.file.filename);
      
      console.debug('[API] Saved upload to', savePath);
      console.log('📁 File uploaded successfully:', req.file.filename);
      
      res.json({
        success: true,
        url: fileUrl,
        key: fileKey,
        filename: req.file.originalname,
        size: req.file.size,
        storage: 'local'
      });
      
    } catch (err) {
      console.error('[API] Upload error', err);
      console.error('❌ File upload failed:', err);
      res.status(500).json({ error: 'File upload failed' });
    }
  }
);

// 3) Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    const contentType = mime.lookup(filename);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const isImage = contentType && contentType.startsWith('image/');
    if (!isImage) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router; 