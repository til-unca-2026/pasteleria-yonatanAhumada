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

    // Ejecución directa en servidor (SSR / Server Actions / Webhook)
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

export interface NotifPedidoParams {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string;
  peso_kg: number;
  total_estimado: number;
  sena_requerida?: number;
  modeloNombre?: string | null;
  dedicatoria?: string | null;
  comprobante_url?: string | null;
  foto_referencia_url?: string | null;
  telegram_chat_id?: string | null;
}

const getBaseAppUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

// 1. Notificación: Nuevo Pedido Ingresado
export async function notifyNuevoPedido(params: NotifPedidoParams): Promise<boolean> {
  const codigo = `#${params.id.slice(0, 8).toUpperCase()}`;
  const appUrl = getBaseAppUrl();

  const lines = [
    `🎂 *¡Nuevo Pedido Recibido! (${codigo})*`,
    "",
    params.modeloNombre ? `🍰 *Torta:* ${params.modeloNombre}` : "🍰 *Torta:* Personalizada",
    `👤 *Cliente:* ${params.cliente_nombre}`,
    `📱 *Teléfono:* ${params.cliente_telefono}`,
    `📅 *Fecha de Entrega:* ${params.fecha_entrega}`,
    `⚖️ *Peso:* ${params.peso_kg} kg`,
    `💰 *Total a Transferir:* $${Number(params.total_estimado).toLocaleString("es-AR")}`,
  ];

  if (params.dedicatoria) {
    lines.push(`📝 *Dedicatoria/Notas:* "${params.dedicatoria}"`);
  }
  if (params.foto_referencia_url) {
    lines.push(`🖼️ [Ver Foto de Referencia](${params.foto_referencia_url})`);
  }

  lines.push("");
  lines.push("⏳ *Estado:* Esperando comprobante de pago");
  lines.push(`👉 [Ver Comanda en Panel](${appUrl}/admin?tab=pedidos)`);

  return sendTelegramNotification(lines.join("\n"));
}

// 2. Notificación: Comprobante de Pago Adjuntado por el Cliente
export async function notifyComprobanteAdjuntado(params: NotifPedidoParams): Promise<boolean> {
  const codigo = `#${params.id.slice(0, 8).toUpperCase()}`;
  const appUrl = getBaseAppUrl();

  const lines = [
    `🧾 *¡Comprobante de Pago Adjuntado! (${codigo})*`,
    "",
    `👤 *Cliente:* ${params.cliente_nombre}`,
    `📱 *Teléfono:* ${params.cliente_telefono}`,
    `📅 *Entrega:* ${params.fecha_entrega}`,
    `💵 *Monto Informado:* $${Number(params.total_estimado).toLocaleString("es-AR")}`,
  ];

  if (params.comprobante_url) {
    lines.push(`📎 [Inspeccionar Comprobante de Transferencia](${params.comprobante_url})`);
  }

  lines.push("");
  lines.push("⚠️ *Acción requerida:* Validar transferencia y aprobar pedido.");
  lines.push(`👉 [Abrir Panel de Comandas](${appUrl}/admin?tab=pedidos)`);

  return sendTelegramNotification(lines.join("\n"));
}

