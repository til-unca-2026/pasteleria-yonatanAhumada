export async function sendTelegramNotification(
  message: string,
  chatId?: string
): Promise<boolean> {
  if (!message || !message.trim()) {
    return false;
  }

  try {
    // Si se ejecuta en el navegador, delega al Route Handler interno para proteger el Bot Token
    if (typeof window !== "undefined") {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, chatId }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { ok?: boolean };
      return Boolean(data.ok);
    }

    // Ejecución directa en servidor (SSR / Server Actions)
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const targetChatId = chatId?.trim() || process.env.TELEGRAM_CHAT_ID?.trim();

    if (!token || !targetChatId) {
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("Aviso: No se pudo enviar la alerta a Telegram (no bloqueante):", err);
    return false;
  }
}

