import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import {
	canEnablePushOnThisDevice,
	getExistingPushSubscription,
	isIosDevice,
	isPushSupported,
	isStandaloneDisplayMode,
	sendTestPush,
	subscribeToPush,
	unsubscribeFromPush,
} from '@/features/notifications';
import styles from '../ProfilePage.module.scss';

export const NotificationsTab: React.FC = () => {
	const [checking, setChecking] = useState(true);
	const [enabled, setEnabled] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const refreshStatus = useCallback(async () => {
		setChecking(true);
		setError(null);
		try {
			if (!isPushSupported()) {
				setEnabled(false);
				return;
			}
			const subscription = await getExistingPushSubscription();
			setEnabled(Boolean(subscription));
		} catch {
			setEnabled(false);
		} finally {
			setChecking(false);
		}
	}, []);

	useEffect(() => {
		void refreshStatus();
	}, [refreshStatus]);

	const handleEnable = async () => {
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			await subscribeToPush();
			setEnabled(true);
			setMessage('Push notifications enabled on this device.');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to enable notifications'
			);
		} finally {
			setBusy(false);
		}
	};

	const handleDisable = async () => {
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			await unsubscribeFromPush();
			setEnabled(false);
			setMessage('Push notifications disabled on this device.');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to disable notifications'
			);
		} finally {
			setBusy(false);
		}
	};

	const handleTest = async () => {
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			await sendTestPush();
			setMessage('Test notification sent. Check your notification tray.');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to send test notification'
			);
		} finally {
			setBusy(false);
		}
	};

	const iosNeedsInstall = isIosDevice() && !isStandaloneDisplayMode();
	const unsupported = !isPushSupported();
	const canEnable = canEnablePushOnThisDevice();

	return (
		<Card className={styles.section}>
			<CardHeader>
				<CardTitle>Notifications</CardTitle>
			</CardHeader>
			<CardContent className={styles.notificationsContent}>
				{checking ? (
					<p className={styles.value}>Checking notification status…</p>
				) : unsupported ? (
					<p className={styles.value}>
						This browser does not support Web Push notifications.
					</p>
				) : iosNeedsInstall ? (
					<div className={styles.notificationsGuidance}>
						<p className={styles.value}>
							On iPhone, install Tempo to your Home Screen before enabling push
							notifications.
						</p>
						<ol className={styles.notificationsSteps}>
							<li>Open this site in Safari</li>
							<li>Tap Share, then Add to Home Screen</li>
							<li>Open Tempo from the Home Screen icon</li>
							<li>Return here and tap Enable</li>
						</ol>
					</div>
				) : (
					<>
						<div className={styles.infoField}>
							<span className={styles.label}>Status</span>
							<p className={styles.value}>
								{enabled ? 'Enabled on this device' : 'Not enabled'}
							</p>
						</div>

						<div className={styles.notificationsActions}>
							{enabled ? (
								<>
									<Button
										variant="outline"
										onClick={() => void handleDisable()}
										disabled={busy}
									>
										Disable
									</Button>
									<Button onClick={() => void handleTest()} disabled={busy}>
										Send test notification
									</Button>
								</>
							) : (
								<Button
									onClick={() => void handleEnable()}
									disabled={busy || !canEnable}
								>
									Enable notifications
								</Button>
							)}
						</div>
					</>
				)}

				{message ? <p className={styles.notificationsMessage}>{message}</p> : null}
				{error ? <p className={styles.notificationsError}>{error}</p> : null}
			</CardContent>
		</Card>
	);
};
