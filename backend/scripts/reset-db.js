import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..');
const files = ['data.db', 'data.db-wal', 'data.db-shm'];

function deleteIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Deleted:', path.basename(filePath));
    }
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error('Database is locked. Stop the backend (port 3001) and try again.');
      console.error('On Windows: netstat -ano | findstr :3001  then  taskkill /PID <pid> /F');
      process.exit(1);
    }
    throw err;
  }
}

for (const name of files) {
  deleteIfExists(path.join(backendDir, name));
}
console.log('Database files removed.');
