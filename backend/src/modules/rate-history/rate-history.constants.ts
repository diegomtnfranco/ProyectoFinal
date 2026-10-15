// src/modules/rate-history/rate-history.constants.ts
import { VehicleType } from '../common/enums/vehicle-type.enum';

const VEHICLE_LABELS: Record<VehicleType, string> = {
  [VehicleType.CAR]: 'Auto',
  [VehicleType.MOTORCYCLE]: 'Moto',
  [VehicleType.TRUCK]: 'Camioneta',
  [VehicleType.VAN]: 'Furgón',
};

/** Mensaje para el usuario que intenta ingresar por QR sin tarifa configurada */
export const NO_RATE_QR_MESSAGE =
  'El estacionamiento no tiene tarifas para ese tipo de vehiculo. Contactese con el estacionamiento';

/** Mensaje para owner/employee en el ingreso manual sin tarifa configurada */
export const noRateManualMessage = (vehicleType: VehicleType) =>
  `No existen tarifas para el tipo de vehículo ${VEHICLE_LABELS[vehicleType] ?? vehicleType}. ` +
  'Configurá una tarifa antes de registrar el ingreso.';
