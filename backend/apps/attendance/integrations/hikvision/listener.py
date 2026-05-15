"""
Hikvision ISAPI `alertStream` tinglovchisi.

Qanday ishlaydi:
- LAN orqali `GET http://<HIKVISION_IP>/ISAPI/Event/notification/alertStream` — HTTP Digest auth.
- Javob odatda `multipart/x-mixed-replace` yoki uzluksiz XML oqimi bo‘ladi; bufferda
  `<EventNotificationAlert>...</EventNotificationAlert>` bloklari ajratiladi.
- XML dan `employeeNo` / `employeeNoString` / `cardNo` va `dateTime` / `time` chiqariladi.
- `employee_no` qiymati Django `Student.hikvision_employee_no` maydoni bilan mos kelishi kerak.
- POST `DJANGO_ATTENDANCE_API_URL` ga JSON yuboriladi; server `Attendance` yozuvini yaratadi
  yoki 5 daqiqalik takrorlarni e’tiborsiz qoldiradi.

Xavfsizlik: parollar kodda emas, faqat `.env` orqali. Yuz rasmini saqlamaymiz — `raw_data` faqat
kichik teglar / snippet (rasmli/binary teglar kesib tashlanadi).
"""

from __future__ import annotations

import json
import logging
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Callable

import requests
from requests.auth import HTTPDigestAuth

LogFn = Callable[[str], None]

logger = logging.getLogger(__name__)

# ISAPI oqimidan keladigan voqealar — to‘liq blokni ushlab parslash.
_EVENT_OPEN = re.compile(rb"<\s*EventNotificationAlert\b", re.I)
_EVENT_CLOSE = re.compile(rb"</\s*EventNotificationAlert\s*>", re.I)

# `raw_data` ga kiritilmasin (yuz / binary).
_SKIP_RAW_TAGS = frozenset(
    {
        "picture",
        "snappicture",
        "binarydata",
        "facesnapurl",
        "faceurl",
        "photourl",
        "smallpicurl",
    }
)


