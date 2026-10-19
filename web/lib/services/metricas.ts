import { createClient } from "@/lib/supabase/client";

export interface TopInsumo {
  id: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

export interface DiaSemanaOcupacion {
  dia: string;
  fecha: string;
  numeroDia: number;
  ocupados: number;
  max: number;
  pct: number;
}

export interface MetricasSemanales {
  lunesFecha: string;
  domingoFecha: string;
  rangoTexto: string;
  ingresosTotales: number;
  senasCobradas: number;
  saldoPendiente: number;
  kilosTotales: number;
  totalPedidos: number;
  totalCuposOcupados: number;
  totalCapacidadSemana: number;
  porcentajeOcupacion: number;
  diasSemana: DiaSemanaOcupacion[];
  saboresTop: TopInsumo[];
}

export interface SemanaMes {
  etiqueta: string;
  rango: string;
  ocupados: number;
  max: number;
  pct: number;
}

export interface MetricasMensuales {
  mes: number; // 0-11
  año: number;
  nombreMes: string;
  ingresosTotales: number;
  senasCobradas: number;
  saldoPendiente: number;
  kilosTotales: number;
  totalPedidos: number;
  estadosCount: {
    pendiente: number;
    senado: number;
    enProduccion: number;
    listo: number;
    expirado: number;
  };
  totalCuposOcupados: number;
  totalCapacidadMes: number;
  porcentajeOcupacion: number;
  semanasMes: SemanaMes[];
  saboresTop: TopInsumo[];
}

export interface MesAnual {
  mes: number; // 0-11
  nombreCorto: string; // Ene, Feb, etc.
  ingresos: number;
  tortas: number;
  pct: number;
}

export interface MetricasAnuales {
  año: number;
  ingresosTotales: number;
  senasCobradas: number;
  totalPedidos: number;
  meses: MesAnual[];
  saboresTop: TopInsumo[];
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const DIAS_LETRAS = ["L", "M", "M", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

export async function getMetricasSemanales(monday: Date): Promise<MetricasSemanales> {
  const supabase = createClient();

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(sunday);

  const rangoTexto = `${monday.getDate()} ${MESES[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${MESES[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`;

  // 1. Consultar pedidos de la semana
  const { data: pedidosData, error: errorPedidos } = await supabase
    .from("pedidos")
    .select(`
      id,
      fecha_entrega,
      peso_kg,
      total_estimado,
      sena_requerida,
      estado,
      created_at,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          nombre,
          tipo
        )
      )
    `)
    .gte("fecha_entrega", mondayStr)
    .lte("fecha_entrega", sundayStr);

  if (errorPedidos) {
    console.error("Error al obtener pedidos semanales:", errorPedidos);
  }

  const pedidos = pedidosData || [];
  const pedidosValidos = pedidos.filter((p: any) => p.estado !== "Expirado");

  const ingresosTotales = pedidosValidos.reduce(
    (acc: number, p: any) => acc + Number(p.total_estimado || 0),
    0
  );

  const senasCobradas = pedidosValidos
    .filter((p: any) => ["Señado", "En producción", "Listo"].includes(p.estado))
    .reduce((acc: number, p: any) => acc + Number(p.sena_requerida || 0), 0);

  const saldoPendiente = Math.max(0, ingresosTotales - senasCobradas);

  const kilosTotales = pedidosValidos.reduce(
    (acc: number, p: any) => acc + Number(p.peso_kg || 0),
    0
  );

  const totalPedidos = pedidosValidos.length;

  // Conteo de insumos
  const insumoCounts: Record<string, { id: string; nombre: string; tipo: string; cantidad: number }> = {};
  pedidosValidos.forEach((p: any) => {
    (p.detalles_pedido || []).forEach((dp: any) => {
      const insumo = dp.insumo;
      if (insumo && insumo.id) {
        if (!insumoCounts[insumo.id]) {
          insumoCounts[insumo.id] = {
            id: insumo.id,
            nombre: insumo.nombre,
            tipo: insumo.tipo,
            cantidad: 0,
          };
        }
        insumoCounts[insumo.id].cantidad += 1;
      }
    });
  });

  const insumosArray = Object.values(insumoCounts).sort((a, b) => b.cantidad - a.cantidad);
  const totalInsumosUsados = insumosArray.reduce((acc, s) => acc + s.cantidad, 0);

  const saboresTop: TopInsumo[] = insumosArray.slice(0, 5).map((s) => ({
    ...s,
    porcentaje: totalInsumosUsados > 0 ? Math.round((s.cantidad / totalInsumosUsados) * 100) : 0,
  }));

  // 2. Consultar cupos de los 7 días
  const { data: cuposData } = await supabase
    .from("cupos_diarios")
    .select("fecha, capacidad_maxima, cupos_ocupados")
    .gte("fecha", mondayStr)
    .lte("fecha", sundayStr);

  const cuposMap = new Map<string, { ocupados: number; max: number }>();
  (cuposData || []).forEach((c: any) => {
    cuposMap.set(c.fecha, {
      ocupados: c.cupos_ocupados || 0,
      max: c.capacidad_maxima || 3,
    });
  });

  const diasSemana: DiaSemanaOcupacion[] = [];
  let totalCuposOcupados = 0;
  let totalCapacidadSemana = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = formatDate(curDate);
    const cupo = cuposMap.get(dateStr) || { ocupados: 0, max: 3 };

    totalCuposOcupados += cupo.ocupados;
    totalCapacidadSemana += cupo.max;

    const pct = cupo.max > 0 ? Math.min(100, Math.round((cupo.ocupados / cupo.max) * 100)) : 0;

    diasSemana.push({
      dia: DIAS_LETRAS[i],
      fecha: dateStr,
      numeroDia: curDate.getDate(),
      ocupados: cupo.ocupados,
      max: cupo.max,
      pct,
    });
  }

  const porcentajeOcupacion =
    totalCapacidadSemana > 0 ? Math.round((totalCuposOcupados / totalCapacidadSemana) * 100) : 0;

  return {
    lunesFecha: mondayStr,
    domingoFecha: sundayStr,
    rangoTexto,
    ingresosTotales,
    senasCobradas,
    saldoPendiente,
    kilosTotales,
    totalPedidos,
    totalCuposOcupados,
    totalCapacidadSemana,
    porcentajeOcupacion,
    diasSemana,
    saboresTop,
  };
}

export async function getMetricasMensuales(year: number, month: number): Promise<MetricasMensuales> {
  const supabase = createClient();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDiasMes = lastDay.getDate();

  const startDateStr = `${year}-${pad(month + 1)}-01`;
  const endDateStr = `${year}-${pad(month + 1)}-${pad(totalDiasMes)}`;

  // 1. Consultar pedidos del mes
  const { data: pedidosData, error: errorPedidos } = await supabase
    .from("pedidos")
    .select(`
      id,
      fecha_entrega,
      peso_kg,
      total_estimado,
      sena_requerida,
      estado,
      created_at,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          nombre,
          tipo
        )
      )
    `)
    .gte("fecha_entrega", startDateStr)
    .lte("fecha_entrega", endDateStr);

  if (errorPedidos) {
    console.error("Error al obtener pedidos para métricas:", errorPedidos);
  }

  const pedidos = pedidosData || [];
  const pedidosValidos = pedidos.filter((p: any) => p.estado !== "Expirado");

  // Totales financieros y de volumen
  const ingresosTotales = pedidosValidos.reduce(
    (acc: number, p: any) => acc + Number(p.total_estimado || 0),
    0
  );

  const senasCobradas = pedidosValidos
    .filter((p: any) => ["Señado", "En producción", "Listo"].includes(p.estado))
    .reduce((acc: number, p: any) => acc + Number(p.sena_requerida || 0), 0);

  const saldoPendiente = Math.max(0, ingresosTotales - senasCobradas);

  const kilosTotales = pedidosValidos.reduce(
    (acc: number, p: any) => acc + Number(p.peso_kg || 0),
    0
  );

  const totalPedidos = pedidosValidos.length;

  // Conteo de estados
  const estadosCount = {
    pendiente: pedidos.filter((p: any) => p.estado === "Pendiente").length,
    senado: pedidos.filter((p: any) => p.estado === "Señado").length,
    enProduccion: pedidos.filter((p: any) => p.estado === "En producción").length,
    listo: pedidos.filter((p: any) => p.estado === "Listo").length,
    expirado: pedidos.filter((p: any) => p.estado === "Expirado").length,
  };

  // 2. Conteo de insumos y sabores más pedidos
  const insumoCounts: Record<string, { id: string; nombre: string; tipo: string; cantidad: number }> = {};
  pedidosValidos.forEach((p: any) => {
    (p.detalles_pedido || []).forEach((dp: any) => {
      const insumo = dp.insumo;
      if (insumo && insumo.id) {
        if (!insumoCounts[insumo.id]) {
          insumoCounts[insumo.id] = {
            id: insumo.id,
            nombre: insumo.nombre,
            tipo: insumo.tipo,
            cantidad: 0,
          };
        }
        insumoCounts[insumo.id].cantidad += 1;
      }
    });
  });

  const insumosArray = Object.values(insumoCounts).sort((a, b) => b.cantidad - a.cantidad);
  const totalInsumosUsados = insumosArray.reduce((acc, s) => acc + s.cantidad, 0);

  const saboresTop: TopInsumo[] = insumosArray.slice(0, 5).map((s) => ({
    ...s,
    porcentaje: totalInsumosUsados > 0 ? Math.round((s.cantidad / totalInsumosUsados) * 100) : 0,
  }));

  // 3. Consultar cupos diarios de todo el mes
  const { data: cuposData } = await supabase
    .from("cupos_diarios")
    .select("fecha, capacidad_maxima, cupos_ocupados")
    .gte("fecha", startDateStr)
    .lte("fecha", endDateStr);

  const cuposMap = new Map<string, { ocupados: number; max: number }>();
  (cuposData || []).forEach((c: any) => {
    cuposMap.set(c.fecha, {
      ocupados: c.cupos_ocupados || 0,
      max: c.capacidad_maxima || 3,
    });
  });

  const bloquesSemanas = [
    { num: 1, inicio: 1, fin: 7 },
    { num: 2, inicio: 8, fin: 14 },
    { num: 3, inicio: 15, fin: 21 },
    { num: 4, inicio: 22, fin: 28 },
    { num: 5, inicio: 29, fin: totalDiasMes },
  ].filter((b) => b.inicio <= totalDiasMes);

  let totalCuposOcupados = 0;
  let totalCapacidadMes = 0;

  const semanasMes: SemanaMes[] = bloquesSemanas.map((bloque) => {
    let ocupadosSemana = 0;
    let maxSemana = 0;

    for (let d = bloque.inicio; d <= Math.min(bloque.fin, totalDiasMes); d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      const cupo = cuposMap.get(dateStr) || { ocupados: 0, max: 3 };
      ocupadosSemana += cupo.ocupados;
      maxSemana += cupo.max;
    }

    totalCuposOcupados += ocupadosSemana;
    totalCapacidadMes += maxSemana;

    const pct = maxSemana > 0 ? Math.min(100, Math.round((ocupadosSemana / maxSemana) * 100)) : 0;

    return {
      etiqueta: `Semana ${bloque.num}`,
      rango: `${bloque.inicio} - ${Math.min(bloque.fin, totalDiasMes)} ${MESES[month].slice(0, 3)}`,
      ocupados: ocupadosSemana,
      max: maxSemana,
      pct,
    };
  });

  const porcentajeOcupacion =
    totalCapacidadMes > 0 ? Math.round((totalCuposOcupados / totalCapacidadMes) * 100) : 0;

  return {
    mes: month,
    año: year,
    nombreMes: `${MESES[month]} ${year}`,
    ingresosTotales,
    senasCobradas,
    saldoPendiente,
    kilosTotales,
    totalPedidos,
    estadosCount,
    totalCuposOcupados,
    totalCapacidadMes,
    porcentajeOcupacion,
    semanasMes,
    saboresTop,
  };
}

export async function getMetricasAnuales(year: number): Promise<MetricasAnuales> {
  const supabase = createClient();

  const startDateStr = `${year}-01-01`;
  const endDateStr = `${year}-12-31`;

  // 1. Consultar pedidos del año
  const { data: pedidosData, error: errorPedidos } = await supabase
    .from("pedidos")
    .select(`
      id,
      fecha_entrega,
      peso_kg,
      total_estimado,
      sena_requerida,
      estado,
      created_at,
      detalles_pedido (
        id,
        insumo:insumos (
          id,
          nombre,
          tipo
        )
      )
    `)
    .gte("fecha_entrega", startDateStr)
    .lte("fecha_entrega", endDateStr);

  if (errorPedidos) {
    console.error("Error al obtener pedidos anuales:", errorPedidos);
  }

  const pedidos = pedidosData || [];
  const pedidosValidos = pedidos.filter((p: any) => p.estado !== "Expirado");

  const ingresosTotales = pedidosValidos.reduce(
    (acc: number, p: any) => acc + Number(p.total_estimado || 0),
    0
  );

  const senasCobradas = pedidosValidos
    .filter((p: any) => ["Señado", "En producción", "Listo"].includes(p.estado))
    .reduce((acc: number, p: any) => acc + Number(p.sena_requerida || 0), 0);

  const totalPedidos = pedidosValidos.length;

  // 2. Agrupación por mes (0 a 11)
  const mesesStats: { ingresos: number; tortas: number }[] = Array.from({ length: 12 }, () => ({
    ingresos: 0,
    tortas: 0,
  }));

  pedidosValidos.forEach((p: any) => {
    if (p.fecha_entrega) {
      const monthIdx = parseInt(p.fecha_entrega.split("-")[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        mesesStats[monthIdx].ingresos += Number(p.total_estimado || 0);
        mesesStats[monthIdx].tortas += 1;
      }
    }
  });

  const maxTortasMes = Math.max(1, ...mesesStats.map((m) => m.tortas));

  const meses: MesAnual[] = mesesStats.map((stat, i) => ({
    mes: i,
    nombreCorto: MESES_CORTOS[i],
    ingresos: stat.ingresos,
    tortas: stat.tortas,
    pct: Math.round((stat.tortas / maxTortasMes) * 100),
  }));

  // 3. Sabores más pedidos del año
  const insumoCounts: Record<string, { id: string; nombre: string; tipo: string; cantidad: number }> = {};
  pedidosValidos.forEach((p: any) => {
    (p.detalles_pedido || []).forEach((dp: any) => {
      const insumo = dp.insumo;
      if (insumo && insumo.id) {
        if (!insumoCounts[insumo.id]) {
          insumoCounts[insumo.id] = {
            id: insumo.id,
            nombre: insumo.nombre,
            tipo: insumo.tipo,
            cantidad: 0,
          };
        }
        insumoCounts[insumo.id].cantidad += 1;
      }
    });
  });

  const insumosArray = Object.values(insumoCounts).sort((a, b) => b.cantidad - a.cantidad);
  const totalInsumosUsados = insumosArray.reduce((acc, s) => acc + s.cantidad, 0);

  const saboresTop: TopInsumo[] = insumosArray.slice(0, 5).map((s) => ({
    ...s,
    porcentaje: totalInsumosUsados > 0 ? Math.round((s.cantidad / totalInsumosUsados) * 100) : 0,
  }));

  return {
    año: year,
    ingresosTotales,
    senasCobradas,
    totalPedidos,
    meses,
    saboresTop,
  };
}
