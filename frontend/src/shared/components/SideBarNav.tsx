import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';

export interface SideBarNavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const STORAGE_KEY = 'sidebar:collapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Menú lateral de escritorio (dueño y empleado).
 * Se puede contraer para mostrar solo los íconos; el contenido de la página
 * (flex-1) ocupa el espacio liberado, y las tarjetas de lugares —que escalan
 * con el ancho de su recuadro— se agrandan solas.
 * El estado se recuerda entre visitas.
 */
function SideBarNav({ items }: { items: SideBarNavItem[] }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // sin storage: funciona igual en memoria
      }
      return next;
    });
  };

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const fade = `overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300 ease-out motion-reduce:transition-none ${
    collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
  }`;

  return (
    <aside
      className={`flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm
        transition-[width] duration-300 ease-out motion-reduce:transition-none
        ${collapsed ? 'md:w-[74px]' : 'md:w-[280px]'}`}
    >
      {/* Botón contraer / expandir (solo escritorio: el menú no se muestra en mobile) */}
      <div className="mb-2 flex items-center justify-between">
        <span className={fade}>
          <span className="block pl-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">Menú</span>
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-lg text-gray-500
            transition-[background-color,color,transform] duration-150 ease-out
            hover:bg-gray-100 hover:text-gray-900 active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300
            motion-reduce:transition-none"
        >
          <ToggleIcon size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              aria-label={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group/nav flex h-12 items-center gap-3 rounded-lg px-3.5
                transition-[background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300
                ${isActive ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`
              }
            >
              <Icon
                size={20}
                className="flex-none transition-transform duration-200 ease-out group-hover/nav:scale-110 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <span className={`font-medium ${fade}`}>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default SideBarNav;
