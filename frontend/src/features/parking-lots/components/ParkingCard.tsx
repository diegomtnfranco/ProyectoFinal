import { useEffect } from "react";
import type { ParkingLotNearbyResponseDto } from "../../../types/parking.types";
import {
  MapPin,
  Clock3,
  CircleDot,
  Star,
  Navigation,
  ChevronRight,
  CircleParking,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import OccupancyAlertButton from "./OccupancyAlertButton";
import { vehicleTypeInfo } from "../../../shared/components/activity/activity.utils";
import { useAuthStore } from "../../../stores/authStore";
import { useClientVehiclesStore } from "../../../stores/clientVehiclesStore";
import { recommendRates } from "../utils/rateRecommendations";

interface Props {
  parking: ParkingLotNearbyResponseDto;
  isClosest?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);

/** "08:00:00" → "08:00" */
const shortTime = (time: string) => (time ? time.slice(0, 5) : "--:--");

const vehicleLabel = (type: string) => vehicleTypeInfo[type]?.label ?? type;

/**
 * Tipos de vehículo registrados por el cliente, o null si no hay que personalizar
 * (sin sesión o error al cargar). 'loading' mientras se obtienen.
 */
function useRegisteredVehicleTypes(): string[] | null | "loading" {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const loadedFor = useClientVehiclesStore((s) => s.userId);
  const status = useClientVehiclesStore((s) => s.status);
  const vehicles = useClientVehiclesStore((s) => s.vehicles);
  const load = useClientVehiclesStore((s) => s.load);

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  if (!userId) return null;
  if (loadedFor !== userId || status === "idle" || status === "loading")
    return "loading";
  if (status === "error") return null;
  return vehicles.map((v) => v.vehicleType);
}

function ParkingCard({ parking, isClosest = false }: Props) {
  const navigate = useNavigate();
  const available = parking.availability.available;
  const total = parking.availability.total;
  const occupancyPercentage =
    total > 0 ? ((total - available) / total) * 100 : 0;
  const isFull = available <= 0;

  const registeredTypes = useRegisteredVehicleTypes();
  const recommendation =
    registeredTypes === "loading"
      ? null
      : recommendRates(parking.rates, registeredTypes);
  const personalized =
    Array.isArray(registeredTypes) && registeredTypes.length > 0;

  const distanceText =
    parking.distance >= 1000
      ? `${(parking.distance / 1000).toFixed(1)} km`
      : `${Math.round(parking.distance)} m`;

  const getOccupancyColor = () => {
    if (occupancyPercentage < 50) return "text-green-600";
    if (occupancyPercentage < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const openDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${parking.latitude},${parking.longitude}`,
      "_blank",
    );
  };

  const renderRates = () => {
    if (!recommendation) {
      return (
        <div
          className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
          aria-busy="true"
          aria-label="Cargando tarifas"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 sm:h-8 sm:w-32 sm:rounded-full"
            />
          ))}
        </div>
      );
    }

    if (recommendation.mode === "no-match") {
      return (
        <p className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            No hay tarifas para tus vehículos registrados (
            {recommendation.registeredTypes.map(vehicleLabel).join(", ")}).
          </span>
        </p>
      );
    }

    if (recommendation.rates.length === 0) {
      return <p className="text-xs text-gray-400">Consultar tarifas</p>;
    }

    return (
      <ul className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {recommendation.rates.map((rate) => {
          const info = vehicleTypeInfo[rate.vehicleType];
          const Icon = info?.icon ?? CircleParking;
          return (
            <li
              key={rate.id}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-1"
            >
              <Icon
                size={16}
                className="shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <span className="truncate text-[11px] text-gray-600 sm:text-xs">
                {vehicleLabel(rate.vehicleType)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(rate.price)}
                <span className="ml-0.5 text-[10px] font-normal text-gray-400">
                  /h
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  const ratesTitle =
    recommendation && personalized && recommendation.mode !== "all"
      ? "Tarifas para tus vehículos"
      : "Tarifas por hora";

  return (
    <article className="relative overflow-hidden rounded-3xl bg-white shadow-md transition-shadow hover:shadow-lg md:flex">
      {/* Campana (nivel 3): discreta, arriba a la derecha (sobre la imagen en móvil) */}
      <div className="absolute right-3 top-3 z-10">
        <OccupancyAlertButton
          parkingLotId={parking.id}
          parkingLotName={parking.name}
          variant="compact"
        />
      </div>

      {/* Imagen */}
      <div className="relative h-44 w-full shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 sm:h-52 md:h-auto md:min-h-56 md:w-64 lg:w-72">
        {parking.imageUrl ? (
          <img
            src={parking.imageUrl}
            alt={parking.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/90">
            <CircleParking size={64} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
              isFull ? "bg-red-600 text-white" : "bg-green-600 text-white"
            }`}
          >
            {isFull ? "Completo" : "Disponible"}
          </span>
          {isClosest && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700 shadow-sm">
              <Star size={12} />
              Más cercano
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5 md:p-6">
        <div className="min-w-0 md:pr-12">
          <h2 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">
            {parking.name}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{parking.address}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Navigation size={14} />
              {distanceText}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 size={14} />
              {shortTime(parking.openTime)} - {shortTime(parking.closeTime)} hs
            </span>
          </div>
        </div>

        <section aria-label={ratesTitle}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {ratesTitle}
          </p>
          {renderRates()}
        </section>

        <div className="mt-auto flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {!isFull ? (
              <>
                <span
                  className={`flex items-center gap-2 font-semibold ${getOccupancyColor()}`}
                >
                  <CircleDot size={16} />
                  {available === total
                    ? "Hay lugar"
                    : available > total * 0.3
                      ? "Disponible"
                      : "Últimos lugares"}
                </span>
                <p className="text-sm text-gray-500">
                  {available} de {total} lugares libres
                  <span className="ml-1 text-xs">
                    ({Math.round((available / total) * 100)}% disponible)
                  </span>
                </p>
              </>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-red-600">
                <CircleDot size={16} />
                Completamente lleno
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            {/* Nivel 2: secundaria */}
            <button
              type="button"
              onClick={openDirections}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
            >
              <Navigation size={16} />
              Cómo llegar
            </button>
            {/* Nivel 1: principal */}
            <button
              type="button"
              onClick={() => navigate(`/client/parking-lots/${parking.id}`)}
              className="flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              Ver más
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ParkingCard;
