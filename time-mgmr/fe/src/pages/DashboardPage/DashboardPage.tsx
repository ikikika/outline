/**
 * Dashboard Page Component
 * Protected page for authenticated users
 */

import React from 'react';
import { MainLayout } from '@/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAuthContext } from '@/app/providers/auth';
import styles from './DashboardPage.module.scss';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthContext();

  return (
    <MainLayout>
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Dashboard</h1>

        <div className={styles.grid}>
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Hello, <strong>{user?.displayName || user?.name}</strong>! Welcome
                to your dashboard.
              </p>
            </CardContent>
          </Card>

          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.info}>
                <p>
                  <strong>Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>Role:</strong> {user?.role}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p>More features coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
