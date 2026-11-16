import { createClient } from "@/lib/supabase/client";
import { getCapacidadEstandar } from "@/lib/services/cupos";

export interface TopInsumo {
  id: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  porcentaje: number;
}

export interface TopModelo {
  nombre: string;
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

export interface MetricasFinancieras {
  ingresosTotales: number;
  ingresosConfirmados: number;
  ingresosPorValidar: number;
  pedidosConfirmados: number;
  ticketPromedio: number;
}

export interface MetricasSemanales extends MetricasFinancieras {
  lunesFecha: string;
  domingoFecha: string;
  rangoTexto: string;
  kilosTotales: number;
  totalPedidos: number;
  totalCuposOcupados: number;
  totalCapacidadSemana: number;
  porcentajeOcupacion: number;
  diasSemana: DiaSemanaOcupacion[];
  modelosTop: TopModelo[];
  saboresTop: TopInsumo[];
}

export interface SemanaMes {
  etiqueta: string;
  rango: string;
  ocupados: number;
  max: number;
  pct: number;
}

export interface MetricasMensuales extends MetricasFinancieras {
  mes: number; // 0-11
  año: number;
  nombreMes: string;
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
  modelosTop: TopModelo[];
  saboresTop: TopInsumo[];
}

export interface MesAnual {
  mes: number; // 0-11
  nombreCorto: string; // Ene, Feb, etc.
  ingresos: number;
  tortas: number;
  pct: number;
}

export interface MetricasAnuales extends MetricasFinancieras {
  año: number;
  kilosTotales: number;
  totalPedidos: number;
  meses: MesAnual[];
  modelosTop: TopModelo[];
  saboresTop: TopInsumo[];
}

interface PedidoMetricaRow {
  id: string;
  fecha_entrega: string;
  peso_kg: number;
  total_estimado: number;
  estado: string;
  notas?: string | null;
  detalles_pedido?: {
    id: string;
    insumo: {
      id: string;
      nombre: string;
      tipo: string;
    } | null;
  }[];
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const DIAS_LETRAS = ["L", "M", "M", "J", "V", "S", "D"];

const ESTADOS_CONFIRMADOS = new Set(["Señado", "En producción", "Listo"]);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function calcularFinanzas(pedidosValidos: PedidoMetricaRow[]): MetricasFinancieras {
  const ingresosTotales = pedidosValidos.reduce(
    (acc, p) => acc + Number(p.total_estimado || 0),
    0
  );
  const confirmados = pedidosValidos.filter((p) => ESTADOS_CONFIRMADOS.has(p.estado));
  const ingresosConfirmados = confirmados.reduce(
    (acc, p) => acc + Number(p.total_estimado || 0),
    0
  );
  const ingresosPorValidar = Math.max(0, ingresosTotales - ingresosConfirmados);
  const pedidosConfirmados = confirmados.length;
  const ticketPromedio =
    pedidosConfirmados > 0 ? Math.round(ingresosConfirmados / pedidosConfirmados) : 0;

  return {
    ingresosTotales,
    ingresosConfirmados,
    ingresosPorValidar,
    pedidosConfirmados,
    ticketPromedio,
  };
}

function calcularTopInsumos(pedidosValidos: PedidoMetricaRow[]): TopInsumo[] {
  const counts: Record<string, { id: string; nombre: string; tipo: string; cantidad: number }> = {};

  pedidosValidos.forEach((p) => {
    (p.detalles_pedido || []).forEach((dp) => {
      const insumo = dp.insumo;
      if (insumo && insumo.id) {
        if (!counts[insumo.id]) {
          counts[insumo.id] = {
            id: insumo.id,
            nombre: insumo.nombre,
            tipo: insumo.tipo,
            cantidad: 0,
          };
        }
        counts[insumo.id].cantidad += 1;
      }
    });
  });

  const sorted = Object.values(counts).sort((a, b) => b.cantidad - a.cantidad);
  const total = sorted.reduce((acc, s) => acc + s.cantidad, 0);

  return sorted.slice(0, 5).map((s) => ({
    ...s,
    porcentaje: total > 0 ? Math.round((s.cantidad / total) * 100) : 0,
  }));
}

function calcularTopModelos(pedidosValidos: PedidoMetricaRow[]): TopModelo[] {
  const counts: Record<string, number> = {};

  pedidosValidos.forEach((p) => {
    const raw = p.notas || "";
    const match = raw.match(/\[Modelo:\s*([^\]\-]+?)(?:\s*-\s*[^\]]+)?\]/);
    const nombre = match ? match[1].trim() : "Torta Personalizada";
    counts[nombre] = (counts[nombre] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const total = sorted.reduce((acc, m) => acc + m.cantidad, 0);

  return sorted.slice(0, 5).map((m) => ({
    nombre: m.nombre,
    cantidad: m.cantidad,
    porcentaje: total > 0 ? Math.round((m.cantidad / total) * 100) : 0,
  }));
}

const PEDIDOS_METRICAS_SELECT = `
  id,
  fecha_entrega,
  peso_kg,
  total_estimado,
  estado,
  notas,
  detalles_pedido (
    id,
    insumo:insumos (
      id,
      nombre,
      tipo
    )
  )
`;

export async function getMetricasSemanales(monday: Date): Promise<MetricasSemanales> {
  const supabase = createClient();

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(sunday);
  const rangoTexto = `${monday.getDate()} ${MESES[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${MESES[sunday.getMonth()].slice(0, 3)} ${sunday.getFullYear()}`;

  const [{ data: pedidosData, error: errorPedidos }, { data: cuposData }, capEstandar] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(PEDIDOS_METRICAS_SELECT)
        .gte("fecha_entrega", mondayStr)
        .lte("fecha_entrega", sundayStr),
      supabase
        .from("cupos_diarios")
        .select("fecha, capacidad_maxima, cupos_ocupados")
        .gte("fecha", mondayStr)
        .lte("fecha", sundayStr),
      getCapacidadEstandar(),
    ]);

