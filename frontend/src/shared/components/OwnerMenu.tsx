import {
  ParkingMeter,
  Receipt,
  UserRoundCog,
  Users,
  type LucideIcon
} from 'lucide-react'

export interface OwnerMenuItem {
  name: string
  path: string
  icon: LucideIcon
}

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
    name: 'Empleados',
    path: '/owner/employees',
    icon: Users,
  },
]