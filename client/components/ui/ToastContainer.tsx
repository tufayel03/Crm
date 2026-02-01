
import React from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} />;
      case 'error': return <AlertCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success': return 'bg-white border-l-4 border-success text-textPrimary shadow-lg shadow-success/10';
      case 'error': return 'bg-white border-l-4 border-danger text-textPrimary shadow-lg shadow-danger/10';
      case 'warning': return 'bg-white border-l-4 border-warning text-textPrimary shadow-lg shadow-warning/10';
      default: return 'bg-white border-l-4 border-info text-textPrimary shadow-lg shadow-info/10';
    }
  };

  const getIconColor = (type: string) => {
      switch (type) {
        case 'success': return 'text-success';
        case 'error': return 'text-danger';
        case 'warning': return 'text-warning';
        default: return 'text-info';
      }
  };

  return (
    <div className="fixed top-20 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id} 
          className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-lg border border-border/50 flex items-start gap-3 animate-in slide-in-from-right fade-in duration-300 ${getStyles(n.type)}`}
        >
          <div className={`mt-0.5 ${getIconColor(n.type)}`}>
            {getIcon(n.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-tight">{n.message}</p>
          </div>
          <button 
            onClick={() => removeNotification(n.id)} 
            className="text-textMuted hover:text-textSecondary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
