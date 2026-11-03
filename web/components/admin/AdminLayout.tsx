"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Tab = "pedidos" | "cupos" | "catalogo" | "metricas";

interface AdminLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onBack: () => void;
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  isReceptionOpen?: boolean;
  onToggleReception?: () => void;
}

export function AdminLayout({
  activeTab,
  onTabChange,
  onBack,
  title,
  subtitle,
  rightAction,
  children,
  isReceptionOpen = true,
  onToggleReception,
}: AdminLayoutProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "pedidos", label: "Pedidos" },
    { key: "cupos", label: "Cupos" },
    { key: "catalogo", label: "Catálogo" },
    { key: "metricas", label: "Métricas" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-[#0f172a] relative">
      {/* ── Top Header ── */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-[#1e293b] border-b border-slate-800 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12)]">
        <div className="h-[56px] md:h-[60px] w-full flex items-center px-4 md:px-8 justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="bg-transparent border-0 cursor-pointer flex items-center justify-center rounded-full size-[32px] text-white hover:bg-slate-700/50 transition-colors"
              title="Ir a la tienda como cliente"
              aria-label="Volver"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 16L7 10L13 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <span className="font-bold text-[#fc79bd] text-[15px] md:text-[17px] tracking-[1px] uppercase leading-none">
                PASTELERÍA
              </span>
              <span className="text-slate-500 hidden md:inline">|</span>
              <span className="hidden md:inline font-semibold text-white text-sm">
                Panel de Taller
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle de recepción en header para desktop */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <div className={`rounded-full size-2 ${isReceptionOpen ? "bg-[#10B981]" : "bg-[#ef4444]"}`} />
              <span className="text-xs text-slate-300 font-medium">
                Recepción: <strong className={isReceptionOpen ? "text-[#10B981]" : "text-[#ef4444]"}>{isReceptionOpen ? "ABIERTO" : "CERRADO"}</strong>
              </span>
              <button
                type="button"
                onClick={onToggleReception}
                className={`w-9 h-5 rounded-full relative cursor-pointer border-0 transition-colors ml-1 p-0 ${
                  isReceptionOpen ? "bg-[#10B981]" : "bg-slate-600"
                }`}
                title="Alternar recepción"
              >
                <div
                  className={`absolute top-[2px] bg-white rounded-full size-4 shadow-xs transition-transform ${
                    isReceptionOpen ? "right-[2px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>

            {rightAction ?? (
              <button
                onClick={() => setShowLogoutModal(true)}
                title="Cerrar sesión de admin"
                className="bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800/80 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-200 hover:text-rose-200 transition-all text-xs font-semibold shadow-2xs"
                aria-label="Cerrar sesión"
              >
                <span>Salir</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Modal de Confirmación de Cierre de Sesión ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-center">
            <div className="size-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Cerrar sesión de Administrador?
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Saldrás del panel de control para que puedas navegar y probar el flujo completo como un cliente normal.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl border-0 cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loggingOut ? "Cerrando..." : "Cerrar Sesión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout Principal: Sidebar de Taller + Contenido Expandido ── */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Sidebar exclusivo para Admin en Desktop */}
        <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-[#1e293b] border-r border-slate-700/80 px-4 py-6 min-h-[calc(100vh-60px)] shadow-lg select-none">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">
            Módulos del Taller
          </span>

          <nav className="flex flex-col gap-2 w-full">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left border-0 cursor-pointer ${
                    active
                      ? "bg-pink-500/15 text-[#fc79bd] font-semibold border border-pink-500/30"
                      : "bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium"
                  }`}
                >
                  <TabIcon tab={tab.key} active={active} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-700/80 flex flex-col gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-pink-300 transition-colors bg-transparent border-0 cursor-pointer p-0 px-2 text-left"
            >
              <span>← Volver a la Tienda</span>
            </button>
          </div>
        </aside>

        {/* ── Área de Trabajo Expandida en Desktop ── */}
        <main className="flex-1 w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto pt-4 md:pt-6 pb-[120px] md:pb-16 px-4 md:px-8 min-w-0">
          {children}
        </main>
      </div>

      {/* ── Fixed Bottom Bars (Solo Mobile) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0]">
        <div className="max-w-md mx-auto flex flex-col">
          {/* Reception status bar */}
          <div className="px-[16px] py-[8px] flex items-center justify-between border-b border-[#f1f5f9]">
            <div className="flex items-center gap-[6px]">
              <div
                className={`rounded-full size-[8px] ${
                  isReceptionOpen ? "bg-[#10B981]" : "bg-[#ef4444]"
                }`}
              />
              <span className="font-medium text-[#64748b] text-[12px]">
                Recepción de pedidos:{" "}
                <strong
                  className={`font-semibold ${
                    isReceptionOpen ? "text-[#10B981]" : "text-[#ef4444]"
                  }`}
                >
                  {isReceptionOpen ? "ABIERTO" : "CERRADO"}
                </strong>
              </span>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={onToggleReception}
              className={`w-[44px] h-[24px] rounded-full relative cursor-pointer border-0 transition-colors p-0 ${
                isReceptionOpen ? "bg-[#10B981]" : "bg-[#cbd5e1]"
              }`}
              aria-label="Alternar recepción de pedidos"
            >
              <div
                className={`absolute top-[2px] bg-white rounded-full size-[20px] shadow-sm transition-transform ${
                  isReceptionOpen ? "right-[2px]" : "left-[2px]"
                }`}
              />
            </button>
          </div>

          {/* Bottom Tabs Nav */}
          <nav className="flex items-center justify-around px-[8px] py-[6px] pb-safe">
            {(["pedidos", "cupos", "catalogo", "metricas"] as Tab[]).map((tab) => {
              const active = activeTab === tab;
              const labels: Record<Tab, string> = {
                pedidos: "Pedidos",
                cupos: "Cupos",
                catalogo: "Catálogo",
                metricas: "Métricas",
              };
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`flex flex-col items-center gap-[3px] px-[12px] py-[4px] rounded-[8px] border-0 cursor-pointer bg-transparent transition-colors ${
                    active ? "text-[#0f172a]" : "text-[#94a3b8] hover:text-[#64748b]"
                  }`}
                >
                  <TabIcon tab={tab} active={active} />
                  <span
                    className={`text-[10px] leading-[12px] ${
                      active ? "font-semibold text-[#0f172a]" : "font-normal text-[#94a3b8]"
                    }`}
                  >
                    {labels[tab]}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? "#0f172a" : "#94a3b8";

  if (tab === "pedidos") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="16" rx="2" stroke={color} strokeWidth="1.3" />
        <path d="M7 6H13M7 10H13M7 14H10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (tab === "cupos") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="15" rx="2" stroke={color} strokeWidth="1.3" />
        <path d="M6 2V4M14 2V4M2 8H18" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (tab === "catalogo") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.3" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.3" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.3" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.3" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 14V10M8 14V7M12 14V9M16 14V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
