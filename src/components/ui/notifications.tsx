'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    CheckCircle,
    AlertTriangle,
    Info,
    X,
    AlertCircle
} from 'lucide-react';
import React, { createContext, useContext, useReducer } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationState {
    notifications: Notification[];
}

type NotificationAction =
    | { type: 'ADD_NOTIFICATION'; notification: Notification }
    | { type: 'REMOVE_NOTIFICATION'; id: string };

const NotificationContext = createContext<{
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
} | null>(null);

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
    switch (action.type) {
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [...state.notifications, action.notification]
            };
        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.id)
            };
        default:
            return state;
    }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(notificationReducer, { notifications: [] });

    const addNotification = (notification: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newNotification = { ...notification, id };

        dispatch({ type: 'ADD_NOTIFICATION', notification: newNotification });

        // Auto-remove after duration (default 5 seconds)
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                dispatch({ type: 'REMOVE_NOTIFICATION', id });
            }, duration);
        }
    };

    const removeNotification = (id: string) => {
        dispatch({ type: 'REMOVE_NOTIFICATION', id });
    };

    return (
        <NotificationContext.Provider value={{
            notifications: state.notifications,
            addNotification,
            removeNotification
        }}>
            {children}
            <NotificationContainer />
        </NotificationContext.Provider>
    );
}

function NotificationContainer() {
    const context = useContext(NotificationContext);
    if (!context) return null;

    const { notifications, removeNotification } = context;

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
}

function NotificationItem({
    notification,
    onRemove
}: {
    notification: Notification;
    onRemove: () => void;
}) {
    const iconMap = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const colorMap = {
        success: 'border-green-200 bg-green-50 text-green-800',
        error: 'border-red-200 bg-red-50 text-red-800',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
    };

    const IconComponent = iconMap[notification.type];

    return (
        <div className={cn(
            "relative p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full",
            colorMap[notification.type]
        )}>
            <div className="flex items-start gap-3">
                <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {notification.message && (
                        <p className="text-sm opacity-90 mt-1">{notification.message}</p>
                    )}
                    {notification.action && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-auto p-1 text-xs hover:bg-black/10"
                            onClick={notification.action.onClick}
                        >
                            {notification.action.label}
                        </Button>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-black/10"
                    onClick={onRemove}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}