from aiogram.types import KeyboardButton, ReplyKeyboardMarkup

from apps.businesses.models import Business

from botapp.bot_constants import (
    AS_ADDR,
    AS_CARS,
    AS_CREDIT,
    AS_OP,
    AS_SEARCH,
    AS_TEST,
    AS_TRADE,
    BT_ADM,
    BT_AP,
    BT_ADDR,
    BT_MAST,
    BT_PRICE,
    BT_PROMO,
    BT_SVC,
    CHANGE_SALON_BUTTON,
    CL_ADDR,
    CL_BOOK,
    CL_DOCS,
    CL_PRICE,
    CL_REG,
    CL_SVC,
    ED_ADMIN,
    ED_ADDR,
    ED_COURSES,
    ED_PRICES,
    ED_SCHED,
    ED_TEACHERS,
    ED_TRIAL,
    HOME_BUTTON,
    ITEMS_LEGACY,
    ADDRESS_BUTTON,
    OPERATOR_BUTTON,
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
    R_BOOK_BUTTON,
    R_DELIVERY_BUTTON,
    R_FOOD_ORDER,
    R_MENU_BUTTON,
    R_PROMO_BUTTON,
    R_ADDRESS_BUTTON,
    R_OPERATOR_BUTTON,
    RP_AREA,
    RP_MASTER,
    RP_OP,
    RP_ORDER,
    RP_PRICE,
    RP_SVC,
    SH_DEL,
    SH_OP,
    SH_ORDER,
    SH_PAY,
    SH_PRODUCTS,
    SH_SEARCH,
    TX_DEL,
    TX_OP,
    TX_PRICE,
    TX_TAXI,
)


def category_intro_extra(business_type: str) -> str:
    if business_type == Business.BusinessType.CLINIC:
        return (
            "\n\n⚠️ <i>Bot tibbiy tashxis qo‘ymaydi va davolanishni tavsiya etmaydi. "
            "Faqat klinika xizmatlari va qabul haqida ma’lumot.</i>"
        )
    if business_type == Business.BusinessType.LEGAL_SERVICE:
        return (
            "\n\n⚠️ <i>Bot yakuniy yuridik maslahat bermaydi. "
            "Aniq yechim uchun konsultatsiyaga yoziling.</i>"
        )
    return ""


def category_reply_keyboard(business_type: str) -> ReplyKeyboardMarkup:
    ch = [KeyboardButton(text=CHANGE_SALON_BUTTON), KeyboardButton(text=HOME_BUTTON)]
    if business_type == Business.BusinessType.AUTO_SALON:
        rows = [
            [KeyboardButton(text=AS_CARS), KeyboardButton(text=AS_SEARCH)],
            [KeyboardButton(text=AS_CREDIT), KeyboardButton(text=AS_TRADE)],
            [KeyboardButton(text=AS_TEST), KeyboardButton(text=AS_ADDR)],
            [KeyboardButton(text=AS_OP)],
            ch,
        ]
    elif business_type == Business.BusinessType.EDUCATION_CENTER:
        rows = [
            [KeyboardButton(text=ED_COURSES), KeyboardButton(text=ED_PRICES)],
            [KeyboardButton(text=ED_TRIAL), KeyboardButton(text=ED_TEACHERS)],
            [KeyboardButton(text=ED_SCHED), KeyboardButton(text=ED_ADDR)],
            [KeyboardButton(text=ED_ADMIN)],
            ch,
        ]
    elif business_type == Business.BusinessType.SHOP:
        rows = [
            [KeyboardButton(text=SH_PRODUCTS), KeyboardButton(text=SH_SEARCH)],
            [KeyboardButton(text=SH_ORDER), KeyboardButton(text=SH_DEL)],
            [KeyboardButton(text=SH_PAY), KeyboardButton(text=SH_OP)],
            ch,
        ]
    elif business_type == Business.BusinessType.RESTAURANT:
        rows = [
            [KeyboardButton(text=R_MENU_BUTTON), KeyboardButton(text=R_FOOD_ORDER)],
            [KeyboardButton(text=R_BOOK_BUTTON), KeyboardButton(text=R_DELIVERY_BUTTON)],
            [KeyboardButton(text=R_PROMO_BUTTON), KeyboardButton(text=R_ADDRESS_BUTTON)],
            [KeyboardButton(text=R_OPERATOR_BUTTON)],
            ch,
        ]
    elif business_type == Business.BusinessType.CLINIC:
        rows = [
            [KeyboardButton(text=CL_DOCS), KeyboardButton(text=CL_SVC)],
            [KeyboardButton(text=CL_BOOK), KeyboardButton(text=CL_PRICE)],
            [KeyboardButton(text=CL_ADDR), KeyboardButton(text=CL_REG)],
            ch,
        ]
    elif business_type == Business.BusinessType.BEAUTY_SALON:
        rows = [
            [KeyboardButton(text=BT_SVC), KeyboardButton(text=BT_MAST)],
            [KeyboardButton(text=BT_AP), KeyboardButton(text=BT_PRICE)],
            [KeyboardButton(text=BT_PROMO), KeyboardButton(text=BT_ADDR)],
            [KeyboardButton(text=BT_ADM)],
            ch,
        ]
    elif business_type == Business.BusinessType.REPAIR_SERVICE:
        rows = [
            [KeyboardButton(text=RP_SVC), KeyboardButton(text=RP_MASTER)],
            [KeyboardButton(text=RP_AREA), KeyboardButton(text=RP_ORDER)],
            [KeyboardButton(text=RP_PRICE), KeyboardButton(text=RP_OP)],
            ch,
        ]
    elif business_type == Business.BusinessType.REAL_ESTATE:
        rows = [
            [KeyboardButton(text=RE_LIST), KeyboardButton(text=RE_SEARCH)],
            [KeyboardButton(text=RE_PRICE), KeyboardButton(text=RE_AREA)],
            [KeyboardButton(text=RE_AGENT), KeyboardButton(text=RE_VIEW)],
            ch,
        ]
    elif business_type == Business.BusinessType.TAXI_DELIVERY:
        rows = [
            [KeyboardButton(text=TX_TAXI), KeyboardButton(text=TX_DEL)],
            [KeyboardButton(text=TX_PRICE), KeyboardButton(text=TX_OP)],
            ch,
        ]
    elif business_type == Business.BusinessType.LEGAL_SERVICE:
        rows = [
            [KeyboardButton(text=LG_SVC), KeyboardButton(text=LG_BOOK)],
            [KeyboardButton(text=LG_PRICE), KeyboardButton(text=LG_CALL)],
            ch,
        ]
    elif business_type == Business.BusinessType.PHOTO_VIDEO:
        rows = [
            [KeyboardButton(text=PH_SVC), KeyboardButton(text=PH_PORT)],
            [KeyboardButton(text=PH_ORD), KeyboardButton(text=PH_PRICE)],
            [KeyboardButton(text=PH_OP)],
            ch,
        ]
    else:
        rows = [
            [KeyboardButton(text=ITEMS_LEGACY)],
            [KeyboardButton(text=ADDRESS_BUTTON), KeyboardButton(text=OPERATOR_BUTTON)],
            ch,
        ]
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)
