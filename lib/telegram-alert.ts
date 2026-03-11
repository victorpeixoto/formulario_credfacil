export async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('[telegram-alert] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[telegram-alert] Erro ao enviar mensagem:', err);
    }
  } catch (err) {
    console.error('[telegram-alert] Falha na requisição:', err);
  }
}
