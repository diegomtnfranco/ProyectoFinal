import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SettingsSectionProps {
  /** Clave para recordar si el bloque quedó abierto o cerrado */
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

const storageKey = (id: string) => `settings:section:${id}`;

const readOpen = (id: string) => {
  try {
    return localStorage.getItem(storageKey(id)) !== '0';
  } catch {
    return true;
  }
};

/**
 * Bloque de la página de Configuración (Opciones generales, Tarifa nocturna, Servicios).
 * Mismo estilo para los tres: tarjeta blanca, título en negrita y descripción breve.
 * En escritorio se puede contraer/expandir; en mobile siempre se muestra abierto.
 * El contenido es un contenedor CSS: los formularios usan cq-* para adaptarse al ancho
 * disponible (por ejemplo, cuando se contrae el menú lateral).
 */
function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  const [open, setOpen] = useState(() => readOpen(id));
  const contentId = useId();

  const toggle = () =>
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey(id), next ? '1' : '0');
      } catch {
        // sin storage: funciona igual en memoria
      }
      return next;
    });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="group flex w-full items-start justify-between gap-4 rounded-2xl p-4 text-left sm:p-6
          pointer-events-none md:pointer-events-auto
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
      >
        <span className="min-w-0">
          <span className="block text-lg font-bold text-gray-900">{title}</span>
          {description && <span className="mt-1 block text-sm text-gray-900">{description}</span>}
        </span>
        <span
          className="mt-0.5 hidden h-8 w-8 flex-none items-center justify-center rounded-lg text-gray-500
            transition-[background-color,color] duration-150 ease-out group-hover:bg-gray-100 group-hover:text-gray-900 md:flex"
          aria-hidden="true"
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Cerrado solo oculta en escritorio; en mobile el contenido queda visible */}
      <div id={contentId} className={open ? 'animate-fade-in' : 'md:hidden'}>
        {/* Contenedor de referencia para las variantes cq-*: responde al ancho real del bloque */}
        <div className="border-t border-gray-100 p-4 [container-type:inline-size] sm:p-6">{children}</div>
      </div>
    </section>
  );
}

export default SettingsSection;
