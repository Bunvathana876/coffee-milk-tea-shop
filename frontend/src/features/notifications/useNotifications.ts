import { createContext, useContext } from 'react';
import type { CustomerNotification } from '../../types';

export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';

export interface NotificationContextType {
  notifications: CustomerNotification[];
  unreadCount: number;
  activeAlerts: CustomerNotification[];
  isLoading: boolean;
  isLiveConnected: boolean;
  soundEnabled: boolean;
  browserPermission: BrowserNotificationPermissionState;
  lastOrderEventAt: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissAlert: (notificationId: number, markRead?: boolean) => void;
  toggleSound: () => void;
  requestBrowserPermission: () => Promise<BrowserNotificationPermissionState>;
}

const noopAsync = async () => {};

const defaultNotificationContext: NotificationContextType = {
  notifications: [],
  unreadCount: 0,
  activeAlerts: [],
  isLoading: false,
  isLiveConnected: false,
  soundEnabled: true,
  browserPermission: 'unsupported',
  lastOrderEventAt: 0,
  refreshNotifications: noopAsync,
  markAsRead: noopAsync,
  markAllAsRead: noopAsync,
  dismissAlert: () => {},
  toggleSound: () => {},
  requestBrowserPermission: async () => 'unsupported',
};

export const NotificationContext = createContext<NotificationContextType>(
  defaultNotificationContext,
);

export function useNotifications(): NotificationContextType {
  return useContext(NotificationContext);
}
