# CityBot Desktop

`citybot.uz` saytini Windows / macOS / Linux uchun desktop ilova qiluvchi Electron wrapper.

Foydalanuvchi shu ilovani o'rnatsa, brauzersiz, ish stoli ikonkasidan to'g'ridan-to'g'ri CityBot ga kiradi.

---

## Imkoniyatlar

- 🖥 **Native oyna** — minimal o'lcham 960×600, default 1280×820
- 🌐 **citybot.uz** ni yuklaydi (URL'ni env orqali o'zgartirish mumkin)
- 🔐 **Xavfsiz**: `contextIsolation`, `sandbox: true`, Node API saytga ochilmaydi
- 🔗 **Tashqi havolalar** — sayt ichidagi tashqi linklar tizim brauzerida ochiladi
- 🧩 **Bitta instans** — ilova ikkinchi marta ochilsa, mavjud oyna fokuslanadi
- 🌍 **O'zbek tilida menyu** — Fayl, Tahrirlash, Ko'rinish, Yordam
- 📦 **Auto-builder**: macOS (DMG), Windows (NSIS Installer), Linux (AppImage, deb)
- 🚦 **Offline fallback**: internet uzilsa, chiroyli xato sahifa va "Qayta urinish" tugmasi

---

## Talablar

- **Node.js** 18+ (LTS tavsiya etiladi)
- **npm** yoki **yarn**

---

## O'rnatish va ishga tushirish (dev)

```bash
cd desktop
npm install
npm start
```

Ilova ochiladi va `citybot.uz` ni yuklaydi.

### Boshqa URL bilan sinash

```bash
CITYBOT_URL=http://localhost:5173 npm start
# yoki
CITYBOT_URL=https://staging.citybot.uz npm start
```

---

## Buildlash (production)

Har bir komandadan keyin `desktop/dist/` papkasiga tayyor o'rnatuvchi fayllar tushadi.

### macOS (DMG + zip, x64 va arm64)

```bash
npm run build:mac
```

Natija: `dist/CityBot-1.0.0-mac.dmg` (Intel + Apple Silicon)

> Notarization uchun Apple Developer hisobi va kod imzosi kerak. Ichki tarqatish uchun shart emas, lekin foydalanuvchiga "Open Anyway" qilish kerak bo'ladi (System Preferences → Privacy & Security).

### Windows (NSIS Installer + portable)

```bash
npm run build:win
```

> Windows'ga maxsus build qilish uchun macOS'da [wine](https://formulae.brew.sh/cask/wine-stable) yoki Windows mashinasi yoki Docker (`electronuserland/builder:wine`) kerak bo'ladi.

Natija:
- `dist/CityBot-Setup-1.0.0.exe` — installer
- `dist/CityBot-1.0.0-portable.exe` — portativ (o'rnatishsiz)

### Linux (AppImage + deb)

```bash
npm run build:linux
```

Natija:
- `dist/CityBot-1.0.0.AppImage`
- `dist/citybot_1.0.0_amd64.deb`

### Hammasi birdaniga (Mac, Win, Linux)

```bash
npm run build:all
```

> Bu komanda macOS'da ishlaydi. Windows builds uchun wine yoki Docker kerak.

---

## Struktura

```
desktop/
├── package.json          # Bog'liqliklar va electron-builder konfiguratsiyasi
├── src/
│   ├── main.js           # Asosiy jarayon (oyna yaratish, menyu, navigatsiya)
│   └── preload.js        # Xavfsiz preload (HTML'ga belgi qo'yadi)
├── build/
│   └── icon.png          # Ilova ikonkasi (1024×1024 PNG)
├── dist/                 # Build natijalari (gitignore)
├── README.md
└── .gitignore
```

---

## Sozlash

### URL o'zgartirish

`src/main.js` faylidagi:

```javascript
const APP_URL = process.env.CITYBOT_URL || "https://citybot.uz/";
```

Yoki environment orqali (vaqtinchalik):

```bash
CITYBOT_URL=https://test.citybot.uz npm start
```

### Ikonkani o'zgartirish

`build/icon.png` faylini o'zgartiring (kamida 512×512, yaxshisi 1024×1024 PNG).

- **macOS**: PNG yetadi (electron-builder ichida `.icns` qiladi)
- **Windows**: PNG yoki `icon.ico` (256×256 ichida bo'lishi shart)
- **Linux**: PNG

### Mahalliy versiyani test qilish

`package.json` da `version` ni o'zgartiring (`1.0.1` va h.k.) — keyin yangi build.

### Auto-update

Hozircha auto-update yo'q. Kerak bo'lsa `electron-updater` ulaymiz va GitHub Releases yoki S3 ga release qo'yamiz.

---

## Foydalanuvchi nuqtai nazaridan

1. **Yuklab oladi** — `CityBot-Setup-1.0.0.exe` (Win) yoki `.dmg` (Mac) yoki `.AppImage` (Linux)
2. **O'rnatadi** — 2-3 marta keyingisi
3. **Ish stolida ikonka** — bosadi → CityBot oynasi ochiladi
4. **Login qiladi** — odatdagidek
5. **Brauzersiz ishlatadi** — chrome / safari kerak emas

Bu juda foydali fitness zal egalari, ofis xodimlari uchun — bitta klik bilan dasturga kirishadi.

---

## FAQ

**1. Ilova ichida sayt yangilanganda nima bo'ladi?**  
Sayt avtomatik yangilanadi — chunki bu wrapper, real sayt server'da. Ilovani qayta o'rnatish kerak emas.

**2. Ilova haqida hech narsa keshlash mumkinmi?**  
Hozircha yo'q — sayt onlayn ishlaydi. Service Worker yoki PWA cache xohlasak qo'shamiz.

**3. Telegram WebApp ham shu ilovada ishlaydimi?**  
Yo'q — Telegram WebApp Telegramning ichida ishlaydi. Bu alohida desktop ilova.

**4. Auto-update bormi?**  
Hozircha yo'q. Kerak bo'lsa qo'shamiz (`electron-updater` + GitHub Releases yoki o'z server'ingiz).

**5. Mac App Store yoki Microsoft Store'ga qo'yish mumkinmi?**  
Mumkin, lekin qo'shimcha sozlash kerak (kod imzosi, sertifikatlar, profillar). Hozir ichki tarqatish uchun mo'ljallangan.

**6. Saytdan tashqari hech narsa kerakmasmi?**  
Yo'q. Bu — chiroyli wrapper. Faqat sayt yuklaydi.

---

## Texnik tafsilotlar

- **Electron**: 33.x (latest stable as of 2026-05)
- **Node**: bundled in Electron
- **electron-builder**: 25.x
- **Asar**: yoqilgan (manba kodi to'plamga o'raladi)
- **Sandbox**: yoqilgan (xavfsizlik)
- **Context Isolation**: yoqilgan
- **Node Integration**: o'chirilgan
- **User-Agent**: `... CityBotDesktop/1.0.0` (sayt buni o'qib alohida ko'rsata oladi)

---

*Savol bo'lsa: info@citybot.uz*
