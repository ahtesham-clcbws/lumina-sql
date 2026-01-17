import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useNotificationStore, NotificationType } from '@/stores/useNotificationStore';

const ICON_MAP = {
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

export function Toast({ id, message, type, duration = 5000, onDismiss }: { id: string, message: string, type: NotificationType, duration?: number, onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const { icon: Icon, color, bg, border } = ICON_MAP[type];

  useEffect(() => {
    if (duration <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className={`w-80 glass-panel p-4 flex gap-4 items-start relative overflow-hidden animate-in slide-in-from-right duration-300 ${border}`}>
      <div className={`p-2 rounded-lg ${bg} ${color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      <button 
        onClick={() => onDismiss(id)}
        className="absolute top-4 right-4 opacity-40 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
      
      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 transition-all duration-10 linear" style={{ width: `${progress}%`, color: 'var(--primary)' }} />
      )}
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, dismiss } = useNotificationStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast {...n} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
