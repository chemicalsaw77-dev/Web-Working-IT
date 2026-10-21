'use client';

import { useEffect } from 'react';

export default function NavigationBlocker() {
  useEffect(() => {
    // 1. Block keyboard shortcuts: Ctrl+Y
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 2. Block browser back button (Popstate history trap)
    // Push a dummy state so there's always a next state in history to trap
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Re-push the state to keep the user trapped on the current URL
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
