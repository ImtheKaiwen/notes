import { Router, Response } from 'express';
import prisma from '../db/client.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all note routes
router.use(authenticateToken);

// Get all notes in a folder
router.get('/folder/:folderId', async (req: AuthRequest, res: Response) => {
  const { folderId } = req.params;

  try {
    // Verify folder belongs to the user
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    if (folder.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this folder.' });
    }

    const notes = await prisma.note.findMany({
      where: { folderId },
      orderBy: { updatedAt: 'desc' },
    });

    // Parse items JSON for the frontend
    const parsedNotes = notes.map((note) => ({
      ...note,
      items: JSON.parse(note.items),
    }));

    return res.json({ notes: parsedNotes });
  } catch (err: any) {
    console.error('Fetch notes error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new note inside a folder
router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, status, items, folderId } = req.body;

  if (!title || !status || !folderId) {
    return res.status(400).json({ error: 'Title, status, and folderId are required.' });
  }

  try {
    // Verify folder ownership
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    if (folder.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this folder.' });
    }

    // Default checklist items if not provided
    const stringifiedItems = items ? JSON.stringify(items) : JSON.stringify([]);

    const note = await prisma.note.create({
      data: {
        title,
        status,
        items: stringifiedItems,
        folderId,
      },
    });

    return res.status(201).json({
      note: {
        ...note,
        items: JSON.parse(note.items),
      },
    });
  } catch (err: any) {
    console.error('Create note error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a note (change title, status, and/or checklist items)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, status, items } = req.body;

  try {
    // Find note and check folder ownership
    const note = await prisma.note.findUnique({
      where: { id },
      include: { folder: true },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (note.folder.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this note.' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (items !== undefined) updateData.items = JSON.stringify(items);

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      note: {
        ...updatedNote,
        items: JSON.parse(updatedNote.items),
      },
    });
  } catch (err: any) {
    console.error('Update note error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a note
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Find note and check ownership
    const note = await prisma.note.findUnique({
      where: { id },
      include: { folder: true },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (note.folder.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this note.' });
    }

    await prisma.note.delete({
      where: { id },
    });

    return res.json({ message: 'Note deleted successfully.' });
  } catch (err: any) {
    console.error('Delete note error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
