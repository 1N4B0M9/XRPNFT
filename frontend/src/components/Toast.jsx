import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const colors = {
  success: {
    bg: 'bg-green-950/90',
    border: 'border-green-800/60',
    icon: 'text-green-400',
    bar: 'bg-green-500',
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-800/60',
    icon: 'text-red-400',
    bar: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-950/90',
    border: 'border-blue-800/60',
    icon: 'text-blue-400',
    bar: 'bg-blue-500',
  },
};

function ToastItem({ toast, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const startTime = useRef(Date.now());
  const duration = toast.duration || 5000;

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const style = colors[toast.type] || colors.info;
  const Icon = icons[toast.type] || icons.info;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
        style.bg
      } ${style.border} ${
        exiting
          ? 'opacity-0 translate-x-8 scale-95'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
      style={{ minWidth: 320, maxWidth: 420 }}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.icon}`} />
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold text-white">{toast.title}</p>
          )}
          {toast.message && (
            <p className={`text-sm text-surface-300 ${toast.title ? 'mt-0.5' : ''}`}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-surface-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <div
          className={`h-full transition-all duration-100 ease-linear ${style.bar}`}
          style={{ width: `${progress}%`, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto animate-toast-in">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
