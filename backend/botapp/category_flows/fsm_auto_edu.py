import datetime as dt

from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from asgiref.sync import sync_to_async

from apps.bookings.models import Booking
from apps.businesses.models import Business
from apps.leads.models import Lead

from botapp.bot_constants import (
    AS_ADDR,
    AS_CARS,
    AS_CREDIT,
    AS_OP,
    AS_TEST,
    AS_TRADE,
    ED_ADDR,
    ED_ADMIN,
    ED_COURSES,
    ED_PRICES,
    ED_SCHED,
    ED_TEACHERS,
    ED_TRIAL,
)
from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.category_flows.states import (
    AutoCreditFlow,
    AutoTestDriveFlow,
    AutoTradeFlow,
    EduPriceLeadFlow,
    EduRegisterFlow,
    EduTrialFlow,
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


def register(dp: Dispatcher) -> None:
    # --- Avtosalon menyulari ---
    @dp.message(F.text == AS_CARS)
    async def m_as_cars(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.AUTO_SALON:
            return
        await send_item_catalog(message, state, Business.BusinessType.AUTO_SALON, "Mashinalar")

    @dp.message(F.text == AS_CREDIT)
    async def m_as_credit(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.AUTO_SALON:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(AutoCreditFlow.name)
        await message.answer("💳 Kredit\n\nIsm:", reply_markup=cancel_kb())

    @dp.message(F.text == AS_TRADE)
    async def m_as_trade(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.AUTO_SALON:
            return
        await state.set_state(AutoTradeFlow.name)
        await message.answer("🔁 Trade-in\n\nIsm:", reply_markup=cancel_kb())

    @dp.message(F.text == AS_TEST)
    async def m_as_test(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.AUTO_SALON:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(AutoTestDriveFlow.name)
        await message.answer("🧪 Test drive\n\nIsm:", reply_markup=cancel_kb())

    @dp.message(F.text.in_({AS_ADDR, ED_ADDR}))
    async def m_addr_shared(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        from botapp.category_flows.tools import answer_address

        await answer_address(message, int(d["business_id"]))

    @dp.message(F.text.in_({AS_OP, ED_ADMIN}))
    async def m_op_shared(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        from botapp.category_flows.tools import answer_operator

        await answer_operator(message, int(d["business_id"]))

    # --- Auto credit FSM ---
    @dp.message(AutoCreditFlow.name)
    async def ac_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(AutoCreditFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(AutoCreditFlow.phone, F.contact)
    async def ac_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(AutoCreditFlow.initial)
            await message.answer("Boshlang‘ich to‘lov (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(AutoCreditFlow.phone)
    async def ac_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(AutoCreditFlow.initial)
        await message.answer("Boshlang‘ich to‘lov:", reply_markup=cancel_kb())

    @dp.message(AutoCreditFlow.initial)
    async def ac_i(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_ini=strip_or_none(message.text))
        await state.set_state(AutoCreditFlow.months)
        await message.answer("Muddat (oy):", reply_markup=cancel_kb())

    @dp.message(AutoCreditFlow.months)
    async def ac_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_months=strip_or_none(message.text))
        await state.set_state(AutoCreditFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(AutoCreditFlow.note)
    async def ac_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.CREDIT,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={
                "initial_payment": data.get("flow_ini"),
                "credit_months": data.get("flow_months"),
            },
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ Yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(AutoTestDriveFlow.name)
    async def atd_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(AutoTestDriveFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(AutoTestDriveFlow.phone, F.contact)
    async def atd_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(AutoTestDriveFlow.date)
            await message.answer("Sana (YYYY-MM-DD):", reply_markup=cancel_kb())

    @dp.message(AutoTestDriveFlow.phone)
    async def atd_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(AutoTestDriveFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(AutoTestDriveFlow.date)
    async def atd_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri.")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(AutoTestDriveFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(AutoTestDriveFlow.time)
    async def atd_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri.")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(AutoTestDriveFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(AutoTestDriveFlow.note)
    async def atd_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.TEST_DRIVE,
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
        await message.answer("✅ Test drive yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Trade-in ---
    @dp.message(AutoTradeFlow.name)
    async def tr_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(AutoTradeFlow.phone, F.contact)
    async def tr_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(AutoTradeFlow.brand)
            await message.answer("Marka:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.phone)
    async def tr_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(AutoTradeFlow.brand)
        await message.answer("Marka:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.brand)
    async def tr_b(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tb=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.model)
        await message.answer("Model:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.model)
    async def tr_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tm=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.year)
        await message.answer("Yil:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.year)
    async def tr_y(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(ty=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.mileage)
        await message.answer("Probeg:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.mileage)
    async def tr_mi(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tmi=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.price)
        await message.answer("Kutilayotgan narx:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.price)
    async def tr_p(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(tpr=strip_or_none(message.text))
        await state.set_state(AutoTradeFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(AutoTradeFlow.note)
    async def tr_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.TRADE_IN,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=strip_or_none(message.text),
            metadata={
                "car_brand": data.get("tb"),
                "car_model": data.get("tm"),
                "car_year": data.get("ty"),
                "mileage": data.get("tmi"),
                "expected_price": data.get("tpr"),
            },
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ Trade-in yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # --- Education ---
    @dp.message(F.text == ED_COURSES)
    async def m_ed_c(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.EDUCATION_CENTER:
            return
        await send_item_catalog(message, state, Business.BusinessType.EDUCATION_CENTER, "Kurslar")

    @dp.message(F.text == ED_PRICES)
    async def m_ed_p(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.EDUCATION_CENTER:
            return
        await send_item_catalog(message, state, Business.BusinessType.EDUCATION_CENTER, "Narxlar")
        await state.set_state(EduPriceLeadFlow.name)
        await message.answer("💰 Narx haqida savol uchun ismingiz:", reply_markup=cancel_kb())

    @dp.message(EduPriceLeadFlow.name)
    async def epl_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(EduPriceLeadFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(EduPriceLeadFlow.phone, F.contact)
    async def epl_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(EduPriceLeadFlow.note)
            await message.answer("Savolingiz:", reply_markup=cancel_kb())

    @dp.message(EduPriceLeadFlow.phone)
    async def epl_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(EduPriceLeadFlow.note)
        await message.answer("Savol:", reply_markup=cancel_kb())

    @dp.message(EduPriceLeadFlow.note)
    async def epl_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.PRICE_QUESTION,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=strip_or_none(message.text),
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ So‘rov yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(F.text == ED_TRIAL)
    async def m_ed_tr(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.EDUCATION_CENTER:
            return
        await state.update_data(flow_item_id=None)
        await state.set_state(EduTrialFlow.name)
        await message.answer("🧪 Sinov darsi. Ism:", reply_markup=cancel_kb())

    @dp.message(EduTrialFlow.name)
    async def etr_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(EduTrialFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(EduTrialFlow.phone, F.contact)
    async def etr_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(EduTrialFlow.date)
            await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(EduTrialFlow.phone)
    async def etr_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(EduTrialFlow.date)
        await message.answer("Sana:", reply_markup=cancel_kb())

    @dp.message(EduTrialFlow.date)
    async def etr_d(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        d = parse_date(message.text or "")
        if not d:
            await message.answer("Sana noto‘g‘ri. Masalan: 2026-05-08")
            return
        await state.update_data(flow_date=d.isoformat())
        await state.set_state(EduTrialFlow.time)
        await message.answer("Vaqt:", reply_markup=cancel_kb())

    @dp.message(EduTrialFlow.time)
    async def etr_t(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        t = parse_time(message.text or "")
        if not t:
            await message.answer("Vaqt noto‘g‘ri. Masalan: 14:30")
            return
        await state.update_data(flow_time=t.strftime("%H:%M"))
        await state.set_state(EduTrialFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(EduTrialFlow.note)
    async def etr_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        book = await sync_to_async(create_booking_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            booking_type=Booking.BookingType.TRIAL_LESSON,
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
        await message.answer("✅ Sinov darsi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    @dp.message(F.text == ED_TEACHERS)
    async def m_ed_te(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.EDUCATION_CENTER:
            return
        await message.answer("👨‍🏫 Ustozlar — «📚 Kurslarni ko‘rish» bo‘limidan tanlang.")

    @dp.message(F.text == ED_SCHED)
    async def m_ed_sc(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.EDUCATION_CENTER:
            return
        await message.answer("📅 Jadval va kurs tavsiflarida ko‘ring yoki admin bilan bog‘laning.")

    # Edu register (menu + item)
    @dp.message(EduRegisterFlow.name)
    async def edr_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(EduRegisterFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(EduRegisterFlow.phone, F.contact)
    async def edr_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(EduRegisterFlow.ptime)
            await message.answer("Qulay vaqt (yoki «—»):", reply_markup=cancel_kb())

    @dp.message(EduRegisterFlow.phone)
    async def edr_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(EduRegisterFlow.ptime)
        await message.answer("Qulay vaqt:", reply_markup=cancel_kb())

    @dp.message(EduRegisterFlow.ptime)
    async def edr_ptime(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_ptime=strip_or_none(message.text))
        await state.set_state(EduRegisterFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(EduRegisterFlow.note)
    async def edr_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=Lead.LeadType.COURSE_REGISTER,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            message=strip_or_none(message.text),
            item_id=data.get("flow_item_id"),
            metadata={"preferred_time": data.get("flow_ptime")},
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ Yozilish yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))
