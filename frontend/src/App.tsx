import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PageLoadingFallback } from './components/common/PageLoadingFallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy-loaded route components for optimal Lighthouse Performance & TBT reduction
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Login = React.lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const PersonalInformation = React.lazy(() => import('./pages/PersonalInformation').then((m) => ({ default: m.PersonalInformation })));
const SystemManagement = React.lazy(() => import('./pages/SystemManagement').then((m) => ({ default: m.SystemManagement })));
const HRManagement = React.lazy(() => import('./pages/HRManagement').then((m) => ({ default: m.HRManagement })));
const TimeOffLeaves = React.lazy(() => import('./pages/TimeOffLeaves').then((m) => ({ default: m.TimeOffLeaves })));
const ShiftRostering = React.lazy(() => import('./pages/ShiftRostering').then((m) => ({ default: m.ShiftRostering })));
const ShiftHandovers = React.lazy(() => import('./pages/ShiftHandovers').then((m) => ({ default: m.ShiftHandovers })));
const DailyBriefings = React.lazy(() => import('./pages/DailyBriefings').then((m) => ({ default: m.DailyBriefings })));
const DailyTasks = React.lazy(() => import('./pages/DailyTasks').then((m) => ({ default: m.DailyTasks })));
const AttendanceClock = React.lazy(() => import('./pages/AttendanceClock').then((m) => ({ default: m.AttendanceClock })));
const StaffDirectory = React.lazy(() => import('./pages/StaffDirectory').then((m) => ({ default: m.StaffDirectory })));
const PayrollManagement = React.lazy(() => import('./pages/PayrollManagement').then((m) => ({ default: m.PayrollManagement })));
const Notifications = React.lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })));

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Internal Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="admin" element={<SystemManagement />} />
              <Route path="hr" element={<HRManagement />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<PersonalInformation />} />
              <Route path="shifts" element={<ShiftRostering />} />
              <Route path="attendance" element={<AttendanceClock />} />
              <Route path="handovers" element={<ShiftHandovers />} />
              <Route path="briefings" element={<DailyBriefings />} />
              <Route path="tasks" element={<DailyTasks />} />
              <Route path="leave" element={<TimeOffLeaves />} />
              <Route path="employees" element={<StaffDirectory defaultTab="staff" />} />
              <Route path="licenses" element={<StaffDirectory defaultTab="licenses" />} />
              <Route path="payroll" element={<PayrollManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
  );
};

export default App;
