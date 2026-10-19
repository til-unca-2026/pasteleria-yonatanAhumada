"use client";

import React, { useState, useEffect } from "react";
import {
  getPedidos,
  updatePedidoEstado,
  PedidoConDetalles,
  EstadoPedido,
} from "@/lib/services/pedidos";
import { toWhatsAppPhone } from "@/lib/phone";

const ESTADO_FILTERS: { label: string; value: string }[] = [
  { label: "Todos", value: "Todos" },
  { label: "Pendiente", value: "Pendiente" },
  { label: "Pagado", value: "Señado" },
  { label: "En producción", value: "En producción" },
  { label: "Listo", value: "Listo" },
];

export function PedidosTab() {
  const [filterIdx, setFilterIdx] = useState<number>(0);
  const [pedidos, setPedidos] = useState<PedidoConDetalles[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalComprobanteUrl, setModalComprobanteUrl] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadPedidos();
  }, []);

  async function loadPedidos() {
    setLoading(true);
    try {
      const data = await getPedidos();
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoPedido) => {
    setUpdatingId(id);
    // Optimistic update
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
    );

    try {
      await updatePedidoEstado(id, nuevoEstado);
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error al actualizar estado del pedido.");
      loadPedidos();
    } finally {
      setUpdatingId(null);
    }
  };

  const currentFilter = ESTADO_FILTERS[filterIdx].value;
  const filteredPedidos = pedidos.filter((p) => {
    if (currentFilter === "Todos") return true;
    return p.estado === currentFilter;
  });

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case "Pendiente":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          text: "Pago Pendiente",
        };
      case "Señado":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          text: "Pagado",
        };
      case "En producción":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          text: "En Producción",
        };
      case "Listo":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          dot: "bg-purple-500",
          text: "Listo para Retiro",
        };
      case "Expirado":
        return {
          bg: "bg-slate-100 text-slate-500 border-slate-200",
          dot: "bg-slate-400",
          text: "Expirado",
        };
    }
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-200">
      {/* ── Subtitle and Refresh ── */}
      <div className="px-[16px] pt-[14px] flex items-center justify-between mb-[10px]">
        <div>
          <div className="font-medium text-[#64748b] text-[11px] tracking-[0.5px] uppercase mb-[2px]">
            TALLER & COMANDAS
          </div>
          <div className="font-bold text-[#0f172a] text-[20px]">
            Gestión de Pedidos
          </div>
        </div>
        <button
          type="button"
          onClick={loadPedidos}
          className="size-[32px] rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer shadow-xs"
          title="Actualizar listado"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>

      {/* ── Filter Pills ── */}
      <div className="flex gap-[8px] px-[16px] mb-[12px] overflow-x-auto no-scrollbar">
        {ESTADO_FILTERS.map((f, i) => {
          const count =
            f.value === "Todos"
              ? pedidos.length
              : pedidos.filter((p) => p.estado === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterIdx(i)}
              className={`px-[12px] py-[6px] rounded-full text-[12px] cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                i === filterIdx
                  ? "bg-[#1e293b] text-white font-bold border-0 shadow-sm"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] font-normal hover:border-slate-300"
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${i === filterIdx ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Orders List ── */}
      <div className="px-[16px] flex flex-col gap-[12px] mb-20">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Cargando comandas...</span>
          </div>
        ) : filteredPedidos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200 p-6">
            <p className="font-semibold text-slate-700 mb-1">No hay pedidos en esta sección</p>
            <p className="text-xs text-slate-400">
              {currentFilter === "Todos"
                ? "Los encargos confirmados por los clientes aparecerán aquí."
                : `No hay pedidos con estado "${currentFilter}".`}
            </p>
          </div>
        ) : (
          filteredPedidos.map((p) => {
            const isExpanded = expandedIds.has(p.id);
            const badge = getStatusBadge(p.estado);
            const insumosNombres = p.detalles.map((d) => d.insumo?.nombre).filter(Boolean).join(" • ");
            const cleanPhone = toWhatsAppPhone(p.cliente_telefono);

            return (
              <div
                key={p.id}
                className="bg-white rounded-[16px] border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* ── Cabecera Táctil del Pedido (Toca para expandir / contraer) ── */}
                <div
                  onClick={() => toggleExpanded(p.id)}
                  className="p-[14px] cursor-pointer hover:bg-slate-50/60 active:bg-slate-100/60 transition-colors select-none"
                >
                  {/* Fila 1: Nombre + Peso + Estado */}
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-[#0f172a] text-[15px] truncate">
                        {p.cliente_nombre}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-bold text-[11px] px-2 py-0.5 rounded-full shrink-0">
                        {p.peso_kg} kg
                      </span>
                    </div>

                    <div className={`rounded-full px-[8px] py-[3px] flex items-center gap-1.5 border text-[11px] font-semibold shrink-0 ${badge.bg}`}>
                      <div className={`size-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.text}</span>
                    </div>
                  </div>

                  {/* Fila 2: Resumen de sabores */}
                  <div className="text-xs text-slate-600 font-medium mb-2 line-clamp-1">
                    {insumosNombres || "Configuración estándar"}
                  </div>

                  {/* Fila 3: Fecha de Entrega y Botón WhatsApp */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Entrega: {p.fecha_entrega}</span>
                    </div>

                    {/* Botón WhatsApp (oculto temporalmente en entorno de pruebas)
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full font-bold text-[11px] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.37 17.07L2.13 21.61L6.79 20.39C8.24 21.41 10.05 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>
                    )}
                    */}
                  </div>
                </div>

                {/* ── Barra de Montos y Control de Despliegue ── */}
                <div
                  onClick={() => toggleExpanded(p.id)}
                  className="px-[14px] py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs cursor-pointer hover:bg-pink-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">
                      Total: <strong className="text-slate-900 font-bold">${Number(p.total_estimado).toLocaleString("es-AR")}</strong>
                    </span>
                    <span className={`font-semibold text-[11px] ${p.estado === "Pendiente" ? "text-amber-600" : "text-emerald-600"}`}>
                      {p.estado === "Pendiente" ? (p.comprobante_url ? "• Comprobante enviado" : "• Comprobante pendiente") : "✓ 100% Pagado"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-pink-600">
                    <span>{isExpanded ? "Ocultar" : "Detalles"}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* ── Ficha Técnica Desplegada (Mobile First) ── */}
                {isExpanded && (
                  <div className="p-[14px] bg-slate-50/80 border-t border-slate-200 space-y-3 animate-in fade-in duration-150 text-xs">
                    {/* Ingredientes desglosados */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-2xs">
                      <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                        🎂 Composición de la Torta
                      </span>
                      {p.detalles.map((d) => (
                        <div key={d.id} className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500 capitalize font-medium">
                            {d.insumo?.tipo === "bizcochuelo" ? "🍰 Bizcochuelo:" : d.insumo?.tipo === "relleno" ? "🍯 Relleno:" : "🧁 Cobertura:"}
                          </span>
                          <span className="font-bold text-slate-900 text-right">
                            {d.insumo?.nombre}
                            {d.insumo?.recargo_extra > 0 && (
                              <span className="text-pink-600 font-normal ml-1">
                                (+${d.insumo.recargo_extra.toLocaleString("es-AR")})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500 font-medium">⚖️ Peso:</span>
                        <span className="font-bold text-slate-900">{p.peso_kg} kg</span>
                      </div>
                    </div>

                    {/* Notas del cliente */}
                    {p.notas && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <span className="font-bold text-amber-800 text-[10px] uppercase block mb-1">
                          📝 Notas o Dedicatoria del Cliente:
                        </span>
                        <p className="m-0 text-amber-900 italic font-medium">{p.notas}</p>
                      </div>
                    )}

                    {/* Archivos adjuntos (Comprobante / Referencia) */}
                    {(p.comprobante_url || p.foto_referencia_url) && (
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-2xs">
                        <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                          🖼️ Archivos Adjuntos (Tocar para ampliar)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {p.comprobante_url && (
                            <div className="border border-slate-200 rounded-lg p-2 flex flex-col items-center text-center bg-slate-50">
                              <span className="text-[10px] font-semibold text-slate-600 mb-1">Comprobante</span>
                              <button
                                type="button"
                                onClick={() => setModalComprobanteUrl(p.comprobante_url!)}
                                className="w-full h-20 rounded bg-white overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 flex items-center justify-center shadow-2xs"
                              >
                                <img src={p.comprobante_url} alt="Comprobante" className="w-full h-full object-cover" />
                              </button>
                            </div>
                          )}
                          {p.foto_referencia_url && (
                            <div className="border border-slate-200 rounded-lg p-2 flex flex-col items-center text-center bg-slate-50">
                              <span className="text-[10px] font-semibold text-slate-600 mb-1">Diseño Referencia</span>
                              <button
                                type="button"
                                onClick={() => setModalComprobanteUrl(p.foto_referencia_url!)}
                                className="w-full h-20 rounded bg-white overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 flex items-center justify-center shadow-2xs"
                              >
                                <img src={p.foto_referencia_url} alt="Referencia" className="w-full h-full object-cover" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Balance Financiero */}
                    <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl p-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Estado Financiero</span>
                        <strong className="text-emerald-400 text-base font-bold">
                          {p.estado === "Pendiente" ? "Cobro Pendiente" : "100% Pagado"}
                        </strong>
                      </div>
                      <div className="text-right text-[11px] text-slate-300">
                        <div>Monto Total: <strong className="text-white">${Number(p.total_estimado).toLocaleString("es-AR")}</strong></div>
                        <div className="text-slate-400">Saldo al retiro: $0</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Botón Único de Acción de Etapa ── */}
                <div className="p-3 bg-white border-t border-slate-100">
                  {p.estado === "Pendiente" && (
                    <button
                      type="button"
                      disabled={updatingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "Señado")}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span>✓ Aprobar Pago Total</span>
                    </button>
                  )}

                  {p.estado === "Señado" && (
                    <button
                      type="button"
                      disabled={updatingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "En producción")}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span>🧑‍🍳 Iniciar Producción</span>
                    </button>
                  )}

                  {p.estado === "En producción" && (
                    <button
                      type="button"
                      disabled={updatingId === p.id}
                      onClick={() => handleCambiarEstado(p.id, "Listo")}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span>🎉 Marcar Listo para Retiro</span>
                    </button>
                  )}

                  {p.estado === "Listo" && (
                    <div className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <span>✓ Pedido listo para entrega</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal Visualizador de Comprobante / Imagen con un toque ── */}
      {modalComprobanteUrl && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Visualizador de Imagen</span>
              <button
                type="button"
                onClick={() => setModalComprobanteUrl(null)}
                className="size-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-sm font-bold border-0"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 max-h-[70vh] flex items-center justify-center">
              <img
                src={modalComprobanteUrl}
                alt="Imagen adjunta"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="mt-3 text-center">
              <a
                href={modalComprobanteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-pink-600 hover:underline font-semibold"
              >
                Abrir imagen en tamaño completo ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
