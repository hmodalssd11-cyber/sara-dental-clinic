const path = require('path');
const { app, BrowserWindow } = require('electron');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const isDev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const appRoot = path.resolve(__dirname, '..');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startNextAndCreateWindow() {
  const nextApp = next({ dev: isDev, dir: appRoot });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl).catch((error) => {
      console.error('Next request handler error:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  });

  server.listen(port, '127.0.0.1', () => {
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

app.whenReady().then(startNextAndCreateWindow).catch((error) => {
  console.error('Failed to start Electron app:', error);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
