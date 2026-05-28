import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Folder as FolderIcon, FolderPlus, ArrowRight, ArrowLeft } from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  color: string;
  _count?: {
    notes: number;
  };
}

interface FolderGridProps {
  onSelectFolder: (folder: Folder) => void;
  searchTerm: string;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
}

const PASTEL_COLORS = [
  { name: 'blue', value: 'var(--color-blue)', label: 'Ocean Blue' },
  { name: 'yellow', value: 'var(--color-yellow)', label: 'Warm Yellow' },
  { name: 'pink', value: 'var(--color-pink)', label: 'Soft Pink' },
  { name: 'purple', value: 'var(--color-purple)', label: 'Lavender' }
];

export const FolderGrid: React.FC<FolderGridProps> = ({
  onSelectFolder,
  searchTerm,
  isCreating,
  setIsCreating
}) => {
  const { apiFetch } = useAuth();
  const { showNotification, setSyncingState, showConfirm } = useNotification();
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation Wizard Internal Step
  const [createStep, setCreateStep] = useState(0); // 0: Start, 1: Name, 2: Color
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Fetch Folders
  const fetchFolders = async () => {
    try {
      const data = await apiFetch('/folders');
      setFolders(data.folders);
    } catch (err: any) {
      showNotification('Failed to load folders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleNextStep = () => {
    if (createStep === 1 && !folderName.trim()) {
      showNotification('Please enter a folder name', 'error');
      return;
    }
    setCreateStep(createStep + 1);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    setSyncingState(true, 'Creating folder...');
    try {
      const data = await apiFetch('/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: folderName,
          color: selectedColor,
        }),
      });

      setFolders([data.folder, ...folders]);
      showNotification(`Folder "${folderName}" created!`, 'success');
      
      // Reset State
      setIsCreating(false);
      setCreateStep(0);
      setFolderName('');
      setSelectedColor('yellow');
    } catch (err) {
      showNotification('Failed to create folder', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Avoid triggering onSelectFolder
    
    showConfirm(
      `Delete folder "${name}"?`,
      'All notes and checklists inside will be permanently deleted.',
      async () => {
        setSyncingState(true, 'Deleting folder...');
        try {
          await apiFetch(`/folders/${id}`, {
            method: 'DELETE',
          });
          setFolders(folders.filter(f => f.id !== id));
          showNotification(`Folder "${name}" deleted`, 'default');
        } catch (err) {
          showNotification('Failed to delete folder', 'error');
        } finally {
          setSyncingState(false);
        }
      }
    );
  };

  // Filter folders by search term from Dynamic Island
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPastelBg = (colorName: string) => {
    const col = PASTEL_COLORS.find(c => c.name === colorName);
    return col ? col.value : 'var(--color-yellow)';
  };

  if (isCreating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh' }} className="animate-fade-in">
        <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          
          {/* Step Dots Indicators */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: i <= createStep ? 'var(--text-main)' : 'rgba(0, 0, 0, 0.1)',
                  transition: 'var(--transition-smooth)'
                }}
              />
            ))}
          </div>

          {/* STEP 0: CREATE A FOLDER INTRO */}
          {createStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '6px' }}>Create a Folder</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Organize notes under a color category</p>
              </div>
              
              <div 
                style={{ 
                  cursor: 'pointer', 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '24px', 
                  backgroundColor: 'var(--color-yellow)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '10px auto'
                }} 
                onClick={() => setCreateStep(1)}
              >
                <FolderPlus size={32} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button onClick={() => setIsCreating(false)} className="btn" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Cancel
                </button>
                <button onClick={() => setCreateStep(1)} className="btn btn-primary" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: FOLDER NAME INPUT */}
          {createStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '6px' }}>Name your folder</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Keep it short and descriptive</p>
              </div>

              <div 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '24px', 
                  backgroundColor: 'var(--color-yellow)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '10px auto'
                }}
              >
                <FolderIcon size={32} />
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                  autoFocus
                />
                <button onClick={handleNextStep} className="btn btn-primary btn-icon" style={{ width: '44px', height: '44px', borderRadius: '22px' }}>
                  <ArrowRight size={16} />
                </button>
              </div>

              <button
                onClick={() => setCreateStep(0)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          )}

          {/* STEP 2: PICK COLOR */}
          {createStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '24px', marginBottom: '6px' }}>Pick a color</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a pastel tint for this category</p>
              </div>

              <div 
                style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '24px', 
                  backgroundColor: getPastelBg(selectedColor), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '10px auto',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <FolderIcon size={32} />
              </div>

              {/* Pastel Color Swatches */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '10px 0' }}>
                {PASTEL_COLORS.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedColor(col.name)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: col.value,
                      border: selectedColor === col.name ? '2px solid var(--text-main)' : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transform: selectedColor === col.name ? 'scale(1.1)' : 'none',
                      transition: 'var(--transition-smooth)',
                    }}
                    title={col.label}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button onClick={() => setCreateStep(1)} className="btn" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Back
                </button>
                <button onClick={handleCreateFolder} className="btn btn-success" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Create
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading folders...
        </div>
      ) : filteredFolders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '24px', 
              backgroundColor: 'var(--color-yellow)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px'
            }}
          >
            <FolderIcon size={32} className="text-muted" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No folders found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', maxWidth: '280px', margin: '6px auto 20px' }}>
            {searchTerm ? "No match found for your query. Try editing your term." : "Create your first category folder to start writing checklist items."}
          </p>
          {!searchTerm && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={() => setIsCreating(true)} className="btn btn-primary" style={{ height: '40px', borderRadius: '20px' }}>
                Create Folder
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="folder-grid">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              className="card card-hover animate-fade-in"
              style={{
                backgroundColor: getPastelBg(folder.color),
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '120px',
                border: 'none',
                position: 'relative'
              }}
            >
              {/* Folder Hoverable Delete Cross */}
              <button
                onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                className="folder-delete-btn"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.06)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0,
                  padding: 0
                }}
                title="Delete Folder"
              >
                <span style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>×</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderIcon size={18} strokeWidth={2} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {folder.name}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>
                  {folder._count?.notes || 0} notes
                </span>
              </div>

              <style>{`
                .folder-delete-btn { transition: opacity 0.15s; }
                div:hover > .folder-delete-btn { opacity: 0.6 !important; }
                .folder-delete-btn:hover { opacity: 1 !important; background: rgba(0,0,0,0.12) !important; }
              `}</style>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
