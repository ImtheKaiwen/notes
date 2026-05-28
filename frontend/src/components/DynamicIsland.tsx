import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Timer, Play, Pause, RotateCcw, Search, Plus, ArrowLeft, LogOut, User as UserIcon, Check, AlertCircle } from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface DynamicIslandProps {
  activeFolder: Folder | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onCreateClick?: () => void;
  totalTasks: number;
  completedTasks: number;
}

type IslandMode = 'notch' | 'search' | 'timer' | 'profile' | 'cookie-consent';

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  activeFolder,
  searchTerm,
  onSearchChange,
  onCreateClick,
  totalTasks,
  completedTasks
}) => {
  const {
    state: globalState,
    type: globalType,
    title: globalTitle,
    subtitle: globalSubtitle,
    showNotification,
    handleConfirm,
    handleCancel,
    setFocusTimerState
  } = useNotification();
  const { user, logout } = useAuth();
  
  // Dynamic Island Internal Mode
  const [mode, setMode] = useState<IslandMode>(() => {
    const consent = localStorage.getItem('cookie_consent');
    return consent ? 'notch' : 'cookie-consent';
  });

  // Pomodoro states
  const [selectedDuration, setSelectedDuration] = useState(25 * 60); // default 25 mins
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusSessionTrigger, setFocusSessionTrigger] = useState(0);
  
  const timerRef = useRef<any>(null);
  const islandRef = useRef<HTMLDivElement>(null);

  // Focus Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setPomodoroSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            
            // Record completed focus session to localStorage
            try {
              const sessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
              sessions.push(new Date().toISOString());
              localStorage.setItem('focus_sessions', JSON.stringify(sessions));
              setFocusSessionTrigger(prev => prev + 1);
              showNotification('Focus session completed! Great job! 🎉', 'success');
            } catch (err) {
              console.error(err);
            }
            
            return selectedDuration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, selectedDuration]);

  // Stop and reset timer if user logs out
  useEffect(() => {
    if (!user) {
      setIsTimerRunning(false);
      setPomodoroSeconds(25 * 60);
      setSelectedDuration(25 * 60);
    }
  }, [user]);

  // Synchronize active timer metrics with notification context
  useEffect(() => {
    if (isTimerRunning || pomodoroSeconds !== selectedDuration) {
      if (globalType === 'default' || globalType === 'focus') {
        setFocusTimerState(pomodoroSeconds, isTimerRunning);
      }
    }
  }, [pomodoroSeconds, isTimerRunning, selectedDuration, globalType]);

  // Handle clicking outside to collapse the island back to notch
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(event.target as Node)) {
        if (globalState !== 'idle' && globalType === 'confirm') {
          handleCancel();
        } else {
          setMode(prev => prev === 'cookie-consent' ? 'cookie-consent' : 'notch');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [globalState, globalType, handleCancel]);

  // Global Keyboard Shortcuts for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.getAttribute('contenteditable') === 'true';

      if (isInput) {
        if (e.key === 'Escape') {
          (activeEl as HTMLElement).blur();
          setMode('notch');
        }
        return;
      }

      // Ctrl + K or / to focus search
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || e.key === '/') {
        e.preventDefault();
        setMode('search');
      }

      // Escape to collapse
      if (e.key === 'Escape') {
        setMode('notch');
      }

      // N to trigger new item creation
      if (e.key.toLowerCase() === 'n' && user) {
        e.preventDefault();
        if (onCreateClick) onCreateClick();
        setMode('notch');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, onCreateClick]);

  const selectPresetDuration = (mins: number) => {
    const secs = mins * 60;
    setSelectedDuration(secs);
    setPomodoroSeconds(secs);
    setIsTimerRunning(true);
  };

  const getFocusHistory = () => {
    // Reference trigger state to force update on change
    if (focusSessionTrigger === -999) console.log();
    try {
      const sessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
      const history = [];
      const today = new Date();
      
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        
        const count = sessions.filter((s: string) => new Date(s).toDateString() === dateStr).length;
        history.push({ date: d, count });
      }
      return history;
    } catch (e) {
      return [];
    }
  };

  const handleNotchClick = () => {
    if (!user) return; // Prevent expanding when not logged in
    if (mode === 'notch') {
      setMode('search');
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getIslandClasses = () => {
    let classes = 'dynamic-island ';
    
    // Check if global notification is active (and not the background focus timer)
    if (globalState !== 'idle' && globalType !== 'focus') {
      if (globalState === 'expanded') {
        classes += 'expanded';
      } else if (globalState === 'large') {
        classes += 'large';
      }
      classes += ` notification-${globalType}`;
      return classes;
    }

    if (mode === 'notch') {
      classes += 'idle';
    } else if (mode === 'search') {
      classes += 'expanded';
    } else if (mode === 'timer' || mode === 'profile' || mode === 'cookie-consent') {
      classes += 'large';
    }
    return classes;
  };

  // Helper to render notification layout
  const renderNotificationContent = () => {
    switch (globalType) {
      case 'syncing':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '10px' }}>
            <div className="animate-spin" style={{
              width: '13px',
              height: '13px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#FFFFFF',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{globalTitle}</span>
          </div>
        );
      case 'success':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '8px' }}>
            <Check size={14} strokeWidth={3} style={{ color: '#10B981' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{globalTitle}</span>
          </div>
        );
      case 'error':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '10px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444'
            }}>
              <AlertCircle size={10} strokeWidth={3} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{globalTitle}</span>
          </div>
        );
      case 'confirm':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#FFFFFF' }}>{globalTitle}</span>
              {globalSubtitle && (
                <span style={{ fontSize: '11.5px', opacity: 0.7, color: '#E5E7EB', lineHeight: '1.4' }}>{globalSubtitle}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={handleCancel}
                className="confirm-btn-cancel"
                style={{
                  flexGrow: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="confirm-btn-danger"
                style={{
                  flexGrow: 1,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Delete
              </button>
            </div>
            <style>{`
              .confirm-btn-cancel:hover { background: rgba(255, 255, 255, 0.18) !important; }
              .confirm-btn-danger:hover { background: #DC2626 !important; }
            `}</style>
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{globalTitle}</span>
          </div>
        );
    }
  };

  const handleAcceptCookies = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setMode('notch');
    showNotification('Cookie preferences saved!', 'success');
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('cookie_consent', 'declined');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('saved_email');
    localStorage.removeItem('saved_password');
    setMode('notch');
    showNotification('Cookies declined. Session saving disabled.', 'default');
  };

  const isGlobalNotificationActive = globalState !== 'idle' && globalType !== 'focus';

  return (
    <div className="dynamic-island-container" ref={islandRef}>
      <div className={getIslandClasses()} onClick={handleNotchClick}>
        
        {/* Core transition content wrapper */}
        <div 
          key={isGlobalNotificationActive ? `gnotif-${globalType}-${globalTitle}` : `mode-${mode}`} 
          className="dynamic-island-content"
        >
          {isGlobalNotificationActive ? (
            renderNotificationContent()
          ) : (
            <>
              {/* MODE 1: IDLE NOTCH */}
              {mode === 'notch' && (
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                  {isTimerRunning || pomodoroSeconds !== selectedDuration ? (
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#D0E8FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Timer size={11} className="animate-pulse" /> {formatTime(pomodoroSeconds)}
                    </span>
                  ) : (activeFolder && user) ? (
                    <span style={{ fontSize: '11px', color: '#FFFFFF', opacity: 0.9, fontWeight: 600 }}>
                      {completedTasks}/{totalTasks} tasks
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.25 }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#FFFFFF' }}></div>
                      <div style={{ width: '18px', height: '3px', borderRadius: '1.5px', backgroundColor: '#FFFFFF' }}></div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: EXPANDED SEARCH & ACTION BAR */}
              {mode === 'search' && user && (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                  {/* Search Icon */}
                  <Search size={14} style={{ opacity: 0.4, minWidth: '14px' }} />
                  
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder={activeFolder ? `Search tasks...` : "Search category folders..."}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{
                      flexGrow: 1,
                      background: 'none',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%'
                    }}
                    autoFocus
                  />

                  {/* Split Divider */}
                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.15)' }}></div>

                  {/* Icons controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Creator Icon button */}
                    <button
                      onClick={() => {
                        if (onCreateClick) onCreateClick();
                        setMode('notch');
                      }}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', opacity: 0.8 }}
                      title={activeFolder ? "Add Note List" : "New Folder"}
                    >
                      <Plus size={15} />
                    </button>

                    {/* Timer Menu Trigger */}
                    <button
                      onClick={() => setMode('timer')}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', opacity: 0.8 }}
                      title="Timer Settings"
                    >
                      <Timer size={15} />
                    </button>

                    {/* Profile Menu Trigger */}
                    <button
                      onClick={() => setMode('profile')}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', opacity: 0.8 }}
                      title="User Profile"
                    >
                      <UserIcon size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: TIMER DROPDOWN CONTROLS */}
              {mode === 'timer' && user && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Timer size={14} className="text-purple-400" />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>Focus Timer</span>
                    </div>
                    <button
                      onClick={() => setMode('search')}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                    >
                      <ArrowLeft size={11} /> Back
                    </button>
                  </div>

                  {/* Countdown / Controls row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.05em' }}>
                      {formatTime(pomodoroSeconds)}
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
                        {isTimerRunning ? 'Pause' : 'Start'}
                      </button>

                      <button
                        onClick={() => {
                          setPomodoroSeconds(selectedDuration);
                          setIsTimerRunning(false);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Reset"
                      >
                        <RotateCcw size={10} /> Reset
                      </button>
                    </div>
                  </div>

                  {/* Preset selectors row */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                    {[5, 15, 25, 50].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => selectPresetDuration(mins)}
                        style={{
                          flexGrow: 1,
                          background: selectedDuration === mins * 60 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 4px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODE 4: USER PROFILE DROPDOWN */}
              {mode === 'profile' && user && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '14px' }} onClick={(e) => e.stopPropagation()}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={13} className="text-blue-300" style={{ color: '#93C5FD' }} />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>User Account</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => {
                          logout();
                          setMode('notch');
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#FF8A8A',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.2s'
                        }}
                        title="Log out from account"
                      >
                        <LogOut size={10} /> Log out
                      </button>

                      <div style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)' }}></div>

                      <button
                        onClick={() => setMode('search')}
                        style={{ background: 'none', border: 'none', color: '#FFFFFF', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                      >
                        <ArrowLeft size={11} /> Back
                      </button>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF' }}>{user.name}</span>
                    <span style={{ fontSize: '11.5px', opacity: 0.6, color: '#E5E7EB' }}>{user.email}</span>
                  </div>

                  {/* Focus Analytics (Power User Feature) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', paddingBottom: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span 
                        style={{ fontSize: '10px', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      >
                        Focus Goals
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#34D399' }}>
                        {(() => {
                          try {
                            return JSON.parse(localStorage.getItem('focus_sessions') || '[]').length;
                          } catch (e) { return 0; }
                        })()} done
                      </span>
                    </div>
                    
                    {/* 10-day Heatmap Grid */}
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between', padding: '4px 0' }}>
                      {getFocusHistory().map((day: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            backgroundColor: day.count === 0 ? 'rgba(255,255,255,0.08)' 
                                           : day.count === 1 ? '#34D399' 
                                           : '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: day.count > 0 ? '#FFFFFF' : 'transparent',
                            transition: 'background-color 0.3s ease'
                          }}
                          title={`${day.count} sessions on ${day.date.toLocaleDateString()}`}
                        >
                          {day.count > 0 ? day.count : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 5: COOKIE CONSENT DROPDOWN */}
              {mode === 'cookie-consent' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🍪</span>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>Cookie Preferences</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                    <p style={{ fontSize: '12px', color: '#E5E7EB', lineHeight: '1.5' }}>
                      We use browser storage to securely save your login credentials and preferences so you can log in quickly next time.
                    </p>
                  </div>

                  {/* Buttons row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={handleDeclineCookies}
                      style={{
                        flexGrow: 1,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                    >
                      Decline
                    </button>
                    
                    <button
                      onClick={handleAcceptCookies}
                      style={{
                        flexGrow: 1,
                        background: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10B981')}
                    >
                      Allow Cookies
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
