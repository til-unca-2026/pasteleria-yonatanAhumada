import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      username?: string;
    };
    chat?: {
      id: number;
      first_name?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

// Cliente Supabase seguro para el Webhook (usa service_role si está disponible, o anon)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sendTelegramDirect(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  }).catch((err) => console.warn("Aviso enviando mensaje directo Telegram:", err));
}

// GET: Chequear estado o registrar webhook en Telegram con un clic
export async function GET(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN no configurado" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const shouldSet = searchParams.get("set") === "1";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

  if (shouldSet) {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const data = await res.json();
    return NextResponse.json({
      action: "setWebhook",
      registeredUrl: webhookUrl,
      telegramResponse: data,
    });
  }

  const [meRes, infoRes] = await Promise.all([
    fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()).catch(() => ({})),
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()).catch(() => ({})),
  ]);

  return NextResponse.json({
    status: "online",
    bot: meRes,
    webhookInfo: infoRes,
    suggestedWebhookUrl: webhookUrl,
    howToRegister: `Visita esta URL con ?set=1 para registrar automáticamente el Webhook: ${webhookUrl}?set=1`,
  });
}

// POST: Procesar mensajes entrantes de Telegram (ej: /start <pedido_id>)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramUpdate;
    const msg = body.message;

    if (!msg || !msg.text) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const text = msg.text.trim();
    const chatId = msg.chat?.id;
    const userName = msg.from?.first_name || "Cliente";

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Caso 1: Comando /start con parámetro de pedido
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const pedidoParam = parts[1]?.trim();

      if (pedidoParam) {
        const supabase = getSupabaseAdmin();

        // Buscar pedido por ID exacto o por prefijo (ej: 8 caracteres)
        let { data: pedido } = await supabase
          .from("pedidos")
          .select("id, cliente_nombre, fecha_entrega, total_estimado, estado")
          .eq("id", pedidoParam)
          .maybeSingle();

        if (!pedido && pedidoParam.length >= 6) {
          const { data: searchList } = await supabase
            .from("pedidos")
            .select("id, cliente_nombre, fecha_entrega, total_estimado, estado")
            .ilike("id", `${pedidoParam}%`)
            .limit(1);

          if (searchList && searchList[0]) {
            pedido = searchList[0];
          }
        }

        if (pedido) {
          const shortCode = `#${pedido.id.slice(0, 8).toUpperCase()}`;

          // Vincular chat_id al pedido en Supabase
          const { error: upErr } = await supabase
            .from("pedidos")
            .update({ telegram_chat_id: String(chatId) })
            .eq("id", pedido.id);

          if (upErr) {
            console.error("[Telegram Webhook] Error guardando telegram_chat_id:", upErr);
          }

          // Respuesta al cliente
          await sendTelegramDirect(
            chatId,
            `🎂 *¡Hola ${userName}! Tu pedido ${shortCode} quedó vinculado con éxito.*\n\n` +
              `Te avisaremos automáticamente por acá ante cualquier actualización:\n` +
              `• ✅ Cuando el taller valide tu pago/transferencia\n` +
              `• 🧑‍🍳 Cuando ingrese a la cola de elaboración\n` +
              `• 🎉 Cuando tu torta esté lista para retiro\n\n` +
              `📅 *Fecha de Retiro:* ${pedido.fecha_entrega}\n` +
              `💰 *Total:* $${Number(pedido.total_estimado).toLocaleString("es-AR")}\n\n` +
              `_¡Gracias por elegir Pastelería Artesanal!_`
          );

          // Notificar al taller que el cliente se vinculó
          const tallerChatId = process.env.TELEGRAM_CHAT_ID;
          if (tallerChatId && String(tallerChatId) !== String(chatId)) {
            await sendTelegramDirect(
              tallerChatId,
              `🔔 *Cliente Vinculado:* ${pedido.cliente_nombre} vinculó su Telegram al pedido ${shortCode}. Recibirá las alertas automáticamente.`
            );
          }

          return NextResponse.json({ ok: true, linked: true, pedidoId: pedido.id });
        } else {
          // No se encontró el pedido
          await sendTelegramDirect(
            chatId,
            `⚠️ *No encontramos un pedido activo para el código:* \`${pedidoParam}\`\n\n` +
              `Por favor ingresá a nuestra web en la sección *Mis Pedidos* y tocá el botón *Recibir avisos por Telegram* para vincularlo correctamente.`
          );
          return NextResponse.json({ ok: true, notFound: true });
        }
      } else {
        // /start sin parámetro
        await sendTelegramDirect(
          chatId,
          `🎂 *¡Hola ${userName}! Bienvenido a Pastelería Artesanal.*\n\n` +
            `Este bot te envía notificaciones automáticas sobre el estado de tus tortas encargadas.\n\n` +
            `👉 Para vincular tu pedido:\n` +
            `1. Ingresá a la web en *Mis Pedidos*.\n` +
            `2. Hacé clic en *🔔 Recibir avisos en Telegram* en el detalle de tu compra.`
        );
        return NextResponse.json({ ok: true, welcome: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Error procesando update:", err);
    return NextResponse.json({ ok: true, error: "Handled error" }, { status: 200 });
  }
}

