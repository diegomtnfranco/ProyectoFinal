import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_WS_URL:', import.meta.env.VITE_WS_URL);
console.log('All env:', import.meta.env);
ReactDOM.createRoot(document.getElementById('root')!).render(
  
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)