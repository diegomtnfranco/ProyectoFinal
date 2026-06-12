// src/modules/common/services/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    options?: { width?: number; height?: number; quality?: number }
  ): Promise<string> {
    const fileBase64 = file.buffer.toString('base64');
    const fileUri = `data:${file.mimetype};base64,${fileBase64}`;

    const uploadOptions: UploadApiOptions = {
      folder: folder,
      transformation: [{
        width: options?.width || 1200,
        height: options?.height || 1200,
        crop: 'limit',
        quality: options?.quality || 'auto',
      }],
      use_filename: true,
      unique_filename: true,
      overwrite: true,
    };

    const result = await cloudinary.uploader.upload(fileUri, uploadOptions);
    return result.secure_url;
  }

  async deleteImage(publicId: string): Promise<boolean> {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  }

  extractPublicIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
    return match ? match[1] : null;
  }
}