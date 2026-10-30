import { useState, useEffect } from 'react';
import type { AppMode, PageContext } from '@fpl-companion/shared';

export function useExtensionSync() {
  const [appMode, setAppMode] = useState<AppMode>('classic');
  const [pageContext, setPageContext] = useState<PageContext>({
    mode: 'classic',
    url: '',
    managerId: 481920,
    activeGameweek: 9,
  });
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  useEffect(() => {
    // Check initial storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['appMode', 'pageContext'], (res) => {
        if (res.appMode) setAppMode(res.appMode);
        if (res.pageContext) setPageContext(res.pageContext);
      });

      const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.appMode) setAppMode(changes.appMode.newValue);
        if (changes.pageContext) setPageContext(changes.pageContext.newValue);
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/health');
        if (res.ok) {
          const data = await res.json();
          setIsBackendConnected(true);
          setGeminiConfigured(data.geminiConfigured);
        } else {
          setIsBackendConnected(false);
        }
      } catch (err) {
        setIsBackendConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const toggleMode = (newMode: AppMode) => {
    setAppMode(newMode);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ appMode: newMode });
    }
  };

  return {
    appMode,
    pageContext,
    isBackendConnected,
    geminiConfigured,
    toggleMode,
  };
}
