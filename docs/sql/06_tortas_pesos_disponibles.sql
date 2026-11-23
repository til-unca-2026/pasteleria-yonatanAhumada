-- ============================================================================
-- Issue #33: Pesos y precios directos configurables por modelo de torta
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ============================================================================

ALTER TABLE public.tortas
ADD COLUMN IF NOT EXISTS pesos_disponibles numeric[] DEFAULT ARRAY[1, 1.5, 2]::numeric[],
ADD COLUMN IF NOT EXISTS precios_por_peso jsonb DEFAULT NULL;

UPDATE public.tortas
SET pesos_disponibles = ARRAY[1, 1.5, 2]::numeric[]
WHERE pesos_disponibles IS NULL OR array_length(pesos_disponibles, 1) IS NULL;
