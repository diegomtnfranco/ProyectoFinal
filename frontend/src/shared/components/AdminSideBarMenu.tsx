import {
  Building2,
  Users,
  ClipboardList,
  Settings,
  LogOut
} from 'lucide-react'

import { NavLink } from 'react-router-dom'

function AdminSideBarMenu() {
  const menuItems = [
    {
      title: 'Estacionamientos',
      icon: <Building2 size={20} />,
      path: '/admin/companies'
    },
      {
      title: 'Altas',
      icon: <Building2 size={20} />,
      path: '/admin/actives'
    },
    {
      title: 'Usuarios',
      icon: <Users size={20} />,
      path: '/admin/users'
    },
    {
      title: 'Configuración',
      icon: <Settings size={20} />,
      path: '/admin/settings'
    }
  ]

  return (
    <aside className="w-full
    md:w-[280px]
    rounded-xl
    bg-white
    shadow-sm
    border
    border-gray-200
    p-4
    flex
    flex-col
    justify-between">
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 transition-all
              ${
                isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-700'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
  )
}

export default AdminSideBarMenu