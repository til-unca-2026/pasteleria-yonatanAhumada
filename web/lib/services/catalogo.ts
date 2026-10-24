import { createClient } from "@/lib/supabase/client";

export type TipoInsumo = "bizcochuelo" | "relleno" | "cobertura";

export interface InsumoDB {
  id: string;
  tipo: TipoInsumo;
  nombre: string;
  imagen_url?: string | null;
  recargo_extra: number;
  activo: boolean;
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

    const { data, error } = await supabase
      .from("tortas_insumos")
      .select("insumo:insumos(*)")
      .eq("torta_id", torta.id);

    if (error || !data) {
      console.error("Error fetching insumos por torta:", error);
      return getInsumosActivos();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compatibles = data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row.insumo as InsumoDB)
      .filter((i: InsumoDB) => Boolean(i && i.activo));

    return compatibles.length > 0 ? compatibles : getInsumosActivos();
  } catch (err) {
    console.error("Error al obtener insumos por torta:", err);
    return getInsumosActivos();
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

