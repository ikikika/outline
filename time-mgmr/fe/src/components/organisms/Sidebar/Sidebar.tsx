import React from 'react';
import { CalendarDays, ChartColumn, ListOrdered, LogOut, PanelLeftClose, UserRound } from 'lucide-react';
import { ROUTES } from '@/app/routes/routes';
import { APP_NAME } from '@/core/constants/app';
import { NavItem } from '@/components/atoms/NavItem/NavItem';
import { useAuthContext } from '@/app/providers/auth';
import { useSidebarLayout } from './SidebarLayoutContext';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthContext();
  const { close, isMobile } = useSidebarLayout();

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h1 className="sidebar__title">{APP_NAME}</h1>
        <button
          type="button"
          className="sidebar__collapse"
          aria-label="Collapse sidebar"
          onClick={close}
        >
          <PanelLeftClose size={18} strokeWidth={2} />
        </button>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation" onClick={isMobile ? close : undefined}>
        <NavItem label="Timetable" path={ROUTES.TIMETABLE} icon={<CalendarDays size={18} />} />
        <NavItem label="Activities" path={ROUTES.ACTIVITIES} icon={<ListOrdered size={18} />} />
        <NavItem label="Report" path={ROUTES.REPORT} icon={<ChartColumn size={18} />} />
        <NavItem label="Profile" path={ROUTES.PROFILE} icon={<UserRound size={18} />} />
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className="sidebar__user-name">{user?.name || 'User'}</span>
        </div>
        <button onClick={logout} className="sidebar__logout" aria-label="Logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
