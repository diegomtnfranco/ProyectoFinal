// src/modules/common/pipes/file-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly defaultOptions = {
    maxSizeMB: 2,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'],
  };

  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const { maxSizeMB, allowedMimeTypes } = {
      ...this.defaultOptions,
      ...this.options,
    };

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      throw new BadRequestException(`El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Formato no permitido. Formatos aceptados: ${allowedMimeTypes.join(', ')}`
      );
    }

    return file;
  }
}