from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from asgiref.sync import sync_to_async

from apps.businesses.models import Business
from apps.leads.models import Lead

from botapp.bot_constants import (
    R_DELIVERY_BUTTON,
    R_FOOD_ORDER,
    SH_DEL,
    SH_ORDER,
    SH_PAY,
    SH_PRODUCTS,
)
from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.category_flows.states import FoodOrderFlow, ShopOrderFlow, ShopSimpleLeadFlow
from botapp.category_flows.tools import (
    cancel_kb,
    flow_cancel,
    need_business,
    notify_lead_saved,
    notify_order_saved,
    phone_kb,
    send_item_catalog,
)
from botapp.repository import create_booking_record, create_lead_record, create_order_record
from botapp.telegram_utils import parse_phone, strip_or_none


def register(dp: Dispatcher) -> None:
    @dp.message(F.text == SH_PRODUCTS)
    async def m_sh_p(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.SHOP:
            return
        await send_item_catalog(message, state, Business.BusinessType.SHOP, "Mahsulotlar")

    @dp.message(F.text == SH_ORDER)
    async def m_sh_o(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.SHOP:
            return
        await message.answer(
            "🛒 Avval «🛍 Mahsulotlarni ko‘rish» dan pozitsiyani tanlang va «🛒 Buyurtma» tugmasini bosing."
        )

    @dp.message(F.text == SH_DEL)
    async def m_sh_d(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.SHOP:
            return
        await state.update_data(simple_lead_type=Lead.LeadType.DELIVERY_QUESTION)
        await state.set_state(ShopSimpleLeadFlow.name)
        await message.answer("🚚 Yetkazib berish. Ism:", reply_markup=cancel_kb())

    @dp.message(F.text == SH_PAY)
    async def m_sh_pay(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.SHOP:
            return
        await state.update_data(simple_lead_type=Lead.LeadType.PAYMENT_QUESTION)
        await state.set_state(ShopSimpleLeadFlow.name)
        await message.answer("💳 To‘lov haqida. Ism:", reply_markup=cancel_kb())

    @dp.message(ShopSimpleLeadFlow.name)
    async def ssl_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(ssl_name=strip_or_none(message.text))
        await state.set_state(ShopSimpleLeadFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(ShopSimpleLeadFlow.phone, F.contact)
    async def ssl_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(ssl_phone=p)
            await state.set_state(ShopSimpleLeadFlow.msg)
            await message.answer("Xabaringiz:", reply_markup=cancel_kb())

    @dp.message(ShopSimpleLeadFlow.phone)
    async def ssl_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(ssl_phone=p)
        await state.set_state(ShopSimpleLeadFlow.msg)
        await message.answer("Xabar:", reply_markup=cancel_kb())

    @dp.message(ShopSimpleLeadFlow.msg)
    async def ssl_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=data.get("simple_lead_type") or Lead.LeadType.CONTACT,
            name=data.get("ssl_name") or "",
            phone=data.get("ssl_phone") or "",
            message=strip_or_none(message.text),
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer("✅ Yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # Shop order (item from callback)
    @dp.message(ShopOrderFlow.name)
    async def so_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(ShopOrderFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(ShopOrderFlow.phone, F.contact)
    async def so_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(ShopOrderFlow.qty)
            await message.answer("Soni (raqam):", reply_markup=cancel_kb())

    @dp.message(ShopOrderFlow.phone)
    async def so_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(ShopOrderFlow.qty)
        await message.answer("Soni:", reply_markup=cancel_kb())

    @dp.message(ShopOrderFlow.qty)
    async def so_q(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        try:
            q = int(strip_or_none(message.text))
        except (TypeError, ValueError):
            await message.answer("Butun son kiriting.")
            return
        if q < 1:
            return
        await state.update_data(flow_qty=q)
        await state.set_state(ShopOrderFlow.address)
        await message.answer("Manzil:", reply_markup=cancel_kb())

    @dp.message(ShopOrderFlow.address)
    async def so_a(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_addr=strip_or_none(message.text))
        await state.set_state(ShopOrderFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(ShopOrderFlow.note)
    async def so_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        iid = data.get("flow_item_id")
        if not iid:
            await message.answer("Xato: mahsulot tanlanmagan.")
            await state.set_state(Flow.browsing)
            return
        order = await sync_to_async(create_order_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            address=data.get("flow_addr") or "",
            note=strip_or_none(message.text),
            metadata={"order_kind": "shop"},
            lines=[{"item_id": int(iid), "quantity": int(data.get("flow_qty") or 1)}],
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_order_saved(order)
        await message.answer("✅ Buyurtma yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))

    # Restaurant food + delivery lead
    @dp.message(F.text == R_FOOD_ORDER)
    async def m_rf(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.RESTAURANT:
            return
        await message.answer(
            "🍔 «🍔 Menyu» dan taom tanlang va «🍔 Buyurtma» tugmasini bosing.",
            reply_markup=category_reply_keyboard(Business.BusinessType.RESTAURANT),
        )

    @dp.message(F.text == R_DELIVERY_BUTTON)
    async def m_rd(message: Message, state: FSMContext) -> None:
        d = await need_business(message, state)
        if not d or d.get("business_type") != Business.BusinessType.RESTAURANT:
            return
        await state.update_data(simple_lead_type=Lead.LeadType.DELIVERY_QUESTION)
        await state.set_state(ShopSimpleLeadFlow.name)
        await message.answer("🚚 Yetkazib berish haqida. Ism:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.name)
    async def fo_n(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(flow_name=strip_or_none(message.text))
        await state.set_state(FoodOrderFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(FoodOrderFlow.phone, F.contact)
    async def fo_pc(message: Message, state: FSMContext) -> None:
        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(flow_phone=p)
            await state.set_state(FoodOrderFlow.qty)
            await message.answer("Soni:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.phone)
    async def fo_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri formatda. Iltimos, +998... ko‘rinishida yuboring.")
            return
        await state.update_data(flow_phone=p)
        await state.set_state(FoodOrderFlow.qty)
        await message.answer("Soni:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.qty)
    async def fo_q(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        try:
            q = int(strip_or_none(message.text))
        except (TypeError, ValueError):
            return
        if q < 1:
            return
        await state.update_data(flow_qty=q)
        await state.set_state(FoodOrderFlow.mode)
        await message.answer("Tur: <b>yetkazish</b> yoki <b>olib ketish</b> deb yozing:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.mode)
    async def fo_m(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        raw = (message.text or "").strip().lower()
        dtype = "delivery" if "yetkaz" in raw else "pickup"
        await state.update_data(food_mode=dtype)
        if dtype == "delivery":
            await state.set_state(FoodOrderFlow.address)
            await message.answer("Manzil:", reply_markup=cancel_kb())
        else:
            await state.update_data(food_addr="")
            await state.set_state(FoodOrderFlow.note)
            await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.address)
    async def fo_a(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(food_addr=strip_or_none(message.text))
        await state.set_state(FoodOrderFlow.note)
        await message.answer("Izoh:", reply_markup=cancel_kb())

    @dp.message(FoodOrderFlow.note)
    async def fo_note(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        iid = data.get("flow_item_id")
        if not iid:
            await message.answer("Taom tanlanmagan.")
            await state.set_state(Flow.browsing)
            return
        order = await sync_to_async(create_order_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            name=data.get("flow_name") or "",
            phone=data.get("flow_phone") or "",
            address=data.get("food_addr") or "",
            note=strip_or_none(message.text),
            metadata={
                "order_kind": "food",
                "delivery_type": data.get("food_mode") or "pickup",
            },
            lines=[{"item_id": int(iid), "quantity": int(data.get("flow_qty") or 1)}],
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_order_saved(order)
        await message.answer("✅ Taom buyurtmasi yuborildi.", reply_markup=category_reply_keyboard(data["business_type"]))
