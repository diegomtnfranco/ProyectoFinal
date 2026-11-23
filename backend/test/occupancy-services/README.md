# E2E: tarifa nocturna + servicios por ocupación

Levanta la `AppModule` completa (guards globales reales, JWT, ValidationPipe
igual a `main.ts`) contra un PostgreSQL real temporal. No forma parte de
`npm test` y **no agrega dependencias al `package.json`**.

Desde `backend/` (Linux/macOS/WSL):

```bash
npm i --no-save --legacy-peer-deps embedded-postgres "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/occupancy-services/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/occupancy-services/jest.config.js
kill %1
```

`mapped-types-cjs` es solo para Jest: `@nestjs/mapped-types` está declarado como
`"*"` y resuelve a la 12.x (solo ESM), que Jest no puede cargar. Es el mismo
motivo por el que hoy fallan 6 specs de `npm test`.

Escenarios cubiertos (numeración del requerimiento): 11–16, 18–25 y la
coherencia del desglose del 26. Los escenarios 1–10 y 26 están cubiertos con
fechas exactas en `src/modules/occupancy-services/charge-calculator.spec.ts`.
