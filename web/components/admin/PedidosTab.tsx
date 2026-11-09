"use client";

import React, { useState, useEffect } from "react";
import {
  getPedidos,
  updatePedidoEstado,
  rechazarPedido,
  PedidoConDetalles,
  EstadoPedido,
} from "@/lib/services/pedidos";
import { getTodasLasTortas, TortaDB } from "@/lib/services/catalogo";
import { toWhatsAppPhone } from "@/lib/phone";
import {
  notifyPagoAprobado,
  notifyPedidoListo,
  notifyPedidoRechazado,
} from "@/lib/services/telegram";

const FALLBACK_TORTA_IMAGES: Record<string, string> = {
  "torta de frutos rojos": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-frutos-rojos.jpg",
  "torta temática infantil": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-tematica.jpg",
  "chocotorta clásica": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/chocotorta-clasica.jpg",
  "torta floral vintage": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-floral.jpg",
};

const ESTADO_FILTERS: { label: string; value: string }[] = [
  { label: "Pendientes", value: "Pendiente" },
  { label: "Para Elaborar", value: "Señado" },
  { label: "Listos", value: "Listo" },
  { label: "Historial", value: "Todos" },
];

export function PedidosTab() {
  const [filterIdx, setFilterIdx] = useState<number>(0);
  const [pedidos, setPedidos] = useState<PedidoConDetalles[]>([]);
  const [tortasCatalog, setTortasCatalog] = useState<TortaDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalComprobanteUrl, setModalComprobanteUrl] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pedidoToReject, setPedidoToReject] = useState<PedidoConDetalles | null>(null);
  const [rejecting, setRejecting] = useState<boolean>(false);

  // Toggle para vista mobile
  const toggleExpandedMobile = (id: string) => {
    setSelectedId(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadPedidos();
    getTodasLasTortas().then((data) => {
      if (data && data.length > 0) setTortasCatalog(data);
    });
  }, []);

  async function loadPedidos() {
    setLoading(true);
    try {
      const data = await getPedidos();
      setPedidos(data);

      // Determinación inteligente de la pestaña inicial:
      // Si hay pedidos pendientes (especialmente con comprobante), abrir en "Pendientes" (idx 0).
      // Si no, abrir directamente en "Para Elaborar" (idx 1) o 0.
      const hasPendientes = data.some((p) => p.estado === "Pendiente");
      const hasParaElaborar = data.some((p) => p.estado === "Señado" || p.estado === "En producción");
      const defaultIdx = hasPendientes ? 0 : hasParaElaborar ? 1 : 0;
      setFilterIdx(defaultIdx);

      const targetFilter = ESTADO_FILTERS[defaultIdx].value;
      const initialMatches = data.filter((p) => {
        if (targetFilter === "Todos") return true;
        if (targetFilter === "Señado") return p.estado === "Señado" || p.estado === "En producción";
        return p.estado === targetFilter;
      });

      if (initialMatches.length > 0) {
        setSelectedId(initialMatches[0].id);
      } else if (data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }

  const parseModeloYNotas = (rawNotas?: string | null) => {
    if (!rawNotas) return { modeloNombre: null, tortaImagen: null, dedicatoria: null };

    const matchModelo = rawNotas.match(/\[Modelo:\s*([^\]\-]+?)(?:\s*-\s*[^\]]+)?\]/);
    const modeloNombre = matchModelo ? matchModelo[1].trim() : null;

    const dedicatoria = rawNotas
      .replace(/\[Modelo:\s*[^\]]+\]/g, "")
      .trim() || null;

    let tortaImagen: string | null = null;
    if (modeloNombre) {
      const found = tortasCatalog.find(
        (t) =>
          t.nombre.toLowerCase().trim() === modeloNombre.toLowerCase().trim() ||
          t.slug.toLowerCase().trim() === modeloNombre.toLowerCase().trim()
      );
      if (found?.imagen_url) {
        tortaImagen = found.imagen_url;
      } else {
        const lowerMod = modeloNombre.toLowerCase().trim();
        const fallbackKey = Object.keys(FALLBACK_TORTA_IMAGES).find(
          (k) => lowerMod.includes(k) || k.includes(lowerMod)
        );
        if (fallbackKey) {
          tortaImagen = FALLBACK_TORTA_IMAGES[fallbackKey];
        }
      }
    }

    return { modeloNombre, tortaImagen, dedicatoria };
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoPedido) => {
    setUpdatingId(id);
    const pedidoActual = pedidos.find((p) => p.id === id);
    // Optimistic update
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
    );

    try {
      await updatePedidoEstado(id, nuevoEstado);

      if (pedidoActual) {
        const { modeloNombre } = parseModeloYNotas(pedidoActual.notas);

        if (nuevoEstado === "Señado") {
          notifyPagoAprobado({
            id: pedidoActual.id,
            cliente_nombre: pedidoActual.cliente_nombre,
            cliente_telefono: pedidoActual.cliente_telefono,
            fecha_entrega: pedidoActual.fecha_entrega,
            peso_kg: pedidoActual.peso_kg,
            total_estimado: pedidoActual.total_estimado,
            modeloNombre,
          }).catch((err) =>
            console.warn("Aviso no bloqueante al notificar pago a Telegram:", err)
          );
        } else if (nuevoEstado === "Listo") {
          notifyPedidoListo({
            id: pedidoActual.id,
            cliente_nombre: pedidoActual.cliente_nombre,
            cliente_telefono: pedidoActual.cliente_telefono,
            fecha_entrega: pedidoActual.fecha_entrega,
            peso_kg: pedidoActual.peso_kg,
            total_estimado: pedidoActual.total_estimado,
            modeloNombre,
          }).catch((err) =>
            console.warn("Aviso no bloqueante al notificar comanda lista a Telegram:", err)
          );
        }
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error al actualizar estado del pedido.");
      loadPedidos();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmRechazo = async () => {
    if (!pedidoToReject) return;
    const id = pedidoToReject.id;
    const fecha = pedidoToReject.fecha_entrega;
    const cliente = pedidoToReject.cliente_nombre;
    setRejecting(true);

    try {
      await rechazarPedido(id, fecha);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: "Expirado" as EstadoPedido } : p))
      );
      setPedidoToReject(null);

      // Notificación automática a Telegram de cupo liberado
      notifyPedidoRechazado({
        id,
        cliente_nombre: cliente,
        fecha_entrega: fecha,
      }).catch((err) =>
        console.warn("Aviso no bloqueante al notificar rechazo a Telegram:", err)
      );
    } catch (err) {
      console.error("Error al rechazar pedido:", err);
      alert("Error al rechazar el pedido en el servidor.");
    } finally {
      setRejecting(false);
    }
  };

  const currentFilter = ESTADO_FILTERS[filterIdx].value;

  // Filtrado
  const filteredList = pedidos.filter((p) => {
    if (currentFilter === "Todos") return true;
    if (currentFilter === "Señado") return p.estado === "Señado" || p.estado === "En producción";
    return p.estado === currentFilter;
  });

  // Ordenamiento inteligente:
  // - En "Todos": Primero los Pendientes con comprobante por revisar (urgente), luego por entrega
  // - En "Pendientes": Comprobantes adjuntos arriba
  // - En "Pagados": Por fecha de entrega más próxima (cronograma de cocina)
  const sortedPedidos = [...filteredList].sort((a, b) => {
    if (currentFilter === "Todos") {
      const aUrgent = a.estado === "Pendiente" && Boolean(a.comprobante_url);
      const bUrgent = b.estado === "Pendiente" && Boolean(b.comprobante_url);
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      const aPend = a.estado === "Pendiente";
      const bPend = b.estado === "Pendiente";
      if (aPend && !bPend) return -1;
      if (!aPend && bPend) return 1;

      return a.fecha_entrega.localeCompare(b.fecha_entrega);
    }

    if (currentFilter === "Pendiente") {
      const aHasComp = Boolean(a.comprobante_url);
      const bHasComp = Boolean(b.comprobante_url);
      if (aHasComp && !bHasComp) return -1;
      if (!aHasComp && bHasComp) return 1;
      return (b.created_at || "").localeCompare(a.created_at || "");
    }

    if (currentFilter === "Señado") {
      return a.fecha_entrega.localeCompare(b.fecha_entrega);
    }

    if (currentFilter === "Listo") {
      return b.fecha_entrega.localeCompare(a.fecha_entrega);
    }

    return 0;
  });

  // Pedidos pendientes con comprobante listo para aprobar
  const pendingWithReceiptCount = pedidos.filter(
    (p) => p.estado === "Pendiente" && Boolean(p.comprobante_url)
  ).length;

  // Pedido seleccionado para el panel lateral
  const activeSelected =
    sortedPedidos.find((p) => p.id === selectedId) || sortedPedidos[0] || null;

  const getStatusBadge = (estado: EstadoPedido) => {
    switch (estado) {
      case "Pendiente":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
          text: "Pago Pendiente",
        };
      case "Señado":
      case "En producción":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          text: "Pagado",
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
          text: "Rechazado / Expirado",
        };
    }
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-200 pb-12">
      {/* ── Subtitle and Refresh ── */}
      <div className="px-4 md:px-0 pt-3 md:pt-1 flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-[#a43073] text-[11px] tracking-[0.5px] uppercase mb-0.5">
            TALLER & COMANDAS
          </div>
          <div className="font-bold text-[#0f172a] text-xl md:text-2xl">
            Gestión de Pedidos
          </div>
        </div>
        <button
          type="button"
          onClick={loadPedidos}
          className="size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors"
          title="Actualizar listado"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>

      {/* ── Filter Pills con Notificación de Pendientes ── */}
      <div className="flex gap-2 px-4 md:px-0 mb-4 overflow-x-auto no-scrollbar">
        {ESTADO_FILTERS.map((f, i) => {
          const count =
            f.value === "Todos"
              ? pedidos.length
              : f.value === "Señado"
              ? pedidos.filter((p) => p.estado === "Señado" || p.estado === "En producción").length
              : pedidos.filter((p) => p.estado === f.value).length;

          const isPendienteFilter = f.value === "Pendiente";
          const hasUnapprovedReceipts = isPendienteFilter && pendingWithReceiptCount > 0;

          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilterIdx(i);
                // Si la selección actual no pertenece al nuevo filtro, auto-seleccionar el primero
                const newFilter = f.value;
                const match = pedidos.filter((p) => {
                  if (newFilter === "Todos") return true;
                  if (newFilter === "Señado") return p.estado === "Señado" || p.estado === "En producción";
                  return p.estado === newFilter;
                });
                if (match.length > 0) setSelectedId(match[0].id);
              }}
              className={`px-3 py-1.5 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all flex items-center gap-1.5 relative ${
                i === filterIdx
                  ? "bg-[#1e293b] text-white font-bold border-0 shadow-sm"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] font-normal hover:border-slate-300"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  i === filterIdx ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>

              {/* Punto rojo pulsante si hay comprobantes pendientes de validación */}
              {hasUnapprovedReceipts && (
                <span className="flex h-2 w-2 relative -ml-0.5" title={`${pendingWithReceiptCount} comprobante(s) por revisar`}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Master-Detail Layout (2 columnas en PC) ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* ── Columna Izquierda: Lista de Comandas ── */}
        <div className="w-full lg:w-[410px] xl:w-[440px] shrink-0 flex flex-col gap-3">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Cargando comandas...</span>
            </div>
          ) : sortedPedidos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 p-6">
              <p className="font-semibold text-slate-700 mb-1">No hay pedidos en esta sección</p>
              <p className="text-xs text-slate-400">
                {currentFilter === "Pendiente"
                  ? "No hay pedidos pendientes de pago en este momento."
                  : currentFilter === "Señado"
                  ? "No hay pedidos en cola para elaborar en el taller."
                  : currentFilter === "Listo"
                  ? "No hay pedidos terminados esperando retiro."
                  : "No hay pedidos registrados en el historial."}
              </p>
            </div>
          ) : (
            sortedPedidos.map((p) => {
              const isSelected = activeSelected?.id === p.id;
              const isExpandedMobile = expandedIds.has(p.id);
              const badge = getStatusBadge(p.estado);
              const { modeloNombre, tortaImagen, dedicatoria } = parseModeloYNotas(p.notas);
              const hasReceiptPending = p.estado === "Pendiente" && Boolean(p.comprobante_url);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                  }}
                  className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? "border-pink-500 ring-2 ring-pink-500/15 shadow-sm bg-pink-50/10"
                      : "border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs"
                  } ${hasReceiptPending ? "border-l-4 border-l-rose-500" : ""}`}
                >
                  <div className="p-3.5 select-none">
                    <div className="flex gap-3 items-start">
                      {/* Miniatura visual de la torta */}
                      <div className="size-12 rounded-xl overflow-hidden bg-pink-50 border border-slate-200 shrink-0 flex items-center justify-center relative">
                        {tortaImagen ? (
                          <img
                            src={tortaImagen}
                            alt={modeloNombre || "Torta"}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🎂</span>
                        )}
                      </div>

                      {/* Info de la Torta, Cliente y Estado */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[#0f172a] text-sm truncate">
                            {modeloNombre || "Torta Personalizada"}
                          </span>
                          <div className={`rounded-full px-2 py-0.5 flex items-center gap-1.5 border text-[10px] font-semibold shrink-0 ${badge.bg}`}>
                            <div className={`size-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.text}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-700 mb-1">
                          <span className="font-medium truncate max-w-[140px]">
                            👤 {p.cliente_nombre}
                          </span>
                          <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                            {p.peso_kg} kg
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                          <span className="font-medium text-slate-600 flex items-center gap-1">
                            📅 {p.fecha_entrega}
                          </span>
                          <span className="font-bold text-[#0f172a]">
                            ${Number(p.total_estimado).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Alerta si tiene comprobante por revisar */}
                    {hasReceiptPending && (
                      <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-rose-700 font-semibold bg-rose-50/60 -mx-3.5 -mb-3.5 px-3.5 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Comprobante adjunto por validar
                        </span>
                        <span className="text-[10px] bg-rose-200/80 text-rose-800 px-1.5 py-0.2 rounded font-bold uppercase">
                          Revisar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* En Mobile: botón para desplegar acordeón inline */}
                  <div className="lg:hidden border-t border-slate-100 bg-slate-50 px-3 py-1.5 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandedMobile(p.id);
                      }}
                      className="text-pink-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>{isExpandedMobile ? "Ocultar detalle" : "Ver detalle comanda"}</span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                        className={`transition-transform duration-200 ${isExpandedMobile ? "rotate-180" : ""}`}
                      >
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  {/* Detalle inline exclusivo para Mobile cuando se expande */}
                  {isExpandedMobile && (
                    <div className="lg:hidden p-3.5 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
                      {/* Desglose de insumos */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                        <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                          🎂 Composición de la Torta
                        </span>
                        {p.detalles.map((d) => (
                          <div key={d.id} className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 capitalize">
                              {d.insumo?.tipo === "bizcochuelo" ? "🍰 Bizcochuelo:" : d.insumo?.tipo === "relleno" ? "🍯 Relleno:" : d.insumo?.tipo === "topping" ? "🍓 Topping:" : "🧁 Cobertura:"}
                            </span>
                            <span className="font-bold text-slate-800 text-right">
                              {d.insumo?.nombre}
                              {d.insumo?.recargo_extra > 0 && (
                                <span className="text-pink-600 font-normal ml-1">
                                  (+${d.insumo.recargo_extra.toLocaleString("es-AR")})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Dedicatoria */}
                      {dedicatoria && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <span className="font-bold text-amber-800 text-[10px] uppercase block mb-1">
                            📝 Dedicatoria del Cliente:
                          </span>
                          <p className="m-0 text-amber-900 italic font-medium">{dedicatoria}</p>
                        </div>
                      )}

                      {/* Comprobante */}
                      {p.comprobante_url && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3">
                          <span className="font-bold text-slate-800 text-[10px] uppercase block mb-1.5">
                            Comprobante de Pago
                          </span>
                          <button
                            type="button"
                            onClick={() => setModalComprobanteUrl(p.comprobante_url!)}
                            className="w-full h-24 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer flex items-center justify-center shadow-2xs"
                          >
                            <img src={p.comprobante_url} alt="Comprobante" className="w-full h-full object-cover" />
                          </button>
                        </div>
                      )}

                      {/* Botones de acción móvil */}
                      <div className="pt-2 flex flex-col gap-2">
                        {p.estado === "Pendiente" && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => handleCambiarEstado(p.id, "Señado")}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              ✓ Aprobar Pago Total
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === p.id}
                              onClick={() => setPedidoToReject(p)}
                              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              ✕ Rechazar Pedido
                            </button>
                          </>
                        )}
                        {(p.estado === "Señado" || p.estado === "En producción") && (
                          <button
                            type="button"
                            disabled={updatingId === p.id}
                            onClick={() => handleCambiarEstado(p.id, "Listo")}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            🎉 Marcar Listo para Retiro
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Columna Derecha: Panel Lateral de Detalle en PC (Sticky) ── */}
        <div className="hidden lg:block flex-1 sticky top-[76px] self-start max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar">
          {activeSelected ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100 animate-in fade-in duration-150">
              {/* Header de Detalle */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                      #{activeSelected.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      Encargado: {activeSelected.created_at ? new Date(activeSelected.created_at).toLocaleDateString("es-AR") : "Reciente"}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white m-0">
                    {parseModeloYNotas(activeSelected.notas).modeloNombre || "Torta Personalizada"}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Fecha de Entrega
                  </div>
                  <div className="text-base font-bold text-pink-300 flex items-center gap-1.5 justify-end">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{activeSelected.fecha_entrega}</span>
                  </div>
                </div>
              </div>

              {/* Ficha Técnica: Foto + Ingredientes */}
              <div className="p-5 space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="size-20 rounded-xl overflow-hidden bg-pink-50 border border-slate-200 shrink-0 shadow-2xs relative">
                    {parseModeloYNotas(activeSelected.notas).tortaImagen ? (
                      <img
                        src={parseModeloYNotas(activeSelected.notas).tortaImagen!}
                        alt="Torta"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-3xl">🎂</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">
                        Detalles de Elaboración
                      </span>
                      <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full font-bold text-xs">
                        ⚖️ {activeSelected.peso_kg} kg
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                      {activeSelected.detalles.length > 0 ? (
                        activeSelected.detalles.map((d) => (
                          <div key={d.id} className="flex justify-between items-baseline border-b border-slate-200/60 pb-1 last:border-0 last:pb-0">
                            <span className="text-slate-500 font-medium capitalize">
                              {d.insumo?.tipo === "bizcochuelo" ? "🍰 Bizcochuelo:" : d.insumo?.tipo === "relleno" ? "🍯 Relleno:" : d.insumo?.tipo === "topping" ? "🍓 Topping:" : "🧁 Cobertura:"}
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
                        ))
                      ) : (
                        <div className="text-slate-500 italic">Receta estándar artesanal del taller</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dedicatoria del cliente */}
                {parseModeloYNotas(activeSelected.notas).dedicatoria && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5">
                    <span className="font-bold text-amber-800 text-[10px] uppercase tracking-wider block mb-1">
                      📝 Dedicatoria o Indicaciones del Cliente:
                    </span>
                    <p className="m-0 text-amber-950 font-medium text-xs leading-relaxed italic">
                      &quot;{parseModeloYNotas(activeSelected.notas).dedicatoria}&quot;
                    </p>
                  </div>
                )}

                {/* Archivos Adjuntos: Comprobante y Referencia */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    Archivos de Validación (Clic para ampliar)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Comprobante de transferencia */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center text-center">
                      <span className="text-xs font-semibold text-slate-700 mb-2">
                        Comprobante de Pago
                      </span>
                      {activeSelected.comprobante_url ? (
                        <button
                          type="button"
                          onClick={() => setModalComprobanteUrl(activeSelected.comprobante_url!)}
                          className="w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-200 hover:border-pink-300 transition-colors cursor-pointer group shadow-2xs relative"
                        >
                          <img
                            src={activeSelected.comprobante_url}
                            alt="Comprobante"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            🔍 Ampliar
                          </div>
                        </button>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-2">
                          <span>Sin comprobante</span>
                          <span className="text-[10px] text-slate-400 mt-1">Aún no fue adjuntado</span>
                        </div>
                      )}
                    </div>

                    {/* Foto de diseño de referencia */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center text-center">
                      <span className="text-xs font-semibold text-slate-700 mb-2">
                        Diseño de Referencia
                      </span>
                      {activeSelected.foto_referencia_url ? (
                        <button
                          type="button"
                          onClick={() => setModalComprobanteUrl(activeSelected.foto_referencia_url!)}
                          className="w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-200 hover:border-pink-300 transition-colors cursor-pointer group shadow-2xs relative"
                        >
                          <img
                            src={activeSelected.foto_referencia_url}
                            alt="Referencia"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            🔍 Ampliar
                          </div>
                        </button>
                      ) : (
                        <div className="w-full h-28 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-2">
                          <span>Diseño estándar</span>
                          <span className="text-[10px] text-slate-400 mt-1">Sin foto extra</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Datos del Cliente y Botón WhatsApp */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Cliente
                    </span>
                    <strong className="text-slate-900 text-sm block">
                      {activeSelected.cliente_nombre}
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      {activeSelected.cliente_telefono}
                    </span>
                  </div>

                  {activeSelected.cliente_telefono && (
                    <a
                      href={`https://wa.me/${toWhatsAppPhone(activeSelected.cliente_telefono)}?text=${encodeURIComponent(
                        `Hola ${activeSelected.cliente_nombre}! Te escribimos de la Pastelería sobre tu pedido #${activeSelected.id.slice(0, 8).toUpperCase()}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                    >
                      <span>WhatsApp</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Balance Económico */}
                <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Estado Financiero
                    </span>
                    <strong
                      className={`text-base font-bold ${
                        activeSelected.estado === "Pendiente" ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {activeSelected.estado === "Pendiente" ? "Cobro Pendiente" : "100% Pagado"}
                    </strong>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>
                      Monto Total:{" "}
                      <strong className="text-white text-sm">
                        ${Number(activeSelected.total_estimado).toLocaleString("es-AR")}
                      </strong>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Seña requerida: ${Number(activeSelected.sena_requerida || 0).toLocaleString("es-AR")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Acciones del Panel de Detalle */}
              <div className="p-4 bg-slate-50 flex items-center gap-2.5">
                {activeSelected.estado === "Pendiente" && (
                  <>
                    <button
                      type="button"
                      disabled={updatingId === activeSelected.id}
                      onClick={() => handleCambiarEstado(activeSelected.id, "Señado")}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Aprobar Pago Total</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === activeSelected.id}
                      onClick={() => setPedidoToReject(activeSelected)}
                      className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Rechazar</span>
                    </button>
                  </>
                )}

                {(activeSelected.estado === "Señado" || activeSelected.estado === "En producción") && (
                  <button
                    type="button"
                    disabled={updatingId === activeSelected.id}
                    onClick={() => handleCambiarEstado(activeSelected.id, "Listo")}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🎉 Marcar como Listo para Retiro</span>
                  </button>
                )}

                {activeSelected.estado === "Listo" && (
                  <div className="flex-1 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Pedido completado y listo para entrega</span>
                  </div>
                )}

                {activeSelected.estado === "Expirado" && (
                  <div className="flex-1 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold text-center">
                    Pedido Rechazado / Expirado (Cupo liberado)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <span className="text-3xl block mb-2">📋</span>
              <p className="font-semibold text-slate-700 text-sm mb-1">Ninguna comanda seleccionada</p>
              <p className="text-xs text-slate-400">Hacé clic en cualquier pedido del listado para inspeccionar sus datos.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Confirmación para Rechazar Pedido ── */}
      {pedidoToReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="size-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h4 className="font-bold text-slate-900 text-center text-base mb-1">
              ¿Rechazar este pedido?
            </h4>

            <p className="text-xs text-slate-600 text-center mb-4 leading-relaxed">
              El pedido <strong className="text-slate-900">#{pedidoToReject.id.slice(0, 8).toUpperCase()}</strong> de <strong className="text-slate-900">{pedidoToReject.cliente_nombre}</strong> pasará a estado <em>Rechazado</em> y se liberará el cupo ocupado para el <strong className="text-slate-900">{pedidoToReject.fecha_entrega}</strong>.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setPedidoToReject(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleConfirmRechazo}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {rejecting ? (
                  <>
                    <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rechazando...</span>
                  </>
                ) : (
                  <span>Sí, Rechazar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Lightbox para Ampliar Comprobante / Referencia ── */}
      {modalComprobanteUrl && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Visualizador de Comprobante / Imagen</span>
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
                Abrir imagen en pestaña nueva ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
