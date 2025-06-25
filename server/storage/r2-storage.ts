import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export interface R2Config {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class R2Storage {
  private client: S3Client;
  private bucket: string;

  constructor(config: R2Config) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async uploadFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
    const key = `uploads/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    await this.client.send(command);
    
    // Return the public URL
    return `https://${this.bucket}.${this.getR2Domain()}/uploads/${filename}`;
  }

  async getFileUrl(filename: string): Promise<string> {
    const key = `uploads/${filename}`;
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Generate a signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    return signedUrl;
  }

  async deleteFile(filename: string): Promise<void> {
    const key = `uploads/${filename}`;
    
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  private getR2Domain(): string {
    // Extract domain from endpoint
    const endpoint = this.client.config.endpoint;
    if (!endpoint) {
      throw new Error('R2 endpoint not configured');
    }
    const url = new URL(endpoint as unknown as string);
    return url.hostname;
  }
}

// Factory function to create R2 storage from environment variables
export function createR2Storage(): R2Storage | null {
  const config = {
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };

  // Check if all required config is present
  if (!config.bucket || !config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    console.log('⚠️ R2 storage not configured, falling back to local storage');
    return null;
  }

  return new R2Storage(config as R2Config);
} 