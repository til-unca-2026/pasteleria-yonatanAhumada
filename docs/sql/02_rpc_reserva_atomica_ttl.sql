-- ============================================================================
-- Issue #19: Reserva temporal de cupos con TTL (60 min) y control atómico
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Función para liberar cupos de reservas expiradas (sin comprobante > 60 min)
CREATE OR REPLACE FUNCTION public.limpiar_reservas_expiradas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expirados integer := 0;
BEGIN
  WITH expirados AS (
    UPDATE public.pedidos
    SET estado = 'Expirado'
    WHERE estado = 'Pendiente'
      AND comprobante_url IS NULL
      AND expiracion_reserva IS NOT NULL
      AND expiracion_reserva < NOW()
    RETURNING id, fecha_entrega
  ),
  conteo_por_fecha AS (
    SELECT fecha_entrega, COUNT(*)::integer AS cantidad
    FROM expirados
    GROUP BY fecha_entrega
  ),
  cupos_actualizados AS (
    UPDATE public.cupos_diarios c
    SET cupos_ocupados = GREATEST(0, c.cupos_ocupados - cpf.cantidad)
    FROM conteo_por_fecha cpf
    WHERE c.fecha = cpf.fecha_entrega
    RETURNING c.fecha
  )
  SELECT COALESCE(SUM(cantidad), 0)::integer
  INTO v_total_expirados
  FROM conteo_por_fecha;

  RETURN v_total_expirados;
END;
$$;

-- 2. Función transaccional atómica para validar cupo (FOR UPDATE), descontarlo y crear el pedido con TTL de 60 min
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
  p_ttl_minutos integer DEFAULT 60
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
BEGIN
  -- Liberar primero reservas vencidas para no bloquear cupos abandonados
  PERFORM public.limpiar_reservas_expiradas();

  -- Obtener capacidad diaria estándar configurada
  SELECT COALESCE((valor::text)::integer, 3)
  INTO v_cap_estandar
  FROM public.configuracion
  WHERE clave = 'capacidad_diaria_estandar'
  LIMIT 1;

  IF v_cap_estandar IS NULL OR v_cap_estandar < 1 THEN
    v_cap_estandar := 3;
  END IF;

  -- Garantizar fila de fecha en cupos_diarios sin condición de carrera
  INSERT INTO public.cupos_diarios (fecha, capacidad_maxima, cupos_ocupados, bloqueado_manual)
  VALUES (p_fecha_entrega, v_cap_estandar, 0, false)
  ON CONFLICT (fecha) DO NOTHING;

  -- Bloqueo exclusivo a nivel de fila para evitar sobreventa simultánea
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

  -- Ocupar 1 cupo atómicamente
  UPDATE public.cupos_diarios
  SET cupos_ocupados = cupos_ocupados + 1
  WHERE fecha = p_fecha_entrega;

  -- Insertar pedido con TTL de 60 minutos
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
    expiracion_reserva
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
    NOW() + make_interval(mins => GREATEST(1, COALESCE(p_ttl_minutos, 60)))
  )
  RETURNING * INTO v_pedido;

  -- Insertar detalles de insumos personalizados si corresponde
  IF p_insumos_ids IS NOT NULL AND array_length(p_insumos_ids, 1) > 0 THEN
    FOREACH v_insumo_id IN ARRAY p_insumos_ids LOOP
      INSERT INTO public.detalles_pedido (pedido_id, insumo_id)
      VALUES (v_pedido.id, v_insumo_id);
    END LOOP;
  END IF;

  RETURN v_pedido;
END;
$$;

-- 3. Función atómica para rechazar/cancelar pedido sin doble liberación de cupo
CREATE OR REPLACE FUNCTION public.rechazar_pedido_atomico(p_pedido_id uuid)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_estado_anterior text;
BEGIN
  SELECT estado INTO v_estado_anterior
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PEDIDO_NO_ENCONTRADO: No existe el pedido %', p_pedido_id;
  END IF;

  UPDATE public.pedidos
  SET estado = 'Expirado'
  WHERE id = p_pedido_id
  RETURNING * INTO v_pedido;

  -- Solo decrementar cupo si el pedido aún estaba ocupando lugar (no estaba Expirado)
  IF v_estado_anterior <> 'Expirado' THEN
    UPDATE public.cupos_diarios
    SET cupos_ocupados = GREATEST(0, cupos_ocupados - 1)
    WHERE fecha = v_pedido.fecha_entrega;
  END IF;

  RETURN v_pedido;
END;
$$;

-- Permisos de ejecución para clientes web y servicio
GRANT EXECUTE ON FUNCTION public.limpiar_reservas_expiradas() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reservar_cupo_y_crear_pedido(text, text, date, numeric, numeric, numeric, text, text, text, uuid[], integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rechazar_pedido_atomico(uuid) TO anon, authenticated, service_role;
