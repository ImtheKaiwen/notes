import { Router, Response } from 'express';
import prisma from '../db/client.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all folder routes
router.use(authenticateToken);

// Get all folders of the logged-in user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { notes: true }
        }
      }
    });
    return res.json({ folders });
  } catch (err: any) {
    console.error('Fetch folders error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new folder
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, color } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: 'Folder name and color are required.' });
  }

  try {
    const folder = await prisma.folder.create({
      data: {
        name,
        color,
        userId: req.userId!,
      },
    });
    return res.status(201).json({ folder });
  } catch (err: any) {
    console.error('Create folder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a folder
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify the folder belongs to the user
    const folder = await prisma.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    if (folder.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this folder.' });
    }

    // Delete the folder (cascade deletes notes via foreign key relation)
    await prisma.folder.delete({
      where: { id },
    });

    return res.json({ message: 'Folder deleted successfully.' });
  } catch (err: any) {
    console.error('Delete folder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
