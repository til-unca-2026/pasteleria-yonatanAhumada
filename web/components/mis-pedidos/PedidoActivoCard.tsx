"use client";

import React from "react";
import { TransferenciaInfo } from "./TransferenciaInfo";
import { ComprobanteUploader } from "./ComprobanteUploader";

export interface PedidoActivoData {
  id: string;
  numeroPedido: string;
  nombreProducto: string;
  peso: string;
  estado: string;
  estadoOperativo?: string;
  fechaEntregaTexto: string;
  countdownFormatted: string;
  isCountdownExpired: boolean;
  total: number;
  seña: number;
  cbu?: string;
  alias?: string;
  titular?: string;
  comprobanteUrl?: string | null;
  baseNombre?: string;
  rellenosNombres?: string[];
  coberturaNombre?: string;
  notas?: string | null;
  fotoReferenciaUrl?: string | null;
  tortaImagen?: string | null;
  modeloNombre?: string | null;
}

interface PedidoActivoCardProps {
  pedido: PedidoActivoData;
  file: File | null;
  onFileChange: (file: File | null) => void;
  confirmed: boolean;
}

export function PedidoActivoCard({
  pedido,
  file,
  onFileChange,
  confirmed,
}: PedidoActivoCardProps) {
  const [showDetails, setShowDetails] = React.useState<boolean>(true);

  return (
    <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0px_2px_8px_rgba(15,23,42,0.07)] overflow-hidden">
      {/* ── Card Header ── */}
      <div className="px-[16px] pt-[14px] pb-[12px] border-b border-[#f1f5f9]">
        <div className="flex items-start justify-between gap-[10px] mb-[6px]">
          <div className="flex items-center gap-[10px]">
            <div className="bg-[#fdf4f8] border border-[#f9a8d4] rounded-[8px] size-[40px] flex items-center justify-center text-[20px] shrink-0 overflow-hidden">
              {pedido.tortaImagen ? (
                <img
                  src={pedido.tortaImagen}
                  alt={pedido.modeloNombre || pedido.nombreProducto}
                  className="w-full h-full object-cover"
                />
              ) : (
                "🎂"
              )}
            </div>
            <div>
              <span className="font-bold text-[#0f172a] text-[14px] leading-[18px] block">
                {pedido.modeloNombre || pedido.nombreProducto}
              </span>
              <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
                {pedido.peso} · Pedido{" "}
                <strong className="font-semibold text-[#334155]">
                  {pedido.numeroPedido}
                </strong>
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-full px-[9px] py-[4px] flex items-center gap-[5px] shrink-0">
            <div className="bg-[#f59e0b] rounded-full size-[6px]" />
            <span className="font-semibold text-[#92400e] text-[10px] leading-none whitespace-nowrap">
              {pedido.estado}
            </span>
          </div>
        </div>

        {/* Date + Countdown */}
        <div className="flex items-center justify-between mt-[8px]">
          <div className="flex items-center gap-[5px]">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke="#64748b" strokeWidth="1.1" />
              <path d="M4 1V3M10 1V3M1 6H13" stroke="#64748b" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span className="font-medium text-[#334155] text-[12px]">
              {pedido.fechaEntregaTexto}
            </span>
          </div>

          <div
            className={`rounded-full px-[9px] py-[3px] flex items-center gap-[4px] ${
              pedido.isCountdownExpired
                ? "bg-[#fee2e2] border border-[#fca5a5]"
                : "bg-[#fff7ed] border border-[#fed7aa]"
            }`}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="#f59e0b" strokeWidth="1.1" />
              <path d="M5 2.5V5L6.5 6.5" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span className="font-semibold text-[#92400e] text-[10px]">
              Expira en {pedido.countdownFormatted} hs
            </span>
          </div>
        </div>
      </div>

      {/* ── Seguimiento en Vivo (Pendiente, En producción, Listo) ── */}
      <div className="px-[16px] py-[12px] bg-slate-50/80 border-b border-[#f1f5f9]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Seguimiento en Vivo
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
            Taller: <strong className="text-slate-900">{pedido.estadoOperativo || "Pendiente"}</strong>
          </span>
        </div>

        {/* Stepper horizontal con 3 hitos */}
        {(() => {
          const op = pedido.estadoOperativo || "Pendiente";
          let activeIndex = 0;
          if (op === "Señado" || op === "En producción") activeIndex = 1;
          if (op === "Listo") activeIndex = 2;

          const steps = [
            { label: "Pendiente", desc: "Validación" },
            { label: "En producción", desc: "Elaborando" },
            { label: "Listo", desc: "Para entregar" },
          ];

          return (
            <div className="relative pt-1 pb-1">
              {/* Barra de progreso de fondo */}
              <div className="absolute top-[17px] left-8 right-8 h-[2px] bg-slate-200 z-0" />
              <div
                className="absolute top-[17px] left-8 h-[2px] bg-emerald-500 transition-all duration-500 z-0"
                style={{
                  width: activeIndex === 0 ? "0%" : activeIndex === 1 ? "50%" : "calc(100% - 64px)",
                }}
              />

              <div className="grid grid-cols-3 relative z-10 text-center">
                {steps.map((st, i) => {
                  const isCompleted = i < activeIndex;
                  const isCurrent = i === activeIndex;

                  return (
                    <div key={st.label} className="flex flex-col items-center">
                      <div
                        className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                          isCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isCurrent
                            ? "bg-white border-emerald-500 text-emerald-600 shadow-xs ring-2 ring-emerald-100"
                            : "bg-white border-slate-300 text-slate-400"
                        }`}
                      >
                        {isCompleted ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-[11px] font-bold mt-1 block leading-tight ${
                          isCurrent
                            ? "text-emerald-700"
                            : isCompleted
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {st.label}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {st.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Desglose de Detalles de la Torta ── */}
      <div className="border-b border-[#f1f5f9] bg-[#fafafa]">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-[16px] py-[8px] flex items-center justify-between border-0 bg-transparent cursor-pointer hover:bg-slate-100/60 transition-colors"
        >
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <span>📋</span> Detalles de la Torta
          </span>
          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            {showDetails ? "Ocultar" : "Ver detalles"}
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
            >
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {showDetails && (
          <div className="px-[16px] pb-[12px] pt-[4px] space-y-[6px] text-[11px] border-t border-slate-100 animate-in fade-in duration-150">
            {pedido.baseNombre && (
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">🍰 Bizcochuelo:</span>
                <span className="font-semibold text-slate-900">{pedido.baseNombre}</span>
              </div>
            )}
            {pedido.rellenosNombres && pedido.rellenosNombres.length > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">🍯 Rellenos:</span>
                <span className="font-semibold text-slate-900">{pedido.rellenosNombres.join(" + ")}</span>
              </div>
            )}
            {pedido.coberturaNombre && (
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-medium">🧁 Cobertura:</span>
                <span className="font-semibold text-slate-900">{pedido.coberturaNombre}</span>
              </div>
            )}
            {pedido.notas && (
              <div className="bg-white rounded-[6px] border border-slate-200 p-[8px] mt-1 text-slate-700">
                <span className="font-semibold block text-[10px] text-slate-500 mb-0.5">📝 Notas / Dedicatoria:</span>
                <p className="m-0 italic leading-snug">{pedido.notas}</p>
              </div>
            )}
            {pedido.fotoReferenciaUrl && (
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-600">🖼️ Foto de diseño:</span>
                <a
                  href={pedido.fotoReferenciaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 font-semibold hover:underline"
                >
                  Ver foto adjunta ↗
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Transfer / Banking Details ── */}
      <TransferenciaInfo
        total={pedido.total}
        seña={pedido.seña}
        cbu={pedido.cbu}
        alias={pedido.alias}
        titular={pedido.titular}
      />

      {/* ── Upload Proof Area ── */}
      <ComprobanteUploader
        file={file}
        onFileChange={onFileChange}
        confirmed={confirmed}
        comprobanteUrl={pedido.comprobanteUrl}
      />
    </div>
  );
}
