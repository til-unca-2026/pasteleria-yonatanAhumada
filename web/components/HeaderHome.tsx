"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface HeaderUser {
  id: string;
  email?: string;
  name?: string;
}

interface HeaderHomeProps {
  user: HeaderUser | null;
  isAdmin: boolean;
}

export function HeaderHome({ user, isAdmin }: HeaderHomeProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setMenuOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const userInitial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split("@")[0] || "Usuario";

  return (
    <header className="shrink-0 bg-[#1e293b] border-b border-slate-800 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12)] z-30 relative w-full">
      <div className="h-[56px] md:h-[60px] w-full flex items-center justify-between px-4 md:px-8 relative">
        {/* ── LOGO / MARCA (Izquierda) ── */}
        <Link
          href="/"
          className="font-bold text-[#fc79bd] text-[15px] md:text-[17px] tracking-[1px] uppercase leading-none hover:opacity-90 transition-opacity text-decoration-none"
        >
          PASTELERÍA
        </Link>

        {/* ── ACCIONES (Derecha: Admin si corresponde + Usuario) ── */}
        <div className="flex items-center gap-2">
          {/* BOTÓN DE ADMIN (SOLO SI ES ADMIN) */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-[#fc79bd] transition-all text-xs font-semibold text-decoration-none shadow-xs"
              title="Panel de Administración"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Admin</span>
            </Link>
          )}

          {/* BOTÓN DE USUARIO */}
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer text-left"
                title="Menú de usuario"
                aria-label="Menú de usuario"
              >
                <div className="size-[28px] rounded-full bg-gradient-to-br from-[#f472b6] to-[#a43073] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {userInitial}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-300 mr-1 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold text-decoration-none shadow-2xs"
                title="Iniciar sesión"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Ingresar</span>
              </Link>
            )}

            {/* Menú flotante de usuario (alineado a la derecha) */}
            {menuOpen && user && (
              <div className="absolute top-[42px] right-0 w-[220px] bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-700/80 mb-1">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-pink-500/20 text-[#fc79bd] rounded text-[10px] font-semibold tracking-wide uppercase">
                      Admin
                    </span>
                  )}
                </div>

                <Link
                  href="/mis-pedidos"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors text-decoration-none"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span>Mis Pedidos</span>
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#fc79bd] hover:bg-pink-500/10 rounded-lg transition-colors text-decoration-none font-medium"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Panel de Administración</span>
                  </Link>
                )}

                <div className="border-t border-slate-700/80 my-1"></div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border-0 bg-transparent text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{loggingOut ? "Cerrando..." : "Cerrar Sesión"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
