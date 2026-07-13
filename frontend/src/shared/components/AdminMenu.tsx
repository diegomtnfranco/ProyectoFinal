
import {
  Building2,
  Users,
  Settings,
  type LucideIcon
} from 'lucide-react'

export interface AdminMenuItem {
  name: string
  path: string
  icon: LucideIcon
}

export const adminMenu: AdminMenuItem[] = [
  {
    name: 'Estacionamientos',
    path: '/admin/companies',
    icon: Building2,
  },
  {
    name: 'Altas',
    path: '/admin/actives',
    icon: Building2,
  },
  {
    name: 'Usuarios',
    path: '/admin/users',
    icon: Users,
  },
  {
    name: 'Configuración',
    path: '/admin/settings',
    icon: Settings,
  },
]