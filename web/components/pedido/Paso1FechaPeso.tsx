"use client";

import React, { useState, useEffect } from "react";
import { SizeOption } from "./types";
import { getCapacidadEstandar, getCuposMes, CupoDiarioDB } from "@/lib/services/cupos";

export const SIZES: SizeOption[] = [
  { kg: "1 kg", weight: 1, porciones: "8-10 porc.", portions: "8-10 porc.", precio: "$18.500", rawPrice: 18500 },
  { kg: "1.5 kg", weight: 1.5, porciones: "12-15 porc.", portions: "12-15 porc.", precio: "$26.000", rawPrice: 26000 },
  { kg: "2 kg", weight: 2, porciones: "18-20 porc.", portions: "18-20 porc.", precio: "$34.000", rawPrice: 34000 },
];

const CALENDAR_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface Paso1Props {
  selectedDateStr?: string;
  onSelectDate?: (dateStr: string, formattedDisplay: string) => void;
  // Compatibilidad hacia atrás
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
  selectedWeight: number;
  onSelectWeight: (weight: number, price: number) => void;
  tortaNombre?: string;
  tortaImagen?: string;
  basePricePerKg?: number;
}

export function Paso1FechaPeso({
  selectedDateStr,
  onSelectDate,
  selectedDay,
  onSelectDay,
  selectedWeight,
  onSelectWeight,
  tortaNombre,
  tortaImagen,
  basePricePerKg,
}: Paso1Props) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const effectiveSizes: SizeOption[] = basePricePerKg
    ? [
        {
          kg: "1 kg",
          weight: 1,
          porciones: "8-10 porc.",
          portions: "8-10 porc.",
          precio: `$${basePricePerKg.toLocaleString("es-AR")}`,
          rawPrice: basePricePerKg,
        },
        {
          kg: "1.5 kg",
          weight: 1.5,
          porciones: "12-15 porc.",
          portions: "12-15 porc.",
          precio: `$${Math.round(basePricePerKg * 1.5).toLocaleString("es-AR")}`,
          rawPrice: Math.round(basePricePerKg * 1.5),
        },
        {
          kg: "2 kg",
          weight: 2,
          porciones: "18-20 porc.",
          portions: "18-20 porc.",
          precio: `$${Math.round(basePricePerKg * 2).toLocaleString("es-AR")}`,
          rawPrice: Math.round(basePricePerKg * 2),
        },
      ]
    : SIZES;

  const [estandarCap, setEstandarCap] = useState<number>(3);
  const [cuposMes, setCuposMes] = useState<CupoDiarioDB[]>([]);
  const [loadingCupos, setLoadingCupos] = useState<boolean>(true);

  // Fecha seleccionada interna (mínimo 48 hs / 2 días de anticipación)
  const pad = (n: number) => n.toString().padStart(2, "0");
  const minDeliveryDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  const defaultInitialDate =
    selectedDateStr ||
    `${minDeliveryDateObj.getFullYear()}-${pad(minDeliveryDateObj.getMonth() + 1)}-${pad(minDeliveryDateObj.getDate())}`;
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string>(defaultInitialDate);

  // Notificar fecha inicial al montar si no estaba seleccionada
  useEffect(() => {
    if (!selectedDateStr && onSelectDate) {
      const formatted = `${minDeliveryDateObj.getDate()} de ${MONTH_NAMES[minDeliveryDateObj.getMonth()]} ${minDeliveryDateObj.getFullYear()}`;
      onSelectDate(defaultInitialDate, formatted);
    }
  }, []);

  useEffect(() => {
    async function loadCupos() {
      setLoadingCupos(true);
      try {
        const [estandar, cupos] = await Promise.all([
          getCapacidadEstandar(),
          getCuposMes(currentYear, currentMonth),
        ]);
        setEstandarCap(estandar);
        setCuposMes(cupos);
      } catch (err) {
        console.error("Error cargando disponibilidad:", err);
      } finally {
        setLoadingCupos(false);
      }
    }
    loadCupos();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
    const formatted = `${day} de ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
    setCurrentSelectedDate(dateStr);
    if (onSelectDate) {
      onSelectDate(dateStr, formatted);
    }
    if (onSelectDay) {
      onSelectDay(day);
    }
    setShowCalendar(false);
  };

  // Matriz de días
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
  const startingOffset = (firstDayOfWeek + 6) % 7;

  // Evaluar estado del día (mínimo 48 horas / 2 días de anticipación)
  const getDayAvailability = (day: number) => {
    const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
    const dayDate = new Date(currentYear, currentMonth - 1, day);
    dayDate.setHours(0, 0, 0, 0);

    const minAllowedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    minAllowedDate.setHours(0, 0, 0, 0);

    // Bloqueo estricto: fechas pasadas o con menos de 48 hs de anticipación
    const isPastOrTooSoon = dayDate < minAllowedDate;
    const found = cuposMes.find((c) => c.fecha === dateStr);
    const maxCap = found ? found.capacidad_maxima : estandarCap;
    const occupied = found ? found.cupos_ocupados : 0;
    const isBlocked = found ? found.bloqueado_manual : false;

    const isFull = occupied >= maxCap;
    const isAvailable = !isPastOrTooSoon && !isBlocked && !isFull;

    return { isAvailable, isBlocked, isFull, isPastOrTooSoon };
  };

  const selectedDateObj = new Date(currentSelectedDate + "T12:00:00");
  const displaySelectedDate = isNaN(selectedDateObj.getTime())
    ? "Fecha seleccionada"
    : `${selectedDateObj.getDate()} de ${MONTH_NAMES[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`;

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-200">
      {/* Banner Modelo Seleccionado */}
      {tortaNombre && (
        <div className="bg-white rounded-[12px] border border-pink-100 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] p-[12px] mb-[16px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg overflow-hidden border border-pink-200 bg-pink-50 flex items-center justify-center text-lg shrink-0">
              {tortaImagen ? (
                <img
                  src={tortaImagen}
                  alt={tortaNombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                "🎂"
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-pink-700 block">
                Modelo seleccionado
              </span>
              <span className="text-[14px] font-bold text-slate-900 leading-tight">
                {tortaNombre}
              </span>
            </div>
          </div>
          {basePricePerKg && (
            <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              ${basePricePerKg.toLocaleString("es-AR")}/kg
            </span>
          )}
        </div>
      )}

      {/* Bloque Fecha de Entrega */}
      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[16px] mb-[20px]">
        <div className="flex items-center justify-between mb-[12px]">
          <div className="flex items-center gap-[8px]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="14" height="13" rx="2" stroke="#a43073" strokeWidth="1.2" />
              <path d="M5 1V3M11 1V3M1 6H15" stroke="#a43073" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-[#0f172a] text-[12px]">
              Fecha de Entrega
            </span>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-[#10B981] rounded-full size-[6px]" />
            <span className="font-medium text-[#0f172a] text-[11px]">
              Cupos en tiempo real
            </span>
          </div>
        </div>

        {/* Tarjeta de Fecha Seleccionada */}
        <div className="flex items-center justify-between bg-[#f8fafc] rounded-[8px] p-[12px]">
          <div className="flex items-center gap-[10px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="15" rx="2" stroke="#64748b" strokeWidth="1.2" />
              <path d="M6 2V4M14 2V4M2 8H18" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
              <text x="10" y="15" textAnchor="middle" fontSize="7" fill="#64748b" fontWeight="600">
                {selectedDateObj.getDate() || ""}
              </text>
            </svg>
            <div>
              <div className="font-bold text-[#0f172a] text-[15px] leading-[20px]">
                {displaySelectedDate}
              </div>
              <div className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                Retiro: 10:00 a 18:00 hs • Mínimo 48 hs de anticipación
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-white border border-[#e2e8f0] rounded-[6px] px-[12px] py-[6px] font-medium text-[#0f172a] text-[12px] cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {showCalendar ? "Cerrar" : "Cambiar"}
          </button>
        </div>

        {/* Calendario Desplegable al tocar "Cambiar" */}
        {showCalendar && (
          <div className="mt-[16px] pt-[14px] border-t border-[#e2e8f0]">
            <div className="flex items-center justify-between mb-[6px]">
              <span className="font-bold text-[#0f172a] text-[14px]">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>
              <div className="flex gap-[4px]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="size-[24px] rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-700"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M8 10L4 6L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="size-[24px] rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-700"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M4 10L8 6L4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mb-3">
              Mínimo 48 hs de anticipación para elaboración artesanal.
            </div>

            {loadingCupos ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="size-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px]">Consultando cupos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-y-[6px]">
                {CALENDAR_DAYS.map((d, i) => (
                  <div key={i} className="flex items-center justify-center pb-1">
                    <span className="font-semibold text-[#94a3b8] text-[11px]">{d}</span>
                  </div>
                ))}

                {Array.from({ length: startingOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="p-1"></div>
                ))}

                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
                  const { isAvailable, isBlocked, isFull, isPastOrTooSoon } = getDayAvailability(day);
                  const isSelected = currentSelectedDate === dateStr;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleDaySelect(day)}
                      className={`flex flex-col items-center justify-center py-[5px] rounded-[8px] transition-all border ${
                        isSelected
                          ? "bg-[#1e293b] border-[#1e293b] text-white cursor-pointer shadow-sm"
                          : !isAvailable
                          ? "bg-transparent border-transparent opacity-35 cursor-not-allowed text-slate-400"
                          : "bg-transparent border-transparent hover:bg-slate-100 text-[#0f172a] cursor-pointer"
                      }`}
                    >
                      <span
                        className={`text-[12px] ${
                          isSelected
                            ? "font-bold text-white"
                            : isBlocked || isPastOrTooSoon
                            ? "line-through"
                            : "font-medium"
                        }`}
                      >
                        {day}
                      </span>
                      <div
                        className={`rounded-full size-[4px] mt-1 ${
                          isSelected
                            ? "bg-[#38bdf8]"
                            : isBlocked
                            ? "bg-slate-400"
                            : isFull
                            ? "bg-red-500"
                            : isAvailable
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Leyenda */}
            <div className="flex items-center gap-[12px] mt-[12px] pt-[8px] border-t border-slate-100">
              <div className="flex items-center gap-[4px]">
                <div className="bg-[#10B981] rounded-full size-[6px]" />
                <span className="text-[#64748b] text-[10px]">Disponible</span>
              </div>
              <div className="flex items-center gap-[4px]">
                <div className="bg-[#ef4444] rounded-full size-[6px]" />
                <span className="text-[#64748b] text-[10px]">Completo</span>
              </div>
              <div className="flex items-center gap-[4px]">
                <div className="bg-[#94a3b8] rounded-full size-[6px]" />
                <span className="text-[#64748b] text-[10px]">Sin atención</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bloque Tamaño / Peso */}
      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[16px] mb-[16px]">
        <div className="flex items-center gap-[8px] mb-[12px]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#a43073" strokeWidth="1.2" />
            <path d="M5 8H11M8 5V11" stroke="#a43073" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[#0f172a] text-[12px]">
            Tamaño y Porciones
          </span>
        </div>

        <div className="grid grid-cols-3 gap-[8px]">
          {effectiveSizes.map((s) => {
            const isSelected = selectedWeight === s.weight;
            return (
              <button
                key={s.weight}
                type="button"
                onClick={() => onSelectWeight(s.weight, s.rawPrice)}
                className={`flex flex-col items-center justify-center p-[10px] rounded-[10px] border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1e293b] border-[#1e293b] shadow-md text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-[#0f172a]"
                }`}
              >
                <span className={`font-bold text-[14px] ${isSelected ? "text-white" : "text-[#0f172a]"}`}>
                  {s.kg}
                </span>
                <span className={`text-[10px] my-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {s.porciones}
                </span>
                <span className={`text-[11px] font-semibold ${isSelected ? "text-pink-300" : "text-pink-600"}`}>
                  {s.precio}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
