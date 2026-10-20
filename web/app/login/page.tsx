"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/";
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (nextParam === "/admin") {
          const { data: adminRecord } = await supabase
            .from("admins")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (adminRecord) {
            router.replace("/admin");
            return;
          } else {
            router.replace("/");
            return;
          }
        }
        router.replace(nextParam);
      }
    }
    checkSession();
  }, [router, supabase, nextParam]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const redirectTarget = nextParam.startsWith("/") ? nextParam : "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTarget)}`,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : error.message
        );
        setLoading(false);
        return;
      }

      if (data.user) {
        if (nextParam === "/admin") {
          const { data: adminRecord } = await supabase
            .from("admins")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();

          if (adminRecord) {
            router.replace("/admin");
          } else {
            router.replace("/");
          }
        } else {
          router.replace(nextParam);
        }
      }
    } else {
      // Modo Registro
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Logueado automáticamente tras el registro
        router.replace(nextParam);
      } else if (data.user) {
        setInfoMsg("¡Cuenta creada! Por favor revisa tu correo electrónico para confirmar tu registro.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Glow ambiental */}
      <div className="absolute bg-[#fc79bd]/15 blur-[90px] rounded-full size-[320px] top-[-80px] left-[-80px] pointer-events-none" />
      <div className="absolute bg-[#3b82f6]/15 blur-[90px] rounded-full size-[300px] bottom-[-80px] right-[-80px] pointer-events-none" />

      {/* Botón Volver */}
      <div className="w-full max-w-md mb-4 flex justify-start z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors text-decoration-none bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Volver a la tienda</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#1e293b] border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 relative">
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 bg-pink-500/10 border border-pink-500/20 text-[#fc79bd] rounded-full text-xs font-semibold tracking-wider uppercase mb-3">
            PASTELERÍA ARTESANAL
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {mode === "login"
              ? "Accede para seguir tus pedidos o administrar la pastelería"
              : "Regístrate para gestionar tus pedidos fácilmente"}
          </p>
        </div>

        {/* Selector de modo: Iniciar Sesión / Registro */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0 ${
              mode === "login"
                ? "bg-[#fc79bd] text-[#0f172a] shadow-xs"
                : "bg-transparent text-slate-400 hover:text-white"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0 ${
              mode === "register"
                ? "bg-[#fc79bd] text-[#0f172a] shadow-xs"
                : "bg-transparent text-slate-400 hover:text-white"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Botón de Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl border border-slate-600 bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="flex items-center my-5">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            o con email
          </span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Formulario Email / Contraseña */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-pink-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading
              ? "Procesando..."
              : mode === "login"
              ? "Ingresar"
              : "Crear mi Cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center text-slate-400">
          <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
