# E2E: billetera demo + pagos (wallet, Mercado Pago Sandbox, presencial) + finanzas

Levanta la `AppModule` completa (guards globales reales, JWT, ValidationPipe
igual a `main.ts`) contra un PostgreSQL real temporal. No forma parte de
`npm test` y **no agrega dependencias al `package.json`**.

Mercado Pago se reemplaza por un cliente falso (`overrideProvider(MercadoPagoClient)`):
la suite no hace llamadas de red. Las firmas de los webhooks se generan con la
misma fórmula oficial (HMAC-SHA256 del manifest) y una clave de prueba.

Desde `backend/` (Linux/macOS/WSL):

```bash
npm i --no-save --legacy-peer-deps embedded-postgres "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/payments/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/payments/jest.config.js --runInBand
kill %1
```

Cubre: billetera única y persistente, cargas válidas/inválidas e idempotentes,
débitos atómicos y concurrentes, saldo insuficiente, pagos ajenos, reservas solo
confirmadas, importe = facturado por el egreso real (con servicio adicional e
incluido), diferencia de reserva pagada (D3), pago presencial (D4), Mercado Pago
(reutilización del checkout, retorno sin confirmación, firmas inválidas,
aprobado, rechazado, pendiente, importe distinto, webhooks repetidos, aprobación
tardía duplicada), credenciales no expuestas, finanzas por dueño, tarjetas de
actividad, permisos por rol y el control de pertenencia de `GET /reservations/:id` (D6).
