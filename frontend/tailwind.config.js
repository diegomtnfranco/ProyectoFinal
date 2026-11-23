import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    //require('daisyui'),
    // Variantes por ancho del contenedor (no de la pantalla): cq-sm:, cq-md:, cq-lg:
    // Se usan dentro de un elemento con [container-type:inline-size] (ej. los bloques
    // de Configuración), así el formulario se adapta cuando se contrae el menú lateral.
    plugin(({ addVariant }) => {
      addVariant('cq-sm', '@container (min-width: 560px)')
      addVariant('cq-md', '@container (min-width: 760px)')
      addVariant('cq-lg', '@container (min-width: 1000px)')
    }),
  ],
}
