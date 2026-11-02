import { NextRequest, NextResponse } from "next/server";

interface TelegramRequestBody {
  message?: string;
  chatId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Mensaje vacío" },
        { status: 400 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const defaultChatId = process.env.TELEGRAM_CHAT_ID?.trim();
    const targetChatId = body.chatId?.trim() || defaultChatId;

    if (!token || !targetChatId) {
      console.warn(
        "[Telegram] Credenciales no configuradas (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)."
      );
      return NextResponse.json(
        { ok: false, skipped: true, reason: "Credenciales no configuradas" },
        { status: 200 }
      );
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    // Intento 1: con formato Markdown
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    // Fallback resiliente: si falla por caracteres especiales en Markdown (ej. '_' en URLs o notas), reintentar en texto plano
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn(
        "[Telegram] Falló envío con Markdown, reintentando como texto plano:",
        errData
      );
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message.replace(/[*_`]/g, ""),
        }),
      });
    }

    if (!res.ok) {
      const errorDetail = await res.text().catch(() => "Error desconocido");
      console.error("[Telegram] Error de API:", errorDetail);
      return NextResponse.json(
        { ok: false, error: errorDetail },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[Telegram] Excepción de red o servidor:", err);
    // Retornamos 200 con ok: false para no bloquear ni disparar errores fatales en el cliente
    return NextResponse.json(
      { ok: false, error: "Error de red al contactar Telegram" },
      { status: 200 }
    );
  }
}

