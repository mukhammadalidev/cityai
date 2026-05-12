"""Fitness zal (fitness_center) uchun Telegram bot oqimi.

- Abonementlar ro‘yxati
- Trenerlar (item metadata.trainer_name dan jamlangan)
- Bepul sinov mashg‘ulot (Booking.TRIAL_LESSON, metadata.source=fitness_trial)
- Mashg‘ulot jadvali (item metadata.schedule)
- Narxlar
- Manzil
- Admin bilan bog‘lanish
- Abonementga yozilish (Lead.MEMBERSHIP_REQUEST)
"""
from __future__ import annotations

import datetime as dt
import html
from decimal import Decimal

from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from asgiref.sync import sync_to_async

from apps.bookings.models import Booking
from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.leads.models import Lead

from botapp.bot_constants import (
    FZ_ABON,
    FZ_ADDR,
    FZ_ADM,
    FZ_PRICE,
    FZ_SCHED,
    FZ_TRAINERS,
    FZ_TRIAL,
)
from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.category_flows.states import FitnessMembershipFlow, FitnessTrialFlow
from botapp.category_flows.tools import (
    answer_address,
    answer_operator,
    cancel_kb,
    flow_cancel,
    need_business,
    notify_booking_saved,
    notify_lead_saved,
    phone_kb,
)
from botapp.repository import create_booking_record, create_lead_record
from botapp.telegram_utils import parse_date, parse_phone, parse_time, strip_or_none


TRAINING_TYPES = [
    "Fitness",
    "Bodybuilding",
    "Crossfit",
    "Yoga",
    "Cardio",
    "Personal training",
]


def _format_price(price, currency: str) -> str:
    if price is None:
        return "—"
    p = int(price) if isinstance(price, (Decimal, int, float)) else 0
    return f"{p:,}".replace(",", " ") + f" {currency or 'so‘m'}"


def _fitness_items(business_id: int) -> list[dict]:
    return list(
        Item.objects.filter(business_id=business_id, status=Item.Status.ACTIVE)
        .order_by("title")
        .values("id", "title", "price", "currency", "description", "metadata")[:40]
    )


@sync_to_async
def _fetch_fitness_items(business_id: int) -> list[dict]:
    return _fitness_items(business_id)


def _abon_card(it: dict) -> str:
    m = it.get("metadata") or {}
    title = html.escape(str(it.get("title") or "—"))
    lines = [f"🏋️ <b>{title}</b>", ""]
    lines.append(f"💰 Narx: {_format_price(it.get('price'), it.get('currency') or 'so‘m')}")
    if m.get("duration"):
        lines.append(f"⏳ Davomiyligi: {html.escape(str(m['duration']))}")
    if m.get("sessions_count") not in (None, ""):
        lines.append(f"🔢 Mashg‘ulotlar soni: {html.escape(str(m['sessions_count']))}")
    if m.get("trainer_name"):
        lines.append(f"👨‍🏫 Trener: {html.escape(str(m['trainer_name']))}")
    if m.get("schedule"):
        lines.append(f"📅 Jadval: {html.escape(str(m['schedule']))}")
    if m.get("training_type"):
        lines.append(f"🏷 Turi: {html.escape(str(m['training_type']))}")
    if m.get("level"):
        lines.append(f"📊 Daraja: {html.escape(str(m['level']))}")
    if m.get("gender_group"):
        lines.append(f"👥 Guruh: {html.escape(str(m['gender_group']))}")
    return "\n".join(lines)


def _abon_inline(business_id: int, item_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📄 Batafsil", callback_data=f"fz:d:{business_id}:{item_id}"),
                InlineKeyboardButton(text="📝 Yozilish", callback_data=f"fz:reg:{business_id}:{item_id}"),
            ],
            [
                InlineKeyboardButton(text="🧪 Sinov mashg‘ulot", callback_data=f"fz:trl:{business_id}:{item_id}"),
            ],
        ]
    )


