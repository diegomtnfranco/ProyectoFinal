import {
  MapPin,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

export interface ClientMenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

export const clientMenu: ClientMenuItem[] = [
  {
    name: "Estacionamientos",
    path: "/client",
    icon: MapPin,
  },
  {
    name: "Mis reservas",
    path: "/client/my-reservations",
    icon: CalendarCheck,
  },
];