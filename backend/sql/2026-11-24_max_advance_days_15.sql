-- Reservas programadas: anticipación máxima de 7 a 15 días.
--
-- El valor vive en parking_lots.settings (jsonb). El código ya usa 15 como default
-- para estacionamientos nuevos; este script actualiza los existentes que tienen el
-- default anterior (7) o no tienen el valor. Respeta los que el dueño configuró
-- con otro número. Idempotente.
--
-- Uso:  psql -h <host> -U <user> -d <db> -f sql/2026-11-24_max_advance_days_15.sql

BEGIN;

UPDATE parking_lots
SET settings = COALESCE(settings, '{}'::jsonb) || '{"maxAdvanceDays": 15}'::jsonb
WHERE settings IS NULL
   OR NOT (settings ? 'maxAdvanceDays')
   OR (settings->>'maxAdvanceDays')::int = 7;

COMMIT;
