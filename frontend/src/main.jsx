import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/i18n'
import './index.css'
import App from './App'

// Set initial direction
const lang = localStorage.getItem('lang') || 'he'
document.documentElement.lang = lang
document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
