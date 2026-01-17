import { useNotificationStore, NotificationType } from '@/stores/useNotificationStore';

export function showToast(message: string, type: NotificationType = 'success') {
    useNotificationStore.getState().show(message, type);
    console.log(`[Toast ${type}] ${message}`);
}
