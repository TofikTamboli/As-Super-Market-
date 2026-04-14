/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Storefront from './pages/Storefront';
import Dashboard from './pages/Dashboard';

const Forbidden = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-background p-4 text-center">
    <h1 className="text-6xl font-bold text-primary mb-4">403</h1>
    <p className="text-xl text-text-main/60 mb-8">Access Denied. You don't have permission to view this page.</p>
    <Navigate to="/" />
  </div>
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'admin' | 'client' }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>;
  
  if (!user) return <Navigate to="/" />;
  
  if (role === 'admin' && !isAdmin) return <Navigate to="/403" />;
  
  return <>{children}</>;
};

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, isAdmin } = useAuth();
  
  if (loading) return null;
  if (user && profile) {
    // Double check admin email for immediate redirection
    const isAdminEmail = user.email === "mhasifshaikh7028@gmail.com";
    if (isAdmin || isAdminEmail) return <Navigate to="/dashboard" />;
    return <Navigate to="/storefront" />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AuthRedirect><Login /></AuthRedirect>} />
          <Route 
            path="/storefront" 
            element={
              <ProtectedRoute role="client">
                <Storefront />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute role="admin">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/403" element={<Forbidden />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
