

import { useEffect } from 'react';
import { toast } from 'sonner';
import AppRoutes from './router';
import GlobalRealtimeMount from './components/common/GlobalRealtimeMount';

function App() {
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Find if we clicked on any element inside the toast container
      const clickedToast = (event.target as HTMLElement).closest('[data-sonner-toast]') || 
                           (event.target as HTMLElement).closest('[data-sonner-toaster]');
      if (clickedToast) return;

      // Find if we clicked on an interactive element (buttons, links, inputs, etc.)
      const isInteractive = (event.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]');
      if (isInteractive) return;

      // Dismiss all toasts
      toast.dismiss();
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  return (
    <>
      <GlobalRealtimeMount />
      <AppRoutes />
    </>
  );
}

export default App;
