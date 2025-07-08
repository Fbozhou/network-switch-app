// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ylzNetworkAPI', {
  getStatus: async () => await ipcRenderer.invoke('get-status'),
  toggleMode: async () => await ipcRenderer.invoke('toggle-mode'),
  toggleAlwaysOnTop: async () =>
    await ipcRenderer.invoke('toggle-always-on-top'),
})
