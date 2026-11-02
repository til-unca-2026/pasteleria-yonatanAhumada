"use client";

import React, { useState, useEffect } from "react";
import {
  getCapacidadEstandar,
  updateCapacidadEstandar,
  getCuposMes,
  upsertCupoDia,
  deleteCupoDia,
  CupoDiarioDB,
} from "@/lib/services/cupos";

const DAYS_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function CuposTab() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(today.getDate());

  const [estandarCapacity, setEstandarCapacity] = useState<number>(3);
  const [savingEstandar, setSavingEstandar] = useState<boolean>(false);

  const [cuposData, setCuposData] = useState<CupoDiarioDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Configuración del día seleccionado
  const [selectedDayCapacity, setSelectedDayCapacity] = useState<number>(3);
  const [selectedDayBlocked, setSelectedDayBlocked] = useState<boolean>(false);
  const [selectedDayOccupied, setSelectedDayOccupied] = useState<number>(0);
  const [savingDay, setSavingDay] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Cargar datos del mes y capacidad estándar
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [estandar, cupos] = await Promise.all([
          getCapacidadEstandar(),
          getCuposMes(currentYear, currentMonth),
        ]);
        setEstandarCapacity(estandar);
        setCuposData(cupos);
      } catch (err) {
        console.error("Error cargando cupos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentYear, currentMonth]);

  // Actualizar estado del día seleccionado cuando cambia cuposData o el día
  useEffect(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(selectedDayNumber)}`;
    const found = cuposData.find((c) => c.fecha === dateStr);

    if (found) {
      setSelectedDayCapacity(found.capacidad_maxima);
      setSelectedDayBlocked(found.bloqueado_manual);
      setSelectedDayOccupied(found.cupos_ocupados);
    } else {
      setSelectedDayCapacity(estandarCapacity);
      setSelectedDayBlocked(false);
      setSelectedDayOccupied(0);
    }
  }, [selectedDayNumber, currentYear, currentMonth, cuposData, estandarCapacity]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDayNumber(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDayNumber(1);
  };

  const handleSaveEstandar = async (nuevaCap: number) => {
    setEstandarCapacity(nuevaCap);
    setSavingEstandar(true);
    try {
      await updateCapacidadEstandar(nuevaCap);
    } catch (err) {
      console.error("Error guardando capacidad estándar:", err);
    } finally {
      setSavingEstandar(false);
    }
  };

  const handleSaveDayCapacity = async (nuevaCap: number) => {
    setSelectedDayCapacity(nuevaCap);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(selectedDayNumber)}`;

    // Actualización inmediata optimista del calendario
    setCuposData((prev) => {
      const exists = prev.some((c) => c.fecha === dateStr);
      if (exists) {
        return prev.map((c) =>
          c.fecha === dateStr ? { ...c, capacidad_maxima: nuevaCap } : c
        );
      }
      return [
        ...prev,
        {
          fecha: dateStr,
          capacidad_maxima: nuevaCap,
          cupos_ocupados: selectedDayOccupied,
          bloqueado_manual: selectedDayBlocked,
        },
      ];
    });

    setSavingDay(true);
    try {
      const updated = await upsertCupoDia(
        dateStr,
        nuevaCap,
        selectedDayBlocked
      );
      setCuposData((prev) => {
        const filtered = prev.filter((c) => c.fecha !== dateStr);
        return [...filtered, updated];
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Error guardando capacidad del día:", err);
    } finally {
      setSavingDay(false);
    }
  };

  const handleResetToGeneral = async () => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(selectedDayNumber)}`;
    setSavingDay(true);
    try {
      if (selectedDayOccupied === 0 && !selectedDayBlocked) {
        await deleteCupoDia(dateStr);
        setCuposData((prev) => prev.filter((c) => c.fecha !== dateStr));
      } else {
        const updated = await upsertCupoDia(dateStr, estandarCapacity, selectedDayBlocked);
        setCuposData((prev) => prev.map((c) => (c.fecha === dateStr ? updated : c)));
      }
      setSelectedDayCapacity(estandarCapacity);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Error al restablecer a capacidad general:", err);
    } finally {
      setSavingDay(false);
    }
  };

  const handleToggleBlock = async (newBlocked: boolean) => {
    setSelectedDayBlocked(newBlocked);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(selectedDayNumber)}`;

    // Actualización inmediata del calendario
    setCuposData((prev) => {
      const exists = prev.some((c) => c.fecha === dateStr);
      if (exists) {
        return prev.map((c) =>
          c.fecha === dateStr ? { ...c, bloqueado_manual: newBlocked } : c
        );
      }
      return [
        ...prev,
        {
          fecha: dateStr,
          capacidad_maxima: selectedDayCapacity,
          cupos_ocupados: selectedDayOccupied,
          bloqueado_manual: newBlocked,
        },
      ];
    });

    try {
      await upsertCupoDia(dateStr, selectedDayCapacity, newBlocked);
    } catch (err) {
      console.error("Error al persistir bloqueo de fecha:", err);
    }
  };

  // Construcción de la matriz del calendario
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 es Domingo
  // Ajuste a Lunes = 0, Domingo = 6
  const startingOffset = (firstDayOfWeek + 6) % 7;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const getDayStatus = (day: number) => {
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
    const found = cuposData.find((c) => c.fecha === dateStr);
    const isSelectedDay = selectedDayNumber === day;
    const maxCap = isSelectedDay ? selectedDayCapacity : (found ? found.capacidad_maxima : estandarCapacity);
    const occupied = found ? found.cupos_ocupados : 0;
    const isBlocked = isSelectedDay ? selectedDayBlocked : (found ? found.bloqueado_manual : false);

    if (isBlocked) return { status: "blocked", maxCap, occupied };
    if (occupied >= maxCap) return { status: "full", maxCap, occupied };
    return { status: "available", maxCap, occupied };
  };

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const selectedDateObj = new Date(currentYear, currentMonth - 1, selectedDayNumber);
  selectedDateObj.setHours(0, 0, 0, 0);
  const isPastDate = selectedDateObj < todayMidnight;

  return (
    <div className="px-4 md:px-0 pt-2 md:pt-0 flex flex-col gap-5 w-full animate-in fade-in duration-200">
      {/* ── Capacidad Estándar ── */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-bold text-[#a43073] text-[11px] uppercase tracking-wider">
              Control de Capacidad
            </span>
            <div className="font-bold text-[#0f172a] text-xl leading-tight mt-0.5">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </div>
          </div>
        </div>

        <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-[#0f172a] text-sm">
              Capacidad Diaria Predeterminada
            </span>
            <div className="font-normal text-[#64748b] text-xs mt-0.5">
              Límite estándar de pedidos elaborables por día en el taller
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-bold text-[#0f172a] text-base whitespace-nowrap">
              {estandarCapacity} pedidos / día
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveEstandar(Math.max(1, estandarCapacity - 1))}
                className="size-8 rounded-lg border border-[#e2e8f0] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                aria-label="Disminuir capacidad estándar"
              >
                <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
                  <path d="M1 1H11" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span className="font-bold text-[#0f172a] text-base w-7 text-center">
                {estandarCapacity}
              </span>
              <button
                type="button"
                onClick={() => handleSaveEstandar(estandarCapacity + 1)}
                className="size-8 rounded-lg bg-[#1e293b] hover:bg-[#334155] flex items-center justify-center cursor-pointer border-0 text-white transition-colors shadow-2xs"
                aria-label="Aumentar capacidad estándar"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1V11M1 6H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenedor Grid 2 Columnas en Desktop: Calendario + Ajuste puntual ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Izquierda: Calendario */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>
            </div>
            <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="size-[28px] rounded-[6px] border border-[#e2e8f0] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors text-slate-700"
              aria-label="Mes anterior"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 10L4 6L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="size-[28px] rounded-[6px] border border-[#e2e8f0] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors text-slate-700"
              aria-label="Mes siguiente"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 10L8 6L4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Cargando cupos del mes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-[6px] gap-x-[4px]">
            {DAYS_HEADER.map((d, i) => (
              <div key={i} className="flex items-center justify-center pb-2">
                <span className="font-semibold text-[#94a3b8] text-[11px]">{d}</span>
              </div>
            ))}

            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}

            {/* Días del mes */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const day = i + 1;
              const { status, maxCap } = getDayStatus(day);
              const isSelected = selectedDayNumber === day;
              const isBlocked = status === "blocked";
              const isFull = status === "full";

              const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
              const foundInDb = cuposData.find((c) => c.fecha === dateStr);
              const hasCustomCap = foundInDb !== undefined && foundInDb.capacidad_maxima !== estandarCapacity;

              const dayDate = new Date(currentYear, currentMonth - 1, day);
              dayDate.setHours(0, 0, 0, 0);
              const isPast = dayDate < todayMidnight;

              let dotColor = "bg-[#10B981]";
              if (isPast) dotColor = "bg-slate-300";
              else if (isBlocked) dotColor = "bg-slate-400";
              else if (isFull) dotColor = "bg-red-500";

              let btnStyle = "bg-transparent border-transparent hover:bg-slate-100 text-[#0f172a]";
              if (isSelected && isBlocked) {
                btnStyle = "bg-slate-700 border-slate-700 text-slate-200 shadow-sm";
              } else if (isSelected) {
                btnStyle = "bg-[#1e293b] border-[#1e293b] text-white shadow-sm";
              } else if (isBlocked) {
                btnStyle = "bg-slate-100 border-slate-200 text-slate-400";
              } else if (hasCustomCap) {
                btnStyle = "bg-pink-50/60 border-pink-200 text-pink-950";
              } else if (isPast) {
                btnStyle = "bg-slate-50/50 border-transparent text-slate-400 hover:bg-slate-100/70";
              }

              let textStyle = "font-medium text-[#0f172a]";
              if (isSelected && isBlocked) {
                textStyle = "font-bold line-through text-slate-300";
              } else if (isSelected) {
                textStyle = "font-bold text-white";
              } else if (isBlocked) {
                textStyle = "line-through text-slate-400";
              } else if (hasCustomCap) {
                textStyle = "font-semibold text-pink-900";
              } else if (isPast) {
                textStyle = "font-normal text-slate-400";
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayNumber(day)}
                  className={`flex flex-col items-center justify-center py-[5px] rounded-[8px] transition-all cursor-pointer border relative ${btnStyle}`}
                  title={hasCustomCap ? `Capacidad personalizada: ${maxCap} pedidos` : `Capacidad general: ${maxCap} pedidos`}
                >
                  <span className={`text-[12px] ${textStyle}`}>
                    {day}
                  </span>
                  <div className={`rounded-full size-[5px] mt-1 ${dotColor}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-[12px] mt-[14px] border-t border-[#e2e8f0] pt-[10px]">
          <div className="flex items-center gap-[4px]">
            <div className="bg-[#10B981] rounded-full size-[7px]" />
            <span className="font-normal text-[#64748b] text-[10px]">Disponible</span>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-[#ef4444] rounded-full size-[7px]" />
            <span className="font-normal text-[#64748b] text-[10px]">Lleno</span>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-[#94a3b8] rounded-full size-[7px]" />
            <span className="font-normal text-[#64748b] text-[10px]">Bloqueado</span>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-pink-100 border border-pink-300 rounded-[3px] size-[8px]" />
            <span className="font-normal text-[#64748b] text-[10px]">Cupo personalizado</span>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-slate-300 rounded-full size-[7px]" />
            <span className="font-normal text-[#94a3b8] text-[10px]">Pasado</span>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Ajuste puntual del Día Seleccionado */}
      <div className="lg:col-span-5">
        {(() => {
          const selectedDateStr = `${currentYear}-${pad(currentMonth)}-${pad(selectedDayNumber)}`;
          const selectedDayEntry = cuposData.find((c) => c.fecha === selectedDateStr);
          const isCustomCapacity = selectedDayEntry !== undefined && selectedDayEntry.capacidad_maxima !== estandarCapacity;

          return (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-xs p-5 sticky top-20">
            <div className="flex items-center justify-between mb-[12px]">
              <div className="flex items-center gap-[8px]">
                <div className="bg-[#ffd8e7] rounded-[8px] p-[6px] shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="2" width="14" height="13" rx="2" stroke="#a43073" strokeWidth="1.2" />
                    <path d="M5 1V3M11 1V3M1 6H15" stroke="#a43073" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-[#0f172a] text-[14px]">
                    {selectedDayNumber} de {MONTH_NAMES[currentMonth - 1]} {currentYear}
                  </div>
                  <div className="font-normal text-[#64748b] text-[11px]">
                    {isPastDate
                      ? "Registro histórico de cupos"
                      : isCustomCapacity
                      ? "Excepción individual (no cambia con la capacidad general)"
                      : "Heredando capacidad diaria predeterminada"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPastDate && (
                  <span className="bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-[8px] py-[2px] text-[10px] font-semibold">
                    Solo lectura
                  </span>
                )}
                <div
                  className={`flex items-center gap-[4px] rounded-full px-[10px] py-[3px] border ${
                    selectedDayBlocked
                      ? "bg-slate-100 border-slate-300 text-slate-600"
                      : selectedDayOccupied >= selectedDayCapacity
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-[#d1fae5] border-emerald-200 text-[#065f46]"
                  }`}
                >
                  <span className="font-semibold text-[11px]">
                    {selectedDayBlocked
                      ? "Cerrado"
                      : `${selectedDayOccupied}/${selectedDayCapacity} Ocupados`}
                  </span>
                </div>
              </div>
            </div>

            {/* Capacidad específica */}
            <div className={`bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] p-[12px] mb-[12px] ${isPastDate ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between mb-[4px]">
                <div>
                  <div className="font-semibold text-[#0f172a] text-[13px]">
                    Capacidad para esta fecha
                  </div>
                  <div className="font-normal text-[#64748b] text-[11px]">
                    {isPastDate
                      ? "Capacidad asignada en su momento"
                      : "Modifica el cupo individual sin alterar los demás días"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isCustomCapacity
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {isCustomCapacity ? "Personalizado" : "General"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-[#0f172a] text-[15px]">
                  {selectedDayCapacity} pedidos
                </span>
                <div className="flex items-center gap-[8px]">
                  <button
                    type="button"
                    disabled={isPastDate}
                    onClick={() => handleSaveDayCapacity(Math.max(1, selectedDayCapacity - 1))}
                    className="size-[32px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Disminuir capacidad del día"
                  >
                    <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
                      <path d="M1 1H11" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className="font-bold text-[#0f172a] text-[18px] w-[24px] text-center">
                    {selectedDayCapacity}
                  </span>
                  <button
                    type="button"
                    disabled={isPastDate}
                    onClick={() => handleSaveDayCapacity(selectedDayCapacity + 1)}
                    className="size-[32px] rounded-[8px] bg-[#1e293b] hover:bg-[#334155] flex items-center justify-center cursor-pointer border-0 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Aumentar capacidad del día"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1V11M1 6H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {isCustomCapacity && !isPastDate && (
                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetToGeneral}
                    disabled={savingDay}
                    className="text-[11px] text-slate-500 hover:text-pink-600 underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Restablecer a capacidad general ({estandarCapacity} pedidos)
                  </button>
                </div>
              )}
            </div>

            {/* Interruptor de Bloqueo Manual */}
            <div className={`flex items-center justify-between p-[12px] bg-slate-50 rounded-[10px] border border-slate-200 mb-[14px] ${isPastDate ? "opacity-60" : ""}`}>
              <div>
                <div className="font-semibold text-[#0f172a] text-[13px]">
                  Bloquear fecha para pedidos
                </div>
                <div className="text-[11px] text-slate-500">
                  {isPastDate ? "Esta fecha ya pasó" : "Impide que los clientes reserven en este día (feriado, taller cerrado, etc.)"}
                </div>
              </div>
              <button
                type="button"
                disabled={isPastDate}
                onClick={() => handleToggleBlock(!selectedDayBlocked)}
                className={`w-[44px] h-[24px] rounded-full relative border-0 transition-colors ${
                  isPastDate
                    ? "bg-slate-200 cursor-not-allowed"
                    : selectedDayBlocked
                    ? "bg-red-500 cursor-pointer"
                    : "bg-slate-300 cursor-pointer"
                }`}
              >
                <div
                  className={`absolute top-[2px] size-[20px] rounded-full bg-white shadow-sm transition-transform ${
                    selectedDayBlocked ? "right-[2px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>

            {/* Estado o Botón Guardar Día */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                {savingDay
                  ? "Guardando cambios en Supabase..."
                  : savedSuccess
                  ? "✓ Cambios guardados correctamente"
                  : isPastDate
                  ? "Fecha pasada (solo lectura)"
                  : "Los ajustes de fecha se guardan automáticamente"}
              </span>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  </div>
  );
}
