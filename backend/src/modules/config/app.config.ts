// backend/src/modules/config/app.config.ts

export const appConfig = () => ({
  // ============ ENTORNO ============
  STAGE: process.env.STAGE || 'development',  // ✅ AGREGAR
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // ============ BASE DE DATOS ============
  DB_PASSWORD: process.env.DB_PASSWORD || 'backend_app_server',
  DB_USER: process.env.DB_USER || 'backend_app_server',
  DB_NAME: process.env.DB_NAME || 'parkingApp',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  
  // ============ JWT ============
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_key_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // ============ SERVIDOR ============
  PORT: process.env.PORT || 3000,
  
  // ============ EMAIL ============
  EMAIL_USER: process.env.EMAIL_USER || 'tu_email@gmail.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'tu_contraseña_gmail',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  
  // ============ FRONTEND ============
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ============ CLOUDINARY ============
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'tu_cloud_name',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || 'tu_api_key',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'tu_api_secret',
  CLOUDINARY_IMAGE_QUALITY: process.env.CLOUDINARY_IMAGE_QUALITY || '80',
  CLOUDINARY_IMAGE_FORMAT: process.env.CLOUDINARY_IMAGE_FORMAT || 'webp',
  CLOUDINARY_MAX_WIDTH: process.env.CLOUDINARY_MAX_WIDTH || '1200',
  CLOUDINARY_MAX_HEIGHT: process.env.CLOUDINARY_MAX_HEIGHT || '1200',
});