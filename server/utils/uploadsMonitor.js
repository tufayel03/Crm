const fs = require('fs/promises');
const path = require('path');

const getDirSize = async (dir) => {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(fullPath);
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      total += stat.size;
    }
  }
  return total;
};

const bytesToGb = (bytes) => Math.round((bytes / (1024 ** 3)) * 100) / 100;

const startUploadsMonitor = async ({
  uploadsDir,
  warnBytes = 5 * 1024 * 1024 * 1024,
  intervalMs = 60 * 60 * 1000,
  onWarn = (msg) => console.warn(msg)
} = {}) => {
  if (!uploadsDir) return;

  const check = async () => {
    try {
      await fs.access(uploadsDir);
      const size = await getDirSize(uploadsDir);
      if (size >= warnBytes) {
        onWarn(`[uploads] Storage warning: ${bytesToGb(size)} GB used in ${uploadsDir}.`);
      }
    } catch {
      // Ignore missing directory
    }
  };

  await check();
  setInterval(check, intervalMs);
};

module.exports = { startUploadsMonitor };
