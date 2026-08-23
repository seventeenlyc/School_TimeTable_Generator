// preload.js — Electron 渲染进程预加载脚本
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  arch: process.arch,
});
