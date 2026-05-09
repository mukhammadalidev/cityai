from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from asgiref.sync import sync_to_async

from apps.businesses.models import Business
from apps.leads.models import Lead

from botapp.bot_constants import AS_SEARCH, SH_SEARCH
from botapp.bot_states import Flow
from botapp.category_flows.keyboards import category_reply_keyboard
from botapp.category_flows.states import AutoSearchFlow, ContactLeadFlow, ShopSearchFlow
from botapp.category_flows.tools import (
    cancel_kb,
    flow_cancel,
    format_item_short,
    item_inline,
    need_business,
    notify_lead_saved,
    phone_kb,
)
from botapp.repository import create_lead_record, fetch_items_for_business as fetch_sync


def register(dp: Dispatcher) -> None:
    @dp.message(ContactLeadFlow.name)
    async def cl_name(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        await state.update_data(cf_name=strip(message.text))
        await state.set_state(ContactLeadFlow.phone)
        await message.answer("Telefon:", reply_markup=phone_kb())

    @dp.message(ContactLeadFlow.phone, F.contact)
    async def cl_pc(message: Message, state: FSMContext) -> None:
        from botapp.telegram_utils import parse_phone

        p = parse_phone(message.contact.phone_number) if message.contact else None
        if p:
            await state.update_data(cf_phone=p)
            await state.set_state(ContactLeadFlow.message)
            await message.answer("Qisqa xabar:", reply_markup=cancel_kb())

    @dp.message(ContactLeadFlow.phone)
    async def cl_pt(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        from botapp.telegram_utils import parse_phone

        p = parse_phone(message.text or "")
        if not p:
            await message.answer("Telefon noto‘g‘ri.")
            return
        await state.update_data(cf_phone=p)
        await state.set_state(ContactLeadFlow.message)
        await message.answer("Xabar:", reply_markup=cancel_kb())

    @dp.message(ContactLeadFlow.message)
    async def cl_msg(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        lead = await sync_to_async(create_lead_record, thread_sensitive=True)(
            business_id=int(data["business_id"]),
            telegram_user_id=message.from_user.id,
            lead_type=data.get("contact_lead_type") or Lead.LeadType.CONTACT,
            name=data.get("cf_name") or "",
            phone=data.get("cf_phone") or "",
            message=strip(message.text),
            item_id=data.get("flow_item_id"),
            username=message.from_user.username or "",
            first_name=message.from_user.first_name or "",
            last_name=message.from_user.last_name or "",
        )
        await state.set_state(Flow.browsing)
        await notify_lead_saved(lead)
        await message.answer(
            "✅ So‘rovingiz qabul qilindi.",
            reply_markup=category_reply_keyboard(data.get("business_type") or ""),
        )

    @dp.message(AutoSearchFlow.waiting)
    async def auto_search_q(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        bid = int(data["business_id"])
        q = (message.text or "").strip().lower()
        items = await sync_to_async(fetch_sync, thread_sensitive=True)(bid, None)
        found = [it for it in items if q in (it.get("title") or "").lower()]
        if not found:
            await message.answer("Hech narsa topilmadi. Boshqa so‘z yuboring yoki bekor qiling.")
            return
        btype = data.get("business_type") or ""
        for it in found[:15]:
            await message.answer(
                format_item_short(it, btype),
                reply_markup=item_inline(
                    bid,
                    int(it["id"]),
                    [
                        ("📄 Batafsil", "d"),
                        ("💳 Kredit", "cr"),
                        ("🧪 Test drive", "td"),
                        ("☎️ Bog‘lanish", "lc"),
                    ],
                ),
            )
        await state.set_state(Flow.browsing)
        await message.answer("Natija:", reply_markup=category_reply_keyboard(btype))

    @dp.message(ShopSearchFlow.waiting)
    async def shop_search_q(message: Message, state: FSMContext) -> None:
        if await flow_cancel(message, state):
            return
        data = await state.get_data()
        bid = int(data["business_id"])
        q = (message.text or "").strip().lower()
        items = await sync_to_async(fetch_sync, thread_sensitive=True)(bid, None)
        found = [it for it in items if q in (it.get("title") or "").lower()]
        if not found:
            await message.answer("Topilmadi.")
            return
        btype = Business.BusinessType.SHOP
        for it in found[:15]:
            await message.answer(
                format_item_short(it, btype),
                reply_markup=item_inline(
                    bid,
                    int(it["id"]),
                    [("📄 Batafsil", "d"), ("🛒 Buyurtma", "ord")],
                ),
            )
        await state.set_state(Flow.browsing)
        await message.answer("Tayyor.", reply_markup=category_reply_keyboard(data.get("business_type") or ""))

    @dp.message(F.text == AS_SEARCH)
    async def btn_auto_search(message: Message, state: FSMContext) -> None:
        data = await need_business(message, state)
        if not data or data.get("business_type") != Business.BusinessType.AUTO_SALON:
            return
        await state.set_state(AutoSearchFlow.waiting)
        await message.answer("🔎 Qidiruv matni:", reply_markup=cancel_kb())

    @dp.message(F.text == SH_SEARCH)
    async def btn_shop_search(message: Message, state: FSMContext) -> None:
        data = await need_business(message, state)
        if not data or data.get("business_type") != Business.BusinessType.SHOP:
            return
        await state.set_state(ShopSearchFlow.waiting)
        await message.answer("🔎 Mahsulot nomi:", reply_markup=cancel_kb())


def strip(t) -> str:
    return (t or "").strip()
