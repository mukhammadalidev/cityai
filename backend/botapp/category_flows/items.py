import html

from aiogram import Dispatcher, F
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery
from asgiref.sync import sync_to_async

from apps.businesses.models import Business
from apps.leads.models import Lead

from botapp.category_flows.states import (
    AutoCreditFlow,
    AutoTestDriveFlow,
    BeautyBookFlow,
    ClinicBookFlow,
    ContactLeadFlow,
    EduRegisterFlow,
    EduTrialFlow,
    FoodOrderFlow,
    LegalBookFlow,
    PhotoBookFlow,
    RealLeadFlow,
    RealViewFlow,
    RepairBookFlow,
    ShopOrderFlow,
)
from botapp.category_flows.tools import cancel_kb
from botapp.repository import get_item_row as get_item_row_sync


def register_item_router(dp: Dispatcher) -> None:
    @dp.callback_query(F.data.startswith("i:"))
    async def item_callback(query: CallbackQuery, state: FSMContext) -> None:
        parts = query.data.split(":")
        if len(parts) != 4:
            await query.answer()
            return
        _, bid_s, iid_s, act = parts
        business_id = int(bid_s)
        item_id = int(iid_s)
        data = await state.get_data()
        if data.get("business_id") != business_id:
            await query.answer("Sessiya eskirgan. /start", show_alert=True)
            return
        row = await sync_to_async(get_item_row_sync, thread_sensitive=True)(item_id, business_id)
        if not row:
            await query.answer("Pozitsiya topilmadi.", show_alert=True)
            return
        btype = data.get("business_type") or ""
        title = html.escape(str(row["title"]))
        if act == "d":
            meta = row.get("metadata") or {}
            body = f"📄 <b>{title}</b>\n"
            if row.get("description"):
                body += html.escape(str(row["description"])[:1500])
            if isinstance(meta, dict) and meta:
                body += "\n\n" + html.escape(str(meta)[:800])
            await query.message.answer(body)
            await query.answer()
            return

        await state.update_data(flow_item_id=item_id)

        if act == "cr" and btype == Business.BusinessType.AUTO_SALON:
            await state.set_state(AutoCreditFlow.name)
            await query.message.answer("💳 <b>Kredit</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "td" and btype == Business.BusinessType.AUTO_SALON:
            await state.set_state(AutoTestDriveFlow.name)
            await query.message.answer("🧪 <b>Test drive</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "reg" and btype == Business.BusinessType.EDUCATION_CENTER:
            await state.set_state(EduRegisterFlow.name)
            await query.message.answer("📝 <b>Kursga yozilish</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "trl" and btype == Business.BusinessType.EDUCATION_CENTER:
            await state.set_state(EduTrialFlow.name)
            await query.message.answer("🧪 <b>Sinov darsi</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "ord" and btype == Business.BusinessType.SHOP:
            await state.set_state(ShopOrderFlow.name)
            await query.message.answer("🛒 <b>Buyurtma</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "food" and btype == Business.BusinessType.RESTAURANT:
            await state.set_state(FoodOrderFlow.name)
            await query.message.answer("🍔 <b>Taom buyurtmasi</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "cc" and btype == Business.BusinessType.CLINIC:
            await state.set_state(ClinicBookFlow.name)
            await query.message.answer("📅 <b>Qabulga yozilish</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "ap" and btype == Business.BusinessType.BEAUTY_SALON:
            await state.set_state(BeautyBookFlow.name)
            await query.message.answer("📅 <b>Navbat</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "sb" and btype == Business.BusinessType.REPAIR_SERVICE:
            await state.set_state(RepairBookFlow.name)
            await query.message.answer("📅 <b>Xizmat buyurtmasi</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "pi" and btype == Business.BusinessType.REAL_ESTATE:
            await state.set_state(RealLeadFlow.name)
            await query.message.answer("☎️ <b>Uy bo‘yicha so‘rov</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "rv" and btype == Business.BusinessType.REAL_ESTATE:
            await state.set_state(RealViewFlow.name)
            await query.message.answer("📅 <b>Uy ko‘rish</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "lg" and btype == Business.BusinessType.LEGAL_SERVICE:
            await state.set_state(LegalBookFlow.name)
            await query.message.answer("⚖️ <b>Konsultatsiya</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "ph" and btype == Business.BusinessType.PHOTO_VIDEO:
            await state.set_state(PhotoBookFlow.name)
            await query.message.answer("📸 <b>Buyurtma</b>\n\nIsm:", reply_markup=cancel_kb())
        elif act == "lc":
            lt = Lead.LeadType.CAR_INTEREST if btype == Business.BusinessType.AUTO_SALON else Lead.LeadType.CONTACT
            await state.update_data(contact_lead_type=lt)
            await state.set_state(ContactLeadFlow.name)
            await query.message.answer("☎️ <b>Aloqa</b>\n\nIsmingiz:", reply_markup=cancel_kb())
        else:
            await query.answer()
            return
        await query.answer()
