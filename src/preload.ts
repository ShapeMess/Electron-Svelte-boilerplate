
import { contextBridge } from 'electron';

// Specify all your dangerous stuff here
// and expose it safely using contextBridge.

// Access app.env globally in the content script
contextBridge.exposeInMainWorld('app', {
    env: process.env.NODE_ENV 
});

console.log('Hello, this is the preload script!');

