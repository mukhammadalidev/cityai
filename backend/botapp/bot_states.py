from aiogram.fsm.state import State, StatesGroup


class Flow(StatesGroup):
    choosing_salon = State()
    browsing = State()


class AiAssistStates(StatesGroup):
    """Foydalanuvchi AI ga savol yozishni kutmoqda."""

    waiting_question = State()
