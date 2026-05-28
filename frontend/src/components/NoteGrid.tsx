import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Plus, Trash2, CheckSquare, Square, ClipboardList, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  starred?: boolean;
}

interface Note {
  id: string;
  title: string;
  status: 'completed' | 'continued' | 'backlog';
  items: ChecklistItem[];
  folderId: string;
  createdAt: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface NoteGridProps {
  folder: Folder;
  searchTerm: string;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  onBack: () => void;
  onProgressUpdate: (completed: number, total: number) => void;
}

export const NoteGrid: React.FC<NoteGridProps> = ({
  folder,
  searchTerm,
  isCreating,
  setIsCreating,
  onProgressUpdate
}) => {
  const { apiFetch } = useAuth();
  const { showNotification, setSyncingState, showConfirm } = useNotification();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'continued' | 'completed'>('all');

  // Note creation inputs
  const [newNoteTitle, setNewNoteTitle] = useState('');
  
  // New task text per note card (indexed by note.id)
  const [newItemTexts, setNewItemTexts] = useState<{ [key: string]: string }>({});

  const fetchNotes = async () => {
    try {
      const data = await apiFetch(`/notes/folder/${folder.id}`);
      setNotes(data.notes);
      calculateAndNotifyProgress(data.notes);
    } catch (err: any) {
      showNotification('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [folder.id]);

  // Calculate total/completed tasks and notify parent App.tsx
  const calculateAndNotifyProgress = (currentNotes: Note[]) => {
    let total = 0;
    let completed = 0;

    currentNotes.forEach(note => {
      note.items.forEach(item => {
        total++;
        if (item.done) completed++;
      });
    });

    onProgressUpdate(completed, total);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    setSyncingState(true, 'Adding note...');
    try {
      const data = await apiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: newNoteTitle,
          status: 'continued',
          items: [],
          folderId: folder.id,
        }),
      });

      const updatedNotes = [data.note, ...notes];
      setNotes(updatedNotes);
      showNotification(`Note "${newNoteTitle}" added!`, 'success');
      setNewNoteTitle('');
      setIsCreating(false);
      calculateAndNotifyProgress(updatedNotes);
    } catch (err) {
      showNotification('Failed to add note', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    showConfirm(
      `Delete checklist "${title}"?`,
      'This checklist card will be permanently deleted.',
      async () => {
        setSyncingState(true, 'Deleting note...');
        try {
          await apiFetch(`/notes/${id}`, {
            method: 'DELETE',
          });
          const updatedNotes = notes.filter(n => n.id !== id);
          setNotes(updatedNotes);
          showNotification(`Note "${title}" deleted`, 'default');
          calculateAndNotifyProgress(updatedNotes);
        } catch (err) {
          showNotification('Failed to delete note', 'error');
        } finally {
          setSyncingState(false);
        }
      }
    );
  };

  const handleAddTaskItem = async (noteId: string) => {
    const text = newItemTexts[noteId] || '';
    if (!text.trim()) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      text: text.trim(),
      done: false,
    };

    const updatedItems = [...note.items, newItem];
    const isCompleted = updatedItems.length > 0 && updatedItems.every(i => i.done);
    const newStatus = isCompleted ? 'completed' : 'continued';

    setSyncingState(true, 'Adding task...');
    try {
      const data = await apiFetch(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: updatedItems,
          status: newStatus,
        }),
      });

