# Hikvision Face ID — avtomatik davomat (ketma-ket qo‘llanma)

Yuzdan o‘tgach **Django admin**da **Attendance (FaceID)** jadvalida yozuv paydo bo‘lishi uchun bajariladigan barcha qadamlar.

---

## 1. Bu nima qiladi (umumiy sxema)

1. **Hikvision terminal** (masalan DS-K1T343MWX) foydalanuvchini tanaydi va **hodisa** yaratadi.
2. **`listen_hikvision`** dasturi qurilmadan **doimiy oqim** (`alertStream`) orqali hodisani o‘qiydi.
3. Hodisadan **`employeeNo`** (yoki `employeeNoString` / `cardNo`) va **vaqt** olinadi.
4. Django API ga **POST** yuboriladi: `/api/attendance/hikvision/event/`.
5. Django **`Student.hikvision_employee_no`** bo‘yicha o‘quvchini topadi va **`Attendance`** yozuvini **`came`** holatida yaratadi.
6. **Bir xil o‘quvchi** uchun oxirgi **`came`** dan **5 daqiqa** ichida takror hodisa — **yangi qator yozilmaydi** (`Duplicate ignored`).

**Eslatma:** bu **kunlik dars davomati** (`StudentAttendance` — present/absent) emas; bu **FaceID / turniket** uchun alohida jadval — admin da **“FaceID davomati (Hikvision)” → Attendances**.

---

## 2. Oldindan shartlar

| # | Nima |
|---|------|
| 1 | Kompyuter va terminal **bir LAN** (masalan `192.168.1.x`). |
| 2 | Terminalda foydalanuvchi **yuz bilan** ro‘yxatdan o‘tgan bo‘lsin (hodisa kelishi uchun). |
| 3 | Loyiha ildizidagi **`.env`** to‘ldirilgan bo‘lsin (quyida). |
| 4 | Migratsiya bajarilgan: `python manage.py migrate`. |

---

## 3. `.env` sozlash (loyiha ildizi, `chatbot/.env`)

Quyidagilar **majburiy** (listener va Hikvisionga ulanish uchun):

```env
HIKVISION_IP=192.168.1.10
HIKVISION_USERNAME=admin
HIKVISION_PASSWORD=... qurilma paroli ...

DJANGO_ATTENDANCE_API_URL=http://127.0.0.1:8000/api/attendance/hikvision/event/
```

**Ixtiyoriy** — webhook himoyasi (bo‘sh qoldirsangiz, sarlavha tekshirilmaydi):

```env
HIKVISION_WEBHOOK_SECRET=uzun_tasodifiy_kalit
```

Agar `HIKVISION_WEBHOOK_SECRET` bo‘lsa, listener avtomatik **`X-Hikvision-Secret`** yuboradi — Django ham shu kalitni kutadi.

**Qurilmaga User yuborish** (admin harakati) uchun ham shu `HIKVISION_*` ishlatiladi; qo‘shimcha ixtiyoriy: `HIKVISION_PLAN_TEMPLATE_NO`, `HIKVISION_DOOR_NO`, … (`.env.example` ga qarang).

---

## 4. Django: migratsiya va server

```bash
cd backend
source marta/bin/activate   # yoki o‘z virtualenv
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

`runserver` **doim ochiq** turishi kerak (API ishlashi uchun).

---

## 5. O‘quvchini CRM va Face ID bilan bog‘lash

1. Brauzer: `http://127.0.0.1:8000/admin/`
2. **Students → Student** — kerakli o‘quvchini oching.
3. **`Hikvision employee no`** maydoniga terminaldagi **`employeeNo`** bilan **bir xil** qiymat yozing (masalan `1001`).
4. **Saqlang**.

**Ixtiyoriy:** agar foydalanuvchi terminal **User** ro‘yxatida avtomatik chiqmasa, **Students** ro‘yxatida o‘quvchini tanlab pastdan **«Tanlanganlarni Hikvision qurilmasiga yuborish (UserInfo)»** harakatini ishga tushiring (tarmoq va `.env` to‘g‘ri bo‘lishi kerak).

---

## 6. Listener: avtomatik davomatning “yuragi”

**Alohida terminal** oching ( `runserver` ni yopmang ):

```bash
cd backend
source marta/bin/activate
python manage.py listen_hikvision
```

Muvaffaqiyatli bo‘lsa, xabarlar orasida oqim ochilgani haqida yozuv bo‘ladi. Bu jarayon **to‘xtatilsa**, yangi hodisalar Django ga **ketmaydi** — davomat **to‘xtaydi**.

