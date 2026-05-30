import { useState } from "react";

import { CheckCircle } from "lucide-react";

import {
  Car,
  Motorbike,
  Truck,
  Pencil,
  Check,
  X,
  DollarSign,
} from "lucide-react";

type VehicleType = {
  id: number;
  name: string;
  price: number;
  icon: JSX.element;
};

export default function TarifasView() {
  const initialTariffs: VehicleType[] = [
    {
      id: 1,
      name: "Auto",
      price: 500,
      icon: <Car className="w-5 h-5" />,
    },
    {
      id: 2,
      name: "Moto",
      price: 300,
      icon: <Motorbike className="w-5 h-5" />,
    },
    {
      id: 3,
      name: "Camioneta",
      price: 700,
      icon: <Truck className="w-5 h-5" />,
    },
  ];

  const [tariffs, setTariffs] = useState(initialTariffs);

  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleType | null>(null);

  const [editedPrice, setEditedPrice] = useState("");

  const handleEdit = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
    setEditedPrice(vehicle.price.toString());
  };

  const handleCancel = () => {
    setSelectedVehicle(null);
    setEditedPrice("");
  };

  const handleConfirm = () => {
  if (!selectedVehicle) return;

  const updatedTariffs = tariffs.map((vehicle) =>
    vehicle.id === selectedVehicle.id
      ? {
          ...vehicle,
          price: Number(editedPrice),
        }
      : vehicle
  );

  setTariffs(updatedTariffs);

  const updatedVehicle = updatedTariffs.find(
    (v) => v.id === selectedVehicle.id
  );

  setSelectedVehicle(updatedVehicle || null);

  // Mostrar toast
  setShowToast(true);

  setTimeout(() => {
    setShowToast(false);
  }, 5000);
};

  const [showToast, setShowToast] = useState(false);
  return (
    <div className="w-full min-h-screen bg-slate-100 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION IZQUIERDA */}
        <section className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Editar tarifa
            </h2>

            {/* VEHICULO */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Vehículo seleccionado
              </label>

              <div className="w-full h-12 rounded-xl border border-slate-300 bg-slate-100 px-4 flex items-center gap-3 text-slate-700">
                {selectedVehicle?.icon}

                <span>
                  {selectedVehicle
                    ? selectedVehicle.name
                    : "Seleccione un vehículo"}
                </span>
              </div>
            </div>

            {/* TARIFA */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Tarifa
              </label>

              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />

                <input
                  type="number"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(e.target.value)}
                  disabled={!selectedVehicle}
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
              disabled={!selectedVehicle}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl transition"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </section>

        {/* SECTION DERECHA */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            Tarifas registradas
          </h2>

          <div className="space-y-4">
            {tariffs.map((vehicle) => (
              <div
                key={vehicle.id}
                className="w-full border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-700">
                    {vehicle.icon}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {vehicle.name}
                    </h3>

                    <p className="text-slate-500 text-sm">
                      ${vehicle.price}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleEdit(vehicle)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
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
      <p className="font-semibold">Tarifa actualizada</p>
      <p className="text-sm text-emerald-100">
        Los cambios fueron guardados correctamente.
      </p>
    </div>
  </div>
)}
      </div>
    </div>
  );
}