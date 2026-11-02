import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderHome, HeaderUser } from "@/components/HeaderHome";

export const dynamic = "force-dynamic";

interface CakeCard {
  id: string;
  name: string;
  slug: string;
  image: string;
  pricePerKg: number;
  type: "personalizable" | "receta_fija";
  badge?: string;
  description: string;
  ctaText: string;
}

const CAKES_CATALOG: CakeCard[] = [
  {
    id: "torta-tematica",
    name: "Torta Temática Infantil",
    slug: "torta-tematica",
    image: "/tortas/torta-tematica.jpg",
    pricePerKg: 18000,
    type: "personalizable",
    badge: "100% Personalizable",
    description: "Masa húmeda y rellenos a elección. Decoración artesanal temática.",
    ctaText: "Personalizar",
  },
  {
    id: "chocotorta-clasica",
    name: "Chocotorta Clásica",
    slug: "chocotorta-clasica",
    image: "/tortas/chocotorta-clasica.jpg",
    pricePerKg: 16000,
    type: "receta_fija",
    badge: "Receta Tradicional",
    description: "Galletitas Chocolinas con crema colonial de dulce de leche y queso.",
    ctaText: "Pedir",
  },
  {
    id: "torta-frutos-rojos",
    name: "Torta de Frutos Rojos",
    slug: "torta-frutos-rojos",
    image: "https://zmqaitjziznxocdppsnk.supabase.co/storage/v1/object/public/catalogo/tortas/torta-frutos-rojos.jpg",
    pricePerKg: 19500,
    type: "personalizable",
    badge: "100% Personalizable",
    description: "Bizcochuelo húmedo, crema chantilly suave y abundante cubierta de frutillas frescas y frutos del bosque.",
    ctaText: "Personalizar",
  },
  {
    id: "torta-floral",
    name: "Torta Floral Vintage",
    slug: "torta-floral",
    image: "/tortas/torta-floral.jpg",
    pricePerKg: 19000,
    type: "receta_fija",
    badge: "Receta Tradicional",
    description: "Diseño botánico romántico con crema suave y flores comestibles.",
    ctaText: "Pedir",
  },
];

