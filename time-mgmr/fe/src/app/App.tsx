/**
 * App — sets up the router and top-level providers.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/auth';
import { ThemeProvider } from '@/app/providers/theme';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import { ROUTES } from '@/app/routes/routes';
import { Loading } from '@/components/molecules/Loading/Loading';
import '@/styles/tailwind.css';
import '@/styles/index.scss';

const LandingPage = lazy(() =>
  import('@/pages/LandingPage/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const TimetablePage = lazy(() =>
  import('@/pages/TimetablePage/TimetablePage').then((m) => ({ default: m.TimetablePage }))
);
const ActivitiesPage = lazy(() =>
  import('@/pages/ActivitiesPage/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage }))
);
const ReportPage = lazy(() =>
  import('@/pages/ReportPage/ReportPage').then((m) => ({ default: m.ReportPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage/ProfilePage').then((m) => ({
    default: m.ProfilePage,
  }))
);

const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <Suspense fallback={<Loading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTES.TIMETABLE,
        element: (
          <Suspense fallback={<Loading />}>
            <TimetablePage />
          </Suspense>
        ),
      },
      {
        path: '/today',
        element: <Navigate to={ROUTES.TIMETABLE} replace />,
      },
      {
        path: ROUTES.ACTIVITIES,
        element: (
          <Suspense fallback={<Loading />}>
            <ActivitiesPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.REPORT,
        element: (
          <Suspense fallback={<Loading />}>
            <ReportPage />
          </Suspense>
        ),
      },
      {
        path: ROUTES.DASHBOARD,
        element: <Navigate to={ROUTES.TIMETABLE} replace />,
      },
      {
        path: ROUTES.PROFILE,
        element: (
          <Suspense fallback={<Loading />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: ROUTES.HOME,
    element: (
      <Suspense fallback={<Loading />}>
        <LandingPage />
      </Suspense>
    ),
  },
  { path: ROUTES.NOT_FOUND, element: <Navigate to={ROUTES.HOME} replace /> },
]);

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
