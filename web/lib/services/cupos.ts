import { createClient } from "@/lib/supabase/client";

export interface CupoDiarioDB {
  fecha: string; // "YYYY-MM-DD"
  capacidad_maxima: number;
  cupos_ocupados: number;
  bloqueado_manual: boolean;
}

export async function getCapacidadEstandar(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "capacidad_diaria_estandar")
    .maybeSingle();

  if (error || !data) {
    return 3;
  }
  return Number(data.valor) || 3;
}

export async function updateCapacidadEstandar(nuevaCapacidad: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .upsert({
      clave: "capacidad_diaria_estandar",
      valor: nuevaCapacidad,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error actualizando capacidad estándar:", error);
    throw error;
  }
  return data;
}

export async function getRecepcionAbierta(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "recepcion_pedidos_abierta")
    .maybeSingle();

  if (error || !data) {
    return true;
  }
  return data.valor === true || data.valor === "true";
}

export async function updateRecepcionAbierta(abierta: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .upsert({
      clave: "recepcion_pedidos_abierta",
      valor: abierta,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error actualizando recepción de pedidos:", error);
    throw error;
  }
  return data;
}

export async function getCuposMes(year: number, month: number): Promise<CupoDiarioDB[]> {
  const supabase = createClient();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const primerDia = `${year}-${pad(month)}-01`;
  const ultimoDia = `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}`;

  const { data, error } = await supabase
    .from("cupos_diarios")
    .select("*")
    .gte("fecha", primerDia)
    .lte("fecha", ultimoDia);

  if (error) {
    console.error("Error al obtener cupos del mes:", error);
    return [];
  }
  return (data as CupoDiarioDB[]) ?? [];
}

export async function upsertCupoDia(
  fecha: string,
  capacidad_maxima: number,
  bloqueado_manual: boolean
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cupos_diarios")
    .upsert(
      {
        fecha,
        capacidad_maxima,
        bloqueado_manual,
      },
      { onConflict: "fecha" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error guardando cupo del día:", error);
    throw error;
  }
  return data as CupoDiarioDB;
}

export async function deleteCupoDia(fecha: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cupos_diarios")
    .delete()
    .eq("fecha", fecha);

  if (error) {
    console.error("Error eliminando personalización de cupo:", error);
    throw error;
  }
}

