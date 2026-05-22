/**
 * Landing demo so'rovi — keyinchalik POST /api/landing/contact/ ulash mumkin.
 * Hozir: localStorage + Telegram deep link fallback.
 */

const STORAGE_KEY = "citybot_demo_requests";

export function buildDemoPayload(form) {
  return {
    name: form.name?.trim(),
    phone: form.phone?.trim(),
    business_type: form.business_type,
    message: form.message?.trim(),
    source: "citybot_landing",
    created_at: new Date().toISOString(),
  };
}

export async function submitDemoRequest(form) {
  const payload = buildDemoPayload(form);

  // Kelajakda: await api.post("/landing/contact/", payload);

  const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  prev.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-50)));

  const text = encodeURIComponent(
    `Demo so'rov (citybot.uz)\nIsm: ${payload.name}\nTel: ${payload.phone}\nBiznes: ${payload.business_type}\n${payload.message || ""}`
  );
  return { ok: true, telegramUrl: `https://t.me/citybotcrm?text=${text}` };
}
