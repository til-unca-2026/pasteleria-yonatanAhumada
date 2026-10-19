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