def _training_kb() -> InlineKeyboardMarkup:
    rows = []
    row = []
    for t in TRAINING_TYPES:
        row.append(InlineKeyboardButton(text=t, callback_data=f"fz:tt:{t}"))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    return InlineKeyboardMarkup(inline_keyboard=rows)


def register(dp: Dispatcher) -> None:
    @dp.message(F.text == FZ_ABON)
    async def m_abon(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        items = await _fetch_fitness_items(int(d["business_id"]))
        if not items:
            await message.answer("Hozircha abonementlar kiritilmagan.")
            return
        await message.answer("🏋️ <b>Abonementlar</b>")
        for it in items[:25]:
            await message.answer(_abon_card(it), reply_markup=_abon_inline(int(d["business_id"]), int(it["id"])))

    @dp.message(F.text == FZ_PRICE)
    async def m_price(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        items = await _fetch_fitness_items(int(d["business_id"]))
        if not items:
            await message.answer("Hozircha narxlar kiritilmagan.")
            return
        lines = ["💰 <b>Narxlar:</b>", ""]
        for idx, it in enumerate(items[:20], start=1):
            title = html.escape(str(it.get("title") or "—"))
            lines.append(f"{idx}. {title} — {_format_price(it.get('price'), it.get('currency') or 'so‘m')}")
        lines.append("")
        lines.append("Yozilish uchun kerakli abonementni tanlang yoki telefon raqamingizni qoldiring.")
        await message.answer("\n".join(lines))

    @dp.message(F.text == FZ_SCHED)
    async def m_sched(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        items = await _fetch_fitness_items(int(d["business_id"]))
        groups: dict[str, list[str]] = {}
        for it in items:
            m = it.get("metadata") or {}
            sched = m.get("schedule")
            ttype = m.get("training_type") or "Mashg‘ulot"
            if not sched:
                continue
            groups.setdefault(str(ttype), []).append(str(sched))
        if not groups:
            await message.answer("Hozircha jadval kiritilmagan. Admin bilan bog‘laning.")
            return
        lines = ["📅 <b>Mashg‘ulot jadvali:</b>", ""]
        for ttype, scheds in groups.items():
            lines.append(f"🏋️ <b>{html.escape(ttype)}:</b>")
            for s in dict.fromkeys(scheds):
                lines.append(html.escape(s))
            lines.append("")
        await message.answer("\n".join(lines).strip())

    @dp.message(F.text == FZ_TRAINERS)
    async def m_trainers(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        items = await _fetch_fitness_items(int(d["business_id"]))
        trainers: dict[str, dict] = {}
        for it in items:
            m = it.get("metadata") or {}
            name = (m.get("trainer_name") or "").strip()
            if not name:
                continue
            entry = trainers.setdefault(name, {"name": name, "types": set(), "schedules": set()})
            if m.get("training_type"):
                entry["types"].add(str(m["training_type"]))
            if m.get("schedule"):
                entry["schedules"].add(str(m["schedule"]))
        if not trainers:
            await message.answer("Hozircha trenerlar haqida ma’lumot kiritilmagan.")
            return
        for name, info in list(trainers.items())[:15]:
            text = (
                f"👨‍🏫 <b>{html.escape(name)}</b>\n"
                f"🏷 Yo‘nalish: {html.escape(', '.join(sorted(info['types'])) or '—')}\n"
                f"📅 Jadval: {html.escape(' · '.join(sorted(info['schedules'])) or '—')}"
            )
            await message.answer(text)
        await message.answer("Trenerga yozilish uchun «🏋️ Abonementlar» bo‘limidan tegishli paketni tanlang.")

    @dp.message(F.text == FZ_ADDR)
    async def m_addr(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        await answer_address(message, int(d["business_id"]))

    @dp.message(F.text == FZ_ADM)
    async def m_admin(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        await answer_operator(message, int(d["business_id"]))

    # === Sinov mashg‘ulot FSM ===

    @dp.message(F.text == FZ_TRIAL)
    async def trial_start(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.FITNESS_CENTER:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(FitnessTrialFlow.name)
        await message.answer("🧪 <b>Bepul sinov mashg‘ulot</b>\n\nIsmingizni kiriting:", reply_markup=cancel_kb())

    @dp.message(FitnessTrialFlow.name)
    async def trial_name(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(FitnessTrialFlow.phone)
        await message.answer("Telefon raqamingizni yuboring (+998 …):", reply_markup=phone_kb())

    @dp.message(FitnessTrialFlow.phone, F.contact)
    async def trial_phone_contact(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if not p:
            await message.answer("Telefon noto‘g‘ri. Qo‘lda kiriting:")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(FitnessTrialFlow.training_type)
        await message.answer("Qaysi yo‘nalish qiziq?", reply_markup=_training_kb())

    @dp.message(FitnessTrialFlow.phone)
    async def trial_phone_text(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(FitnessTrialFlow.training_type)
        await message.answer("Qaysi yo‘nalish qiziq?", reply_markup=_training_kb())

    @dp.callback_query(FitnessTrialFlow.training_type, F.data.startswith("fz:tt:"))
    async def trial_training_type(query: CallbackQuery, state: FSMContext) -> None:
        ttype = query.data.split(":", 2)[2]
        await state.update_data(flow_ttype=ttype)
        await state.set_state(FitnessTrialFlow.date)
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        await query.message.answer(
            f"Tanlandi: <b>{html.escape(ttype)}</b>\n\nQaysi sana qulay? (masalan 2026-05-20)",
            reply_markup=cancel_kb(),
        )
        await query.answer()

    @dp.message(FitnessTrialFlow.training_type)
    async def trial_training_type_text(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        ttype = strip_or_none(message.text) or "Fitness"
        await state.update_data(flow_ttype=ttype)
        await state.set_state(FitnessTrialFlow.date)
        await message.answer("Qaysi sana qulay? (masalan 2026-05-20):", reply_markup=cancel_kb())

    @dp.message(FitnessTrialFlow.date)
    async def trial_date(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-20")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(FitnessTrialFlow.time)
        await message.answer("Qaysi vaqt qulay? (masalan 18:00):", reply_markup=cancel_kb())

    @dp.message(FitnessTrialFlow.time)
    async def trial_time(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 18:00")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(FitnessTrialFlow.note)
        await message.answer("Qo‘shimcha izoh bormi? (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(FitnessTrialFlow.note)
    async def trial_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        ttype = data.get("flow_ttype") or "Fitness"
        booking = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.TRIAL_LESSON,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"training_type": ttype, "source": "fitness_trial"},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(booking)
        await message.answer(
            "✅ <b>Sinov mashg‘ulot arizangiz qabul qilindi!</b>\n\n"
            "Zal admini tez orada siz bilan bog‘lanadi.\n\n"
            f"👤 Ism: {html.escape(data.get('flow_name') or '—')}\n"
            f"📞 Telefon: {html.escape(data.get('flow_phone') or '—')}\n"
            f"🏋️ Yo‘nalish: {html.escape(ttype)}\n"
            f"📅 Sana: {data.get('flow_date')}\n"
            f"🕒 Vaqt: {data.get('flow_time')}",
            reply_markup=category_reply_keyboard(data["business_type"]),
        )

    # === Abonementga yozilish (Lead.MEMBERSHIP_REQUEST) ===

    @dp.callback_query(F.data.startswith("fz:reg:"))
    async def membership_start_from_item(query: CallbackQuery, state: FSMContext) -> None:
        try:
            _, _, bid, iid = query.data.split(":", 3)
            business_id, item_id = int(bid), int(iid)
        except (ValueError, IndexError):
            await query.answer("Noto‘g‘ri tanlov.", show_alert=True)
            return
        data = await state.get_data()
        if int(data.get("business_id") or 0) != business_id:
            await query.answer("Avval biznesni qayta tanlang.", show_alert=True)
            return
        await state.update_data(flow_item_id=item_id)
        await state.set_state(FitnessMembershipFlow.name)
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        await query.message.answer(
            "📝 <b>Abonementga yozilish</b>\n\nIsmingizni kiriting:",
            reply_markup=cancel_kb(),
        )
        await query.answer()

    @dp.callback_query(F.data.startswith("fz:trl:"))
    async def trial_from_item(query: CallbackQuery, state: FSMContext) -> None:
        try:
            _, _, bid, iid = query.data.split(":", 3)
            business_id, item_id = int(bid), int(iid)
        except (ValueError, IndexError):
            await query.answer("Noto‘g‘ri tanlov.", show_alert=True)
            return
        data = await state.get_data()
        if int(data.get("business_id") or 0) != business_id:
            await query.answer("Avval biznesni qayta tanlang.", show_alert=True)
            return
        await state.update_data(flow_item_id=item_id)
        await state.set_state(FitnessTrialFlow.name)
        try:
            await query.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        await query.message.answer(
            "🧪 <b>Bepul sinov mashg‘ulot</b>\n\nIsmingizni kiriting:",
            reply_markup=cancel_kb(),
        )
        await query.answer()

    @dp.callback_query(F.data.startswith("fz:d:"))
    async def details_from_item(query: CallbackQuery, state: FSMContext) -> None:
        try:
            _, _, bid, iid = query.data.split(":", 3)
            item_id = int(iid)
        except (ValueError, IndexError):
            await query.answer()
            return
        it = await sync_to_async(
            lambda: Item.objects.filter(pk=item_id, status=Item.Status.ACTIVE)
            .values("id", "title", "price", "currency", "description", "metadata")
            .first(),
            thread_sensitive=True,
        )()
        if not it:
            await query.answer("Topilmadi.", show_alert=True)
            return
        text = _abon_card(it)
        desc = (it.get("description") or "").strip()
        if desc:
            text += f"\n\n{html.escape(desc[:1000])}"
        await query.message.answer(text)
        await query.answer()

    @dp.message(FitnessMembershipFlow.name)
    async def mb_name(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(FitnessMembershipFlow.phone)
        await message.answer("Telefon raqamingizni yuboring (+998 …):", reply_markup=phone_kb())

    @dp.message(FitnessMembershipFlow.phone, F.contact)
    async def mb_phone_contact(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if not p:
            await message.answer("Telefon noto‘g‘ri. Qo‘lda kiriting:")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(FitnessMembershipFlow.start_date)
        await message.answer("Boshlash sanasi (masalan 2026-05-20 yoki «—»):", reply_markup=cancel_kb())

    @dp.message(FitnessMembershipFlow.phone)
    async def mb_phone_text(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(FitnessMembershipFlow.start_date)
        await message.answer("Boshlash sanasi (masalan 2026-05-20 yoki «—»):", reply_markup=cancel_kb())

    @dp.message(FitnessMembershipFlow.start_date)
    async def mb_start_date(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        raw = strip_or_none(message.text)
        await state.update_data(flow_start=raw if raw and raw != "—" else "")
        await state.set_state(FitnessMembershipFlow.time)
        await message.answer("Qulay vaqt (masalan 18:00 yoki «—»):", reply_markup=cancel_kb())

    @dp.message(FitnessMembershipFlow.time)
    async def mb_time(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        raw = strip_or_none(message.text)
        await state.update_data(flow_ptime=raw if raw and raw != "—" else "")
        await state.set_state(FitnessMembershipFlow.note)
        await message.answer("Qo‘shimcha izoh bormi? (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(FitnessMembershipFlow.note)
    async def mb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.MEMBERSHIP_REQUEST,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={
                "preferred_start_date": data.get("flow_start") or "",
                "preferred_time": data.get("flow_ptime") or "",
            },
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        item_title = "—"
        if lead and lead.item_id and lead.item:
            item_title = lead.item.title
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer(
            "✅ <b>Abonement bo‘yicha arizangiz qabul qilindi!</b>\n\n"
            "Admin tez orada siz bilan bog‘lanadi.\n\n"
            f"👤 Ism: {html.escape(data.get('flow_name') or '—')}\n"
            f"📞 Telefon: {html.escape(data.get('flow_phone') or '—')}\n"
            f"🏋️ Abonement: {html.escape(item_title)}",
            reply_markup=category_reply_keyboard(data["business_type"]),
        )
