/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import PengusulDashboard from './pages/PengusulDashboard';
import VerifikatorDashboard from './pages/VerifikatorDashboard';
import BapperidaDashboard from './pages/BapperidaDashboard';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/" replace />;
  
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<Layout />}>
          <Route path="/pengusul" element={
            <ProtectedRoute allowedRoles={['pengusul']}>
              <PengusulDashboard />
            </ProtectedRoute>
          } />
          <Route path="/verifikator" element={
            <ProtectedRoute allowedRoles={['verifikator']}>
              <VerifikatorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/bapperida" element={
            <ProtectedRoute allowedRoles={['bapperida']}>
              <BapperidaDashboard />
            </ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
