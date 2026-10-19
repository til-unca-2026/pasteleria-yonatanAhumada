"use client";

import React, { useState, useEffect } from "react";
import {
  getMetricasSemanales,
  getMetricasMensuales,
  getMetricasAnuales,
  MetricasSemanales,
  MetricasMensuales,
  MetricasAnuales,
} from "@/lib/services/metricas";

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function MetricasTab() {
  const [viewMode, setViewMode] = useState<"semanal" | "mensual" | "anual">("semanal");

  // Semanal state
  const [mondayDate, setMondayDate] = useState<Date>(getMondayOfCurrentWeek());
  const [dataSemanal, setDataSemanal] = useState<MetricasSemanales | null>(null);

  // Mensual & Anual state
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
  const handlePrevYear = () => {
    setCurrentYear((y) => y - 1);
  };

  const handleNextYear = () => {
    setCurrentYear((y) => y + 1);
  };

  const handleResetCurrentYear = () => {
    setCurrentYear(new Date().getFullYear());
  };

  const isCurrentMonth =
    currentYear === now.getFullYear() && currentMonth === now.getMonth();
  const isCurrentYear = currentYear === now.getFullYear();

  const formatCurrency = (val: number) =>
    "$" + Number(val || 0).toLocaleString("es-AR");

  return (
    <div className="px-[16px] pt-[14px] pb-24 flex flex-col gap-[14px] w-full animate-in fade-in duration-200">
      {/* ── View Switcher: Semana vs Mes vs Año ── */}
      <div className="w-full flex gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setViewMode("semanal")}
          className={`flex-1 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
            viewMode === "semanal"
              ? "bg-[#1e293b] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setViewMode("mensual")}
          className={`flex-1 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
            viewMode === "mensual"
              ? "bg-[#1e293b] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          Mes
        </button>
        <button
          type="button"
          onClick={() => setViewMode("anual")}
          className={`flex-1 py-2 rounded-lg cursor-pointer text-xs font-semibold transition-all ${
            viewMode === "anual"
              ? "bg-[#1e293b] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 bg-transparent"
          }`}
        >
          Año
        </button>
      </div>

      {/* ── Navegador Compacto para Vista Mensual ── */}
      {viewMode === "mensual" && (
        <div className="flex items-center justify-between px-1 py-0.5">
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

          <div className="text-center">
            <span className="font-extrabold text-[#0f172a] text-[15px]">
              {MESES_NOMBRES[currentMonth]} {currentYear}
            </span>
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

      {/* ── Navegador Compacto para Vista Anual ── */}
      {viewMode === "anual" && (
        <div className="flex items-center justify-between px-1 py-0.5">
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

          <div className="text-center">
            <span className="font-extrabold text-[#0f172a] text-[15px]">
              Año {currentYear}
            </span>
          </div>

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

      {loading && !dataSemanal && !dataMensual && !dataAnual ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Calculando indicadores...</span>
        </div>
      ) : viewMode === "semanal" ? (
        <>
          {/* ── 2 Tarjetas de Rendimiento Semanal ── */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Facturación
              </div>
              <div className="font-bold text-slate-900 text-xl">
                {formatCurrency(dataSemanal?.ingresosTotales || 0)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Señas Cobradas
              </div>
              <div className="font-bold text-emerald-600 text-xl">
                {formatCurrency(dataSemanal?.senasCobradas || 0)}
              </div>
            </div>
          </div>

          {/* ── Gráfico Semanal Diario: L M M J V S D ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-[#0f172a] text-[14px]">Ocupación Semanal</div>
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

            <div className="font-black text-[#0f172a] text-[24px] leading-tight mb-4">
              {dataSemanal?.totalCuposOcupados || 0} / {dataSemanal?.totalCapacidadSemana || 21}{" "}
              <span className="font-normal text-slate-500 text-sm">tortas producidas</span>
            </div>

            <div className="flex items-end gap-2 h-[84px] pt-2">
              {(dataSemanal?.diasSemana || []).map((dia, i) => {
                const isWeekend = i === 5 || i === 6;
                const isEmpty = dia.ocupados === 0;
                const heightPct = isEmpty ? 10 : Math.max(16, (dia.ocupados / Math.max(dia.max, 1)) * 100);

                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
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
                    <span className="font-semibold text-slate-600 text-[10px]">{dia.dia}</span>
                    <span
                      className={`text-[9px] ${
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

          {/* ── Insumos y Sabores Más Pedidos de la Semana ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[#0f172a] text-[14px]">
                Sabores e Insumos Más Pedidos
              </span>
            </div>

            {(!dataSemanal?.saboresTop || dataSemanal.saboresTop.length === 0) ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Aún no hay comandas registradas en esta semana.
              </div>
            ) : (
              dataSemanal.saboresTop.map((item, idx) => (
                <div key={item.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-[12px]">
                      {idx + 1}. {item.nombre}{" "}
                      <span className="text-slate-400 text-[10px]">({item.tipo})</span> •{" "}
                      <strong className="text-slate-700 font-semibold">{item.cantidad} tortas</strong>
                    </span>
                    <span className="font-bold text-pink-600 text-[12px]">{item.porcentaje}%</span>
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
        </>
      ) : viewMode === "mensual" ? (
        /* ══════════════════════════════════════════════════════════
           VISTA MENSUAL
           ══════════════════════════════════════════════════════════ */
        <>
          {/* ── 2 Tarjetas de Rendimiento Mensual ── */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Facturación
              </div>
              <div className="font-bold text-slate-900 text-xl">
                {formatCurrency(dataMensual?.ingresosTotales || 0)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Señas Cobradas
              </div>
              <div className="font-bold text-emerald-600 text-xl">
                {formatCurrency(dataMensual?.senasCobradas || 0)}
              </div>
            </div>
          </div>

          {/* ── Ocupación del Obrador por Semanas del Mes ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-[#0f172a] text-[14px]">Ocupación del Mes</div>
                <div className="font-normal text-[#64748b] text-[11px]">
                  Capacidad de horneado semana a semana
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                <div className="bg-[#10B981] rounded-full size-2" />
                <span className="font-bold text-[#10B981] text-[11px]">
                  {dataMensual?.porcentajeOcupacion || 0}% mensual
                </span>
              </div>
            </div>

            <div className="font-black text-[#0f172a] text-[24px] leading-tight mb-4">
              {dataMensual?.totalCuposOcupados || 0} / {dataMensual?.totalCapacidadMes || 0}{" "}
              <span className="font-normal text-slate-500 text-sm">cupos reservados</span>
            </div>

            <div className="flex items-end gap-2.5 h-[90px] pt-2">
              {(dataMensual?.semanasMes || []).map((sem, i) => {
                const isEmpty = sem.ocupados === 0;
                const heightPct = isEmpty ? 8 : Math.max(15, (sem.ocupados / Math.max(sem.max, 1)) * 100);
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "64px" }}>
                      <div
                        className="w-full max-w-[36px] rounded-lg transition-all duration-300"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: isEmpty
                            ? "#e2e8f0"
                            : sem.pct >= 80
                            ? "#10B981"
                            : "#334155",
                          minHeight: "8px",
                        }}
                        title={`${sem.etiqueta} (${sem.rango}): ${sem.ocupados} de ${sem.max} cupos (${sem.pct}%)`}
                      />
                    </div>
                    <span className="font-semibold text-slate-600 text-[10px] whitespace-nowrap">{sem.etiqueta}</span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {sem.ocupados}/{sem.max}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Insumos Más Elegidos del Mes ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[#0f172a] text-[14px]">
                Insumos Más Elegidos en {MESES_NOMBRES[currentMonth]}
              </span>
            </div>

            {(!dataMensual?.saboresTop || dataMensual.saboresTop.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aún no hay comandas registradas en {MESES_NOMBRES[currentMonth]} {currentYear}.
              </div>
            ) : (
              dataMensual.saboresTop.map((item, idx) => (
                <div key={item.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-[12px]">
                      {idx + 1}. {item.nombre}{" "}
                      <span className="text-slate-400 text-[10px]">({item.tipo})</span> •{" "}
                      <strong className="text-slate-700 font-semibold">{item.cantidad} tortas</strong>
                    </span>
                    <span className="font-bold text-pink-600 text-[12px]">{item.porcentaje}%</span>
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
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════
           VISTA ANUAL
           ══════════════════════════════════════════════════════════ */
        <>
          {/* ── 2 Tarjetas de Rendimiento Anual ── */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Facturación Anual
              </div>
              <div className="font-bold text-slate-900 text-xl">
                {formatCurrency(dataAnual?.ingresosTotales || 0)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 tracking-wide mb-1">
                Señas Cobradas
              </div>
              <div className="font-bold text-emerald-600 text-xl">
                {formatCurrency(dataAnual?.senasCobradas || 0)}
              </div>
            </div>
          </div>

          {/* ── Gráfico de 12 Meses (Ene a Dic) ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-[#0f172a] text-[14px]">Producción Anual</div>
                <div className="font-normal text-[#64748b] text-[11px]">
                  Tortas horneadas mes a mes ({currentYear})
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0]">
                <div className="bg-[#10B981] rounded-full size-2" />
                <span className="font-bold text-[#10B981] text-[11px]">
                  {dataAnual?.totalPedidos || 0} tortas en el año
                </span>
              </div>
            </div>

            <div className="flex items-end gap-1.5 h-[90px] pt-3">
              {(dataAnual?.meses || []).map((m) => {
                const isEmpty = m.tortas === 0;
                const heightPct = isEmpty ? 8 : Math.max(16, m.pct);

                return (
                  <div key={m.mes} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
                      <div
                        className="w-full rounded-md transition-all duration-300"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: isEmpty
                            ? "#e2e8f0"
                            : "#334155",
                          minHeight: "6px",
                        }}
                        title={`${m.nombreCorto}: ${m.tortas} tortas (${formatCurrency(m.ingresos)})`}
                      />
                    </div>
                    <span className="font-semibold text-slate-600 text-[9px]">{m.nombreCorto}</span>
                    <span
                      className={`text-[8px] ${
                        m.tortas > 0 ? "text-slate-800 font-bold" : "text-slate-400 font-normal"
                      }`}
                    >
                      {m.tortas}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Insumos Más Elegidos del Año ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-xs p-[16px]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-[#0f172a] text-[14px]">
                Insumos Más Elegidos en {currentYear}
              </span>
            </div>

            {(!dataAnual?.saboresTop || dataAnual.saboresTop.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aún no hay comandas registradas en {currentYear}.
              </div>
            ) : (
              dataAnual.saboresTop.map((item, idx) => (
                <div key={item.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-800 text-[12px]">
                      {idx + 1}. {item.nombre}{" "}
                      <span className="text-slate-400 text-[10px]">({item.tipo})</span> •{" "}
                      <strong className="text-slate-700 font-semibold">{item.cantidad} tortas</strong>
                    </span>
                    <span className="font-bold text-pink-600 text-[12px]">{item.porcentaje}%</span>
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
        </>
      )}
    </div>
  );
}
