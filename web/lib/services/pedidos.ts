import { createClient } from "@/lib/supabase/client";
import { getCapacidadEstandar } from "@/lib/services/cupos";

export type EstadoPedido =
  | "Pendiente"
  | "Expirado"
  | "Señado"
  | "En producción"
  | "Listo";

export interface PedidoConDetalles {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string; // YYYY-MM-DD
  peso_kg: number;
  total_estimado: number;
  sena_requerida: number;
  estado: EstadoPedido;
  notas?: string | null;
  comprobante_url?: string | null;
  foto_referencia_url?: string | null;
  expiracion_reserva?: string | null;
  created_at: string;
  detalles: {
    id: string;
    insumo: {
      id: string;
      tipo: string;
      nombre: string;
      recargo_extra: number;
    };
  }[];
}

export async function getPedidos(fecha?: string, estado?: string): Promise<PedidoConDetalles[]> {
  const supabase = createClient();
  let query = supabase
    .from("pedidos")
    .select(`
      *,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          tipo,
          nombre,
          recargo_extra
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (fecha) {
    query = query.eq("fecha_entrega", fecha);
  }
  if (estado && estado !== "Todos") {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al obtener pedidos:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    ...p,
    detalles: (p.detalles_pedido || []).map((dp: any) => ({
      id: dp.id,
      insumo: dp.insumo,
    })),
  })) as PedidoConDetalles[];
}

export async function getPedidoById(id: string): Promise<PedidoConDetalles | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          tipo,
          nombre,
          recargo_extra
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    detalles: (data.detalles_pedido || []).map((dp: any) => ({
      id: dp.id,
      insumo: dp.insumo,
    })),
  } as PedidoConDetalles;
}

export async function getPedidosPorIds(ids: string[]): Promise<PedidoConDetalles[]> {
  if (!ids || ids.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          tipo,
          nombre,
          recargo_extra
        )
      )
    `)
    .in("id", ids.slice(0, 20))
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error al obtener pedidos por IDs:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    ...p,
    detalles: (p.detalles_pedido || []).map((dp: any) => ({
      id: dp.id,
      insumo: dp.insumo,
    })),
  })) as PedidoConDetalles[];
}

export async function getPedidosPorTelefono(telefono: string): Promise<PedidoConDetalles[]> {
  const supabase = createClient();
  const cleanPhone = telefono.replace(/[^0-9]/g, "");

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          tipo,
          nombre,
          recargo_extra
        )
      )
    `)
    .ilike("cliente_telefono", `%${cleanPhone.slice(-8)}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al buscar pedidos por teléfono:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    ...p,
    detalles: (p.detalles_pedido || []).map((dp: any) => ({
      id: dp.id,
      insumo: dp.insumo,
    })),
  })) as PedidoConDetalles[];
}

