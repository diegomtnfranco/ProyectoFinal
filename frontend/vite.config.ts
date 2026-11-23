import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],

server: {
  host: true,          // escucha también en la red local (192.168.x.x)
  allowedHosts: true,  // acepta el host del túnel de cloudflared
  // Todo lo que vaya a /api y /socket.io se reenvía al backend local.
  // Así el celular solo necesita la URL del túnel del frontend.
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true,
    },
  },
}
})
