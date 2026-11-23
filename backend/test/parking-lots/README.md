# Regresión: estacionamiento con tarifas inactivas

Antes, generar/regenerar QR, editar el estacionamiento, activarlo/desactivarlo o
cambiar su imagen devolvía 500 si tenía alguna tarifa eliminada (inactiva):
`findOne()` filtra esas tarifas y `save()` intentaba poner su `parking_lot_id`
en NULL. Ahora se actualizan solo las columnas modificadas.

Desde `backend/` (Linux/macOS/WSL), con una base nueva:

```bash
npm i --no-save --legacy-peer-deps embedded-postgres "mapped-types-cjs@npm:@nestjs/mapped-types@2.1.0"
node test/parking-lots/pg-server.mjs &     # esperar "PG_READY"
npx jest -c test/parking-lots/jest.config.js
kill %1
```
