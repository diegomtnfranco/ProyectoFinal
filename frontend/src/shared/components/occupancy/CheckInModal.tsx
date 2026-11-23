import { useEffect, useState, type JSX } from 'react';
import { Car, Motorbike, Truck, X } from 'lucide-react';
import { VehicleType, type UserVehicleType } from '../../../types/auth.types';
import { occupancyServicesService } from '../../../services/occupancy-services.service';
import ServiceCheckboxList from './ServiceCheckboxList';
import type { OfferedService } from '../../../types/occupancy-services.types';

const vehicleOptions: { value: UserVehicleType; label: string; icon: JSX.Element }[] = [
  { value: VehicleType.CAR, label: 'Auto', icon: <Car size={20} /> },
  { value: VehicleType.MOTORCYCLE, label: 'Moto', icon: <Motorbike size={20} /> },
  { value: VehicleType.TRUCK, label: 'Camioneta', icon: <Truck size={20} /> },
  { value: VehicleType.VAN, label: 'Furgón', icon: <Truck size={20} /> },
];

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plate: string, vehicleType: UserVehicleType, serviceKeys?: string[]) => void;
  isLoading?: boolean;
  defaultPlate?: string;
  defaultVehicleType?: UserVehicleType;
  /** Si se indica, muestra los servicios activos del estacionamiento (opcionales) */
  parkingLotId?: string;
}

export function CheckInModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  defaultPlate = '',
  defaultVehicleType = VehicleType.CAR,
  parkingLotId,
}: CheckInModalProps) {
  const [plate, setPlate] = useState(defaultPlate);
  const [vehicleType, setVehicleType] = useState<UserVehicleType>(defaultVehicleType);
  const [services, setServices] = useState<OfferedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Servicios activos del estacionamiento; si falla, el ingreso sigue funcionando sin ellos
  useEffect(() => {
    if (!isOpen || !parkingLotId) return;
    let cancelled = false;
    occupancyServicesService
      .getSelectableServices(parkingLotId)
      .then((list) => {
        if (cancelled) return;
        setServices(list);
        setSelectedServices([]);
      })
      .catch(() => !cancelled && setServices([]));
    return () => {
      cancelled = true;
    };
  }, [isOpen, parkingLotId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plate.trim()) {
      onConfirm(plate.trim().toUpperCase(), vehicleType, selectedServices);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Registrar ingreso</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Patente</label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="ABC123"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Tipo de vehículo</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as UserVehicleType)}
              className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              {vehicleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {services.length > 0 && (
            <div className="mb-6">
              <p className="block text-sm font-medium mb-1">
                Servicios solicitados <span className="font-normal text-gray-400">(opcional)</span>
              </p>
              <ServiceCheckboxList options={services} selected={selectedServices} onChange={setSelectedServices} disabled={isLoading} />
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-500 text-white py-2 rounded-xl hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Registrando...' : 'Confirmar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}