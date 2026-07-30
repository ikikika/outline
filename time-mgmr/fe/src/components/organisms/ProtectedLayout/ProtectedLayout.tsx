import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes/routes';
import { Header } from '@/components/organisms/Header/Header';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
import {
  SidebarLayoutProvider,
  useSidebarLayout,
} from '@/components/organisms/Sidebar/SidebarLayoutContext';
import { APP_NAME } from '@/core/constants/app';
import './ProtectedLayout.css';

const ProtectedLayoutShell: React.FC = () => {
  const { isOpen, isMobile, close } = useSidebarLayout();
  const { pathname } = useLocation();
  const lockViewportScroll = pathname === ROUTES.TIMETABLE;

  return (
    <div
      className={`protected-layout ${isOpen ? 'protected-layout--sidebar-open' : 'protected-layout--sidebar-closed'}`}
    >
      <Sidebar />

      {isMobile && isOpen ? (
        <button
          type="button"
          className="protected-layout__backdrop"
          aria-label="Close sidebar"
          onClick={close}
        />
      ) : null}

      <div className="protected-layout__content">
        <Header />
        <main
          className={`protected-layout__main${lockViewportScroll ? ' protected-layout__main--locked' : ''}`}
        >
          <div
            className={`protected-layout__container${lockViewportScroll ? ' protected-layout__container--locked' : ''}`}
          >
            <Outlet />
          </div>
        </main>
        <footer className="protected-layout__footer">
          <div className="protected-layout__footer-inner">
            <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

/**
 * ProtectedLayout — authenticated shell: sidebar + header + page outlet.
 */
export const ProtectedLayout: React.FC = () => (
  <SidebarLayoutProvider>
    <ProtectedLayoutShell />
  </SidebarLayoutProvider>
);
