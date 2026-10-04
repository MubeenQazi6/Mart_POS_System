const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseApi', {
  generateLicense: (input) => ipcRenderer.invoke('generate-license', input),
  saveLicenseFile: (defaultFilename, content) => ipcRenderer.invoke('save-license-file', defaultFilename, content),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
});
