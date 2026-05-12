
export const appConfig = () => ({

  DB_PASSWORD: process.env.DB_PASSWORD || 'backend_app_server',
  DB_USER: process.env.DB_USER || 'backend_app_server',
  DB_NAME: process.env.DB_NAME || 'parkingApp',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || '5432',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_key_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  PORT: process.env.PORT || 3000,
  EMAIL_USER: process.env.EMAIL_USER || 'tu_email@gmail.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'tu_contraseña_gmail',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
});