import React from 'react'
import App from '@hub/beigeboard'

const API_URL = import.meta.env.VITE_BEIGEBOARD_API_URL ?? 'http://localhost:8003'

export default function Widget() {
  return <App apiUrl={API_URL} />
}
