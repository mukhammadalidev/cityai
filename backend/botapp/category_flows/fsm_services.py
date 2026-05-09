import datetime as dt

from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from asgiref.sync import sync_to_async

from apps.bookings.models import Booking
from apps.businesses.models import Business
from apps.leads.models import Lead

from botapp.bot_constants import (
    BT_ADM,
    BT_ADDR,
    BT_AP,
    BT_MAST,
    BT_PRICE,
    BT_PROMO,
    BT_SVC,
    CL_ADDR,
    CL_BOOK,
    CL_DOCS,
    CL_PRICE,
    CL_REG,
    CL_SVC,
    LG_BOOK,
    LG_CALL,
    LG_PRICE,
    LG_SVC,
    PH_ORD,
    PH_OP,
    PH_PORT,
    PH_PRICE,
    PH_SVC,
    RE_AGENT,
    RE_AREA,
    RE_LIST,
    RE_PRICE,
    RE_SEARCH,
    RE_VIEW,
    RP_AREA,
    RP_MASTER,
    RP_OP,
    RP_ORDER,
    RP_PRICE,
    RP_SVC,
    TX_DEL,
    TX_OP,
    TX_PRICE,
    TX_TAXI,
)
from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.category_flows.states import (
    BeautyBookFlow,
    ClinicBookFlow,
    LegalBookFlow,
    ParcelFlow,
    PhotoBookFlow,
    RealLeadFlow,
    RealSearchFlow,
    RealViewFlow,
    RepairBookFlow,
    TaxiFlow,
)
from botapp.category_flows.tools import (
    cancel_kb,
    flow_cancel,
    need_business,
    notify_booking_saved,
    notify_lead_saved,
    phone_kb,
    send_item_catalog,
)
from botapp.repository import create_booking_record, create_lead_record
from botapp.telegram_utils import parse_date, parse_phone, parse_time, strip_or_none


ADDR_SET = {BT_ADDR, CL_ADDR, RP_AREA, RE_AREA}
OP_SET = {BT_ADM, CL_REG, RP_OP, TX_OP, PH_OP, LG_CALL}


