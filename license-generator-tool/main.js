const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { generateSignedLicense } = require('./generator');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 820,
    minWidth: 700,
    minHeight: 650,
    title: 'MARTPOS Master License Generator (Developer Edition)',
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('generate-license', async (_, input) => {
    try {
      const result = generateSignedLicense(input);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  });

  ipcMain.handle('copy-to-clipboard', async (_, text) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-license-file', async (_, defaultFilename, content) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Customer License JSON',
        defaultPath: defaultFilename,
        filters: [
          { name: 'JSON License File', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
