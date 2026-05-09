from aiogram.fsm.state import State, StatesGroup


class Flow(StatesGroup):
    choosing_salon = State()
    browsing = State()
