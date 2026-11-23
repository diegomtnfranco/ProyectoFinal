# E2E: checkout QR con identificación automática + métodos de pago

Levanta la `AppModule` completa (guards globales reales, JWT, ValidationPipe
igual a `main.ts`) contra un PostgreSQL real temporal y Socket.IO real. No forma
parte de `npm test` y **no agrega dependencias al `package.json`**.

Desde `backend/` (Linux/macOS/WSL):

```bash
npm i --no-save --legacy-peer-deps embedded-postgres "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0" socket.io-client
node test/checkout/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/checkout/jest.config.js --runInBand
kill %1
```

> embedded-postgres no corre como root (initdb lo rechaza): usar un usuario común.
> Cada corrida necesita una base limpia: reiniciar `pg-server.mjs` entre corridas.

Cubre (sección 9 del requerimiento y el ingreso por QR con vehículos del perfil):
- Vehículo obligatorio: cliente sin vehículos (403 en checkout, reservas y pagos),
  primer registro, no se puede borrar el único, máximo 3, otros roles sin cambios.
- Identificación: varios vehículos propios, sin coincidencias, patente de otro
  cliente, ocupación inexistente, otro estacionamiento, QR inválido, patente
  compartida (D2), salida QR anónima deshabilitada (410), el cliente no puede
  enviar importe/patente/tipo.
- Billetera: saldo inferior, igual, importe manipulado (AMOUNT_CHANGED), error
  durante el débito (rollback del egreso), reintento idempotente, doble
  confirmación, 3 solicitudes simultáneas (un solo cobro).
- Efectivo: solicitud (no libera el espacio), aviso WebSocket + notificación solo
  al dueño y empleados del lote, solicitud duplicada (también en paralelo),
  consulta del estado, egreso con cobro (empleado y dueño), egreso sin cobro
  (pago pendiente, deuda pagable después), cancelación, pago con billetera con
  solicitud pendiente, carrera cliente vs. personal.
- Permisos: empleado/dueño ajeno, cliente intentando confirmar pagos, importe
  enviado desde el frontend, egreso sin ocupación válida, administrador sin cambios.
- Ingreso por QR del cliente: solo sus vehículos (nunca los de otro usuario),
  patente y tipo tomados del vehículo (coinciden en el panel del personal y en la
  tarifa), vehículo con ingreso activo, tipo sin tarifa, patente manual bloqueada
  para clientes con sesión (el ingreso sin cuenta sigue funcionando).
