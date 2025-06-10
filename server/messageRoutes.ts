import express from 'express';
import bodyParser from 'body-parser';
import { storage } from './storage.js';

const router = express.Router();
router.use(bodyParser.json());

// 2) Create message (after uploads)
router.post(
  '/api/public/project/:token/messages',
  async (req, res, next) => {
    try {
      const { content, senderName, senderType, attachments: keys } = req.body;
      
      // Verify project exists
      const projectData = await storage.getProjectByToken(req.params.token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }
      
      // keys is array of object keys e.g. ["token/12345-file.jpg"]
      const attachments = (keys || []).map((key: string) =>
        `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`
      );
      
      // Save to DB using our storage system
      const message = await storage.createProjectMessage({
        projectId: projectData.id!,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '(File attachment)',
        attachments
      });

      console.log('✅ Message created with attachments:', attachments);

      // Log activity for admin
      await storage.createActivity({
        type: 'client_message',
        description: `New message from ${senderName}: ${content ? content.substring(0, 50) : 'File attachment'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: projectData.companyId,
        projectId: projectData.id!
      });

      res.json({
        ...message,
        filesUploaded: attachments.length,
        success: true
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router; 