      const updatedNotes = notes.map(n => n.id === noteId ? data.note : n);
      setNotes(updatedNotes);
      setNewItemTexts({ ...newItemTexts, [noteId]: '' });
      calculateAndNotifyProgress(updatedNotes);
    } catch (err) {
      showNotification('Failed to add task', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleToggleTaskItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    let triggerConfetti = false;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const nextState = !item.done;
        const otherItemsDone = note.items.filter(i => i.id !== itemId).every(i => i.done);
        if (nextState && otherItemsDone) {
          triggerConfetti = true;
        }
        return { ...item, done: nextState };
      }
      return item;
    });

    const isCompleted = updatedItems.length > 0 && updatedItems.every(i => i.done);
    const newStatus = isCompleted ? 'completed' : 'continued';

    setSyncingState(true, 'Saving check...');
    try {
      const data = await apiFetch(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: updatedItems,
          status: newStatus,
        }),
      });

      const updatedNotes = notes.map(n => n.id === noteId ? data.note : n);
      setNotes(updatedNotes);
      calculateAndNotifyProgress(updatedNotes);

      if (triggerConfetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        showNotification(`Note "${note.title}" Completed!`, 'success');
      }
    } catch (err) {
      showNotification('Failed to update task', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleDeleteTaskItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.filter(item => item.id !== itemId);
    const isCompleted = updatedItems.length > 0 && updatedItems.every(i => i.done);
    const newStatus = isCompleted ? 'completed' : 'continued';

    setSyncingState(true, 'Deleting task...');
    try {
      const data = await apiFetch(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: updatedItems,
          status: newStatus,
        }),
      });

      const updatedNotes = notes.map(n => n.id === noteId ? data.note : n);
      setNotes(updatedNotes);
      calculateAndNotifyProgress(updatedNotes);
    } catch (err) {
      showNotification('Failed to remove task', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleDuplicateNote = async (sourceNote: Note) => {
    setSyncingState(true, 'Duplicating card...');
    try {
      // Deep copy tasks, resetting completed checks to active
      const cleanItems = sourceNote.items.map(item => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        text: item.text,
        done: false,
        starred: item.starred || false
      }));

      const data = await apiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${sourceNote.title} (Copy)`,
          status: 'continued',
          items: cleanItems,
          folderId: folder.id,
        }),
      });

      const updatedNotes = [data.note, ...notes];
      setNotes(updatedNotes);
      showNotification(`Duplicated "${sourceNote.title}"!`, 'success');
      calculateAndNotifyProgress(updatedNotes);
    } catch (err) {
      showNotification('Failed to duplicate note', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  const handleToggleStarTaskItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        return { ...item, starred: !item.starred };
      }
      return item;
    });

    setSyncingState(true, 'Updating task...');
    try {
      const data = await apiFetch(`/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: updatedItems,
        }),
      });

      const updatedNotes = notes.map(n => n.id === noteId ? data.note : n);
      setNotes(updatedNotes);
      calculateAndNotifyProgress(updatedNotes);
    } catch (err) {
      showNotification('Failed to star task', 'error');
    } finally {
      setSyncingState(false);
    }
  };

  // Filter notes by both active tab AND search term
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'completed') {
      return note.items.some(item => item.done);
    }
    if (filter === 'continued') {
      return note.items.length === 0 || note.items.some(item => !item.done);
    }
    return true;
  });

  if (isCreating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '55vh' }} className="animate-fade-in">
        <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '24px', marginBottom: '6px' }}>Create Checklist</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Add a new task card in folder "{folder.name}"</p>
            </div>
            
            <div 
              style={{ 
                width: '90px', 
                height: '90px', 
                borderRadius: '24px', 
                backgroundColor: 'var(--color-blue)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '10px auto'
              }} 
            >
              <ClipboardList size={32} />
            </div>

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Checklist title (e.g. Work, Tasks)"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsCreating(false)} className="btn" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, height: '40px', borderRadius: '20px' }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Filter Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', gap: '16px' }}>
        {(['all', 'continued', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-title)',
              fontWeight: 600,
              fontSize: '14px',
              padding: '6px 4px',
              color: filter === tab ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'var(--transition-smooth)'
            }}
          >
            {tab === 'continued' ? 'Active' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {filter === tab && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: 0,
                  right: 0,
                  height: '2.5px',
                  backgroundColor: 'var(--text-main)',
                  borderRadius: '1px'
                }}
              />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Loading checklists...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '24px', 
              backgroundColor: 'var(--color-blue)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px'
            }}
          >
            <ClipboardList size={32} className="text-muted" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No checklists found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', maxWidth: '280px', margin: '6px auto 20px' }}>
            {searchTerm ? "No checklist matches your search term." : "Start adding checklist cards to organize tasks!"}
          </p>
        </div>
      ) : (
        /* Notes Masonry Grid */
        <div className="note-grid">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="card animate-fade-in"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                breakInside: 'avoid',
                marginBottom: '20px',
                border: 'none',
                boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
              }}
            >
              {/* Note Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{note.title}</h4>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: note.status === 'completed' ? 'var(--color-green)' : 'rgba(0,0,0,0.04)',
                      color: note.status === 'completed' ? '#2E7D32' : 'var(--text-muted)',
                      width: 'fit-content',
                      marginTop: '2px'
                    }}
                  >
                    {note.status === 'completed' ? 'Completed' : 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {/* Duplicate / Template button */}
                  <button
                    onClick={() => handleDuplicateNote(note)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: 0.5, display: 'flex' }}
                    className="btn-hover"
                    title="Duplicate Checklist (Template)"
                  >
                    <ClipboardList size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id, note.title)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: 0.5, display: 'flex' }}
                    className="btn-hover"
                    title="Delete List"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Checklist Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {(() => {
                  const rawItems = filter === 'continued'
                    ? note.items.filter(item => !item.done)
                    : filter === 'completed'
                    ? note.items.filter(item => item.done)
                    : note.items;

                  // Sort starred items to the top
                  const itemsToShow = [...rawItems].sort((a: any, b: any) => {
                    const aStar = a.starred ? 1 : 0;
                    const bStar = b.starred ? 1 : 0;
                    return bStar - aStar;
                  });

                  if (itemsToShow.length === 0) {
                    return (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        {filter === 'continued'
                          ? 'No active tasks.'
                          : filter === 'completed'
                          ? 'No completed tasks.'
                          : 'No items yet. Add one below.'}
                      </span>
                    );
                  }

                  return itemsToShow.map((item: any) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '8px',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div
                        onClick={() => handleToggleTaskItem(note.id, item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexGrow: 1, minWidth: 0 }}
                      >
                        {item.done ? (
                          <CheckSquare size={15} style={{ color: '#2E7D32', minWidth: '15px' }} />
                        ) : (
                          <Square size={15} style={{ opacity: 0.5, minWidth: '15px' }} />
                        )}
                        <span
                          style={{
                            fontSize: '12.5px',
                            textDecoration: item.done ? 'line-through' : 'none',
                            color: item.done ? 'var(--text-muted)' : 'var(--text-main)',
                            fontWeight: item.starred ? 600 : 400,
                            transition: 'var(--transition-smooth)',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            textAlign: 'left'
                          }}
                        >
                          {item.text}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* Star Priority Toggle Button */}
                        <button
                          onClick={() => handleToggleStarTaskItem(note.id, item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: item.starred ? '#F59E0B' : 'var(--text-muted)',
                            opacity: item.starred ? 1 : undefined,
                            cursor: 'pointer',
                            display: 'flex',
                            padding: '4px'
                          }}
                          className="task-star-btn"
                          title={item.starred ? "Unstar Task" : "Star Task"}
                        >
                          <Star size={12} fill={item.starred ? '#F59E0B' : 'none'} />
                        </button>

                        <button
                          onClick={() => handleDeleteTaskItem(note.id, item.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', opacity: 0, cursor: 'pointer', display: 'flex', padding: '4px' }}
                          className="task-delete-btn"
                          title="Delete Task"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
                <style>{`
                  .task-delete-btn { transition: opacity 0.15s; }
                  div:hover > .task-delete-btn { opacity: 0.5 !important; }
                  .task-delete-btn:hover { opacity: 1 !important; }
                  
                  .task-star-btn { opacity: 0.15; transition: opacity 0.15s; }
                  div:hover .task-star-btn { opacity: 0.4; }
                  .task-star-btn:hover { opacity: 1 !important; }
                `}</style>
              </div>

              {/* Task Adding Input */}
              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Add item..."
                  value={newItemTexts[note.id] || ''}
                  onChange={(e) => setNewItemTexts({ ...newItemTexts, [note.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTaskItem(note.id)}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '16px', height: '32px' }}
                />
                <button
                  onClick={() => handleAddTaskItem(note.id)}
                  style={{
                    padding: '0',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    minHeight: '32px',
                    maxWidth: '32px',
                    maxHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1C1C1E',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2C2C2E')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1C1C1E')}
                  title="Add Task"
                >
                  <Plus size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
