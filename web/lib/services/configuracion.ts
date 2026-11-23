import { createClient } from "@/lib/supabase/client";

export interface TallerConfig {
  cbu: string;
  alias: string;
  titular: string;
  whatsapp: string;
  direccion_retiro: string;
  horario_retiro: string;
}

export const DEFAULT_TALLER_CONFIG: TallerConfig = {
  cbu: "0000003100012345678901",
  alias: "pasteleria.taller",
  titular: "Yonatan Ahumada",
  whatsapp: "",
  direccion_retiro: "",
  horario_retiro: "",
};

const CONFIG_CLAVE = "datos_taller";

export async function getTallerConfig(): Promise<TallerConfig> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", CONFIG_CLAVE)
      .maybeSingle();

    if (error || !data || !data.valor || typeof data.valor !== "object") {
      return DEFAULT_TALLER_CONFIG;
    }

    const raw = data.valor as Partial<TallerConfig>;
    return {
      cbu: typeof raw.cbu === "string" && raw.cbu.trim() ? raw.cbu : DEFAULT_TALLER_CONFIG.cbu,
      alias: typeof raw.alias === "string" && raw.alias.trim() ? raw.alias : DEFAULT_TALLER_CONFIG.alias,
      titular: typeof raw.titular === "string" && raw.titular.trim() ? raw.titular : DEFAULT_TALLER_CONFIG.titular,
      whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp : "",
      direccion_retiro: typeof raw.direccion_retiro === "string" ? raw.direccion_retiro : "",
      horario_retiro: typeof raw.horario_retiro === "string" ? raw.horario_retiro : "",
    };
  } catch (err) {
    console.warn("Aviso leyendo configuracion del taller:", err);
    return DEFAULT_TALLER_CONFIG;
  }
}

export async function updateTallerConfig(config: TallerConfig): Promise<TallerConfig> {
  const supabase = createClient();
  const payload: TallerConfig = {
    cbu: config.cbu.trim(),
    alias: config.alias.trim(),
    titular: config.titular.trim(),
    whatsapp: config.whatsapp.trim(),
    direccion_retiro: config.direccion_retiro.trim(),
    horario_retiro: config.horario_retiro.trim(),
  };

  const { error } = await supabase
    .from("configuracion")
    .upsert({
      clave: CONFIG_CLAVE,
      valor: payload,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error guardando configuracion del taller:", error);
    throw error;
  }

  return payload;
}
