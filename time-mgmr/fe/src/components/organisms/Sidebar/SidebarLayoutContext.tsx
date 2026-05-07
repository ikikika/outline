import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

export interface ISidebarLayoutContext {
  isOpen: boolean;
  isMobile: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SidebarLayoutContext = createContext<ISidebarLayoutContext | null>(null);

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

export const SidebarLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [isOpen, setIsOpen] = useState(() => !getIsMobile());

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      setIsOpen(!mobile);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const value = useMemo(
    () => ({ isOpen, isMobile, open, close, toggle }),
    [isOpen, isMobile, open, close, toggle]
  );

  return (
    <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>
  );
};

const FALLBACK: ISidebarLayoutContext = {
  isOpen: true,
  isMobile: false,
  open: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
};

export function useSidebarLayout(): ISidebarLayoutContext {
  return useContext(SidebarLayoutContext) ?? FALLBACK;
}
