# E2E: reservas programadas (Clientes: Sistema de Reservas)

Levanta la `AppModule` completa contra un PostgreSQL real temporal. No forma
parte de `npm test` y **no agrega dependencias al `package.json`**.

Desde `backend/` (Linux/macOS/WSL, usuario no root):

```bash
npm i --no-save --legacy-peer-deps embedded-postgres "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/scheduled-reservations/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/scheduled-reservations/jest.config.js --runInBand
kill %1
```

Cubre:
- `GET /api/reservations/availability/:lotId` (público): solo horas en punto, futuras,
  >= 1 h desde ahora, dentro del horario de atención; marca las programadas (>= 24 h).
- `GET /api/reservations/availability/:lotId/exits`: egresos dentro del horario, con precio.
- `POST /api/reservations`: tarifa diferencial en reservas programadas, espacio asegurado
  para todo el intervalo, rechazo de minutos / fuera de horario / sin espacio.
- Descuento configurable por estacionamiento (`settings.scheduledReservationDiscountPercent`).
