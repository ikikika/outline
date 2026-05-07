/**
 * Header Organism Component
 * Reads auth state from AuthContext — no prop drilling required.
 */

import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Moon, PanelLeft, Sun, UserRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthContext } from '@/app/providers/auth';
import { useThemeContext } from '@/app/providers/theme';
import { useSidebarLayout } from '@/components/organisms/Sidebar/SidebarLayoutContext';
import { ROUTES } from '@/app/routes/routes';
import { APP_NAME } from '@/core/constants/app';
import styles from './Header.module.scss';

export const Header: React.FC = () => {
  const { user, logout } = useAuthContext();
  const { resolvedTheme, toggleTheme } = useThemeContext();
  const { isOpen: sidebarOpen, isMobile, open: openSidebar } = useSidebarLayout();
  const navigate = useNavigate();
  const isDark = resolvedTheme === 'dark';

  const handleLogout = useCallback(async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }, [logout, navigate]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          {!sidebarOpen ? (
            <button
              type="button"
              className={styles.sidebarOpen}
              aria-label="Open sidebar"
              onClick={openSidebar}
            >
              {isMobile ? <Menu size={20} strokeWidth={2} /> : <PanelLeft size={20} strokeWidth={2} />}
            </button>
          ) : null}
          <Link to={user ? ROUTES.TODAY : ROUTES.HOME} className={styles.logo}>
            {APP_NAME}
          </Link>
        </div>

        {user ? (
          <div className={styles.userMenu}>
            <Button
              variant="ghost"
              size="sm"
              className={styles.actionBtn}
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} strokeWidth={2} aria-hidden /> : <Moon size={16} strokeWidth={2} aria-hidden />}
              <span className={styles.actionLabel}>{isDark ? 'Light' : 'Dark'}</span>
            </Button>
            <span className={styles.userName}>{user.displayName || user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className={styles.actionBtn}
              onClick={() => navigate(ROUTES.PROFILE)}
              aria-label="Profile"
            >
              <UserRound size={16} strokeWidth={2} aria-hidden />
              <span className={styles.actionLabel}>Profile</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={styles.actionBtn}
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut size={16} strokeWidth={2} aria-hidden />
              <span className={styles.actionLabel}>Logout</span>
            </Button>
          </div>
        ) : (
          <div className={styles.authButtons}>
            <Button
              variant="ghost"
              size="sm"
              className={styles.actionBtn}
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} strokeWidth={2} aria-hidden /> : <Moon size={16} strokeWidth={2} aria-hidden />}
              <span className={styles.actionLabel}>{isDark ? 'Light' : 'Dark'}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>
              Sign In
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