def _local_tag(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


# Hodisada ishlatiladigan teglar (proshivkaga qarab farq qiladi).
_EMPLOYEE_TAGS = frozenset(
    {
        "employeeno",
        "employeenostring",
        "cardno",
        "workerno",
        "personno",
        "employeeid",
        "optno",
        "userid",
        "fpid",
        "staffid",
    }
)


def _walk_json_for_employee(obj: object) -> str | None:
    """JSON ichidan birinchi mos keladigan xodim identifikatorini qidiradi."""
    if isinstance(obj, dict):
        for k in (
            "employeeNoString",
            "employeeNo",
            "cardNo",
            "FPID",
            "workerNo",
            "personNo",
        ):
            v = obj.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        for v in obj.values():
            found = _walk_json_for_employee(v)
            if found:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = _walk_json_for_employee(v)
            if found:
                return found
    return None


def _extract_employee_regex(xml_text: str) -> str | None:
    """XML matnidan namespace bilan ham teglarni ushlab olish (ET ba'zan matnni o'tkazib yuboradi)."""
    patterns = (
        r"<(?:\w+:)?employeeNoString>\s*([^<]+?)\s*</(?:\w+:)?employeeNoString>",
        r"<(?:\w+:)?employeeNo>\s*([^<]+?)\s*</(?:\w+:)?employeeNo>",
        r"<(?:\w+:)?cardNo>\s*([^<]+?)\s*</(?:\w+:)?cardNo>",
        r"<(?:\w+:)?FPID>\s*([^<]+?)\s*</(?:\w+:)?FPID>",
    )
    for pat in patterns:
        m = re.search(pat, xml_text, re.I | re.DOTALL)
        if m:
            s = m.group(1).strip()
            if s:
                return s
    return None


def _parse_event_xml(xml_bytes: bytes) -> tuple[str | None, str | None, dict]:
    """
    XML dan employee raqami, vaqt va xavfsiz `raw_data` lug‘atini chiqaradi.
    Returns: (employee_no, iso_datetime_or_None, raw_dict)
    """
    raw_dict: dict = {}
    text = xml_bytes.decode("utf-8", errors="replace")

    # Ba'zi proshivkalar to'liq blokni JSON qilib yuboradi.
    stripped = text.strip()
    if stripped.startswith("{"):
        try:
            j = json.loads(stripped)
            emp_j = _walk_json_for_employee(j)
            if emp_j:
                raw_dict["_format"] = "json"
                return emp_j, None, raw_dict
        except json.JSONDecodeError:
            pass

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        logger.warning("XML parse xatosi: %s", e)
        emp_rx = _extract_employee_regex(text)
        return emp_rx, None, {"parse_error": str(e), "regex_fallback": bool(emp_rx)}

    employee_no: str | None = None
    by_tag: dict[str, str] = {}
    for el in root.iter():
        t = _local_tag(el.tag).lower()
        if t in _EMPLOYEE_TAGS and el.text and el.text.strip():
            by_tag.setdefault(t, el.text.strip())
        # Ba'zan identifikator atributda (matn emas).
        for ak, av in el.attrib.items():
            al = ak.lower()
            if any(x in al for x in ("employee", "cardno", "fpid")) and av and str(av).strip():
                by_tag.setdefault(f"@{al}", str(av).strip())

    employee_no = (
        by_tag.get("employeeno")
        or by_tag.get("employeenostring")
        or by_tag.get("cardno")
        or by_tag.get("fpid")
        or by_tag.get("workerno")
        or by_tag.get("personno")
        or by_tag.get("employeeid")
    )
    if not employee_no:
        for k, v in by_tag.items():
            if k.startswith("@") and v:
                employee_no = v
                break

    if not employee_no:
        employee_no = _extract_employee_regex(text)

    event_dt: datetime | None = None
    dt_text: str | None = None
    for el in root.iter():
        t = _local_tag(el.tag)
        if t == "dateTime" and el.text and el.text.strip():
            dt_text = el.text.strip()
            break
    if dt_text is None:
        for el in root.iter():
            t = _local_tag(el.tag)
            if t == "time" and el.text and el.text.strip():
                dt_text = el.text.strip()
                break

    if dt_text:
        try:
            if dt_text.endswith("Z"):
                event_dt = datetime.fromisoformat(dt_text.replace("Z", "+00:00"))
            else:
                event_dt = datetime.fromisoformat(dt_text)
        except ValueError:
            logger.warning("Sana/vaqt formati tushunarsiz: %s", dt_text)

    # Debug: kichik matnli teglar (rasmsiz).
    for el in root.iter():
        tag = _local_tag(el.tag)
        if tag.lower() in _SKIP_RAW_TAGS:
            continue
        if el.text and el.text.strip():
            txt = el.text.strip()
            if len(txt) > 400:
                txt = txt[:400] + "…"
            raw_dict.setdefault(tag, txt)
        if len(raw_dict) >= 40:
            break

    iso = event_dt.isoformat() if event_dt else None
    return employee_no, iso, raw_dict


def _extract_event_blocks(buffer: bytearray) -> list[bytes]:
    """Buffer dan to‘liq EventNotificationAlert bloklarini ajratadi; buffer yangilanadi."""
    out: list[bytes] = []
    if not buffer:
        return out
    data = bytes(buffer)
    pos = 0
    while True:
        m_open = _EVENT_OPEN.search(data, pos)
        if not m_open:
            del buffer[:pos]
            if len(buffer) > 200_000:
                del buffer[:-100_000]
            return out
        start = m_open.start()
        m_close = _EVENT_CLOSE.search(data, m_open.end())
        if not m_close:
            # To‘liq blok hali kelmagan — boshini saqlab qolamiz.
            del buffer[:start]
            return out
        end = m_close.end()
        out.append(data[start:end])
        pos = end
        if pos >= len(data):
            del buffer[:pos]
            return out


def _env(name: str, default: str = "") -> str:
    import os

    return (os.getenv(name) or default).strip()


def _post_to_django(
    employee_no: str,
    event_iso: str,
    device_ip: str,
    raw_data: dict,
    api_url: str,
    secret: str | None,
) -> None:
    payload = {
        "employee_no": employee_no,
        "event_time": event_iso,
        "device_ip": device_ip,
        "raw_data": raw_data,
    }
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Hikvision-Secret"] = secret
    r = requests.post(api_url, json=payload, headers=headers, timeout=60)
    r.raise_for_status()


def _handle_one_event(xml_bytes: bytes, device_ip: str, api_url: str, secret: str | None, log: LogFn) -> None:
    debug = _env("HIKVISION_DEBUG_EVENTS", "0").lower() in ("1", "true", "yes")
    emp, iso, raw = _parse_event_xml(xml_bytes)
    if debug:
        snippet = xml_bytes[:1800].decode("utf-8", errors="replace")
        log(f"[hikvision][debug] parsed employee_no={emp!r} event_time={iso!r} raw_keys={list(raw.keys())[:15]}")
        log(f"[hikvision][debug] xml_snippet:\n{snippet}")
    if not emp:
        log("[hikvision] employee_no topilmadi, yuborilmadi. XML (qisqa): " + xml_bytes[:500].decode("utf-8", "replace"))
        if not debug:
            log("[hikvision] Maslahat: .env ga HIKVISION_DEBUG_EVENTS=1 qo‘ying — to‘liq hodisa chiqadi.")
        return
    if not iso:
        iso = datetime.now(timezone.utc).isoformat()

    try:
        _post_to_django(emp, iso, device_ip, raw, api_url, secret)
        log(f"[hikvision] OK → Django: employee_no={emp} time={iso}")
    except requests.HTTPError as e:
        body = ""
        if e.response is not None:
            body = (e.response.text or "")[:500]
        log(f"[hikvision] Django API HTTP xato: {e} body={body}")
    except requests.RequestException as e:
        log(f"[hikvision] Django API ga ulanishda xato (server o‘chiq bo‘lishi mumkin): {e}")


def _stream_url(ip: str) -> str:
    return f"http://{ip}/ISAPI/Event/notification/alertStream"


def run_listener_forever(log: LogFn | None = None) -> None:
    """
    Cheksiz sikl: ulanish → oqim o‘qish → uzilsa, pauza bilan qayta ulanish.

    `.env` / muhit:
      HIKVISION_IP, HIKVISION_USERNAME, HIKVISION_PASSWORD,
      DJANGO_ATTENDANCE_API_URL, HIKVISION_WEBHOOK_SECRET (ixtiyoriy)
    """
    write: LogFn = log or (lambda m: logger.info("%s", m))

    ip = _env("HIKVISION_IP", "192.168.1.10")
    user = _env("HIKVISION_USERNAME", "admin")
    password = _env("HIKVISION_PASSWORD")
    api_url = _env(
        "DJANGO_ATTENDANCE_API_URL",
        "http://127.0.0.1:8000/api/attendance/hikvision/event/",
    )
    secret = (_env("HIKVISION_WEBHOOK_SECRET") or None) or None

    if not password:
        write("[hikvision] HIKVISION_PASSWORD .env da ko‘rsatilmagan — chiqyapman.")
        return

    url = _stream_url(ip)
    auth = HTTPDigestAuth(user, password)
    buf = bytearray()

    while True:
        try:
            write(f"[hikvision] Ulanmoqda: {url} (user={user})")
            with requests.get(
                url,
                auth=auth,
                stream=True,
                timeout=(15, None),
                headers={"Accept": "*/*"},
            ) as resp:
                if resp.status_code == 401:
                    write("[hikvision] 401 Unauthorized — login/parol noto‘g‘ri yoki Digest sozlanmagan.")
                    time.sleep(30)
                    continue
                resp.raise_for_status()
                write(f"[hikvision] Oqim ochildi (HTTP {resp.status_code}). Voqealar kutilmoqda…")

                for chunk in resp.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    buf.extend(chunk)
                    blocks = _extract_event_blocks(buf)
                    for block in blocks:
                        _handle_one_event(block, device_ip=ip, api_url=api_url, secret=secret, log=write)

        except requests.exceptions.ConnectionError as e:
            write(f"[hikvision] Ulanish rad etildi yoki qurilma oflayn: {e} — 10 s dan keyin qayta uriniladi.")
        except requests.exceptions.Timeout:
            write("[hikvision] Timeout — qayta ulanmoqda.")
        except requests.RequestException as e:
            write(f"[hikvision] So‘rov xatosi: {e}")
        except OSError as e:
            write(f"[hikvision] Tarmoq xatosi: {e}")

        time.sleep(10)
