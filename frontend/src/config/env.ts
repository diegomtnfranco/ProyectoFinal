export const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || window.location.origin,
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN ?? ''
};
