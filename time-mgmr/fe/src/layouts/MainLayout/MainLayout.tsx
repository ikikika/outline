/**
 * MainLayout Template
 * Delegates auth display to Header (which reads from AuthContext).
 * Only responsible for page structure.
 */

import React from 'react';
import { Header } from '@/components/organisms';
import { APP_NAME } from '@/core/constants/app';
import styles from './MainLayout.module.scss';

interface IMainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<IMainLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
