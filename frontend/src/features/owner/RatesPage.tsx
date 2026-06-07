import { useState, useEffect, type JSX } from "react";
import { CheckCircle } from "lucide-react";
import {
  Car,
  Motorbike,
  Truck,
  Pencil,
  Check,
  X,
  DollarSign,
  Loader2,
  Plus,
} from "lucide-react";
import { useRatesStore } from "../../stores/ratesStore";
import { useParkingLotsStore } from "../../stores/parkingStore";
import { VehicleType, type UserVehicleType } from "../../types/auth.types";
import type { Rate, CreateRateDto } from "../../types/parking.types";

// Mapeo de UserVehicleType a nombre y icono
const vehicleConfig: Record<UserVehicleType, { name: string; icon: JSX.Element }> = {
  [VehicleType.CAR]: { name: "Auto", icon: <Car className="w-5 h-5" /> },
  [VehicleType.TRUCK]: { name: "Camioneta", icon: <Truck className="w-5 h-5" /> },
  [VehicleType.MOTORCYCLE]: { name: "Moto", icon: <Motorbike className="w-5 h-5" /> },
  [VehicleType.VAN]: { name: "Furgón", icon: <Truck className="w-5 h-5" /> },
};

// Opciones para el selector
const vehicleOptions: { value: UserVehicleType; label: string }[] = [
  { value: VehicleType.CAR, label: "Auto" },
  { value: VehicleType.TRUCK, label: "Camioneta" },
  { value: VehicleType.MOTORCYCLE, label: "Moto" },
  { value: VehicleType.VAN, label: "Furgón" },
];

export default function RatesPage() {
  const { currentParkingLot, fetchMyParkingLot, isLoading: parkingLoading } = useParkingLotsStore();
  const { rates, fetchRatesByParkingLot, createRate, updateRate, isLoading: ratesLoading, error, clearError } = useRatesStore();

  const [selectedVehicleType, setSelectedVehicleType] = useState<UserVehicleType | null>(null);
  const [editedPrice, setEditedPrice] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Cargar el estacionamiento del dueño
  useEffect(() => {
    fetchMyParkingLot();
  }, [fetchMyParkingLot]);

  // Cuando tengamos el parking, cargar sus tarifas
  useEffect(() => {
    if (currentParkingLot?.id) {
      fetchRatesByParkingLot(currentParkingLot.id);
    }
  }, [currentParkingLot, fetchRatesByParkingLot]);

  // Cuando se selecciona un vehículo, cargar su precio actual (si existe)
  const handleVehicleSelect = (vehicleType: UserVehicleType) => {
    setSelectedVehicleType(vehicleType);
    const rate = rates.find(r => r.vehicleType === vehicleType);
    if (rate) {
      setEditedPrice(rate.pricePerHour.toString());
    } else {
      setEditedPrice("");
    }
  };

  const handleCancel = () => {
    setSelectedVehicleType(null);
    setEditedPrice("");
    clearError();
  };

  const handleConfirm = async () => {
    // Validar que haya seleccionado un vehículo
    if (!selectedVehicleType || !currentParkingLot?.id) {
      return;
    }

    const newPrice = Number(editedPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      return;
    }

    const existingRate = rates.find(r => r.vehicleType === selectedVehicleType);

    try {
      if (existingRate) {
        // EDITAR tarifa existente
        await updateRate(existingRate.id, { pricePerHour: newPrice });
        setToastMessage(`Tarifa de ${vehicleConfig[selectedVehicleType].name} actualizada correctamente`);
      } else {
        // CREAR nueva tarifa
        const createData: CreateRateDto = {
          parkingLotId: currentParkingLot.id,
          vehicleType: selectedVehicleType,
          pricePerHour: newPrice,
          rateType: "hourly",
        };
        await createRate(createData);
        setToastMessage(`Tarifa de ${vehicleConfig[selectedVehicleType].name} creada correctamente`);
      }
      
      setSelectedVehicleType(null);
      setEditedPrice("");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      console.error("Error al guardar tarifa:", err);
    }
  };

  const isLoading = parkingLoading || ratesLoading;

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando tarifas...</p>
        </div>
      </div>
    );
  }

  if (!currentParkingLot) {
    return (
      <div className="w-full min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">No tenés un estacionamiento registrado.</p>
          <button 
            onClick={() => window.location.href = '/create-company'}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-xl"
          >
            Crear estacionamiento
          </button>
        </div>
      </div>
    );
  }

  const selectedVehicleInfo = selectedVehicleType ? vehicleConfig[selectedVehicleType] : null;
  const selectedRate = selectedVehicleType ? rates.find(r => r.vehicleType === selectedVehicleType) : null;
  const isEditing = selectedRate !== null;

  return (
    <div className="w-full min-h-screen bg-slate-100 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION IZQUIERDA - Editar/Crear tarifa */}
        <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {isEditing ? "Editar tarifa" : "Crear nueva tarifa"}
            </h2>

            {/* SELECTOR DE VEHÍCULO */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Seleccionar vehículo
              </label>
              
              <select
                value={selectedVehicleType || ""}
                onChange={(e) => handleVehicleSelect(e.target.value as UserVehicleType)}
                className="w-full h-12 rounded-xl border border-slate-300 px-4 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Seleccione un vehículo --</option>
                {vehicleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* VEHÍCULO SELECCIONADO */}
            {/* {selectedVehicleType && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Vehículo seleccionado
                </label>
                <div className="w-full h-12 rounded-xl border border-slate-300 bg-slate-100 px-4 flex items-center gap-3 text-slate-700">
                  {selectedVehicleInfo?.icon}
                  <span>{selectedVehicleInfo?.name}</span>
                </div>
              </div>
            )} */}

            {/* TARIFA ACTUAL (solo si existe) */}
            {selectedRate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Tarifa actual
                </label>
                <div className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 flex items-center text-slate-700">
                  ${selectedRate.pricePerHour} / hora
                </div>
              </div>
            )}

            {/* NUEVA TARIFA */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                {isEditing ? "Nueva tarifa por hora ($)" : "Tarifa por hora ($)"}
              </label>

              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(e.target.value)}
                  disabled={!selectedVehicleType}
                  className="w-full h-12 rounded-xl border border-slate-300 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="Ingrese la tarifa"
                />
              </div>
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex justify-between mt-10">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl transition"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>

            <button
              onClick={handleConfirm}
              disabled={!selectedVehicleType || !editedPrice}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl transition"
            >
              <Check className="w-4 h-4" />
              {isEditing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </section>

        {/* SECTION DERECHA - Lista de tarifas */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            Tarifas registradas
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {rates.map((rate) => {
              const vehicleInfo = vehicleConfig[rate.vehicleType];
              return (
                <div
                  key={rate.id}
                  className="w-full border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                      {vehicleInfo?.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {vehicleInfo?.name}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        ${rate.pricePerHour} / hora
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVehicleSelect(rate.vehicleType)}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {rates.length === 0 && !isLoading && (
              <div className="text-center py-8 text-slate-500">
                No hay tarifas configuradas. Seleccione un vehículo y cree una.
              </div>
            )}
          </div>
        </section>

        {/* TOAST DE ÉXITO */}
        {showToast && (
          <div
            className="
              fixed
              top-6
              right-6
              z-50
              bg-emerald-500
              text-white
              px-5
              py-3
              rounded-xl
              shadow-lg
              flex
              items-center
              gap-3
              animate-in
              fade-in
              slide-in-from-right-5
              duration-300
            "
          >
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">¡Éxito!</p>
              <p className="text-sm text-emerald-100">{toastMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}