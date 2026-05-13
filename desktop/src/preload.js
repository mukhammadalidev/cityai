// Bo'sh preload — saytga hech qanday Node API ochilmaydi (xavfsizlik).
// Kelajakda saytga "men desktopdaman" deyish kerak bo'lsa, shu yerga yozasiz.
window.addEventListener("DOMContentLoaded", () => {
  // Misol: <html> elementiga belgi qo'yamiz — sayt CSS orqali bilishi mumkin.
  document.documentElement.dataset.citybotDesktop = "1";
});