def register(dp: Dispatcher) -> None:
    @dp.message(F.text.in_(ADDR_SET))
    async def addrs(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        from botapp.category_flows.tools import answer_address

        await answer_address(message, int(d["business_id"]))

    @dp.message(F.text.in_(OP_SET))
    async def ops(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        from botapp.category_flows.tools import answer_operator

        await answer_operator(message, int(d["business_id"]))

    # --- Clinic ---
    @dp.message(F.text.in_({CL_DOCS, CL_SVC}))
    async def cl_items(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.CLINIC:
            return
        await send_item_catalog(message, state, Business.BusinessType.CLINIC, "Xizmatlar")

    @dp.message(F.text == CL_PRICE)
    async def cl_pr(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.CLINIC:
            return
        await send_item_catalog(message, state, Business.BusinessType.CLINIC, "Narxlar")

    @dp.message(F.text == CL_BOOK)
    async def cl_book_btn(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.CLINIC:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(ClinicBookFlow.name)
        await message.answer("📅 Qabul. Ism:", reply_markup=cancel_kb())

    @dp.message(ClinicBookFlow.name)
    async def cb_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(ClinicBookFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(ClinicBookFlow.phone, F.contact)
    async def cb_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(ClinicBookFlow.date)
            await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(ClinicBookFlow.phone)
    async def cb_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(ClinicBookFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(ClinicBookFlow.date)
    async def cb_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri.")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(ClinicBookFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(ClinicBookFlow.time)
    async def cb_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(ClinicBookFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(ClinicBookFlow.note)
    async def cb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.CONSULTATION,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Qabul arizasi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Beauty ---
    @dp.message(F.text == BT_SVC)
    async def bt_sv(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.BEAUTY_SALON:
            return
        await send_item_catalog(message, state, Business.BusinessType.BEAUTY_SALON, "Xizmatlar")

    @dp.message(F.text.in_({BT_MAST, BT_PRICE, BT_PROMO}))
    async def bt_misc(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.BEAUTY_SALON:
            return
        await message.answer("Ma’lumot uchun xizmatlar ro‘yxatiga qarang yoki admin bilan bog‘laning.")

    @dp.message(F.text == BT_AP)
    async def bt_ap(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.BEAUTY_SALON:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(BeautyBookFlow.name)
        await message.answer("📅 Navbat. Ism:", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.name)
    async def bb_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(BeautyBookFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(BeautyBookFlow.phone, F.contact)
    async def bb_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(BeautyBookFlow.master)
            await message.answer("Usta ismi (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.phone)
    async def bb_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(BeautyBookFlow.master)
        await message.answer("Usta:", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.master)
    async def bb_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(b_master=strip_or_none(message.text))
        await state.set_state(BeautyBookFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.date)
    async def bb_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(BeautyBookFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.time)
    async def bb_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(BeautyBookFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(BeautyBookFlow.note)
    async def bb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.APPOINTMENT,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"master_name": data.get("b_master") or ""},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Navbat arizasi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Repair ---
    @dp.message(F.text == RP_SVC)
    async def rp_sv(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REPAIR_SERVICE:
            return
        await send_item_catalog(message, state, Business.BusinessType.REPAIR_SERVICE, "Xizmatlar")

    @dp.message(F.text.in_({RP_MASTER, RP_PRICE}))
    async def rp_m(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REPAIR_SERVICE:
            return
        await message.answer("Batafsil ma’lumot uchun xizmatlar ro‘yxatini ko‘ring.")

    @dp.message(F.text == RP_ORDER)
    async def rp_ord(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REPAIR_SERVICE:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(RepairBookFlow.name)
        await message.answer("📅 Buyurtma. Ism:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.name)
    async def rb_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(RepairBookFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(RepairBookFlow.phone, F.contact)
    async def rb_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(RepairBookFlow.address)
            await message.answer("Manzil:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.phone)
    async def rb_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(RepairBookFlow.address)
        await message.answer("Manzil:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.address)
    async def rb_a(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(rb_addr=strip_or_none(message.text))
        await state.set_state(RepairBookFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.date)
    async def rb_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(RepairBookFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.time)
    async def rb_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(RepairBookFlow.problem)
        await message.answer("Muammo tavsifi:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.problem)
    async def rb_p(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(rb_prob=strip_or_none(message.text))
        await state.set_state(RepairBookFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(RepairBookFlow.note)
    async def rb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.SERVICE_BOOKING,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"address": data.get("rb_addr"), "problem_description": data.get("rb_prob")},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Buyurtma yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Real estate ---
    @dp.message(F.text == RE_LIST)
    async def re_li(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        await send_item_catalog(message, state, Business.BusinessType.REAL_ESTATE, "Uylar")

    @dp.message(F.text == RE_SEARCH)
    async def re_search_btn(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        await state.set_state(RealSearchFlow.waiting)
        await message.answer("🔎 Uy qidirish uchun kalit so‘z kiriting:", reply_markup=cancel_kb())

    @dp.message(RealSearchFlow.waiting)
    async def re_search_run(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        q = strip_or_none(message.text).lower()
        from botapp.repository import fetch_items_for_business
        from botapp.category_flows.tools import format_item_short, item_inline

        items = await sync_to_async(fetch_items_for_business, thread_sensitive=True)(int(d["business_id"]), None)
        found = [it for it in items if q in (it.get("title") or "").lower()]
        if not found:
            await message.answer("Mos uy topilmadi. Boshqa so‘z bilan urinib ko‘ring.")
            return
        for it in found[:15]:
            await message.answer(
                format_item_short(it, Business.BusinessType.REAL_ESTATE),
                reply_markup=item_inline(int(d["business_id"]), int(it["id"]), [("📄 Batafsil", "d"), ("☎️ So‘rov", "pi"), ("📅 Ko‘rish", "rv")]),
            )
        await state.set_state(Flow.browsing)
        await message.answer("Natijalar tayyor.", reply_markup=category_reply_keyboard(d["business_type"]))

    @dp.message(F.text == RE_PRICE)
    async def re_price(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        await send_item_catalog(message, state, Business.BusinessType.REAL_ESTATE, "E’lonlar")

    @dp.message(F.text == RE_AGENT)
    async def re_ag(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(RealLeadFlow.name)
        await message.answer("☎️ Agent. Ism:", reply_markup=cancel_kb())

    @dp.message(F.text == RE_VIEW)
    async def re_v(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.REAL_ESTATE:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(RealViewFlow.name)
        await message.answer("📅 Uy ko‘rish. Ism:", reply_markup=cancel_kb())

    @dp.message(RealLeadFlow.name)
    async def rl_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(RealLeadFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(RealLeadFlow.phone, F.contact)
    async def rl_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(RealLeadFlow.msg)
            await message.answer("Xabar:", reply_markup=cancel_kb())

    @dp.message(RealLeadFlow.phone)
    async def rl_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(RealLeadFlow.msg)
        await message.answer("Xabar:", reply_markup=cancel_kb())

    @dp.message(RealLeadFlow.msg)
    async def rl_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(rl_msg=strip_or_none(message.text))
        await state.set_state(RealLeadFlow.ctime)
        await message.answer("Qulay aloqa vaqti (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(RealLeadFlow.ctime)
    async def rl_c(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.PROPERTY_INTEREST,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=data.get("rl_msg") or "",
            item_id=data.get("flow_item_id"),
            metadata={"preferred_contact_time": strip_or_none(message.text)},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ So‘rov yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(RealViewFlow.name)
    async def rv_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(RealViewFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(RealViewFlow.phone, F.contact)
    async def rv_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(RealViewFlow.date)
            await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(RealViewFlow.phone)
    async def rv_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(RealViewFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(RealViewFlow.date)
    async def rv_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(RealViewFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(RealViewFlow.time)
    async def rv_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(RealViewFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(RealViewFlow.note)
    async def rv_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.APPOINTMENT,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Uy ko‘rish arizasi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Taxi ---
    @dp.message(F.text == TX_TAXI)
    async def tx_t(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.TAXI_DELIVERY:
            return
        await state.set_state(TaxiFlow.name)
        await message.answer("🚕 Taxi. Ism:", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.name)
    async def tx_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(TaxiFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(TaxiFlow.phone, F.contact)
    async def tx_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(TaxiFlow.from_a)
            await message.answer("Qayerdan:", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.phone)
    async def tx_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(TaxiFlow.from_a)
        await message.answer("Qayerdan:", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.from_a)
    async def tx_f(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tx_f=strip_or_none(message.text))
        await state.set_state(TaxiFlow.to_a)
        await message.answer("Qayerga:", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.to_a)
    async def tx_to(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tx_t=strip_or_none(message.text))
        await state.set_state(TaxiFlow.ptime)
        await message.answer("Vaqt (masalan 18:30):", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.ptime)
    async def tx_ptime(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tx_pt=strip_or_none(message.text))
        await state.set_state(TaxiFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(TaxiFlow.note)
    async def tx_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        today = dt.date.today()
        tm = parse_time(data.get("tx_pt") or "") or dt.time(9, 0)
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.SERVICE_BOOKING,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=today,
            preferred_time=tm,
            note=strip_or_none(message.text),
            metadata={
                "service_type": "taxi",
                "from_address": data.get("tx_f"),
                "to_address": data.get("tx_t"),
            },
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Taxi so‘rovi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(F.text == TX_DEL)
    async def tx_d(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.TAXI_DELIVERY:
            return
        await state.set_state(ParcelFlow.name)
        await message.answer("📦 Yetkazib berish. Ism:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.name)
    async def pf_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(ParcelFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(ParcelFlow.phone, F.contact)
    async def pf_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(ParcelFlow.pickup)
            await message.answer("Olib ketish manzili:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.phone)
    async def pf_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(ParcelFlow.pickup)
        await message.answer("Olib ketish:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.pickup)
    async def pf_pk(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(pk=strip_or_none(message.text))
        await state.set_state(ParcelFlow.dropoff)
        await message.answer("Yetkazish manzili:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.dropoff)
    async def pf_dr(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(dr=strip_or_none(message.text))
        await state.set_state(ParcelFlow.pkg)
        await message.answer("Paket / izoh:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.pkg)
    async def pf_pkg(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(pkg=strip_or_none(message.text))
        await state.set_state(ParcelFlow.ptime)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(ParcelFlow.ptime)
    async def pf_ptime(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        today = dt.date.today()
        tm = parse_time(strip_or_none(message.text) or "") or dt.time(12, 0)
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.SERVICE_BOOKING,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=today,
            preferred_time=tm,
            note="",
            metadata={
                "service_type": "delivery",
                "pickup_address": data.get("pk"),
                "delivery_address": data.get("dr"),
                "package_note": data.get("pkg"),
            },
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Yetkazib berish so‘rovi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(F.text == TX_PRICE)
    async def tx_pr(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.TAXI_DELIVERY:
            return
        await message.answer("Narxlar operator bilan aniqlanadi. ☎️ tugmasidan foydalaning.")

    # --- Legal ---
    @dp.message(F.text == LG_SVC)
    async def lg_sv(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.LEGAL_SERVICE:
            return
        await send_item_catalog(message, state, Business.BusinessType.LEGAL_SERVICE, "Xizmatlar")

    @dp.message(F.text == LG_PRICE)
    async def lg_pr(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.LEGAL_SERVICE:
            return
        await send_item_catalog(message, state, Business.BusinessType.LEGAL_SERVICE, "Narxlar")

    @dp.message(F.text == LG_BOOK)
    async def lg_b(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.LEGAL_SERVICE:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(LegalBookFlow.name)
        await message.answer("⚖️ Konsultatsiya. Ism:", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.name)
    async def lb_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(LegalBookFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(LegalBookFlow.phone, F.contact)
    async def lb_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(LegalBookFlow.topic)
            await message.answer("Mavzu (qisqa):", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.phone)
    async def lb_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(LegalBookFlow.topic)
        await message.answer("Mavzu:", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.topic)
    async def lb_top(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(legal_top=strip_or_none(message.text))
        await state.set_state(LegalBookFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.date)
    async def lb_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(LegalBookFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.time)
    async def lb_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(LegalBookFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(LegalBookFlow.note)
    async def lb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.CONSULTATION,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"legal_topic": data.get("legal_top")},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Ariza yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Photo ---
    @dp.message(F.text.in_({PH_SVC, PH_PORT, PH_PRICE}))
    async def ph_cat(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.PHOTO_VIDEO:
            return
        await send_item_catalog(message, state, Business.BusinessType.PHOTO_VIDEO, "Xizmatlar")

    @dp.message(F.text == PH_ORD)
    async def ph_o(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.PHOTO_VIDEO:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(PhotoBookFlow.name)
        await message.answer("📸 Buyurtma. Ism:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.name)
    async def pb_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(PhotoBookFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(PhotoBookFlow.phone, F.contact)
    async def pb_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(PhotoBookFlow.event_type)
            await message.answer("Tadbir turi:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.phone)
    async def pb_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(PhotoBookFlow.event_type)
        await message.answer("Tadbir turi:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.event_type)
    async def pb_e(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(ev=strip_or_none(message.text))
        await state.set_state(PhotoBookFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.date)
    async def pb_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(PhotoBookFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.time)
    async def pb_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(PhotoBookFlow.location)
        await message.answer("Joy:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.location)
    async def pb_l(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(loc=strip_or_none(message.text))
        await state.set_state(PhotoBookFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(PhotoBookFlow.note)
    async def pb_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.SERVICE_BOOKING,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            preferred_date=dt.date.fromisoformat(data["flow_date"]),
            preferred_time=dt.datetime.strptime(data["flow_time"], "%H:%M").time(),
            note=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"event_type": data.get("ev"), "location": data.get("loc")},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_booking_saved(book)
        await message.answer("✅ Buyurtma yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))
