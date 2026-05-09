from aiogram import Router

from . import catalog, leads, messages, start

router = Router()
router.include_router(start.router)
router.include_router(catalog.router)
router.include_router(leads.router)
router.include_router(messages.router)
