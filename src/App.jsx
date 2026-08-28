import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Catalog from './Catalog.jsx'

export default function App() {
  return (
    <Routes>
      {/* 고객 공개용: 로그인 게이트웨이 없이 곧바로 카탈로그 노출 */}
      <Route path="/" element={<Catalog />} />
      <Route path="*" element={<Catalog />} />
    </Routes>
  )
}
