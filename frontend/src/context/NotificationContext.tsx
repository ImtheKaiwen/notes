import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

export type IslandState = 'idle' | 'expanded' | 'large';
export type IslandType = 'default' | 'success' | 'error' | 'syncing' | 'progress' | 'focus' | 'confirm';

interface NotificationContextProps {
  state: IslandState;
  type: IslandType;
  title: string;
  subtitle?: string;
  customContent?: ReactNode;
  showNotification: (title: string, type?: IslandType) => void;
  showConfirm: (title: string, subtitle: string, onConfirm: () => void) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
  setSyncingState: (isSyncing: boolean, message?: string) => void;
  setProgressState: (completed: number, total: number, label: string) => void;
  setFocusTimerState: (secondsLeft: number, isActive: boolean) => void;
  clearNotification: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<IslandState>('idle');
  const [type, setType] = useState<IslandType>('default');
  
  const isSyncingRef = useRef(false);
  const currentSyncTitleRef = useRef('');
  
  const typeRef = useRef<IslandType>(type);
  useEffect(() => {
    typeRef.current = type;
  }, [type]);

  const [title, setTitle] = useState<string>('Online');
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined);
  const [customContent, setCustomContent] = useState<ReactNode | undefined>(undefined);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  // Automatically reset to idle after duration
  useEffect(() => {
    if (!(state === 'expanded' && (type === 'success' || type === 'error' || type === 'default'))) {
      return;
    }
    const timer = setTimeout(() => {
      setState('idle');
      setType('default');
      setTitle('Online');
    }, 3500);
    return () => clearTimeout(timer);
  }, [state, type]);

  const showNotification = (msg: string, t: IslandType = 'success') => {
    isSyncingRef.current = false;
    setTitle(msg);
    setType(t);
    setState('expanded');
    setSubtitle(undefined);
    setCustomContent(undefined);
    setConfirmCallback(null);
  };

  const showConfirm = (titleText: string, subtitleText: string, onConfirm: () => void) => {
    isSyncingRef.current = false;
    setTitle(titleText);
    setSubtitle(subtitleText);
    setType('confirm');
    setState('large');
    setConfirmCallback(() => onConfirm);
  };

  const handleConfirm = () => {
    if (confirmCallback) {
      confirmCallback();
    }
    clearNotification();
  };

  const handleCancel = () => {
    clearNotification();
  };

  const setSyncingState = (isSyncing: boolean, message = 'Saving to cloud...') => {
    if (isSyncing) {
      isSyncingRef.current = true;
      currentSyncTitleRef.current = message;
      setTitle(message);
      setType('syncing');
      setState('expanded');
      setSubtitle(undefined);
      setCustomContent(undefined);
      setConfirmCallback(null);
    } else {
      if (isSyncingRef.current) {
        isSyncingRef.current = false;
        const lowerTitle = currentSyncTitleRef.current.toLowerCase();
        if (
          lowerTitle.includes('checking') ||
          lowerTitle.includes('logging') ||
          lowerTitle.includes('connecting') ||
          lowerTitle.includes('creating account')
        ) {
          clearNotification();
        } else {
          setTitle('Changes saved');
          setType('success');
          setState('expanded');
        }
      }
    }
  };

  const setProgressState = (completed: number, total: number, label: string) => {
    isSyncingRef.current = false;
    setTitle(label);
    setType('progress');
    setState('expanded');
    setSubtitle(`${completed} of ${total} tasks complete`);
    setCustomContent(undefined);
    setConfirmCallback(null);
  };

  const setFocusTimerState = (secondsLeft: number, isActive: boolean) => {
    isSyncingRef.current = false;
    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    setTitle(`Focus Timer: ${formatTime(secondsLeft)}`);
    setType('focus');
    setState('expanded');
    setSubtitle(isActive ? 'Keep going!' : 'Paused');
  };

  const clearNotification = () => {
    isSyncingRef.current = false;
    setState('idle');
    setType('default');
    setTitle('Online');
    setSubtitle(undefined);
    setCustomContent(undefined);
    setConfirmCallback(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        state,
        type,
        title,
        subtitle,
        customContent,
        showNotification,
        showConfirm,
        handleConfirm,
        handleCancel,
        setSyncingState,
        setProgressState,
        setFocusTimerState,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