export default async function Home() {
  let isReceptionOpen = true;
  let isAdmin = false;
  let headerUser: HeaderUser | null = null;
  let cakesCatalog: CakeCard[] = CAKES_CATALOG;

  try {
    const supabase = await createClient();

    // 1. Cargar tortas activas desde Supabase
    const { data: tortasFromDb } = await supabase
      .from("tortas")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: true });

    if (tortasFromDb && tortasFromDb.length > 0) {
      cakesCatalog = tortasFromDb.map((t) => ({
        id: t.slug,
        name: t.nombre,
        slug: t.slug,
        image: t.imagen_url || "",
        pricePerKg: Number(t.precio_base_kg),
        type: t.tipo as "personalizable" | "receta_fija",
        description: t.descripcion || "",
        ctaText: t.cta_text || (t.tipo === "personalizable" ? "Personalizar" : "Pedir"),
      }));
    }
    const { data } = await supabase
      .from("configuracion")
      .select("valor")
      .eq("clave", "recepcion_pedidos_abierta")
      .maybeSingle();

    if (data) {
      isReceptionOpen = data.valor === true || data.valor === "true";
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      headerUser = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      };

      const { data: adminRecord } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (adminRecord) {
        isAdmin = true;
      }
    }
  } catch (e) {
    console.error("Error consultando estado de recepción:", e);
  }

  return (
    <div
      className="flex flex-col min-h-screen w-full relative overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #f8fafc 0%, #fdf4f8 100%)" }}
    >
      {/* Ambient glows */}
      <div className="absolute bg-[#ffd8e7] blur-[70px] left-[-80px] md:left-[10%] opacity-35 rounded-full size-[280px] md:size-[400px] top-[-60px] pointer-events-none" />
      <div className="absolute bg-[#e9ddff] blur-[60px] opacity-20 right-[-80px] md:right-[10%] rounded-full top-[35%] size-[260px] md:size-[380px] pointer-events-none" />

      {/* ── Header ── */}
      <HeaderHome user={headerUser} isAdmin={isAdmin} />

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Sidebar vertical acoplado a la izquierda con el mismo fondo oscuro del header */}
        <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-[#1e293b] border-r border-slate-700/80 px-4 py-6 min-h-[calc(100vh-60px)] shadow-lg">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">
            Navegación
          </span>

          <nav className="flex flex-col gap-2 w-full">
            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-pink-500/15 text-[#fc79bd] font-semibold text-sm transition-colors border border-pink-500/30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Catálogo</span>
            </Link>

            <Link
              href="/mis-pedidos"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium text-sm transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>Mis Pedidos</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-[#fc79bd] hover:bg-pink-500/10 font-medium text-sm transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Panel Taller</span>
              </Link>
            )}
          </nav>

          {/* Tarjeta de estado de pedidos */}
          <div className="mt-auto pt-6 border-t border-slate-700/80 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Atención
            </span>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-white m-0 mb-1">Pedidos con 48hs</p>
              Elaboramos cada torta a pedido con insumos frescos.
            </div>
          </div>
        </aside>

        {/* Área principal: Vitrina de Productos */}
        <main className="flex-1 px-4 md:px-8 pt-5 md:pt-6 pb-[85px] md:pb-12 w-full min-w-0">
          <h1 className="sr-only">Catálogo de Tortas Artesanales</h1>

          {/* ── Catálogo Grid (2 col mobile, 2 col tablet, 3 col desktop con sidebar) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5 w-full">
              {cakesCatalog.map((cake) => {
                const targetUrl = `/pedido?torta=${cake.slug}&nombre=${encodeURIComponent(
                  cake.name
                )}&precio=${cake.pricePerKg}&tipo=${cake.type}&imagen=${encodeURIComponent(cake.image || "")}`;

                return (
                  <div
                    key={cake.id}
                    className="bg-white rounded-[14px] md:rounded-2xl border border-slate-200/80 shadow-[0px_2px_6px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-pink-300/60 transition-all duration-200 group"
                  >
                    {/* Imagen o Placeholder pastelero */}
                    <div className="relative w-full h-[130px] md:h-[180px] bg-slate-100 overflow-hidden flex items-center justify-center">
                      {cake.image ? (
                        <img
                          src={cake.image}
                          alt={cake.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-amber-50/50 text-slate-400 p-3 text-center">
                          <div className="size-10 md:size-12 rounded-full bg-white shadow-2xs border border-pink-100 flex items-center justify-center text-xl md:text-2xl mb-1 group-hover:scale-110 transition-transform">
                            🎂
                          </div>
                          <span className="text-[10px] md:text-xs font-semibold text-slate-500">Pastelería Artesanal</span>
                        </div>
                      )}
                    </div>

                    {/* Contenido de la tarjeta */}
                    <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className="font-bold text-[#0f172a] text-[13px] md:text-[15px] leading-tight m-0 line-clamp-1">
                          {cake.name}
                        </h2>
                        <p className="text-[11px] md:text-[12px] text-slate-500 leading-snug m-0 mt-1.5 line-clamp-2">
                          {cake.description}
                        </p>
                      </div>

                      <div className="mt-3 md:mt-4 pt-2.5 border-t border-slate-100">
                        <div className="flex items-baseline justify-between mb-2.5">
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium">Desde</span>
                          <span className="text-[13px] md:text-[15px] font-bold text-pink-700">
                            ${cake.pricePerKg.toLocaleString("es-AR")}{" "}
                            <span className="text-[10px] md:text-xs font-normal text-slate-500">/kg</span>
                          </span>
                        </div>

                        {isReceptionOpen ? (
                          <Link
                            href={targetUrl}
                            className="w-full bg-[#1e293b] hover:bg-pink-700 text-white py-2 md:py-2.5 px-2 rounded-[8px] md:rounded-[10px] text-[11px] md:text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 active:scale-[0.98]"
                          >
                            <span>{cake.ctaText}</span>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5H8M5 2L8 5L5 8"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-slate-200 text-slate-400 py-1.5 px-1 rounded-[8px] text-[10px] md:text-xs font-semibold text-center cursor-not-allowed"
                          >
                            Pausado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>

      {/* ── Fixed Bottom Navigation Bar (Mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0px_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
        <div className="max-w-md mx-auto h-[54px] px-6 flex items-center justify-around">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-pink-700 font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[10px] leading-none">Catálogo</span>
          </Link>

          <Link
            href="/mis-pedidos"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="text-[10px] leading-none">Mis Pedidos</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span className="text-[10px] leading-none">Taller</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

