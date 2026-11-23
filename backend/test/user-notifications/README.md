# E2E: centro de notificaciones

AppModule completa + PostgreSQL real temporal + Socket.IO real. El envío de
emails existente (reservas) se simula porque el entorno de prueba no tiene SMTP.
No forma parte de `npm test` y no agrega dependencias al `package.json`.

Desde `backend/` (Linux/macOS/WSL). Cada suite necesita una base nueva:

```bash
npm i --no-save --legacy-peer-deps embedded-postgres socket.io-client@4.8.3 "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/user-notifications/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/user-notifications/jest.config.js
kill %1
```

Cubre: reservas (solicitud, confirmación, rechazo, cancelación, aislamiento entre
estacionamientos y empleados inactivos), baja/aumento de tarifas, máquina de
ocupación con cooldown de 10 minutos, avisos de cierre 60/15 min, paginación,
contador, lectura, sincronización entre pestañas, seguridad, admin sin
notificaciones, retención de 90 días y que una notificación fallida no afecta
la operación de negocio.
