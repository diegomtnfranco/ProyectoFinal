import {
  ParkingMeter,
  Receipt,
  UserRoundCog,
  Users,
  type LucideIcon
} from 'lucide-react'

export const ownerMenu: OwnerMenuItem[] = [
  {
    name: 'Espacios',
    path: '/owner/parking',
    icon: ParkingMeter,
  },
  {
    name: 'Tarifas',
    path: '/owner/rates',
    icon: Receipt,
  },
  {
    name: 'Usuarios y accesos',
    path: '/owner/users',
    icon: UserRoundCog,
  },
  {
    name: 'Empleados',
    path: '/owner/employees',
    icon: Users,
  },
]