# Face ID — faqat 3 qadam (tushunarli)

## 1) Bitta skriptni ishga tushiring

Terminalda (loyiha `chatbot` papkasida):

```bash
chmod +x scripts/start-hikvision-attendance.sh
./scripts/start-hikvision-attendance.sh
```

Yoki:

```bash
bash scripts/start-hikvision-attendance.sh
```

Bu **Django** (8000-port) va **Hikvision tinglovchini** birga yoqadi. **To‘xtatish:** `Ctrl+C`.

> Agar `marta` virtual muhit bo‘lmasa, avval: `cd backend && python3.11 -m venv marta && source marta/bin/activate && pip install -r requirements.txt`

---

## 2) O‘quvchini raqam bilan bog‘lang

Brauzer: **http://127.0.0.1:8000/admin/**

**Students →** o‘quvchini oching → **`Hikvision employee no`** maydoniga qurilmadagi **employeeNo** bilan **bir xil** raqam yozing → **Saqlang**.

---

## 3) «Keldi» qayerda ko‘rinadi

Admin: **FaceID davomati (Hikvision) → Attendances**

Yuzdan o‘tgach bir necha soniya ichida yangi qator paydo bo‘lishi kerak.

---

**Ishlamasa:** `.env` da `HIKVISION_WEBHOOK_SECRET` bo‘lsa, listener avtomatik yuboradi — kalit noto‘g‘ri bo‘lsa ishlamaydi. Vaqtincha secret qatorini `.env` dan olib tashlab sinab ko‘ring.

Batafsil: `backend/docs/HIKVISION_AUTOMATIK_DAVOMAT.md`
