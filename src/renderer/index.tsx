import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const isOverlay = new URLSearchParams(window.location.search).get('overlay') === '1'
if (isOverlay) document.body.classList.add('overlay')

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App isOverlay={isOverlay} />
  </React.StrictMode>
)
