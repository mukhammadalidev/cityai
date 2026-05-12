from aiogram import Dispatcher

from botapp.category_flows import (
    fsm_auto_edu,
    fsm_commerce,
    fsm_contact_search,
    fsm_fitness,
    fsm_services,
    items,
)


def register_category_flows(dp: Dispatcher) -> None:
    items.register_item_router(dp)
    fsm_contact_search.register(dp)
    fsm_auto_edu.register(dp)
    fsm_commerce.register(dp)
    fsm_services.register(dp)
    fsm_fitness.register(dp)
