"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HeaderHome } from "@/components/HeaderHome";
import { SidebarNav } from "@/components/SidebarNav";
import { HeaderMisPedidos } from "@/components/mis-pedidos/HeaderMisPedidos";
import {
  PedidoActivoCard,
  PedidoActivoData,
} from "@/components/mis-pedidos/PedidoActivoCard";
import {
  getPedidoById,
  getPedidosPorIds,
  getPedidosPorUsuario,
  adjuntarComprobanteAPedido,
  PedidoConDetalles,
} from "@/lib/services/pedidos";
import { getTortasActivas, TortaDB } from "@/lib/services/catalogo";
import { DEFAULT_TALLER_CONFIG, getTallerConfig, TallerConfig } from "@/lib/services/configuracion";
import { notifyComprobanteAdjuntado } from "@/lib/services/telegram";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_TORTA_IMAGES: Record<string, string> = {
  "torta de frutos rojos": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-frutos-rojos.jpg",
  "torta temática infantil": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-tematica.jpg",
  "chocotorta clásica": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/chocotorta-clasica.jpg",
  "torta floral vintage": "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-floral.jpg",
};

function MisPedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string; phone?: string } | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [unlinkingTg, setUnlinkingTg] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [pedidosList, setPedidosList] = useState<PedidoConDetalles[]>([]);
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(queryId);
  const [estadoFiltro, setEstadoFiltro] = useState<"Todos" | "Pendientes" | "Confirmados" | "Expirados">("Todos");
  const [telefonoInput, setTelefonoInput] = useState<string>("");
  const [buscando, setBuscando] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Countdown state
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [tortasCatalog, setTortasCatalog] = useState<TortaDB[]>([]);
  const [tallerConfig, setTallerConfig] = useState<TallerConfig>(DEFAULT_TALLER_CONFIG);

  useEffect(() => {
    getTortasActivas().then((data) => {
      if (data && data.length > 0) setTortasCatalog(data);
    });
    getTallerConfig().then(setTallerConfig).catch(() => {});
  }, []);

  // 1. Exigir sesión iniciada y cargar únicamente los pedidos de esta cuenta
  useEffect(() => {
    async function loadUserAndOrders() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const nextUrl = queryId ? `/mis-pedidos?id=${queryId}` : "/mis-pedidos";
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }

        const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
        let userPhone = user.user_metadata?.phone_number || "";
        let userOrderIds: string[] = [];

        if (typeof window !== "undefined") {
          if (!userPhone) {
            userPhone = localStorage.getItem(`user_phone_${user.id}`) || "";
          }
          const storedIds = localStorage.getItem(`user_orders_${user.id}`);
          if (storedIds) {
            try {
              userOrderIds = JSON.parse(storedIds);
            } catch (e) {
              console.error("Error parsing user orders from storage:", e);
            }
          }
        }

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: userName,
          phone: userPhone,
        });

        const { data: adminRecord } = await supabase
          .from("admins")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (adminRecord) {
          setIsAdminUser(true);
        }

        // Verificar vinculación de Telegram a nivel de cuenta
        const { data: tgRecord } = await supabase
          .from("usuarios_telegram")
          .select("telegram_chat_id")
          .eq("user_id", user.id)
          .maybeSingle();

        const ordersMap = new Map<string, PedidoConDetalles>();

        // Cargar estrictamente los pedidos de la cuenta autenticada
        const fetchedByUser = await getPedidosPorUsuario(user.id);
        fetchedByUser.forEach((o) => ordersMap.set(o.id, o));

        // Compatibilidad con pedidos propios creados antes de migrar user_id
        if (userOrderIds.length > 0) {
          const fetchedByIds = await getPedidosPorIds(userOrderIds.slice(0, 20));
          fetchedByIds
            .filter((o) => !o.user_id || o.user_id === user.id)
            .forEach((o) => ordersMap.set(o.id, o));
        }

        // Si viene queryId específico perteneciente al usuario
        if (queryId && !ordersMap.has(queryId)) {
          const single = await getPedidoById(queryId);
          if (single && (!single.user_id || single.user_id === user.id)) {
            ordersMap.set(single.id, single);
          }
        }

        const linkedOrder = Array.from(ordersMap.values()).find((o) => Boolean(o.telegram_chat_id));
        setTelegramChatId(tgRecord?.telegram_chat_id || linkedOrder?.telegram_chat_id || null);

        // Convertir y ordenar del más reciente al más antiguo (hasta 20)
        const combined = Array.from(ordersMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 20);

        setPedidosList(combined);

        // Si solo hay un pedido o se especificó queryId, seleccionarlo
        if (queryId && ordersMap.has(queryId)) {
          setSelectedPedidoId(queryId);
          const sel = ordersMap.get(queryId);
          if (sel?.comprobante_url) setConfirmed(true);
        } else if (combined.length === 1) {
          setSelectedPedidoId(combined[0].id);
          if (combined[0].comprobante_url) setConfirmed(true);
        }
      } catch (err) {
        console.error("Error al cargar pedidos del usuario:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserAndOrders();
  }, [supabase]);

  // Sincronizar botón Atrás / Adelante del navegador o mouse con ?id=
  const prevQueryIdRef = React.useRef<string | null>(queryId);
  useEffect(() => {
    if (prevQueryIdRef.current !== queryId) {
      prevQueryIdRef.current = queryId;
      setSelectedPedidoId(queryId);
      setFile(null);
      if (queryId) {
        const match = pedidosList.find((p) => p.id === queryId);
        if (match) setConfirmed(Boolean(match.comprobante_url));
      }
    }
  }, [queryId, pedidosList]);

  const activePedido = pedidosList.find((p) => p.id === selectedPedidoId) || null;

  // 2. Temporizador para el pedido activo seleccionado
  useEffect(() => {
    if (!activePedido?.expiracion_reserva) return;

    const calculateTime = () => {
      const expTime = new Date(activePedido.expiracion_reserva!).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expTime - now) / 1000));
      setSecondsLeft(diffSecs);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [activePedido]);

  // 3. Suscripción en tiempo real a cambios de estado del pedido (Pendiente -> En producción -> Listo)
  useEffect(() => {
    const channel = supabase
      .channel("cliente-pedidos-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
        },
        (payload) => {
          const updated = payload.new as Partial<PedidoConDetalles> & { id: string };
          setPedidosList((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    ...updated,
                    detalles: item.detalles,
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Formatear countdown
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const countdownFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isCountdownExpired = secondsLeft <= 0;

  // 3. Filtrar en tiempo real dentro de los pedidos propios de la cuenta
  const handleBuscarPorTelefono = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const termino = telefonoInput.trim().toLowerCase().replace(/^#/, "");
    if (!termino) {
      setSelectedPedidoId(null);
      return;
    }

    const matches = pedidosList.filter((p) => {
      const codeMatch = p.id.toLowerCase().startsWith(termino);
      const fechaMatch = p.fecha_entrega.toLowerCase().includes(termino);
      const notasMatch = (p.notas || "").toLowerCase().includes(termino);
      return codeMatch || fechaMatch || notasMatch;
    });

    if (matches.length === 0) {
      setErrorMessage("No encontramos pedidos en tu cuenta con ese código o descripción.");
    } else if (matches.length === 1) {
      setSelectedPedidoId(matches[0].id);
      setConfirmed(Boolean(matches[0].comprobante_url));
      router.push(`/mis-pedidos?id=${matches[0].id}`, { scroll: false });
    } else {
      setSelectedPedidoId(null);
      if (queryId) router.push("/mis-pedidos", { scroll: false });
    }
  };

  const handleDesvincularTelegram = async () => {
    if (!currentUser) return;
    setUnlinkingTg(true);
    try {
      await supabase.from("usuarios_telegram").delete().eq("user_id", currentUser.id);
      await supabase
        .from("pedidos")
        .update({ telegram_chat_id: null })
        .eq("user_id", currentUser.id);
      setTelegramChatId(null);
      setPedidosList((prev) => prev.map((p) => ({ ...p, telegram_chat_id: null })));
    } catch (err) {
      console.error("Error al desvincular Telegram:", err);
    } finally {
      setUnlinkingTg(false);
    }
  };

  // 4. Confirmar y subir comprobante
  const handleConfirmUpload = async () => {
    if (!file || !activePedido) return;

    setUploading(true);
    try {
      const updated = await adjuntarComprobanteAPedido(activePedido.id, file);
      setPedidosList((prev) =>
        prev.map((p) => (p.id === activePedido.id ? { ...p, comprobante_url: updated.comprobante_url } : p))
      );
      setConfirmed(true);

      notifyComprobanteAdjuntado({
        id: activePedido.id,
        cliente_nombre: activePedido.cliente_nombre,
        cliente_telefono: activePedido.cliente_telefono,
        fecha_entrega: activePedido.fecha_entrega,
        peso_kg: activePedido.peso_kg,
        total_estimado: activePedido.total_estimado,
        comprobante_url: updated.comprobante_url,
      }).catch((err) => console.warn("Aviso al notificar comprobante a Telegram:", err));
    } catch (err) {
      console.error("Error al subir comprobante:", err);
      alert("Hubo un error al subir el comprobante. Por favor intenta nuevamente.");
    } finally {
      setUploading(false);
    }
  };

  // Helper para armar datos de presentación de un pedido
  const buildPedidoActivoData = (p: PedidoConDetalles): PedidoActivoData => {
    const baseObj = p.detalles?.find((d) => d.insumo?.tipo === "bizcochuelo");
    const rellenosObjs = p.detalles?.filter((d) => d.insumo?.tipo === "relleno") || [];
    const coberturaObj = p.detalles?.find((d) => d.insumo?.tipo === "cobertura");

    const baseNombre = baseObj?.insumo?.nombre || "Bizcochuelo artesanal";
    const rellenosNombres = rellenosObjs.map((r) => r.insumo?.nombre).filter(Boolean);
    const coberturaNombre = coberturaObj?.insumo?.nombre || "Cobertura artesanal";

    const rawNotas = (p as any).notas || "";
    const matchModelo = rawNotas.match(/\[Modelo:\s*([^\]\-]+?)(?:\s*-\s*[^\]]+)?\]/);
    const modeloNombre = matchModelo ? matchModelo[1].trim() : null;
    const cleanNotas = rawNotas.replace(/\[Modelo:\s*[^\]]+\]/gi, "").trim() || null;

    let tortaImagen: string | null = null;
    let isFixedRecipe = rawNotas.toLowerCase().includes("receta tradicional");
    if (modeloNombre) {
      const found = tortasCatalog.find(
        (t) =>
          t.nombre.toLowerCase().trim() === modeloNombre.toLowerCase().trim() ||
          t.slug.toLowerCase().trim() === modeloNombre.toLowerCase().trim()
      );
      if (found?.tipo === "receta_fija") {
        isFixedRecipe = true;
      }
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

    const saboresTexto =
      p.detalles && p.detalles.length > 0
        ? [baseNombre, ...rellenosNombres, coberturaNombre].filter(Boolean).join(" · ")
        : isFixedRecipe
        ? "Receta Tradicional"
        : "Torta Artesanal Personalizada";

    const fechaTexto = p.fecha_entrega
      ? new Date(p.fecha_entrega + "T12:00:00").toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "Fecha a confirmar";

    const getEstadoLabel = () => {
      if (p.estado === "Expirado") {
        return "RESERVA EXPIRADA";
      }
      if (p.estado === "Señado" || p.estado === "En producción" || p.estado === "Listo") {
        return "PAGO CONFIRMADO";
      }
      return p.comprobante_url ? "PAGO EN REVISIÓN" : "PAGO PENDIENTE";
    };

    return {
      id: p.id,
      numeroPedido: `#${p.id.slice(0, 8).toUpperCase()}`,
      nombreProducto: saboresTexto,
      modeloNombre,
      tortaImagen,
      peso: `${p.peso_kg} kg`,
      estado: getEstadoLabel(),
      estadoOperativo: p.estado,
      fechaEntregaTexto: fechaTexto,
      countdownFormatted,
      isCountdownExpired,
      total: p.total_estimado,
      seña: p.total_estimado,
      cbu: tallerConfig.cbu,
      alias: tallerConfig.alias,
      titular: tallerConfig.titular,
      comprobanteUrl: p.comprobante_url,
      baseNombre,
      rellenosNombres,
      coberturaNombre,
      notas: cleanNotas,
      fotoReferenciaUrl: (p as any).foto_referencia_url,
    };
  };

  const activePedidoData = activePedido ? buildPedidoActivoData(activePedido) : null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-[#0f172a] relative">
      {/* ── Top Header consistente en desktop / header móvil en mobile ── */}
      <div className="hidden md:block">
        <HeaderHome user={currentUser} isAdmin={isAdminUser} />
      </div>
      <div className="md:hidden">
        <HeaderMisPedidos
          onBack={() => {
            if (selectedPedidoId && pedidosList.length > 1) {
              router.push("/mis-pedidos", { scroll: false });
            } else {
              router.push("/");
            }
          }}
          title={selectedPedidoId ? `Pedido #${selectedPedidoId.slice(0, 8).toUpperCase()}` : "Mis Pedidos"}
          userInitial={currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || "U"}
        />
      </div>

      {/* ── Layout unificado: Sidebar Izquierdo + Área de Pedidos ── */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        <SidebarNav currentPath="/mis-pedidos" isAdmin={isAdminUser} />

        {/* ── Main Container ── */}
        <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto pt-[56px] md:pt-6 pb-[100px] md:pb-16 px-4 md:px-8">
          {/* Barra de búsqueda en los pedidos propios de la cuenta */}
          <div className="pt-2 md:pt-0 pb-4 max-w-xl">
            <form onSubmit={handleBuscarPorTelefono} className="flex gap-2">
              <input
                type="text"
                placeholder="Filtrar mis pedidos por código (#F9B5F24B), torta o fecha..."
                value={telefonoInput}
                onChange={(e) => {
                  setTelefonoInput(e.target.value);
                  setErrorMessage(null);
                }}
                className="flex-1 border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-pink-500 bg-white shadow-2xs"
              />
              <button
                type="submit"
                className="bg-[#1e293b] hover:bg-pink-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border-0 cursor-pointer transition-colors shadow-2xs"
              >
                Buscar
              </button>
            </form>
            {errorMessage && (
              <span className="text-[11px] text-red-500 font-medium mt-1.5 block">
                {errorMessage}
              </span>
            )}
          </div>

          {/* ── Estado de vinculación de Telegram por cuenta (una sola vez) ── */}
          {currentUser && !loading && (
            <div className="mb-4 max-w-xl">
              {telegramChatId ? (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-xs text-emerald-900">
                        Telegram vinculado a tu cuenta
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Recibirás avisos automáticos de todos tus pedidos actuales y futuros.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://t.me/PasteleriaAhumadaBot?start=u_${currentUser.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Cambiar ↗
                    </a>
                    <span className="text-emerald-300">|</span>
                    <button
                      type="button"
                      onClick={handleDesvincularTelegram}
                      disabled={unlinkingTg}
                      className="text-[11px] font-semibold text-rose-600 hover:underline bg-transparent border-0 cursor-pointer p-0 disabled:opacity-50"
                    >
                      {unlinkingTg ? "..." : "Desvincular"}
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href={`https://t.me/PasteleriaAhumadaBot?start=u_${currentUser.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm transition-all active:scale-[0.98] text-decoration-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center text-base shrink-0">
                      ✈️
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-xs">Vincular Telegram (una sola vez)</div>
                      <div className="text-[10px] text-sky-100 font-normal">
                        Activá las alertas automáticas para toda tu cuenta y recibí aviso cuando tu torta esté lista
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] bg-white text-blue-700 px-2.5 py-1 rounded-lg font-bold shrink-0">
                    Vincular ↗
                  </span>
                </a>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="size-7 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Cargando tus pedidos...</span>
            </div>
          ) : selectedPedidoId && activePedidoData ? (
            /* ── VISTA DETALLE DEL PEDIDO SELECCIONADO ── */
            <div className="max-w-xl">
              {pedidosList.length > 1 && (
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPedidoId(null);
                      setFile(null);
                      router.push("/mis-pedidos", { scroll: false });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 hover:text-pink-800 bg-transparent border-0 cursor-pointer p-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>Ver todos mis pedidos ({pedidosList.length})</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Cliente: {activePedido?.cliente_nombre}
                  </span>
                </div>
              )}

              <PedidoActivoCard
                pedido={activePedidoData}
                file={file}
                onFileChange={setFile}
                confirmed={confirmed}
              />

              <div className="flex items-start gap-2 mt-3 px-1 text-slate-500">
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="7" cy="7" r="6" stroke="#94a3b8" strokeWidth="1.1" />
                  <path d="M7 6V10M7 4.5V4" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="font-normal text-[11px] leading-relaxed">
                  Tu cupo queda reservado por 60 minutos. Una vez validado el pago, recibirás confirmación automática por Telegram.
                </span>
              </div>
            </div>
          ) : pedidosList.length > 0 ? (
            /* ── LISTADO DE ÚLTIMOS 20 PEDIDOS DEL USUARIO (GRID EN DESKTOP) ── */
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900 m-0">Historial de Pedidos</h2>
                  <span className="text-xs text-slate-500">Últimos {pedidosList.length} pedidos registrados</span>
                </div>
                <Link
                  href="/pedido"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-700 hover:bg-pink-500/20 transition-colors text-decoration-none"
                >
                  + Nuevo pedido
                </Link>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {(["Todos", "Pendientes", "Confirmados", "Expirados"] as const).map((tab) => {
                  const count = pedidosList.filter((p) => {
                    if (tab === "Todos") return true;
                    if (tab === "Pendientes") return p.estado === "Pendiente";
                    if (tab === "Confirmados") return p.estado === "Señado" || p.estado === "En producción" || p.estado === "Listo";
                    return p.estado === "Expirado";
                  }).length;
                  const active = estadoFiltro === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEstadoFiltro(tab)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? "bg-[#1e293b] text-white border-[#1e293b] shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-pink-300"
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pedidosList
                  .filter((p) => {
                    const term = telefonoInput.trim().toLowerCase().replace(/^#/, "");
                    if (term) {
                      const matchesTerm =
                        p.id.toLowerCase().startsWith(term) ||
                        p.fecha_entrega.toLowerCase().includes(term) ||
                        (p.notas || "").toLowerCase().includes(term);
                      if (!matchesTerm) return false;
                    }
                    if (estadoFiltro === "Todos") return true;
                    if (estadoFiltro === "Pendientes") return p.estado === "Pendiente";
                    if (estadoFiltro === "Confirmados") return p.estado === "Señado" || p.estado === "En producción" || p.estado === "Listo";
                    return p.estado === "Expirado";
                  })
                  .map((p) => {
                  const displayData = buildPedidoActivoData(p);
                  const isPaid = p.estado === "Señado" || p.estado === "En producción" || p.estado === "Listo";
                  const isExpired = p.estado === "Expirado";
                  const hasReceipt = Boolean(p.comprobante_url);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPedidoId(p.id);
                        setConfirmed(Boolean(p.comprobante_url));
                        setFile(null);
                        router.push(`/mis-pedidos?id=${p.id}`, { scroll: false });
                      }}
                      className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-pink-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              Pedido {displayData.numeroPedido}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Entrega: <strong className="text-slate-700">{p.fecha_entrega}</strong> • {p.peso_kg} kg
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isExpired
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isPaid
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : hasReceipt
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {p.estado}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 mb-3 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                          <div className="size-8 rounded-md overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
                            {displayData.tortaImagen ? (
                              <img
                                src={displayData.tortaImagen}
                                alt={displayData.modeloNombre || displayData.nombreProducto}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs">🎂</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 font-medium line-clamp-1 m-0">
                            {displayData.modeloNombre ? (
                              <>
                                <strong className="text-slate-900">{displayData.modeloNombre}</strong>
                                <span className="text-slate-500"> • {displayData.nombreProducto}</span>
                              </>
                            ) : (
                              displayData.nombreProducto
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                            {isPaid ? "Total abonado" : isExpired ? "Monto" : "Total a transferir"}
                          </span>
                          <span className={`text-sm font-bold ${isExpired ? "text-slate-500 line-through" : "text-pink-700"}`}>
                            ${p.total_estimado.toLocaleString("es-AR")}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold text-pink-700">
                          <span>
                            {isPaid
                              ? hasReceipt
                                ? "Ver comprobante"
                                : "Ver detalle"
                              : isExpired
                              ? "Ver detalle"
                              : hasReceipt
                              ? "Ver comprobante"
                              : "Subir comprobante"}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          /* ── ESTADO VACÍO (SIN PEDIDOS PARA ESTA CUENTA) ── */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-4 shadow-sm">
            <div className="size-14 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-3 text-2xl">
              🎂
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {currentUser ? `Hola ${currentUser.name || "Cliente"}, no tienes pedidos aún` : "No encontramos pedidos en esta cuenta"}
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed max-w-xs mx-auto">
              {currentUser
                ? "Tus pedidos realizados aparecerán aquí automáticamente para que puedas subir comprobantes y hacer el seguimiento."
                : "Iniciá sesión o ingresá tu número de WhatsApp arriba para consultar reservas activas."}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/pedido"
                className="w-full py-3 bg-[#1e293b] hover:bg-[#334155] text-white font-semibold text-xs rounded-xl text-decoration-none shadow-sm transition-all"
              >
                Armar un nuevo pedido
              </Link>
              {!currentUser && (
                <Link
                  href="/login?next=/mis-pedidos"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl text-decoration-none transition-colors"
                >
                  Iniciar sesión con mi cuenta
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ── Botón flotante para confirmar comprobante si está viendo un pedido con comprobante pendiente ── */}
      {activePedidoData && !confirmed && !activePedidoData.comprobanteUrl && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0] shadow-[0px_-4px_8px_rgba(15,23,42,0.06)] px-[16px] pt-[12px] pb-[16px] pb-safe">
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={!file || uploading}
              className={`w-full h-[50px] rounded-[12px] flex items-center justify-center gap-[8px] border-0 transition-all ${
                !file || uploading
                  ? "bg-[#e2e8f0] text-slate-400 cursor-not-allowed"
                  : "bg-[#1e293b] hover:bg-[#334155] text-white cursor-pointer shadow-[0px_4px_12px_rgba(15,23,42,0.18)] active:scale-[0.98]"
              }`}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-semibold text-sm">Subiendo comprobante...</span>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-white text-[15px]">
                    Confirmar Envío de Comprobante
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function MisPedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <div className="size-6 border-2 border-[#1e293b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MisPedidosContent />
    </Suspense>
  );
}
