const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveConfig: (config) => ipcRenderer.send("save-config", config),
  openExternal: (url) => shell.openExternal(url),
});
