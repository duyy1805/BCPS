import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { NotificationProvider } from './context/NotificationContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportList from './pages/ReportList';
import ReportCreate from './pages/ReportCreate';
import ReportDetail from './pages/ReportDetail';
import Notifications from './pages/Notifications';

function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/reports" element={<ReportList />} />
                <Route path="/reports/create" element={<ReportCreate />} />
                <Route path="/reports/:id" element={<ReportDetail />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;
