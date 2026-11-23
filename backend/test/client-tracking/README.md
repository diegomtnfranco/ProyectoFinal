# E2E: vehículos del cliente y seguimiento

AppModule completa + PostgreSQL real temporal + Socket.IO real (verifica que los
eventos lleguen solo a los clientes vinculados). No forma parte de `npm test` y
no agrega dependencias al `package.json`.

Desde `backend/` (Linux/macOS/WSL):

```bash
npm i --no-save --legacy-peer-deps embedded-postgres socket.io-client@4.8.3 "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/client-tracking/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/client-tracking/jest.config.js
kill %1
```

Cubre: límite de 3 vehículos y duplicados (1–6), asociación por patente con
varios clientes y una sola ocupación (8–14), patente única por estacionamiento
(15), seguimiento y permisos (15, 18, 47–49), realización de servicios (37–40),
alertas de cierre sin repetición y aviso nocturno (41–43, 46), egreso e
historial (21, 22).
