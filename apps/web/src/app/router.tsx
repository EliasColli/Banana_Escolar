import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { HomeRedirect, ProtectedRoute } from '@/features/auth/protected-route';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { NewReportPage } from '@/features/reports/pages/NewReportPage';
import { ReportDetailPage } from '@/features/reports/pages/ReportDetailPage';
import {
  AdminHistoryPage,
  MyReportsPage,
  TechnicianInboxPage,
} from '@/features/reports/pages/ReportsListPage';
import { UsersPage } from '@/features/users/pages/UsersPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            element: <ProtectedRoute roles={['USUARIO']} />,
            children: [{ path: 'reports', element: <MyReportsPage /> }],
          },
          {
            element: <ProtectedRoute roles={['USUARIO', 'ADMIN']} />,
            children: [{ path: 'reports/new', element: <NewReportPage /> }],
          },
          { path: 'reports/:id', element: <ReportDetailPage /> },
          {
            element: <ProtectedRoute roles={['ADMIN']} />,
            children: [
              { path: 'history', element: <AdminHistoryPage /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'users', element: <UsersPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['TECNICO']} />,
            children: [{ path: 'inbox', element: <TechnicianInboxPage /> }],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
