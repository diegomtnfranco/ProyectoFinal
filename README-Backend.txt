ejecucion cmd
cd backend
npm run start:dev


install configs

npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/jwt passport-jwt passport bcrypt
npm install @nestjs/swagger


cloudflared
npm install cloudflared

cloudflared tunnel --url http://localhost:5173/ --> Inicia el tunel con cloudflare y reemplaza la url ne .env frontend_url

dev dependencias
npm install -D @types/bcrypt


conection front
backend/src/main.ts:
app.enableCors();

puertos
puerto: 3000
puertofront: 5173

