import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
import {
  SidebarLayoutProvider,
  useSidebarLayout,
} from '@/components/organisms/Sidebar/SidebarLayoutContext';
import './ProtectedLayout.css';

const ProtectedLayoutShell: React.FC = () => {
  const { isOpen, isMobile, close } = useSidebarLayout();

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

      <main className="protected-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

/**
 * ProtectedLayout — wraps authenticated routes with a sidebar + main content area.
 */
export const ProtectedLayout: React.FC = () => (
  <SidebarLayoutProvider>
    <ProtectedLayoutShell />
  </SidebarLayoutProvider>
);
