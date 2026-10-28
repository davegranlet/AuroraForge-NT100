const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aurora', {
  pickFile: filters => ipcRenderer.invoke('pick-file', filters),
  pickSave: () => ipcRenderer.invoke('pick-save'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  pickFbxSave: () => ipcRenderer.invoke('pick-fbx-save'),
  patreonStatus: () => ipcRenderer.invoke('patreon-status'),
  verifyPatreon: args => ipcRenderer.invoke('verify-patreon', args),
  convert: args => ipcRenderer.invoke('convert', args),
  buildPackage: args => ipcRenderer.invoke('build-package', args),
  exportFbx: args => ipcRenderer.invoke('export-fbx', args),
  onLog: fn => ipcRenderer.on('convert-log', (_, text) => fn(text)),
});
