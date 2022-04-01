const path = require('path');
const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
const { app, BrowserWindow } = electron;

// Set operating environment
process.env.NODE_ENV = process.argv.includes('--dev') ? 'development' : 'production';

let production = process.env.NODE_ENV === 'production';

// Enable live reload for all the files inside the project directory
!production && require('electron-reload')(__dirname);

/**  
 * Store the main window object publicly so it's not garbage-collected.
 * @type {electron.BrowserWindow} 
 */ 
let mainWindow; 

const createWindow = () => {

    // Load the previous state of the window (size/position) with fallback to defaults
    let mainWinState = windowStateKeeper({
        defaultWidth: 800,
        defaultHeight: 600,
    });

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: mainWinState.width,
        height: mainWinState.height,
        minWidth: 700,
        minHeight: 550,
        x: mainWinState.x,
        y: mainWinState.y,
        frame: true,
        icon: path.join(__dirname, './app/favicon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            preload: path.join(__dirname, './backend/preload.js')
        }
    });   
  
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'app/index.html'));

    // Open the DevTools.
    !production && mainWindow.webContents.openDevTools();
    
    // Register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the size.
    mainWinState.manage(mainWindow); 
};   
  
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);
  
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') {
        app.quit();
    } 
}); 

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

