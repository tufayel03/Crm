const path = require('path');
const fs = require('fs/promises');
const JSZip = require('jszip');

const uploadsRoot = path.join(__dirname, '..', 'uploads');

const safeResolve = (relativePath = '') => {
  const safePath = relativePath.replace(/^\/+/, '').replace(/\.\./g, '');
  const fullPath = path.join(uploadsRoot, safePath);
  if (!fullPath.startsWith(uploadsRoot)) {
    throw new Error('Invalid path');
  }
  return { fullPath, safePath };
};

const walk = async (dir, base = '') => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath, relPath));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      files.push({
        path: relPath.replace(/\\/g, '/'),
        name: entry.name,
        size: stat.size,
        modifiedAt: stat.mtime
      });
    }
  }
  return files;
};

exports.listFiles = async (req, res) => {
  try {
    await fs.mkdir(uploadsRoot, { recursive: true });
    const files = await walk(uploadsRoot);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const response = files.map(file => ({
      ...file,
      url: `${baseUrl}/uploads/${file.path}`
    }));
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list files.' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ message: 'File path required' });
    const { fullPath } = safeResolve(filePath);
    await fs.unlink(fullPath);
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete file.' });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.json({ message: 'No files removed' });
    }
    for (const filePath of paths) {
      if (!filePath) continue;
      const { fullPath } = safeResolve(filePath);
      try {
        await fs.unlink(fullPath);
      } catch {
        // ignore missing
      }
    }
    res.json({ message: 'Files deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete files.' });
  }
};

exports.downloadFiles = async (req, res) => {
  try {
    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ message: 'File paths required' });
    }
    const zip = new JSZip();
    for (const filePath of paths) {
      if (!filePath) continue;
      const { fullPath, safePath } = safeResolve(filePath);
      try {
        const data = await fs.readFile(fullPath);
        zip.file(safePath.replace(/\\/g, '/'), data);
      } catch {
        // skip missing files
      }
    }
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="matlance_files.zip"');
    res.setHeader('Content-Length', content.length);
    res.send(content);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to download files.' });
  }
};
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const folder = req.body.folder || '';
    const safeName = String(req.file.originalname || 'file').replace(/[^\w.\-]+/g, '_');
    const relativePath = path.join(folder, `${Date.now()}-${safeName}`);
    const { fullPath, safePath } = safeResolve(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, req.file.buffer);
    const stat = await fs.stat(fullPath);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      path: safePath.replace(/\\/g, '/'),
      name: safeName,
      size: stat.size,
      modifiedAt: stat.mtime,
      url: `${baseUrl}/uploads/${safePath.replace(/\\/g, '/')}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to upload file.' });
  }
};
