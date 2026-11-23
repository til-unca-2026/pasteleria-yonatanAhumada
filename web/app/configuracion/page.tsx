"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HeaderHome, HeaderUser } from "@/components/HeaderHome";
import { SidebarNav } from "@/components/SidebarNav";
import { ConfiguracionTab } from "@/components/admin/ConfiguracionTab";

export default function ConfiguracionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [savingCuenta, setSavingCuenta] = useState(false);
  const [cuentaMsg, setCuentaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [unlinkingTg, setUnlinkingTg] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/login?next=/configuracion");
        return;
      }

      const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
      const phone =
        authUser.user_metadata?.phone_number ||
        (typeof window !== "undefined" ? localStorage.getItem(`user_phone_${authUser.id}`) || "" : "");

      setUser({ id: authUser.id, email: authUser.email, name: fullName });
      setNombre(fullName);
      setTelefono(phone);

      const [{ data: adminRec }, { data: tgRec }] = await Promise.all([
        supabase.from("admins").select("id").eq("id", authUser.id).maybeSingle(),
        supabase
          .from("usuarios_telegram")
          .select("telegram_chat_id")
          .eq("user_id", authUser.id)
          .maybeSingle(),
      ]);

      setIsAdmin(Boolean(adminRec));
      setTelegramChatId(tgRec?.telegram_chat_id || null);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const handleSaveCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingCuenta(true);
    setCuentaMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: nombre.trim(),
          phone_number: telefono.trim(),
        },
      });
      if (error) throw error;
      if (typeof window !== "undefined") {
        localStorage.setItem(`user_phone_${user.id}`, telefono.trim());
      }
      setUser({ ...user, name: nombre.trim() });
      setCuentaMsg({ type: "ok", text: "Datos de cuenta guardados correctamente." });
    } catch {
      setCuentaMsg({ type: "err", text: "No se pudieron guardar los datos de tu cuenta." });
    } finally {
      setSavingCuenta(false);
    }
  };

  const handleDesvincularTelegram = async () => {
    if (!user) return;
    setUnlinkingTg(true);
    try {
      await supabase.from("usuarios_telegram").delete().eq("user_id", user.id);
      await supabase.from("pedidos").update({ telegram_chat_id: null }).eq("user_id", user.id);
      setTelegramChatId(null);
    } catch (err) {
      console.error("Error al desvincular Telegram:", err);
    } finally {
      setUnlinkingTg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-[#0f172a]">
      <HeaderHome user={user} isAdmin={isAdmin} />

      <div className="flex-1 flex flex-col md:flex-row w-full">
        <SidebarNav currentPath="/configuracion" isAdmin={isAdmin} />

        <main className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto pt-5 md:pt-6 pb-24 px-4 md:px-8 space-y-8">
          {/* ── Sección 1: Mi Cuenta y Notificaciones (todos los usuarios) ── */}
          <section className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 m-0">Configuración de Cuenta</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Administrá tus datos de contacto y notificaciones de Telegram.
              </p>
            </div>

            {cuentaMsg && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-semibold border ${
                  cuentaMsg.type === "ok"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {cuentaMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <form
                onSubmit={handleSaveCuenta}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
              >
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 m-0">Datos Personales</h2>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp predeterminado
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej: 3854534214"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingCuenta}
                  className="w-full py-2.5 rounded-xl bg-[#1e293b] hover:bg-pink-700 text-white text-xs font-bold border-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {savingCuenta ? "Guardando..." : "Guardar Datos de Cuenta"}
                </button>
              </form>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900 m-0">Notificaciones por Telegram</h2>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Recibí avisos automáticos cuando aprobemos tu pago o tu torta esté lista.
                  </p>
                </div>

                {telegramChatId ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <span className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                        ✓
                      </span>
                      <span>Telegram vinculado a tu cuenta</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://t.me/PasteleriaAhumadaBot?start=u_${user?.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Cambiar cuenta ↗
                      </a>
                      <button
                        type="button"
                        onClick={handleDesvincularTelegram}
                        disabled={unlinkingTg}
                        className="text-xs font-semibold text-rose-600 hover:underline bg-transparent border-0 cursor-pointer p-0 disabled:opacity-50"
                      >
                        {unlinkingTg ? "Desvinculando..." : "Desvincular"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <a
                    href={`https://t.me/PasteleriaAhumadaBot?start=u_${user?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sm transition-all text-decoration-none"
                  >
                    <div>
                      <div className="font-bold text-xs">Vincular Telegram (una sola vez)</div>
                      <div className="text-[10px] text-sky-100">
                        Conectá el bot a tu cuenta para recibir alertas automáticas
                      </div>
                    </div>
                    <span className="text-[11px] bg-white text-blue-700 px-2.5 py-1 rounded-lg font-bold shrink-0">
                      Vincular ↗
                    </span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── Sección 2: Configuración del Taller (solo Admin) ── */}
          {isAdmin && (
            <section className="pt-4 border-t border-slate-200">
              <ConfiguracionTab />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
