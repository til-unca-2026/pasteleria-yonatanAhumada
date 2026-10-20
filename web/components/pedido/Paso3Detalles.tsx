"use client";

import React, { useRef } from "react";
import { formatArgentinaPhone, extractLocalPhone } from "@/lib/phone";

interface Paso3Props {
  deliveryDate: string;
  selectedWeight: number;
  selectedPrice: number;
  selectedBaseNombre?: string;
  selectedFillingsNombres?: string[];
  selectedCoverageNombre?: string;
  nombre: string;
  onChangeNombre: (v: string) => void;
  telefono: string;
  onChangeTelefono: (v: string) => void;
  notas: string;
  onChangeNotas: (v: string) => void;
  referenciaFile: File | null;
  onUploadReferencia: (file: File | null) => void;
  tortaNombre?: string;
  isFixedRecipe?: boolean;
}

export function Paso3Detalles({
  deliveryDate,
  selectedWeight,
  selectedPrice,
  selectedBaseNombre = "Vainilla",
  selectedFillingsNombres = [],
  selectedCoverageNombre = "Buttercream",
  nombre,
  onChangeNombre,
  telefono,
  onChangeTelefono,
  notas,
  onChangeNotas,
  referenciaFile,
  onUploadReferencia,
  tortaNombre,
  isFixedRecipe = false,
}: Paso3Props) {
  const referenciaInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => "$" + val.toLocaleString("es-AR");

  const rawDigits = extractLocalPhone(telefono);
  const displayPhone = rawDigits ? formatArgentinaPhone(rawDigits) : "";

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = extractLocalPhone(val);
    if (!clean) {
      onChangeTelefono("");
    } else {
      const formatted = formatArgentinaPhone(clean);
      onChangeTelefono(`+54 9 ${formatted}`);
    }
  };

  return (
    <div className="flex flex-col gap-[14px] w-full animate-in fade-in duration-200">
      {/* ── 1. Formulario de Contacto ── */}
      <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-[0px_1px_3px_rgba(0,0,0,0.04)] p-[14px]">
        <div className="flex items-center justify-between mb-[12px] pb-2 border-b border-slate-100">
          <div className="flex items-center gap-[6px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" stroke="#1e293b" strokeWidth="1.3" />
              <path d="M1 13C1 10.24 3.69 8 7 8C10.31 8 13 10.24 13 13" stroke="#1e293b" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-[#0f172a] text-[12px] tracking-wide uppercase">
              Tus Datos de Contacto
            </span>
          </div>
          <span className="font-semibold text-pink-600 text-[10px] bg-pink-50 px-2 py-0.5 rounded-full">Requerido</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-slate-600 font-semibold mb-1">Nombre Completo *</label>
            <input
              required
              className="w-full border border-[#cbd5e1] rounded-[8px] px-[12px] py-[9px] font-normal text-[#0f172a] text-[13px] outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] bg-white transition-all"
              value={nombre}
              onChange={(e) => onChangeNombre(e.target.value)}
              placeholder="Ej. Ana García"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 font-semibold mb-1">
              Teléfono / WhatsApp de Contacto *
            </label>
            <div className="flex items-center w-full border border-[#cbd5e1] rounded-[8px] overflow-hidden bg-white focus-within:border-[#1e293b] focus-within:ring-1 focus-within:ring-[#1e293b] transition-all shadow-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-[9px] bg-slate-50 border-r border-[#cbd5e1] select-none shrink-0 text-slate-600">
                <span className="text-[13px] leading-none" role="img" aria-label="Bandera de Argentina">🇦🇷</span>
                <span className="text-[12px] font-bold text-slate-700 tracking-tight">+54 9</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                className="flex-1 px-[12px] py-[9px] font-normal text-[#0f172a] text-[13px] outline-none bg-transparent min-w-0"
                value={displayPhone}
                onChange={handlePhoneChange}
                placeholder="Ej. 11 4829-1020"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Sin 0 ni 15. Usado para coordinar la entrega y consultar tu pedido.
            </span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 font-semibold mb-1">Notas o dedicatoria especial (Opcional)</label>
            <textarea
              className="w-full border border-[#cbd5e1] rounded-[8px] px-[12px] py-[8px] font-normal text-[#0f172a] text-[13px] outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] bg-white resize-none h-[64px] transition-all"
              value={notas}
              onChange={(e) => onChangeNotas(e.target.value)}
              placeholder="Ej. Frase para la torta, temática, alergias o sin frutos secos..."
            />
          </div>

          {/* Subir Foto de Referencia */}
          <div>
            <label className="block text-[11px] text-slate-600 font-semibold mb-1">Foto de referencia de diseño (Opcional)</label>
            <input
              ref={referenciaInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUploadReferencia(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => referenciaInputRef.current?.click()}
              className="w-full border border-dashed border-[#94a3b8] hover:border-[#1e293b] rounded-[8px] px-[12px] py-[10px] flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 text-left transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-xs text-slate-700 font-medium truncate">
                  {referenciaFile ? `✓ ${referenciaFile.name}` : "Adjuntar foto de inspiración o diseño"}
                </span>
              </div>
              <span className="text-[11px] text-[#1e293b] font-bold bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                {referenciaFile ? "Cambiar" : "Examinar"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Resumen de la Torta ── */}
      <div className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-[0px_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="bg-[#1e293b] px-[14px] py-[10px] flex items-center justify-between text-white">
          <div className="flex items-center gap-[8px]">
            <span className="text-[14px]">🎂</span>
            <span className="font-bold text-[12px] tracking-wide uppercase">Resumen de tu Torta</span>
          </div>
          <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
            {selectedWeight} kg
          </span>
        </div>

        <div className="p-[14px] space-y-[10px]">
          {/* Ficha técnica clara */}
          <div className="grid grid-cols-1 gap-[8px] text-[12px]">
            {tortaNombre && (
              <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">🎂 Modelo:</span>
                <span className="font-bold text-slate-900 text-right">{tortaNombre}</span>
              </div>
            )}

            <div className="flex items-start justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">📅 Fecha de Entrega:</span>
              <span className="font-bold text-slate-800 text-right">{deliveryDate || "Fecha a confirmar"}</span>
            </div>

            {isFixedRecipe ? (
              <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">✨ Receta:</span>
                <span className="font-semibold text-amber-700 text-right">Receta Tradicional de la Casa</span>
              </div>
            ) : (
              <>
                {selectedBaseNombre && (
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">🍰 Bizcochuelo:</span>
                    <span className="font-semibold text-slate-800 text-right">{selectedBaseNombre}</span>
                  </div>
                )}

                {selectedFillingsNombres.length > 0 && (
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">🍯 Rellenos:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                      {selectedFillingsNombres.join(" + ")}
                    </span>
                  </div>
                )}

                {selectedCoverageNombre && (
                  <div className="flex items-start justify-between pb-1">
                    <span className="text-slate-500 font-medium">🧁 Cobertura:</span>
                    <span className="font-semibold text-slate-800 text-right">{selectedCoverageNombre}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desglose financiero */}
          <div className="bg-[#f8fafc] rounded-[10px] border border-slate-200 p-[10px] flex items-center justify-between mt-2">
            <div>
              <span className="text-[11px] text-slate-500 block">Total a Transferir</span>
              <strong className="text-[17px] font-bold text-slate-900">{formatCurrency(selectedPrice)}</strong>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-600 font-semibold block">1 Solo Pago</span>
              <span className="text-[11px] text-slate-500">Sin saldo al retirar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Aviso informativo sobre el pago ── */}
      <div className="bg-slate-50 rounded-[10px] border border-slate-200 p-[12px] flex items-start gap-[10px]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-[1px]">
          <circle cx="8" cy="8" r="7" stroke="#64748b" strokeWidth="1.2" />
          <path d="M8 7V11M8 5.5V5" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p className="text-[11px] text-slate-600 leading-[16px] m-0">
          Al presionar <strong className="text-slate-900">Confirmar y Reservar Cupo</strong>, guardaremos tu pedido con reserva por 2 horas para que transfieras el total y subas tu comprobante desde la sección <em>Mis Pedidos</em>. El día de la entrega solo pasas a retirar.
        </p>
      </div>
    </div>
  );
}
