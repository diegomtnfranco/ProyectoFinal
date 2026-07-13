import {
    ParkingMeter,
    QrCode,
    Receipt,
    type LucideIcon
} from 'lucide-react'

export interface employeeMenuItem {
    name: string
    path: string
    icon: LucideIcon
}

export const employeeMenu: employeeMenuItem[] = [
  {
    name: 'Espacios',
    path: '/employee/parking',
    icon: ParkingMeter,
  },
  {
    name: 'Tarifas',
    path: '/employee/rates',
    icon: Receipt,
  },
  {
  name: 'Códigos QR',
  path: '/employee/qr',
  icon: QrCode,
},
// { 
//     name: 'Configuración',
//     path: '/owner/settings',
//     icon: Settings,
//   }
]