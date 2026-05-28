import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { ArrowLeft } from 'lucide-react';
import { DynamicIsland } from './components/DynamicIsland.tsx';
import { AuthFlow } from './components/AuthFlow.tsx';
import { FolderGrid } from './components/FolderGrid.tsx';
import { NoteGrid } from './components/NoteGrid.tsx';

interface Folder {
  id: string;
  name: string;
  color: string;
}

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Navigation & Core States
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  
  // Lifted Search Terms
  const [folderSearch, setFolderSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  
  // Lifted Add Wizards Triggers
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNoteList, setIsCreatingNoteList] = useState(false);

  // Lifted Task Completion Statistics
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  const [showTutorial, setShowTutorial] = useState(false);

  // Keep background clean and default white
  React.useEffect(() => {
    document.body.style.backgroundColor = 'var(--bg-main)';
  }, [activeFolder]);

  // Waking up server loading view
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', gap: '20px', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-border)',
            borderTopColor: '#1E1E1E',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-title)' }}>Kaido</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '280px' }}>
          Connecting to our cloud backend database... This may take a moment on the first load as the server spins up.
        </p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ paddingTop: '80px' }}>
      
      {/* Floating Dynamic Island - Universal Master Controller */}
      <DynamicIsland 
        activeFolder={activeFolder}
        searchTerm={activeFolder ? noteSearch : folderSearch}
        onSearchChange={activeFolder ? setNoteSearch : setFolderSearch}
        onCreateClick={activeFolder ? () => setIsCreatingNoteList(true) : () => setIsCreatingFolder(true)}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
      />

      {/* Floating Page Back Button - Top Left corner */}
      {isAuthenticated && activeFolder && (
        <button
          onClick={() => {
            setActiveFolder(null);
            setNoteSearch('');
          }}
          className="btn animate-fade-in back-btn-fixed"
          style={{
            position: 'fixed',
            left: '24px',
            top: '20px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            border: 'none',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}
          title="Back to folders"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {/* Main Content Router */}
      <main style={{ flexGrow: 1 }}>
        {!isAuthenticated ? (
          <AuthFlow />
        ) : !activeFolder ? (
          <FolderGrid 
            onSelectFolder={(folder) => {
              setActiveFolder(folder);
              setNoteSearch('');
            }}
            searchTerm={folderSearch}
            isCreating={isCreatingFolder}
            setIsCreating={setIsCreatingFolder}
          />
        ) : (
          <NoteGrid 
            folder={activeFolder} 
            searchTerm={noteSearch}
            isCreating={isCreatingNoteList}
            setIsCreating={setIsCreatingNoteList}
            onBack={() => {
              setActiveFolder(null);
              setFolderSearch('');
            }} 
            onProgressUpdate={(completed, total) => {
              setCompletedTasks(completed);
              setTotalTasks(total);
            }}
          />
        )}
      </main>

      {/* Interactive Coaching Spotlight Overlay */}
      {showTutorial && (
        <div 
          className="coaching-overlay animate-fade-in"
          onClick={() => setShowTutorial(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(251, 251, 250, 0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 998,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          {/* Animated SVG arrow pointing up to the Dynamic Island spotlight position */}
          <div style={{ position: 'absolute', top: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'bounceArrow 1.5s infinite ease-in-out' }}>
              <path d="M20 45V5M20 5L10 15M20 5L30 15" stroke="var(--text-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Control Hub
            </span>
          </div>

          <div style={{ maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '80px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>Smart Dynamic Island</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Everything in this minimal app is controlled from the hardware-integrated pill at the top of your screen.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>1</div>
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600 }}>Create Categories & Notes</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Expand the island, click the <strong>+</strong> button to create folders or checklist note cards.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>2</div>
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600 }}>Fuzzy Instant Search</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click the notch, start typing, and instantly filter folders or checklist titles in real-time.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>3</div>
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 600 }}>Deep Focus Timer</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pick a duration directly from the island menu to launch an integrated productivity countdown.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowTutorial(false)} 
              className="btn btn-primary" 
              style={{ width: '100%', height: '40px', borderRadius: '20px', marginTop: '12px' }}
            >
              Got it, let's start!
            </button>
          </div>

          <style>{`
            @keyframes bounceArrow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}
