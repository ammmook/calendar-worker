import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loading, setLoadingState] = useState(false);
  const [message, setMessage] = useState('');

  const setLoading = useCallback((isLoading, msg = '') => {
    setLoadingState(isLoading);
    setMessage(msg);
  }, []);

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease_both] gap-4">
          <div className="uiverse-loader"></div>
          {message && (
            <span className="text-[14px] font-bold text-[#3B4FE4] mt-4 tracking-wide">
              {message}
            </span>
          )}
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used inside <LoadingProvider>');
  return ctx;
}
