import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// marca la ruta como publica para que no haya auth
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);