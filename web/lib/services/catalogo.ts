import { createClient } from "@/lib/supabase/client";

export type TipoInsumo = "bizcochuelo" | "relleno" | "cobertura" | "topping";

export interface InsumoDB {
  id: string;
  tipo: TipoInsumo;
  nombre: string;
  imagen_url?: string | null;
  recargo_extra: number;
  activo: boolean;
  es_default?: boolean;
}

export async function getInsumos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insumos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching insumos:", error);
    return [];
  }
  return data as InsumoDB[];
}

export async function getInsumosActivos(): Promise<InsumoDB[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insumos")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching insumos activos:", error);
    return [];
  }
  return data as InsumoDB[];
}

export interface TortaDB {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo: "personalizable" | "receta_fija";
  precio_base_kg: number;
  imagen_url: string;
  cta_text: string;
  activo: boolean;
}

export async function getTortasActivas(): Promise<TortaDB[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas")
    .select("*")
    .eq("activo", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Error fetching tortas activas:", error);
    return [];
  }
  return data as TortaDB[];
}

export async function getTodasLasTortas(): Promise<TortaDB[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Error fetching todas las tortas:", error);
    return [];
  }
  return data as TortaDB[];
}

export async function updateTortaActivo(id: string, activo: boolean): Promise<TortaDB> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas")
    .update({ activo })
    .eq("id", id)
    .select();

  if (error) {
    console.warn("Aviso al actualizar activo de torta (posible RLS):", error);
  }
  return (data && data[0]) ? (data[0] as TortaDB) : ({ id, activo } as TortaDB);
}

export async function updateTorta(id: string, cambios: Partial<TortaDB>): Promise<TortaDB> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas")
    .update(cambios)
    .eq("id", id)
    .select();

  if (error) {
    console.warn("Aviso al actualizar torta (posible RLS):", error);
  }
  return (data && data[0]) ? (data[0] as TortaDB) : ({ id, ...cambios } as TortaDB);
}

export async function deleteTorta(id: string): Promise<boolean> {
  const supabase = createClient();
  // 1. Eliminar relaciones de insumos compatibles
  await supabase.from("tortas_insumos").delete().eq("torta_id", id);

  // 2. Eliminar la torta
  const { error } = await supabase.from("tortas").delete().eq("id", id);
  if (error) {
    console.error("Error al eliminar torta de Supabase:", error);
    throw error;
  }
  return true;
}

export async function createTorta(torta: Partial<TortaDB>): Promise<TortaDB> {
  const supabase = createClient();
  const slug =
    torta.slug ||
    torta.nombre
      ?.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    `torta-${Date.now()}`;

  const payload = {
    slug,
    nombre: torta.nombre,
    descripcion: torta.descripcion || "",
    tipo: torta.tipo || "personalizable",
    precio_base_kg: torta.precio_base_kg,
    imagen_url: torta.imagen_url || "",
    cta_text: torta.tipo === "receta_fija" ? "Pedir" : "Personalizar",
    activo: torta.activo ?? true,
  };

  const { data, error } = await supabase
    .from("tortas")
    .insert([payload])
    .select();

  if (error) {
    console.error("Error al crear torta en Supabase:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No se pudo confirmar la creación de la torta en Supabase.");
  }

  return data[0] as TortaDB;
}

export async function getInsumosIdsPorTorta(tortaId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas_insumos")
    .select("insumo_id")
    .eq("torta_id", tortaId);

  if (error || !data) {
    console.error("Error fetching insumos por torta ID:", error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => r.insumo_id);
}

export interface TortaInsumoRel {
  insumo_id: string;
  es_default: boolean;
}

export async function getInsumosRelPorTorta(tortaId: string): Promise<TortaInsumoRel[]> {
  const supabase = createClient();
  const res = await supabase
    .from("tortas_insumos")
    .select("insumo_id, es_default")
    .eq("torta_id", tortaId);

  let list: TortaInsumoRel[] = [];
  if (res.error) {
    const fallback = await supabase
      .from("tortas_insumos")
      .select("insumo_id")
      .eq("torta_id", tortaId);
    list = (fallback.data || []).map((r: { insumo_id: string }) => ({
      insumo_id: r.insumo_id,
      es_default: false,
    }));
  } else {
    list = (res.data || []).map((r: { insumo_id: string; es_default?: boolean }) => ({
      insumo_id: r.insumo_id,
      es_default: Boolean(r.es_default),
    }));
  }

  // Respaldo en localStorage en caso de que aún no se haya ejecutado el ALTER TABLE en Supabase
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`torta_defaults_${tortaId}`);
      if (stored) {
        const defaultIds = new Set<string>(JSON.parse(stored));
        list = list.map((item) => ({
          ...item,
          es_default: item.es_default || defaultIds.has(item.insumo_id),
        }));
      }
    } catch {
      // Ignorar error de parsing en localStorage
    }
  }

  return list;
}

