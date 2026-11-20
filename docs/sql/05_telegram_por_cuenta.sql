-- ============================================================================
-- Issue #32: Vinculación única de Telegram por cuenta de usuario
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Tabla para guardar el chat_id de Telegram de cada cuenta
CREATE TABLE IF NOT EXISTS public.usuarios_telegram (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios_telegram ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven su propio telegram" ON public.usuarios_telegram;
CREATE POLICY "Usuarios ven su propio telegram"
  ON public.usuarios_telegram
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios eliminan su propio telegram" ON public.usuarios_telegram;
CREATE POLICY "Usuarios eliminan su propio telegram"
  ON public.usuarios_telegram
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Webhook gestiona usuarios_telegram" ON public.usuarios_telegram;
CREATE POLICY "Webhook gestiona usuarios_telegram"
  ON public.usuarios_telegram
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Actualizar RPC para heredar automáticamente telegram_chat_id de la cuenta
CREATE OR REPLACE FUNCTION public.reservar_cupo_y_crear_pedido(
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_fecha_entrega date,
  p_peso_kg numeric,
  p_total_estimado numeric,
  p_sena_requerida numeric,
  p_notas text DEFAULT NULL,
  p_comprobante_url text DEFAULT NULL,
  p_foto_referencia_url text DEFAULT NULL,
  p_insumos_ids uuid[] DEFAULT '{}',
  p_ttl_minutos integer DEFAULT 60,
  p_user_id uuid DEFAULT NULL
)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap_estandar integer := 3;
  v_cupo public.cupos_diarios%ROWTYPE;
  v_pedido public.pedidos%ROWTYPE;
  v_insumo_id uuid;
  v_uid uuid;
  v_tg_chat_id text;
BEGIN
  v_uid := COALESCE(auth.uid(), p_user_id);
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NO_AUTENTICADO: Debes iniciar sesión para realizar un pedido.';
  END IF;

  -- Buscar si la cuenta ya tiene Telegram vinculado
  SELECT telegram_chat_id
  INTO v_tg_chat_id
  FROM public.usuarios_telegram
  WHERE user_id = v_uid
  LIMIT 1;

  PERFORM public.limpiar_reservas_expiradas();

  SELECT COALESCE((valor::text)::integer, 3)
  INTO v_cap_estandar
  FROM public.configuracion
  WHERE clave = 'capacidad_diaria_estandar'
  LIMIT 1;

  IF v_cap_estandar IS NULL OR v_cap_estandar < 1 THEN
    v_cap_estandar := 3;
  END IF;

  INSERT INTO public.cupos_diarios (fecha, capacidad_maxima, cupos_ocupados, bloqueado_manual)
  VALUES (p_fecha_entrega, v_cap_estandar, 0, false)
  ON CONFLICT (fecha) DO NOTHING;

  SELECT *
  INTO v_cupo
  FROM public.cupos_diarios
  WHERE fecha = p_fecha_entrega
  FOR UPDATE;

  IF v_cupo.bloqueado_manual THEN
    RAISE EXCEPTION 'FECHA_BLOQUEADA: La fecha seleccionada (%) se encuentra bloqueada para pedidos.', p_fecha_entrega;
  END IF;

  IF v_cupo.cupos_ocupados >= v_cupo.capacidad_maxima THEN
    RAISE EXCEPTION 'SIN_CUPOS: Los cupos para la fecha % se encuentran completos (%/%). Por favor seleccioná otra fecha.',
      p_fecha_entrega, v_cupo.cupos_ocupados, v_cupo.capacidad_maxima;
  END IF;

  UPDATE public.cupos_diarios
  SET cupos_ocupados = cupos_ocupados + 1
  WHERE fecha = p_fecha_entrega;

  INSERT INTO public.pedidos (
    cliente_nombre,
    cliente_telefono,
    fecha_entrega,
    peso_kg,
    total_estimado,
    sena_requerida,
    estado,
    notas,
    comprobante_url,
    foto_referencia_url,
    expiracion_reserva,
    user_id,
    telegram_chat_id
  )
  VALUES (
    p_cliente_nombre,
    p_cliente_telefono,
    p_fecha_entrega,
    p_peso_kg,
    p_total_estimado,
    p_sena_requerida,
    'Pendiente',
    p_notas,
    p_comprobante_url,
    p_foto_referencia_url,
    NOW() + make_interval(mins => GREATEST(1, COALESCE(p_ttl_minutos, 60))),
    v_uid,
    v_tg_chat_id
  )
  RETURNING * INTO v_pedido;

  IF p_insumos_ids IS NOT NULL AND array_length(p_insumos_ids, 1) > 0 THEN
    FOREACH v_insumo_id IN ARRAY p_insumos_ids LOOP
      INSERT INTO public.detalles_pedido (pedido_id, insumo_id)
      VALUES (v_pedido.id, v_insumo_id);
    END LOOP;
  END IF;

  RETURN v_pedido;
END;
$$;
