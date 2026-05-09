from aiogram.fsm.state import State, StatesGroup


class AutoSearchFlow(StatesGroup):
    waiting = State()


class ShopSearchFlow(StatesGroup):
    waiting = State()


class ContactLeadFlow(StatesGroup):
    name = State()
    phone = State()
    message = State()


class AutoCreditFlow(StatesGroup):
    name = State()
    phone = State()
    initial = State()
    months = State()
    note = State()


class AutoTestDriveFlow(StatesGroup):
    name = State()
    phone = State()
    date = State()
    time = State()
    note = State()


class AutoTradeFlow(StatesGroup):
    name = State()
    phone = State()
    brand = State()
    model = State()
    year = State()
    mileage = State()
    price = State()
    note = State()


class EduRegisterFlow(StatesGroup):
    name = State()
    phone = State()
    ptime = State()
    note = State()


class EduTrialFlow(StatesGroup):
    name = State()
    phone = State()
    date = State()
    time = State()
    note = State()


class EduPriceLeadFlow(StatesGroup):
    name = State()
    phone = State()
    note = State()


class ShopOrderFlow(StatesGroup):
    name = State()
    phone = State()
    qty = State()
    address = State()
    note = State()


class ShopSimpleLeadFlow(StatesGroup):
    name = State()
    phone = State()
    msg = State()


class FoodOrderFlow(StatesGroup):
    name = State()
    phone = State()
    qty = State()
    mode = State()
    address = State()
    note = State()


class ClinicBookFlow(StatesGroup):
    name = State()
    phone = State()
    date = State()
    time = State()
    note = State()


class BeautyBookFlow(StatesGroup):
    name = State()
    phone = State()
    master = State()
    date = State()
    time = State()
    note = State()


class RepairBookFlow(StatesGroup):
    name = State()
    phone = State()
    address = State()
    date = State()
    time = State()
    problem = State()
    note = State()


class RealSearchFlow(StatesGroup):
    waiting = State()


class RealLeadFlow(StatesGroup):
    name = State()
    phone = State()
    msg = State()
    ctime = State()


class RealViewFlow(StatesGroup):
    name = State()
    phone = State()
    date = State()
    time = State()
    note = State()


class TaxiFlow(StatesGroup):
    name = State()
    phone = State()
    from_a = State()
    to_a = State()
    ptime = State()
    note = State()


class ParcelFlow(StatesGroup):
    name = State()
    phone = State()
    pickup = State()
    dropoff = State()
    pkg = State()
    ptime = State()


class LegalBookFlow(StatesGroup):
    name = State()
    phone = State()
    topic = State()
    date = State()
    time = State()
    note = State()


class PhotoBookFlow(StatesGroup):
    name = State()
    phone = State()
    event_type = State()
    date = State()
    time = State()
    location = State()
    note = State()
