const { app, BrowserWindow, Menu, shell, dialog, session } = require("electron");
const path = require("path");

const APP_URL = process.env.CITYBOT_URL || "https://citybot.uz/";
const SAME_ORIGIN_HOSTNAMES = new Set(["citybot.uz", "www.citybot.uz"]);

let mainWindow = null;

function isInternal(urlString) {
  try {
    const u = new URL(urlString);
    return SAME_ORIGIN_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: "CityBot",
    backgroundColor: "#0f172a",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Tashqi havolalar — tashqi brauzerda ochiladi
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      mainWindow.loadURL(url);
    } else {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Yuklash xatolarida foydalanuvchiga aniq xabar
  mainWindow.webContents.on("did-fail-load", (_e, errCode, errDesc, validatedUrl) => {
    if (errCode === -3 /* ABORTED */) return;
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>CityBot — ulanishda xato</title>
          <style>
            body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
                   background:#0f172a; color:#e2e8f0; display:flex; align-items:center;
                   justify-content:center; height:100vh; margin:0; }
            .box { max-width: 480px; padding: 32px; background:#1e293b;
                   border-radius: 16px; text-align:center; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            p { color:#94a3b8; font-size:14px; line-height:1.5; }
            button { margin-top: 20px; padding: 10px 20px; background:#0891b2;
                     color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px; }
            button:hover { background:#0e7490; }
            code { background:#334155; padding:2px 6px; border-radius:4px; font-size:12px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>🌆 CityBot — sayt yuklanmadi</h1>
            <p>Internet aloqasini tekshiring yoki bir oz keyin qayta urinib ko'ring.</p>
            <p><code>${errDesc} (${errCode})</code></p>
            <button onclick="location.reload()">Qayta urinish</button>
          </div>
        </body>
      </html>
    `;
    mainWindow.webContents.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "CityBot haqida" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: "Yashirish" },
              { role: "hideOthers", label: "Boshqalarni yashirish" },
              { role: "unhide", label: "Hammasini ko'rsatish" },
              { type: "separator" },
              { role: "quit", label: "Chiqish" },
            ],
          },
        ]
      : []),
    {
      label: "Fayl",
      submenu: [
        {
          label: "Bosh sahifa",
          accelerator: "CmdOrCtrl+H",
          click: () => mainWindow && mainWindow.loadURL(APP_URL),
        },
        {
          label: "Brauzerda ochish",
          click: () => shell.openExternal(APP_URL),
        },
        { type: "separator" },
        isMac ? { role: "close", label: "Yopish" } : { role: "quit", label: "Chiqish" },
      ],
    },
    {
      label: "Tahrirlash",
      submenu: [
        { role: "undo", label: "Bekor qilish" },
        { role: "redo", label: "Qayta bajarish" },
        { type: "separator" },
        { role: "cut", label: "Kesish" },
        { role: "copy", label: "Nusxalash" },
        { role: "paste", label: "Joylash" },
        { role: "selectAll", label: "Hammasini tanlash" },
      ],
    },
    {
      label: "Ko'rinish",
      submenu: [
        { role: "reload", label: "Yangilash" },
        { role: "forceReload", label: "Kuchli yangilash" },
        { type: "separator" },
        { role: "resetZoom", label: "Standart o'lcham" },
        { role: "zoomIn", label: "Kattalashtirish" },
        { role: "zoomOut", label: "Kichiklashtirish" },
        { type: "separator" },
        { role: "togglefullscreen", label: "To'liq ekran" },
      ],
    },
    {
      label: "Yordam",
      submenu: [
        {
          label: "Saytni ochish",
          click: () => shell.openExternal("https://citybot.uz"),
        },
        {
          label: "Telegram bot",
          click: () => shell.openExternal("https://t.me/"),
        },
        { type: "separator" },
        {
          label: "Versiya haqida",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "CityBot",
              message: "CityBot Desktop",
              detail:
                `Versiya: ${app.getVersion()}\n` +
                `Electron: ${process.versions.electron}\n` +
                `Sayt: ${APP_URL}\n\n` +
                "© 2026 CityBot",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Yagona instansga ruxsat — ikkinchi marta ochilsa, mavjud oyna fokuslanadi
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // O'zbekiston uchun User-Agent — sayt mobil emas, desktop versiyani ochishi uchun
  try {
    session.defaultSession.setUserAgent(
      `${session.defaultSession.getUserAgent()} CityBotDesktop/${app.getVersion()}`,
    );
  } catch {}

  createWindow();
  buildMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