Ishlab turish usullari (production):

- `screen` / `tmux`
- yoki `systemd` servis
- yoki serverda fon jarayon

---

## 7. Tekshirish (yuzdan o‘tkazgandan keyin)

1. Listener terminalida **xato emas**, ba’zan **OK → Django** kabi qatorlar.
2. Admin: **FaceID davomati (Hikvision) → Attendances** — yangi qator: `student`, `employee_no`, `event_time`, `status=came`.
3. Bir necha marta ketma-ket o‘tsa — 5 daqiqa ichida **bitta** yozuv (takror e’tiborsiz qilinadi).

---

## 8. Hikvision tomonda (agar hodisa kelmasa)

Modellar farq qiladi; umumiy yo‘nalish:

- **Network / Advanced** — ISAPI ochiq bo‘lsin.
- **Event / Linkage / HTTP** (nomi farq qilishi mumkin) — **access / face / attendance** turidagi hodisalar yoqilgan bo‘lishi kerak bo‘lishi mumkin.
- **Vaqt zonasi** — Django `TIME_ZONE` bilan chalkashmasligi uchun terminal va server vaqti mantiqan yaqin bo‘lsin.

Agar `listen_hikvision` **hech qanday** `employee_no` topilmadi degan log bersa, qurilma yuborgan XML boshqa teglarda bo‘lishi mumkin — shu vaqt listener logidagi **XML qisqa snippet**ni saqlab qo‘ying.

---

## 9. Muammo — tez jadval

| Alomat | Tekshirish |
|--------|------------|
| Davomat umuman kelmaydi | `listen_hikvision` ishlayaptimi? `HIKVISION_IP` / parol? `runserver` ishlayaptimi? |
| 403 | `HIKVISION_WEBHOOK_SECRET` listener va `.env` da bir xilmi? |
| 404 student | `hikvision_employee_no` terminaldagi raqam bilan bir xilmi? (yoki `1` vs `001` — kod endi bir nechta raqamli variantni sinaydi.) |
| Qurilma taniydi, lekin Django da «keldi» yo‘q | **1)** Listener ishlamayaptimi. **2)** Terminal logda `employee_no topilmadi` bo‘lsa — hodisa XML boshqacha; `.env` ga **`HIKVISION_DEBUG_EVENTS=1`** qo‘ying, yuzdan o‘tib qayta tekshiring, logdagi `xml_snippet` ni saqlang. **3)** CRM dagi `hikvision_employee_no` aynan shu hodisadagi raqam bilan mos kelishi kerak (bo‘sh joy, boshqa format). |
| Duplicate ignored | Normal — 5 daqiqa ichida takror. |

### `HIKVISION_DEBUG_EVENTS=1`

Faqat nosozlik paytida yoqing. Listener har bir hodisa uchun qisqa XML chiqaradi — qaysi teglarda `employeeNo` turishini ko‘rish osonlashadi.
| User ro‘yxatida yo‘q | Admin harakati **Hikvision ga yuborish** yoki qurilma vebida qo‘lda qo‘shish. |

---

## 10. API (ixtiyoriy test)

```bash
curl -s -X POST "http://127.0.0.1:8000/api/attendance/hikvision/event/" \
  -H "Content-Type: application/json" \
  -H "X-Hikvision-Secret: SIZNING_KALIT" \
  -d '{"employee_no":"1001","event_time":"2026-05-15T10:00:00+05:00","device_ip":"192.168.1.10","raw_data":{}}'
```

`HIKVISION_WEBHOOK_SECRET` bo‘lmasa, `X-Hikvision-Secret` sarlavhasini olib tashlang.

---

## 11. Xulosa — ketma-ket nima qilish kerak

1. `.env` — `HIKVISION_*`, `DJANGO_ATTENDANCE_API_URL` (+ ixtiyoriy `HIKVISION_WEBHOOK_SECRET`).  
2. `migrate` + `runserver`.  
3. Admin — o‘quvchiga **`hikvision_employee_no`** = terminal **`employeeNo`**.  
4. Terminalda yuz ro‘yxatdan o‘tgan bo‘lsin.  
5. **`python manage.py listen_hikvision`** — doimiy ishga tushirish.  
6. Yuzdan o‘tish → admin **Attendances** da tekshirish.

Shu tartibda **Face ID o‘qigandan keyin davomat avtomatik** yoziladi.
