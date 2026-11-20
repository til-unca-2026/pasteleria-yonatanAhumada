-- ============================================================================
-- Issue #33: Pesos configurables por modelo de torta (soporte único y doble piso)
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ============================================================================

ALTER TABLE public.tortas
ADD COLUMN IF NOT EXISTS pesos_disponibles numeric[] DEFAULT ARRAY[1, 1.5, 2]::numeric[];

UPDATE public.tortas
SET pesos_disponibles = ARRAY[1, 1.5, 2]::numeric[]
WHERE pesos_disponibles IS NULL OR array_length(pesos_disponibles, 1) IS NULL;
