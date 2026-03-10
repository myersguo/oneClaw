import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fork, ChildProcess, execSync } from 'child_process';
import getPort from 'get-port';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const startBackend = async (): Promise<number> => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) return 3000; // In dev, we assume backend is running on 3000

  // Find a free port
  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004, 3005] });

  // In production, the backend dist is unpacked from asar to app.asar.unpacked/dist-backend/index.js
  // For paths that need to be unpacked (native modules), we need to check if .asar.unpacked exists
  let backendPath = path.join(__dirname, '..', 'dist-backend', 'index.js');
  const unpackedPath = backendPath.replace('app.asar', 'app.asar.unpacked');
  if (fs.existsSync(unpackedPath)) {
    backendPath = unpackedPath;
    console.log('Using unpacked backend path:', backendPath);
  }
  
  // Calculate frontend path relative to backend path in asar
  // main.js is in /dist/, backend in /dist-backend/, frontend in /frontend/dist/
  // So from main.js to frontend is ../frontend/dist
  // We need to pass absolute path to backend
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  
  console.log('Starting backend from:', backendPath);
  console.log('Frontend path:', frontendPath);
  console.log('Backend port:', port);
  
  // Set DB path to userData
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'oneclaw.db');
  
  // Fix PATH for macOS to include common locations for node/npm/openclaw
  // Electron apps launched from Finder/Dock don't inherit shell PATH
  const PATH_SEPARATOR = process.platform === 'win32' ? ';' : ':';
  const homeDir = app.getPath('home');
  
  // 1. Common paths
  const commonPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/local/bin',
    path.join(homeDir, '.npm-global', 'bin'),
    path.join(homeDir, '.bun', 'bin'), // Added bun
    path.join(homeDir, 'go', 'bin'),   // Added go
  ];

  // 1.1 Attempt to find NVM node path
  try {
    const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvmDir)) {
        const versions = fs.readdirSync(nvmDir).filter(f => f.startsWith('v'));
        // Simple sort by version (string sort is roughly ok for v22 vs v18, but strictly should be semver)
        // v22.21.1 > v18.x.x. Let's just sort and take the last one (lexicographically v22 > v18)
        versions.sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        if (versions.length > 0) {
            const latestVersion = versions[versions.length - 1];
            const nvmBin = path.join(nvmDir, latestVersion, 'bin');
            commonPaths.push(nvmBin);
            logToFile(`Detected NVM Node Path: ${nvmBin}`);
        }
    }
  } catch (e) {
    logToFile(`Failed to detect NVM path: ${e}`);
  }

  // 2. Try to get PATH from user shell
  let shellPath = '';
  if (process.platform !== 'win32') {
    try {
        const userShell = process.env.SHELL || '/bin/zsh';
        // Use a timeout to prevent hanging
        // Try interactive + login shell to ensure .zshrc/.bashrc is loaded
        // We filter the output to find the line that looks like a PATH
        const shellOutput = execSync(`${userShell} -l -i -c 'echo "PATH_START"; echo $PATH; echo "PATH_END"'`, { 
            encoding: 'utf-8', 
            timeout: 3000,
            stdio: ['ignore', 'pipe', 'ignore'] // ignore stdin/stderr
        });
        
        // Extract content between markers
        const match = shellOutput.match(/PATH_START\s+([\s\S]*?)\s+PATH_END/);
        if (match && match[1]) {
            shellPath = match[1].trim();
            logToFile(`Detected Shell PATH (Interactive): ${shellPath}`);
        } else {
            // Fallback to simple trim if markers missed (unlikely)
            shellPath = shellOutput.trim();
        }
    } catch (e: any) {
        logToFile(`Failed to detect shell PATH: ${e.message}`);
    }
  }

  const currentPath = process.env.PATH || '';
  
  // Combine paths: Shell PATH > Common Paths > Current PATH
  // Use Set to remove duplicates
  const pathSet = new Set<string>();
  
  if (shellPath) {
    shellPath.split(PATH_SEPARATOR).forEach(p => p && pathSet.add(p));
  }
  
  commonPaths.forEach(p => pathSet.add(p));
  currentPath.split(PATH_SEPARATOR).forEach(p => p && pathSet.add(p));
  
  const newPath = Array.from(pathSet).join(PATH_SEPARATOR);
  
  logToFile(`Final Modified PATH: ${newPath}`);

  const env = { 
    ...process.env, 
    NODE_ENV: 'production',
    DB_PATH: dbPath,
    PORT: port.toString(),
    FRONTEND_PATH: frontendPath,
    PATH: newPath
  };

  backendProcess = fork(backendPath, [], {
    env,
    silent: true
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data) => {
      logToFile(`Backend STDOUT: ${data.toString()}`);
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data) => {
      logToFile(`Backend STDERR: ${data.toString()}`);
    });
  }

  backendProcess.on('message', (msg) => {
    console.log('Backend message:', msg);
  });
  
  backendProcess.on('error', (err) => {
    console.error('Backend failed to start:', err);
    logToFile(`Backend failed to start: ${err.message}`);
  });
  
  backendProcess.on('exit', (code, signal) => {
    logToFile(`Backend process exited with code ${code} and signal ${signal}`);
  });
  
  return port;
};

const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Log to userData
  try {
    const logPath = path.join(app.getPath('userData'), 'main.log');
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    // Ignore error
  }
  
  // Log to tmp for debugging
  try {
    fs.appendFileSync('/tmp/oneclaw-startup.log', logMessage);
  } catch (e) {
    // Ignore
  }
};

const createWindow = async (): Promise<void> => {
  logToFile('App starting...');
  // Start backend service
  let port = 3000;
  try {
    port = await startBackend();
    logToFile(`Backend started on port ${port}`);
  } catch (err: any) {
    logToFile(`Failed to start backend: ${err.message}`);
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Determine the start URL
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the local Express server
    // Since we are bundling the backend, it will be running on localhost:PORT
    // We wait a bit for backend to be ready
    setTimeout(() => {
        if (mainWindow) {
            const url = `http://localhost:${port}`;
            logToFile(`Loading URL: ${url}`);
            mainWindow.loadURL(url).catch((e: Error) => {
                logToFile(`Failed to load URL: ${e.message}`);
                // Retry once
                setTimeout(() => {
                    logToFile(`Retrying URL load...`);
                    mainWindow?.loadURL(url).catch((err: Error) => {
                        logToFile(`Retry failed: ${err.message}`);
                    });
                }, 3000);
            });
        }
    }, 1000);
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler((details: { url: string }) => {
    const { url } = details;
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
