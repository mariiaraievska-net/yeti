// Netlify викликає цю функцію автоматично на кожну нову заявку з форми «lead»
// і пересилає її в Telegram.
//
// Налаштування: Netlify → Site configuration → Environment variables
//   TG_TOKEN   — токен бота від @BotFather
//   TG_CHAT_ID — твій chat id (бот підкаже його: напиши йому будь-що й відкрий
//                https://api.telegram.org/bot<ТОКЕН>/getUpdates — число в "chat":{"id":…})

exports.handler = async (event) => {
  const { payload } = JSON.parse(event.body || "{}");
  if (!payload || payload.form_name !== "lead") return { statusCode: 200, body: "skip" };

  const d = payload.data || {};
  if (d.website) return { statusCode: 200, body: "bot" }; // пастка для спам-ботів

  const token = process.env.TG_TOKEN;
  const chat = process.env.TG_CHAT_ID;
  if (!token || !chat) return { statusCode: 200, body: "telegram not configured" };

  const clip = (v, n) => String(v || "").trim().slice(0, n);
  const contact = clip(d.contact, 80);
  const tgLink = /^@\w{4,}$/.test(contact) ? `\nhttps://t.me/${contact.slice(1)}` : "";
  const text =
    "🐾 Нова заявка з сайту YETI\n\n" +
    `Ім’я: ${clip(d.name, 80)}\n` +
    `Контакт: ${contact}${tgLink}\n` +
    `Послуга: ${clip(d.service, 80)}` +
    (d.message ? `\n\nПро проєкт: ${clip(d.message, 1500)}` : "");

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  return { statusCode: 200, body: r.ok ? "sent" : "telegram error" };
};
