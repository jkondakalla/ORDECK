import React from 'react'
import LazurosWidget from '@hub/lazuros'

const API_URL = import.meta.env.VITE_LAZUROS_API_URL ?? 'http://localhost:8080'

export default function Widget() {
  return <LazurosWidget apiUrl={API_URL} />
}