export async function getPedidosDeCliente(params: {
  telefono?: string | null;
  nombre?: string | null;
}): Promise<PedidoConDetalles[]> {
  const supabase = createClient();
  let query = supabase
    .from("pedidos")
    .select(`
      *,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          tipo,
          nombre,
          recargo_extra
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (params.telefono && params.telefono.trim()) {
    const cleanPhone = params.telefono.replace(/[^0-9]/g, "");
    if (cleanPhone.length >= 4) {
      query = query.ilike("cliente_telefono", `%${cleanPhone.slice(-8)}%`);
    } else {
      query = query.ilike("cliente_telefono", `%${cleanPhone}%`);
    }
  } else if (params.nombre && params.nombre.trim()) {
    query = query.ilike("cliente_nombre", `%${params.nombre.trim()}%`);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al buscar pedidos del cliente:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    ...p,
    detalles: (p.detalles_pedido || []).map((dp: any) => ({
      id: dp.id,
      insumo: dp.insumo,
    })),
  })) as PedidoConDetalles[];
}

export async function updatePedidoEstado(id: string, nuevoEstado: EstadoPedido) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error al actualizar estado del pedido:", error);
    throw error;
  }
  return data;
}

export async function uploadComprobante(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const fileName = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `comprobantes/${fileName}`;

  const { error } = await supabase.storage
    .from("comprobantes")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("Error subiendo comprobante a Storage:", error);
    throw error;
  }

  const { data } = supabase.storage.from("comprobantes").getPublicUrl(path);
  return data.publicUrl;
}

export async function adjuntarComprobanteAPedido(pedidoId: string, file: File) {
  const comprobanteUrl = await uploadComprobante(file);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .update({ comprobante_url: comprobanteUrl })
    .eq("id", pedidoId)
    .select()
    .single();

  if (error) {
    console.error("Error adjuntando comprobante:", error);
    throw error;
  }
  return data;
}

export async function createNuevoPedido(params: {
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string;
  peso_kg: number;
  total_estimado: number;
  sena_requerida: number;
  insumosIds: string[];
  notas?: string | null;
  comprobanteFile?: File | null;
  fotoReferenciaFile?: File | null;
}) {
  const supabase = createClient();

  // 1. Subir archivos si existen
  let comprobante_url: string | null = null;
  let foto_referencia_url: string | null = null;

  if (params.comprobanteFile) {
    comprobante_url = await uploadComprobante(params.comprobanteFile);
  }
  if (params.fotoReferenciaFile) {
    foto_referencia_url = await uploadComprobante(params.fotoReferenciaFile);
  }

  // 2. Garantizar que la fecha exista en cupos_diarios y validar disponibilidad estricta
  const { data: cupoExistente } = await supabase
    .from("cupos_diarios")
    .select("fecha, capacidad_maxima, cupos_ocupados, bloqueado_manual")
    .eq("fecha", params.fecha_entrega)
    .maybeSingle();

  const estandarCap = await getCapacidadEstandar();
  const maxCap = cupoExistente ? cupoExistente.capacidad_maxima : estandarCap;
  const occupied = cupoExistente ? cupoExistente.cupos_ocupados : 0;
  const isBlocked = cupoExistente ? cupoExistente.bloqueado_manual : false;

  if (isBlocked) {
    throw new Error(`La fecha seleccionada (${params.fecha_entrega}) se encuentra bloqueada para pedidos.`);
  }
  if (occupied >= maxCap) {
    throw new Error(`Los cupos para la fecha ${params.fecha_entrega} se encuentran completos (${occupied}/${maxCap}). Por favor seleccioná otra fecha.`);
  }

  if (!cupoExistente) {
    const { error: insertCupoError } = await supabase.from("cupos_diarios").insert([
      {
        fecha: params.fecha_entrega,
        capacidad_maxima: estandarCap,
        cupos_ocupados: 1,
        bloqueado_manual: false,
      },
    ]);
    if (insertCupoError) {
      console.warn("Aviso al registrar cupo en cupos_diarios (posible RLS):", insertCupoError.message);
    }
  } else {
    // Incrementar cupos ocupados
    const { error: updateCupoError } = await supabase
      .from("cupos_diarios")
      .update({ cupos_ocupados: cupoExistente.cupos_ocupados + 1 })
      .eq("fecha", params.fecha_entrega);
    if (updateCupoError) {
      console.warn("Aviso al actualizar cupos_diarios (posible RLS):", updateCupoError.message);
    }
  }

  // 3. Crear el pedido
  const expiracion = new Date();
  expiracion.setHours(expiracion.getHours() + 24); // 24 horas de reserva de cupo

  const insertPayload: Record<string, any> = {
    cliente_nombre: params.cliente_nombre,
    cliente_telefono: params.cliente_telefono,
    fecha_entrega: params.fecha_entrega,
    peso_kg: params.peso_kg,
    total_estimado: params.total_estimado,
    sena_requerida: params.sena_requerida,
    estado: "Pendiente",
    comprobante_url,
    foto_referencia_url,
    expiracion_reserva: expiracion.toISOString(),
  };

  if (params.notas) {
    insertPayload.notas = params.notas;
  }

  let { data: pedido, error: errorPedido } = await supabase
    .from("pedidos")
    .insert([insertPayload])
    .select()
    .single();

  // Si falló porque la columna 'notas' no existe aún en la tabla de Supabase (PGRST204), reintentar sin notas
  if (errorPedido && errorPedido.code === "PGRST204" && insertPayload.notas) {
    console.warn("Columna 'notas' no existe en pedidos, reintentando inserción sin 'notas':", errorPedido.message);
    delete insertPayload.notas;
    const retry = await supabase
      .from("pedidos")
      .insert([insertPayload])
      .select()
      .single();
    pedido = retry.data;
    errorPedido = retry.error;
  }

  if (errorPedido) {
    const errorMsg = errorPedido.message || errorPedido.details || JSON.stringify(errorPedido);
    console.error("Error al crear pedido en Supabase:", errorMsg, errorPedido);
    throw new Error(errorMsg || "Error al crear pedido en Supabase");
  }

  // 4. Insertar detalles del pedido (insumos)
  if (params.insumosIds.length > 0) {
    const detallesData = params.insumosIds.map((insumo_id) => ({
      pedido_id: pedido.id,
      insumo_id,
    }));
    await supabase.from("detalles_pedido").insert(detallesData);
  }

  return pedido;
}
