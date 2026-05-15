"""
Hikvision ACS (masalan DS-K1T343MWX) ga CRM dan foydalanuvchi yuborish.

ISAPI: AccessControl/UserInfo — odam qurilmaning "User / Personnel" ro'yxatida paydo bo'ladi.
Bu yuz shablonini yuklamaydi; yuzni qurilma veb-interfeysi yoki FaceDataRecord orqali alohida qo'shing.

Autentifikatsiya: HTTP Digest (.env HIKVISION_*).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests
from requests.auth import HTTPDigestAuth

logger = logging.getLogger(__name__)


def _device_base_and_auth() -> tuple[str, HTTPDigestAuth]:
    ip = (os.getenv("HIKVISION_IP") or "").strip() or "192.168.1.10"
    user = (os.getenv("HIKVISION_USERNAME") or "admin").strip()
    password = (os.getenv("HIKVISION_PASSWORD") or "").strip()
    if not password:
        raise RuntimeError("HIKVISION_PASSWORD .env da ko'rsatilmagan.")
    return f"http://{ip}", HTTPDigestAuth(user, password)


def _parse_body(resp: requests.Response) -> Any:
    text = (resp.text or "").strip()
    if not text:
        return {}
    ct = (resp.headers.get("Content-Type") or "").lower()
    if "json" in ct or text.startswith("{"):
        try:
            return resp.json()
        except ValueError:
            return {"_parse_error": True, "text": text[:4000]}
    return {"_non_json": True, "text": text[:4000]}


def _is_api_ok(data: Any) -> bool:
    """Hikvision JSON: statusCode 1 yoki subStatusCode OK (oilaga qarab)."""
    if not isinstance(data, dict):
        return False
    sc = data.get("statusCode")
    if sc is None:
        ui = data.get("UserInfo")
        if isinstance(ui, dict):
            sc = ui.get("statusCode")
    try:
        if int(sc) == 1:
            return True
    except (TypeError, ValueError):
        pass
    if str(sc).lower() in ("ok", "1", "true"):
        return True
    # Ba'zi qurilmalar faqat subStatusCode qaytaradi (masalan "OK").
    sub = (data.get("subStatusCode") or data.get("subStatus") or "") or ""
    if isinstance(sub, str) and sub.upper() in ("OK", "OKAY"):
        return True
    return False


def _user_info_payload(employee_no: str, name: str, phone: str = "") -> dict[str, Any]:
    """
    DS-K1T343MWX (ACS) oilasida ko'p hollarda Record emas, SetUp (PUT) + eshik huquqi talab qilinadi.
    """
    emp = (employee_no or "").strip()
    nm = (name or "").strip() or f"User {emp}"
    info: dict[str, Any] = {
        "employeeNo": emp,
        "name": nm,
        "userType": "normal",
        # Ko'p demo integratsiyalarda majburiy deb ko'rsatilgan maydonlar:
        "belongGroup": (os.getenv("HIKVISION_BELONG_GROUP") or "1").strip() or "1",
        "doorRight": (os.getenv("HIKVISION_DOOR_RIGHT") or "1").strip() or "1",
        "gender": "unknown",
        "Valid": {
            "enable": True,
            "beginTime": "2020-01-01T00:00:00",
            "endTime": "2037-12-31T23:59:59",
            "timeType": "local",
        },
        # 1-eshik, reja shablon raqami — vebda Access Group / Schedule bo'yicha farq qilishi mumkin (.env bilan).
        "RightPlan": [
            {
                "doorNo": int((os.getenv("HIKVISION_DOOR_NO") or "1").strip() or 1),
                "planTemplateNo": (os.getenv("HIKVISION_PLAN_TEMPLATE_NO") or "1").strip() or "1",
            }
        ],
    }
    ph = (phone or "").strip()
    if ph:
        info["phoneNo"] = ph[:32]
    return {"UserInfo": info}


def _user_info_payload_minimal(employee_no: str, name: str, phone: str = "") -> dict[str, Any]:
    """Agar to'liq yuk noto'g'ri bo'lsa, yengil variant."""
    emp = (employee_no or "").strip()
    nm = (name or "").strip() or f"User {emp}"
    info: dict[str, Any] = {
        "employeeNo": emp,
        "name": nm,
        "userType": "normal",
        "Valid": {
            "enable": True,
            "beginTime": "2020-01-01T00:00:00",
            "endTime": "2037-12-31T23:59:59",
            "timeType": "local",
        },
    }
    ph = (phone or "").strip()
    if ph:
        info["phoneNo"] = ph[:32]
    return {"UserInfo": info}


def push_acs_user(employee_no: str, name: str, phone: str = "") -> dict[str, Any]:
    """
    ACS qurilmaga foydalanuvchi yuborish.

    Tartib (hujjat va keng tarqalgan integratsiyalar bo'yicha):
    1) PUT UserInfo/SetUp — qo'shish yoki yangilash (eng ko'p ishlatiladi).
    2) POST UserInfo/Record — yangi.
    3) POST UserInfo/Modify — mavjudini yangilash.
    """
    base, auth = _device_base_and_auth()
    emp = (employee_no or "").strip()
    if not emp:
        raise ValueError("employee_no bo'sh bo'lmasligi kerak.")

    setup_url = f"{base}/ISAPI/AccessControl/UserInfo/SetUp?format=json"
    record_url = f"{base}/ISAPI/AccessControl/UserInfo/Record?format=json"
    modify_url = f"{base}/ISAPI/AccessControl/UserInfo/Modify?format=json"

    headers = {"Content-Type": "application/json; charset=UTF-8"}

    attempts: list[dict[str, Any]] = []

    for label, payload in (
        ("SetUp_full", _user_info_payload(emp, name, phone)),
        ("SetUp_minimal", _user_info_payload_minimal(emp, name, phone)),
    ):
        r = requests.put(setup_url, json=payload, auth=auth, timeout=45, headers=headers)
        data = _parse_body(r)
        attempts.append({"step": label, "method": "PUT", "url": setup_url, "http_status": r.status_code, "data": data})
        if r.status_code < 400 and _is_api_ok(data):
            return {"ok": True, "attempts": attempts}

    payload = _user_info_payload(emp, name, phone)
    r = requests.post(record_url, json=payload, auth=auth, timeout=45, headers=headers)
    data = _parse_body(r)
    attempts.append({"step": "Record", "method": "POST", "url": record_url, "http_status": r.status_code, "data": data})
    if r.status_code < 400 and _is_api_ok(data):
        return {"ok": True, "attempts": attempts}

    r2 = requests.post(modify_url, json=payload, auth=auth, timeout=45, headers=headers)
    data2 = _parse_body(r2)
    attempts.append({"step": "Modify", "method": "POST", "url": modify_url, "http_status": r2.status_code, "data": data2})
    if r2.status_code < 400 and _is_api_ok(data2):
        return {"ok": True, "attempts": attempts}

    # PUT Modify (ba'zi proshivkalar)
    r3 = requests.put(modify_url, json=payload, auth=auth, timeout=45, headers=headers)
    data3 = _parse_body(r3)
    attempts.append({"step": "Modify_PUT", "method": "PUT", "url": modify_url, "http_status": r3.status_code, "data": data3})
    if r3.status_code < 400 and _is_api_ok(data3):
        return {"ok": True, "attempts": attempts}

    out: dict[str, Any] = {
        "ok": False,
        "error": "Barcha urinishlar muvaffaqiyatsiz (SetUp PUT, Record, Modify).",
        "attempts": attempts,
    }
    logger.warning("Hikvision UserInfo xato: %s", out)
    return out


def sync_student_to_hikvision(student) -> dict[str, Any]:
    """Student modeli uchun — hikvision_employee_no majburiy."""
    from apps.students.models import Student  # noqa: PLC0415

    if not isinstance(student, Student):
        raise TypeError("Student modeli kutilgan.")
    eno = (student.hikvision_employee_no or "").strip()
    if not eno:
        return {"ok": False, "error": "hikvision_employee_no bo'sh — avval ID yozing va saqlang."}
    return push_acs_user(eno, student.name, student.phone or "")
