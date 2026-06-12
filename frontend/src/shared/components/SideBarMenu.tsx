import { NavLink } from 'react-router-dom'
import { ownerMenu } from './OwnerMenu'


const SideBarMenu = () => {
  return (
    <aside
      className="
        w-full
        md:w-[280px]
        rounded-xl
        bg-white
        shadow-sm
        border
        border-gray-200
        p-4
        flex
        flex-col
      "
    >
      <nav className="flex flex-col gap-2">
        {ownerMenu.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                flex
                items-center
                gap-3
                rounded-lg
                px-4
                py-3
                transition-all
                ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'hover:bg-gray-100 text-gray-700'
                }
              `
              }
            >
              <Icon size={20} />

              <span className="font-medium">
                {item.name}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default SideBarMenu