  if (errorPedidos) {
    console.error("Error al obtener pedidos semanales:", errorPedidos);
  }

  const pedidos = (pedidosData || []) as unknown as PedidoMetricaRow[];
  const pedidosValidos = pedidos.filter((p) => p.estado !== "Expirado");
  const finanzas = calcularFinanzas(pedidosValidos);
  const kilosTotales = pedidosValidos.reduce((acc, p) => acc + Number(p.peso_kg || 0), 0);

  const cuposMap = new Map<string, { ocupados: number; max: number }>();
  (cuposData || []).forEach((c: { fecha: string; cupos_ocupados: number; capacidad_maxima: number }) => {
    cuposMap.set(c.fecha, {
      ocupados: c.cupos_ocupados || 0,
      max: c.capacidad_maxima || capEstandar,
    });
  });

  const diasSemana: DiaSemanaOcupacion[] = [];
  let totalCuposOcupados = 0;
  let totalCapacidadSemana = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = formatDate(curDate);
    const cupo = cuposMap.get(dateStr) || { ocupados: 0, max: capEstandar };

    totalCuposOcupados += cupo.ocupados;
    totalCapacidadSemana += cupo.max;

    diasSemana.push({
      dia: DIAS_LETRAS[i],
      fecha: dateStr,
      numeroDia: curDate.getDate(),
      ocupados: cupo.ocupados,
      max: cupo.max,
      pct: cupo.max > 0 ? Math.min(100, Math.round((cupo.ocupados / cupo.max) * 100)) : 0,
    });
  }

  return {
    lunesFecha: mondayStr,
    domingoFecha: sundayStr,
    rangoTexto,
    ...finanzas,
    kilosTotales,
    totalPedidos: pedidosValidos.length,
    totalCuposOcupados,
    totalCapacidadSemana,
    porcentajeOcupacion:
      totalCapacidadSemana > 0 ? Math.round((totalCuposOcupados / totalCapacidadSemana) * 100) : 0,
    diasSemana,
    modelosTop: calcularTopModelos(pedidosValidos),
    saboresTop: calcularTopInsumos(pedidosValidos),
  };
}

