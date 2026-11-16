"use client";

import React, { useState, useEffect } from "react";
import {
  getMetricasSemanales,
  getMetricasMensuales,
  getMetricasAnuales,
  MetricasSemanales,
  MetricasMensuales,
  MetricasAnuales,
  MetricasFinancieras,
  TopInsumo,
  TopModelo,
} from "@/lib/services/metricas";

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatCurrency(val: number): string {
  return "$" + Number(val || 0).toLocaleString("es-AR");
}

function KpiResumenGrid({
  finanzas,
  totalPedidos,
  kilosTotales,
}: {
  finanzas?: MetricasFinancieras | null;
  totalPedidos: number;
  kilosTotales: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
          Ingresos Confirmados
        </div>
        <div className="font-bold text-emerald-600 text-xl">
          {formatCurrency(finanzas?.ingresosConfirmados || 0)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {finanzas?.pedidosConfirmados || 0} pedidos pagos (100%)
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
          Por Validar
        </div>
        <div className="font-bold text-amber-600 text-xl">
          {formatCurrency(finanzas?.ingresosPorValidar || 0)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Comprobantes pendientes
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
          Pedidos Válidos
        </div>
        <div className="font-bold text-slate-900 text-xl">
          {totalPedidos}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {kilosTotales.toFixed(1)} kg en total
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
          Ticket Promedio
        </div>
        <div className="font-bold text-slate-900 text-xl">
          {formatCurrency(finanzas?.ticketPromedio || 0)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          Facturación est.: {formatCurrency(finanzas?.ingresosTotales || 0)}
        </div>
      </div>
    </div>
  );
}

function RankingsPanel({
  modelosTop,
  saboresTop,
  emptyLabel,
}: {
  modelosTop: TopModelo[];
  saboresTop: TopInsumo[];
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[#0f172a] text-[14px]">
            Modelos de Torta Más Pedidos
          </span>
        </div>

        {modelosTop.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">{emptyLabel}</div>
        ) : (
          modelosTop.map((item, idx) => (
            <div key={item.nombre} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-800 text-[12px]">
                  {idx + 1}. {item.nombre} •{" "}
                  <strong className="text-slate-700 font-semibold">{item.cantidad} pedidos</strong>
                </span>
                <span className="font-bold text-pink-600 text-[12px]">{item.porcentaje}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-600 rounded-full transition-all duration-300"
                  style={{ width: `${item.porcentaje}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[#0f172a] text-[14px]">
            Sabores e Insumos Más Pedidos
          </span>
        </div>

        {saboresTop.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">
            Sin insumos personalizados en este período.
          </div>
        ) : (
          saboresTop.map((item, idx) => (
            <div key={item.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-800 text-[12px]">
                  {idx + 1}. {item.nombre}{" "}
                  <span className="text-slate-400 text-[10px]">({item.tipo})</span> •{" "}
                  <strong className="text-slate-700 font-semibold">{item.cantidad} tortas</strong>
                </span>
                <span className="font-bold text-slate-700 text-[12px]">{item.porcentaje}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all duration-300"
                  style={{ width: `${item.porcentaje}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function MetricasTab() {
  const [viewMode, setViewMode] = useState<"semanal" | "mensual" | "anual">("semanal");

  const currentMonday = getMondayOfCurrentWeek();
  const [mondayDate, setMondayDate] = useState<Date>(currentMonday);
  const [dataSemanal, setDataSemanal] = useState<MetricasSemanales | null>(null);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth());
  const [dataMensual, setDataMensual] = useState<MetricasMensuales | null>(null);
  const [dataAnual, setDataAnual] = useState<MetricasAnuales | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (viewMode === "semanal") {
      loadSemanal(mondayDate);
    } else if (viewMode === "mensual") {
      loadMensual(currentYear, currentMonth);
    } else {
      loadAnual(currentYear);
    }
  }, [viewMode, mondayDate, currentYear, currentMonth]);

  async function loadSemanal(mDate: Date) {
    setLoading(true);
    try {
      const res = await getMetricasSemanales(mDate);
      setDataSemanal(res);
    } catch (err) {
      console.error("Error cargando métricas semanales:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMensual(y: number, m: number) {
    setLoading(true);
    try {
      const res = await getMetricasMensuales(y, m);
      setDataMensual(res);
    } catch (err) {
      console.error("Error cargando métricas mensuales:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnual(y: number) {
    setLoading(true);
    try {
      const res = await getMetricasAnuales(y);
      setDataAnual(res);
    } catch (err) {
      console.error("Error cargando métricas anuales:", err);
    } finally {
      setLoading(false);
    }
  }

  // Week navigation
  const handleShiftWeek = (days: number) => {
    setMondayDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  };
  const isCurrentWeek = mondayDate.getTime() === currentMonday.getTime();

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };
  const handleResetCurrentMonth = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  // Year navigation
  const handlePrevYear = () => setCurrentYear((y) => y - 1);
  const handleNextYear = () => setCurrentYear((y) => y + 1);

  const isCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth();

  return (
    <div className="pt-2 pb-24 flex flex-col gap-4 w-full animate-in fade-in duration-200">
      {/* ── Header: View Switcher + Period Navigator ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="w-full md:w-80 flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          {(["semanal", "mensual", "anual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-all border-0 ${
                viewMode === mode
                  ? "bg-[#1e293b] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 bg-transparent"
              }`}
            >
              {mode === "semanal" ? "Semana" : mode === "mensual" ? "Mes" : "Año"}
            </button>
          ))}
        </div>

        {/* Period Navigator */}
        {viewMode === "semanal" && (
          <div className="flex items-center justify-between md:justify-end gap-3">
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Semana anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0f172a] text-sm">
                {dataSemanal?.rangoTexto || "Semana actual"}
              </span>
              {!isCurrentWeek && (
                <button
                  type="button"
                  onClick={() => setMondayDate(getMondayOfCurrentWeek())}
                  className="text-[11px] font-semibold text-pink-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Hoy
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Semana siguiente"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {viewMode === "mensual" && (
          <div className="flex items-center justify-between md:justify-end gap-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Mes anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0f172a] text-sm">
                {MESES_NOMBRES[currentMonth]} {currentYear}
              </span>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={handleResetCurrentMonth}
                  className="text-[11px] font-semibold text-pink-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Hoy
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Mes siguiente"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {viewMode === "anual" && (
          <div className="flex items-center justify-between md:justify-end gap-3">
            <button
              type="button"
              onClick={handlePrevYear}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Año anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <span className="font-extrabold text-[#0f172a] text-sm">
              Año {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextYear}
              className="size-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
              title="Año siguiente"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {loading && !dataSemanal && !dataMensual && !dataAnual ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Calculando indicadores...</span>
        </div>
      ) : viewMode === "semanal" ? (
        <>
          <KpiResumenGrid
            finanzas={dataSemanal}
            totalPedidos={dataSemanal?.totalPedidos || 0}
            kilosTotales={dataSemanal?.kilosTotales || 0}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Ocupación Semanal */}
            <div className="lg:col-span-7 bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-[#0f172a] text-[15px]">Ocupación Semanal</div>
                  <div className="font-normal text-[#64748b] text-[11px]">
                    Capacidad de horneado en obrador
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                  <div className="bg-[#10B981] rounded-full size-2" />
                  <span className="font-bold text-[#10B981] text-[11px]">
                    {dataSemanal?.porcentajeOcupacion || 0}% prom.
                  </span>
                </div>
              </div>

              <div className="font-black text-[#0f172a] text-[24px] leading-tight mb-5">
                {dataSemanal?.totalCuposOcupados || 0} / {dataSemanal?.totalCapacidadSemana || 21}{" "}
                <span className="font-normal text-slate-500 text-sm">cupos ocupados</span>
              </div>

              <div className="flex items-end gap-2.5 h-[110px] pt-2">
                {(dataSemanal?.diasSemana || []).map((dia, i) => {
                  const isWeekend = i === 5 || i === 6;
                  const isEmpty = dia.ocupados === 0;
                  const heightPct = isEmpty ? 10 : Math.max(16, (dia.ocupados / Math.max(dia.max, 1)) * 100);

                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full flex items-end justify-center" style={{ height: "72px" }}>
                        <div
                          className="w-full rounded-md transition-all duration-300"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: isEmpty
                              ? "#e2e8f0"
                              : isWeekend
                              ? "#10B981"
                              : "#334155",
                            minHeight: "6px",
                          }}
                          title={`${dia.fecha}: ${dia.ocupados} de ${dia.max} cupos`}
                        />
                      </div>
                      <span className="font-semibold text-slate-600 text-[10px]">
                        {dia.dia} {dia.numeroDia}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isWeekend && dia.ocupados > 0
                            ? "text-[#10B981] font-bold"
                            : dia.ocupados > 0
                            ? "text-slate-700 font-bold"
                            : "text-slate-400 font-normal"
                        }`}
                      >
                        {dia.ocupados}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5">
              <RankingsPanel
                modelosTop={dataSemanal?.modelosTop || []}
                saboresTop={dataSemanal?.saboresTop || []}
                emptyLabel="Aún no hay comandas registradas en esta semana."
              />
            </div>
          </div>
        </>
      ) : viewMode === "mensual" ? (
        <>
          <KpiResumenGrid
            finanzas={dataMensual}
            totalPedidos={dataMensual?.totalPedidos || 0}
            kilosTotales={dataMensual?.kilosTotales || 0}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Estado de Comandas del Mes */}
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-4">
                <div className="font-bold text-[#0f172a] text-[14px] mb-3">
                  Estado de Comandas del Mes
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100">
                    <span className="text-[10px] text-amber-800 font-semibold block">Pendientes</span>
                    <span className="font-bold text-amber-900 text-lg">
                      {dataMensual?.estadosCount.pendiente || 0}
                    </span>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100">
                    <span className="text-[10px] text-blue-800 font-semibold block">Señado</span>
                    <span className="font-bold text-blue-900 text-lg">
                      {dataMensual?.estadosCount.senado || 0}
                    </span>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-2.5 border border-pink-100">
                    <span className="text-[10px] text-pink-800 font-semibold block">En taller</span>
                    <span className="font-bold text-pink-900 text-lg">
                      {dataMensual?.estadosCount.enProduccion || 0}
                    </span>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-semibold block">Listos</span>
                    <span className="font-bold text-emerald-900 text-lg">
                      {dataMensual?.estadosCount.listo || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ocupación Mensual por Semanas */}
              <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-[#0f172a] text-[14px]">Ocupación Mensual</div>
                    <div className="font-normal text-[#64748b] text-[11px]">
                      Desglose por bloques semanales
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                    <div className="bg-[#10B981] rounded-full size-2" />
                    <span className="font-bold text-[#10B981] text-[11px]">
                      {dataMensual?.porcentajeOcupacion || 0}% prom.
                    </span>
                  </div>
                </div>

                <div className="font-black text-[#0f172a] text-[22px] leading-tight mb-4">
                  {dataMensual?.totalCuposOcupados || 0} / {dataMensual?.totalCapacidadMes || 90}{" "}
                  <span className="font-normal text-slate-500 text-xs">cupos ocupados</span>
                </div>

                <div className="flex flex-col gap-3">
                  {(dataMensual?.semanasMes || []).map((sem) => (
                    <div key={sem.etiqueta}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">
                          {sem.etiqueta}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">({sem.rango})</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {sem.ocupados}/{sem.max} ({sem.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1e293b] rounded-full transition-all duration-300"
                          style={{ width: `${sem.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <RankingsPanel
                modelosTop={dataMensual?.modelosTop || []}
                saboresTop={dataMensual?.saboresTop || []}
                emptyLabel="Aún no hay comandas registradas en este mes."
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <KpiResumenGrid
            finanzas={dataAnual}
            totalPedidos={dataAnual?.totalPedidos || 0}
            kilosTotales={dataAnual?.kilosTotales || 0}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-[#0f172a] text-[15px]">
                    Rendimiento Anual {currentYear}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tortas producidas por mes
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-2 h-[140px] pt-2">
                {(dataAnual?.meses || []).map((m) => (
                  <div key={m.mes} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-full flex items-end justify-center" style={{ height: "96px" }}>
                      <div
                        className="w-full rounded-md transition-all duration-300"
                        style={{
                          height: `${m.tortas === 0 ? 8 : Math.max(14, m.pct)}%`,
                          backgroundColor: m.tortas === 0 ? "#e2e8f0" : "#db2777",
                          minHeight: "6px",
                        }}
                        title={`${m.nombreCorto}: ${m.tortas} pedidos (${formatCurrency(m.ingresos)})`}
                      />
                    </div>
                    <span className="font-semibold text-slate-600 text-[10px] truncate w-full text-center">
                      {m.nombreCorto}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700">{m.tortas}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <RankingsPanel
                modelosTop={dataAnual?.modelosTop || []}
                saboresTop={dataAnual?.saboresTop || []}
                emptyLabel="Aún no hay comandas registradas en este año."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
