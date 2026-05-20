import { Rate } from '../types/parking.types';

export function calculatePrice(rate: Rate, hours: number) {
  return Math.max(0, rate.pricePerHour * hours);
}

export function getRateForVehicle(rates: Rate[], vehicleType: string) {
  return rates.find((rate) => rate.vehicleType === vehicleType) ?? null;
}