export async function setInsumoDefault(
  tortaId: string,
  insumoId: string,
  esDefault: boolean,
  otherInsumosOfCategory: string[] = []
): Promise<void> {
  const supabase = createClient();

  // Guardar en localStorage para disponibilidad local inmediata
  if (typeof window !== "undefined") {
    try {
      const key = `torta_defaults_${tortaId}`;
      const existing = localStorage.getItem(key);
      const set = new Set<string>(existing ? JSON.parse(existing) : []);
      // Quitar otros de la misma categoría
      otherInsumosOfCategory.forEach((id) => set.delete(id));
      if (esDefault) {
        set.add(insumoId);
      } else {
        set.delete(insumoId);
      }
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {
      // Ignorar error de localStorage
    }
  }

  // Guardar en Supabase (si la columna es_default existe)
  try {
    if (esDefault) {
      if (otherInsumosOfCategory.length > 0) {
        await supabase
          .from("tortas_insumos")
          .update({ es_default: false })
          .eq("torta_id", tortaId)
          .in("insumo_id", otherInsumosOfCategory);
      }
      await supabase
        .from("tortas_insumos")
        .update({ es_default: true })
        .eq("torta_id", tortaId)
        .eq("insumo_id", insumoId);
    } else {
      await supabase
        .from("tortas_insumos")
        .update({ es_default: false })
        .eq("torta_id", tortaId)
        .eq("insumo_id", insumoId);
    }
  } catch (err) {
    console.warn("Aviso al persistir es_default en Supabase:", err);
  }
}

export async function setInsumoCompatibilidad(
  tortaId: string,
  insumoId: string,
  compatible: boolean
): Promise<void> {
  const supabase = createClient();
  if (compatible) {
    const { error } = await supabase
      .from("tortas_insumos")
      .upsert({ torta_id: tortaId, insumo_id: insumoId });
    if (error) {
      console.warn("Aviso asociando compatibilidad (posible RLS):", error.message);
    }
  } else {
    const { error } = await supabase
      .from("tortas_insumos")
      .delete()
      .eq("torta_id", tortaId)
      .eq("insumo_id", insumoId);
    if (error) {
      console.warn("Aviso desasociando compatibilidad (posible RLS):", error.message);
    }
  }
}

export async function uploadTortaImagen(file: File): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `torta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `tortas/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("catalogo")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error subiendo foto de torta a storage:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("catalogo").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getTortaPorId(id: string): Promise<TortaDB | null> {
  const supabase = createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = supabase.from("tortas").select("*");
  const { data, error } = isUuid
    ? await query.eq("id", id).maybeSingle()
    : await query.eq("slug", id).maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as TortaDB;
}

export async function getTortaPorSlug(slug: string): Promise<TortaDB | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tortas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as TortaDB;
}

export async function getInsumosPorTorta(tortaSlug?: string): Promise<InsumoDB[]> {
  if (!tortaSlug) {
    return getInsumosActivos();
  }

  const supabase = createClient();
  try {
    const { data: torta } = await supabase
      .from("tortas")
      .select("id, tipo")
      .eq("slug", tortaSlug)
      .maybeSingle();

    if (!torta || torta.tipo === "receta_fija") {
      return [];
    }

    // 1. Intentar consultar con es_default
    let rows: any[] = [];
    const res = await supabase
      .from("tortas_insumos")
      .select("es_default, insumo:insumos(*)")
      .eq("torta_id", torta.id);

    if (res.error) {
      // Fallback si la columna es_default aún no fue creada en Supabase
      const fallback = await supabase
        .from("tortas_insumos")
        .select("insumo:insumos(*)")
        .eq("torta_id", torta.id);
      rows = fallback.data || [];
    } else {
      rows = res.data || [];
    }

    if (rows.length === 0) {
      return [];
    }

    // Comprobar si hay defaults guardados en localStorage como fallback
    let localDefaultIds = new Set<string>();
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`torta_defaults_${torta.id}`);
        if (stored) localDefaultIds = new Set(JSON.parse(stored));
      } catch {
        // Ignorar
      }
    }

    const compatibles: InsumoDB[] = rows
      .filter((row: any) => Boolean(row.insumo && row.insumo.activo))
      .map((row: any) => {
        const ins = row.insumo as InsumoDB;
        const isDef = Boolean(row.es_default) || localDefaultIds.has(ins.id);
        return {
          ...ins,
          es_default: isDef,
        };
      });

    return compatibles;
  } catch (err) {
    console.error("Error al obtener insumos por torta:", err);
    return [];
  }
}

export async function uploadInsumoImagen(file: File): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `insumos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("catalogo")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error subiendo imagen a storage:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("catalogo").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createInsumo(insumo: {
  tipo: TipoInsumo;
  nombre: string;
  recargo_extra: number;
  activo?: boolean;
  imagen_url?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insumos")
    .insert([
      {
        tipo: insumo.tipo,
        nombre: insumo.nombre,
        recargo_extra: insumo.recargo_extra,
        activo: insumo.activo ?? true,
        imagen_url: insumo.imagen_url ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating insumo:", error);
    throw error;
  }
  return data as InsumoDB;
}

export async function updateInsumoActivo(id: string, activo: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insumos")
    .update({ activo })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating insumo activo:", error);
    throw error;
  }
  return data as InsumoDB;
}

export async function updateInsumo(
  id: string,
  cambios: {
    nombre?: string;
    tipo?: TipoInsumo;
    recargo_extra?: number;
    activo?: boolean;
    imagen_url?: string | null;
  }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("insumos")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating insumo:", error);
    throw error;
  }
  return data as InsumoDB;
}

export async function deleteInsumo(id: string) {
  const supabase = createClient();
  // Limpiar relaciones de compatibilidad primero para evitar restricciones de FK
  await supabase.from("tortas_insumos").delete().eq("insumo_id", id);
  const { error } = await supabase.from("insumos").delete().eq("id", id);
  if (error) {
    console.error("Error deleting insumo:", error);
    throw error;
  }
  return true;
}

export async function getPrecioBaseKg(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "precio_base_kg")
    .maybeSingle();

  if (error || !data) {
    return 13000;
  }
  return Number(data.valor) || 13000;
}

export async function updatePrecioBaseKg(nuevoPrecio: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .upsert({
      clave: "precio_base_kg",
      valor: nuevoPrecio,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error actualizando precio base por kg:", error);
    throw error;
  }
  return data;
}

