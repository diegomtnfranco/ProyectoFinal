import { Check, X } from "lucide-react";

function ReservationPanel() {

  const reservations = [
    {
      id: 1,
      username: "Juan Pérez",
      vehicle: "Auto",
      start: "08:00",
      end: "12:00",
      
      image: "https://i.pravatar.cc/100?img=12"
    },

    {
      id: 2,
      username: "María Gómez",
      vehicle: "Moto",
      start: "14:00",
      end: "18:00",
      
      image: "https://i.pravatar.cc/100?img=32"
    },

    {
      id: 3,
      username: "Carlos Ruiz",
      vehicle: "Camioneta",
      start: "19:00",
      end: "22:00",
      
      image: "https://i.pravatar.cc/100?img=15"
    }
  ];

  return (

    <div className="w-2/6 rounded-md border border-slate-200 bg-white shadow-sm p-4 min-h-[350px]">

      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Solicitudes de Reserva
      </h2>

      <div className="space-y-4">

        {reservations.map((reservation) => (

          <div
            key={reservation.id}
            className="border border-slate-200 rounded-xl p-4 shadow-sm"
          >

            <div className="flex items-center gap-3">

              <img
                src={reservation.image}
                alt={reservation.username}
                className="w-14 h-14 rounded-full object-cover"
              />

              <div>

                <h3 className="font-semibold text-slate-800">
                  {reservation.username}
                </h3>

                <p className="text-sm text-slate-500">
                  {reservation.vehicle}
                </p>

              </div>

            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-600">

              <p>
                Inicio:
                <span className="font-medium ml-1">
                  {reservation.start}
                </span>
              </p>

              <p>
                Fin:
                <span className="font-medium ml-1">
                  {reservation.end}
                </span>
              </p>

              <p>
                Espacio:
                <span className="font-medium ml-1">
                  {reservation.space}
                </span>
              </p>

            </div>

            <div className="mt-4 flex gap-2">

              <button className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm transition">

                <Check size={16} />

                Aprobar

              </button>

              <button className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition">

                <X size={16} />

                Rechazar

              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );
}

export default ReservationPanel;