export async function getMetricasMensuales(year: number, month: number): Promise<MetricasMensuales> {
  const supabase = createClient();

  const lastDay = new Date(year, month + 1, 0);
  const totalDiasMes = lastDay.getDate();

  const startDateStr = `${year}-${pad(month + 1)}-01`;
  const endDateStr = `${year}-${pad(month + 1)}-${pad(totalDiasMes)}`;

  const [{ data: pedidosData, error: errorPedidos }, { data: cuposData }, capEstandar] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(PEDIDOS_METRICAS_SELECT)
        .gte("fecha_entrega", startDateStr)
        .lte("fecha_entrega", endDateStr),
      supabase
        .from("cupos_diarios")
        .select("fecha, capacidad_maxima, cupos_ocupados")
        .gte("fecha", startDateStr)
        .lte("fecha", endDateStr),
      getCapacidadEstandar(),
    ]);

  if (errorPedidos) {
    console.error("Error al obtener pedidos para métricas:", errorPedidos);
  }

  const pedidos = (pedidosData || []) as unknown as PedidoMetricaRow[];
  const pedidosValidos = pedidos.filter((p) => p.estado !== "Expirado");
  const finanzas = calcularFinanzas(pedidosValidos);
  const kilosTotales = pedidosValidos.reduce((acc, p) => acc + Number(p.peso_kg || 0), 0);

  const estadosCount = {
    pendiente: pedidos.filter((p) => p.estado === "Pendiente").length,
    senado: pedidos.filter((p) => p.estado === "Señado").length,
    enProduccion: pedidos.filter((p) => p.estado === "En producción").length,
    listo: pedidos.filter((p) => p.estado === "Listo").length,
    expirado: pedidos.filter((p) => p.estado === "Expirado").length,
  };

  const cuposMap = new Map<string, { ocupados: number; max: number }>();
  (cuposData || []).forEach((c: { fecha: string; cupos_ocupados: number; capacidad_maxima: number }) => {
    cuposMap.set(c.fecha, {
      ocupados: c.cupos_ocupados || 0,
      max: c.capacidad_maxima || capEstandar,
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
      const cupo = cuposMap.get(dateStr) || { ocupados: 0, max: capEstandar };
      ocupadosSemana += cupo.ocupados;
      maxSemana += cupo.max;
    }

    totalCuposOcupados += ocupadosSemana;
    totalCapacidadMes += maxSemana;

    return {
      etiqueta: `Semana ${bloque.num}`,
      rango: `${bloque.inicio} - ${Math.min(bloque.fin, totalDiasMes)} ${MESES[month].slice(0, 3)}`,
      ocupados: ocupadosSemana,
      max: maxSemana,
      pct: maxSemana > 0 ? Math.min(100, Math.round((ocupadosSemana / maxSemana) * 100)) : 0,
    };
  });

  return {
    mes: month,
    año: year,
    nombreMes: `${MESES[month]} ${year}`,
    ...finanzas,
    kilosTotales,
    totalPedidos: pedidosValidos.length,
    estadosCount,
    totalCuposOcupados,
    totalCapacidadMes,
    porcentajeOcupacion:
      totalCapacidadMes > 0 ? Math.round((totalCuposOcupados / totalCapacidadMes) * 100) : 0,
    semanasMes,
    modelosTop: calcularTopModelos(pedidosValidos),
    saboresTop: calcularTopInsumos(pedidosValidos),
  };
}

export async function getMetricasAnuales(year: number): Promise<MetricasAnuales> {
  const supabase = createClient();

  const startDateStr = `${year}-01-01`;
  const endDateStr = `${year}-12-31`;

  const { data: pedidosData, error: errorPedidos } = await supabase
    .from("pedidos")
    .select(PEDIDOS_METRICAS_SELECT)
    .gte("fecha_entrega", startDateStr)
    .lte("fecha_entrega", endDateStr);

  if (errorPedidos) {
    console.error("Error al obtener pedidos anuales:", errorPedidos);
  }

  const pedidos = (pedidosData || []) as unknown as PedidoMetricaRow[];
  const pedidosValidos = pedidos.filter((p) => p.estado !== "Expirado");
  const finanzas = calcularFinanzas(pedidosValidos);
  const kilosTotales = pedidosValidos.reduce((acc, p) => acc + Number(p.peso_kg || 0), 0);

  const mesesStats = Array.from({ length: 12 }, () => ({ ingresos: 0, tortas: 0 }));

  pedidosValidos.forEach((p) => {
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

  return {
    año: year,
    ...finanzas,
    kilosTotales,
    totalPedidos: pedidosValidos.length,
    meses,
    modelosTop: calcularTopModelos(pedidosValidos),
    saboresTop: calcularTopInsumos(pedidosValidos),
  };
}
