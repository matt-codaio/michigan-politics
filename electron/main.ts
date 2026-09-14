import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, shell } from "electron";
import { ensureLocalDirs, handleLocalRequest, setLocalRoot } from "../vite/local-http.ts";

const APP_NAME = "Michigan Voting Explorer";
app.setName(APP_NAME);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const DEV_URL = "http://127.0.0.1:5173";
const DEFAULT_PORT = 5174;
const BG = "#f3efe6";

const STATIC_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

let viteChild: ChildProcess | null = null;
let httpServer: http.Server | null = null;

function isDev(): boolean {
  return process.env.ELECTRON_DEV === "1";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function urlIsUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await urlIsUp(url)) return;
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function buildUiSync(): void {
  const index = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(index)) return;
  const viteCli = path.join(REPO_ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!fs.existsSync(viteCli)) {
    throw new Error("Vite is not installed. Run npm install in the repo.");
  }
  const result = spawnSync(process.execPath, [viteCli, "build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("UI build failed. Run npm run build.");
  }
}

function startVite(): ChildProcess {
  const viteCli = path.join(REPO_ROOT, "node_modules", "vite", "bin", "vite.js");
  return spawn(process.execPath, [viteCli, "--port", "5173", "--strictPort"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function sendFile(res: http.ServerResponse, filePath: string, method: string): void {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", STATIC_MIME[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  if (method === "HEAD") {
    res.setHeader("Content-Length", String(stat.size));
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function startAppServer(): Promise<string> {
  ensureLocalDirs();
  const indexPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Missing dist/index.html. Run npm run build.");
  }

  const distRoot = DIST_DIR.endsWith(path.sep) ? DIST_DIR : DIST_DIR + path.sep;

  const server = http.createServer((req, res) => {
    if (handleLocalRequest(req, res)) return;

    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    const pathname = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
    const candidate = path.resolve(DIST_DIR, relative);
    if (candidate !== DIST_DIR && !candidate.startsWith(distRoot)) {
      res.statusCode = 400;
      res.end("Invalid path");
      return;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      sendFile(res, candidate, method);
      return;
    }

    sendFile(res, indexPath, method);
  });

  httpServer = server;

  return new Promise((resolve, reject) => {
    const tryListen = (port: number) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.off("error", onError);
        if (err.code === "EADDRINUSE" && port !== 0) {
          tryListen(0);
          return;
        }
        reject(err);
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", onError);
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Server did not bind a port"));
          return;
        }
        resolve(`http://127.0.0.1:${address.port}`);
      });
    };
    tryListen(DEFAULT_PORT);
  });
}

function openExternal(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
  } catch {
    return;
  }
  void shell.openExternal(url);
}

function attachWindowHandlers(win: BrowserWindow, appOrigin: string): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(appOrigin)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 560,
          height: 780,
          backgroundColor: BG,
          webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      };
    }
    openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appOrigin)) return;
    event.preventDefault();
    openExternal(url);
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: BG,
    title: APP_NAME,
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  return win;
}

function macAppMenu(): Electron.MenuItemConstructorOptions {
  return {
    label: APP_NAME,
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit" },
    ],
  };
}

function installMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu()] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function loadUi(win: BrowserWindow): Promise<string> {
  if (isDev()) {
    if (!(await urlIsUp(DEV_URL))) {
      viteChild = startVite();
      viteChild.on("exit", (code) => {
        if (code && code !== 0) {
          console.error(`Vite exited with code ${code}`);
        }
      });
      await waitForUrl(DEV_URL, 40_000);
    }
    await win.loadURL(DEV_URL);
    return DEV_URL;
  }

  buildUiSync();
  const origin = await startAppServer();
  await win.loadURL(origin);
  return origin;
}

function shutdown(): void {
  viteChild?.kill();
  viteChild = null;
  httpServer?.close();
  httpServer = null;
}

async function main(): Promise<void> {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.setAboutPanelOptions({ applicationName: APP_NAME });
  setLocalRoot(path.join(REPO_ROOT, "local"));
  ensureLocalDirs();

  await app.whenReady();
  installMenu();

  const win = createWindow();
  const origin = await loadUi(win);
  attachWindowHandlers(win, origin);

  app.on("second-instance", () => {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createWindow();
      attachWindowHandlers(next, origin);
      void next.loadURL(origin);
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  shutdown();
});

void main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  app.quit();
});
