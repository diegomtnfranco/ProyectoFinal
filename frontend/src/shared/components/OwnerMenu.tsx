import {
  ParkingMeter,
  QrCode,
  Receipt,
  Users,
  Settings,
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
  {
  name: 'Códigos QR',
  path: '/owner/qr',
  icon: QrCode,
},
{ 
    name: 'Configuración',
    path: '/owner/settings',
    icon: Settings,
  }
]