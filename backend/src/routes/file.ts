import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { glob } from 'glob';

const router = Router();

function resolvePath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

router.get('/tree', async (req, res) => {
  const { path: dirPath } = req.query;

  if (!dirPath || typeof dirPath !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }

  const resolvedPath = resolvePath(dirPath);

  try {
    const files = await glob('**/*', { cwd: resolvedPath, ignore: ['node_modules/**'], mark: true });
    // TODO: Convert flat list to tree structure
    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/read', async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  }

  const resolvedPath = resolvePath(filePath);

  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content are required' });
  }

  const resolvedPath = resolvePath(filePath);

  try {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete', async (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const resolvedPath = resolvePath(filePath);

  try {
    await fs.rm(resolvedPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rename', async (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'Old path and new path are required' });
  }

  const resolvedOldPath = resolvePath(oldPath);
  const resolvedNewPath = resolvePath(newPath);

  try {
    await fs.rename(resolvedOldPath, resolvedNewPath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mkdir', async (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const resolvedPath = resolvePath(dirPath);

  try {
    await fs.mkdir(resolvedPath, { recursive: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
