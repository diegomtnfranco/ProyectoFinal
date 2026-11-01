# Pruebas de integración: parking-profiles

Usan un PostgreSQL real temporal (`embedded-postgres`) con el mismo `synchronize`
que el proyecto. No forman parte de `npm test` (están fuera de `src/` y no
coinciden con el patrón de `test/jest-e2e.json`), por eso **no se agregó ninguna
dependencia al `package.json`**.

Para ejecutarlas (desde `backend/`, en Linux/macOS/WSL):

```bash
npm i --no-save embedded-postgres
node test/parking-profiles/pg-server.mjs &   # espera a ver PG_READY
npx jest --rootDir . test/parking-profiles
kill %1
```

- `profiles.pg.spec.ts`: persistencia tras reconectar, catálogo idempotente,
  aislamiento entre estacionamientos, constraint único.
- `profiles.http.spec.ts`: endpoints con los guards reales (JwtAuthGuard +
  JwtStrategy + RolesGuard) y el mismo ValidationPipe de `main.ts`.