// 3. Notificación: Pago Aprobado y Confirmado por el Pastelero
export async function notifyPagoAprobado(params: NotifPedidoParams): Promise<boolean> {
  const codigo = `#${params.id.slice(0, 8).toUpperCase()}`;

  // 1. Mensaje para el taller
  const tallerMsg = [
    `✅ *¡Pago Aprobado y Comanda Confirmada! (${codigo})*`,
    "",
    params.modeloNombre ? `🎂 *Torta:* ${params.modeloNombre}` : "",
    `👤 *Cliente:* ${params.cliente_nombre}`,
    `📱 *Teléfono:* ${params.cliente_telefono}`,
    `📅 *Fecha de Entrega:* ${params.fecha_entrega}`,
    `⚖️ *Peso:* ${params.peso_kg} kg`,
    `💵 *Total Confirmado:* $${Number(params.total_estimado).toLocaleString("es-AR")}`,
    "",
    "🧑‍🍳 *La comanda ingresó en la cola de producción del taller.*",
  ].filter(Boolean).join("\n");

  await sendTelegramNotification(tallerMsg);

  // 2. Alerta directa al Telegram personal del cliente (si vinculó su cuenta)
  if (params.telegram_chat_id) {
    const clienteMsg = [
      `✅ *¡Hola ${params.cliente_nombre}! Tu pago fue confirmado.*`,
      "",
      `Tu pedido *${codigo}* (${params.modeloNombre || "Torta Artesanal"}) fue verificado con éxito y ya está en cola de elaboración.`,
      `📅 *Fecha programada de retiro:* ${params.fecha_entrega}`,
      "",
      `Te avisaremos por acá automáticamente cuando tu torta esté lista para retirar. ¡Gracias por confiar en nosotros! 🎂`,
    ].join("\n");
    await sendTelegramNotification(clienteMsg, params.telegram_chat_id);
  }

  return true;
}

// 4. Notificación: Pedido Rechazado y Cupo Liberado
export async function notifyPedidoRechazado(params: {
  id: string;
  cliente_nombre: string;
  fecha_entrega: string;
  motivo?: string;
  telegram_chat_id?: string | null;
}): Promise<boolean> {
  const codigo = `#${params.id.slice(0, 8).toUpperCase()}`;

  // 1. Notificación al taller
  const tallerMsg = [
    `❌ *Pedido Rechazado / Cupo Liberado (${codigo})*`,
    "",
    `👤 *Cliente:* ${params.cliente_nombre}`,
    `📅 *Fecha Liberada:* ${params.fecha_entrega}`,
    params.motivo ? `ℹ️ *Motivo:* ${params.motivo}` : "ℹ️ *Detalle:* El pedido fue cancelado y el cupo del día fue restablecido.",
  ].join("\n");

  await sendTelegramNotification(tallerMsg);

  // 2. Alerta directa al Telegram del cliente si estaba vinculado
  if (params.telegram_chat_id) {
    const clienteMsg = [
      `❌ *Hola ${params.cliente_nombre}, aviso sobre tu pedido ${codigo}*`,
      "",
      `Lamentablemente tu pedido no pudo ser confirmado por el taller en este momento.`,
      params.motivo ? `ℹ️ *Motivo:* ${params.motivo}` : "ℹ️ Si realizaste una transferencia, por favor contactanos para verificar los datos de la operación.",
    ].join("\n");
    await sendTelegramNotification(clienteMsg, params.telegram_chat_id);
  }

  return true;
}

// 5. Notificación: Pedido Listo para Retiro
export async function notifyPedidoListo(params: NotifPedidoParams): Promise<boolean> {
  const codigo = `#${params.id.slice(0, 8).toUpperCase()}`;

  // 1. Notificación al taller
  const tallerMsg = [
    `🎉 *¡Pedido Listo para Retiro! (${codigo})*`,
    "",
    params.modeloNombre ? `🎂 *Torta:* ${params.modeloNombre}` : "",
    `👤 *Cliente:* ${params.cliente_nombre}`,
    `📱 *Teléfono:* ${params.cliente_telefono}`,
    `📅 *Fecha de Entrega:* ${params.fecha_entrega}`,
    "",
    "🎂 *La torta está terminada, decorada y en frío lista para entregar.*",
  ].filter(Boolean).join("\n");

  await sendTelegramNotification(tallerMsg);

  // 2. Alerta directa al Telegram del cliente
  if (params.telegram_chat_id) {
    const clienteMsg = [
      `🎉 *¡Hola ${params.cliente_nombre}! Tu torta está lista.*`,
      "",
      `Tu pedido *${codigo}* (${params.modeloNombre || "Torta Artesanal"}) ya está terminado, decorado y en frío.`,
      "",
      `📍 Podés pasar a retirarlo por el taller. ¡Te esperamos! 🎂`,
    ].join("\n");
    await sendTelegramNotification(clienteMsg, params.telegram_chat_id);
  }

  return true;
}
