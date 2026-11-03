import React from "react";
import Link from "next/link";

interface SidebarNavProps {
  currentPath: string;
  isAdmin?: boolean;
  wizardStep?: {
    currentStep: 1 | 2 | 3;
    isFixedRecipe?: boolean;
    onSelectStep?: (step: 1 | 2 | 3) => void;
  };
}

export function SidebarNav({ currentPath, isAdmin, wizardStep }: SidebarNavProps) {
  const isCatalogo = currentPath === "/";
  const isMisPedidos = currentPath.startsWith("/mis-pedidos");
  const isAdminPath = currentPath.startsWith("/admin");
  const isPedido = currentPath.startsWith("/pedido");

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-[#1e293b] border-r border-slate-700/80 px-4 py-6 min-h-[calc(100vh-60px)] shadow-lg select-none">
      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">
        Navegación
      </span>

      <nav className="flex flex-col gap-2 w-full">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
            isCatalogo
              ? "bg-pink-500/15 text-[#fc79bd] font-semibold border border-pink-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Catálogo</span>
        </Link>

        <Link
          href="/mis-pedidos"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
            isMisPedidos
              ? "bg-pink-500/15 text-[#fc79bd] font-semibold border border-pink-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium"
          }`}
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
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
              isAdminPath
                ? "bg-pink-500/15 text-[#fc79bd] font-semibold border border-pink-500/30"
                : "text-slate-300 hover:text-[#fc79bd] hover:bg-pink-500/10 font-medium"
            }`}
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

      {/* Sección opcional: Pasos del Pedido (Wizard) en navegación vertical */}
      {wizardStep && (
        <div className="mt-6 pt-5 border-t border-slate-700/80">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-3 block">
            Paso del Pedido
          </span>

          <div className="flex flex-col gap-2 relative">
            <button
              type="button"
              onClick={() => wizardStep.onSelectStep?.(1)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left transition-colors border-0 cursor-pointer ${
                wizardStep.currentStep === 1
                  ? "bg-pink-500/20 text-[#fc79bd] font-bold"
                  : wizardStep.currentStep > 1
                  ? "bg-slate-800/60 text-emerald-400 font-medium"
                  : "bg-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  wizardStep.currentStep === 1
                    ? "bg-[#fc79bd] text-slate-900"
                    : wizardStep.currentStep > 1
                    ? "bg-emerald-500 text-slate-900"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {wizardStep.currentStep > 1 ? "✓" : "1"}
              </div>
              <span>Fecha y Peso</span>
            </button>

            {!wizardStep.isFixedRecipe && (
              <button
                type="button"
                onClick={() => wizardStep.onSelectStep?.(2)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left transition-colors border-0 cursor-pointer ${
                  wizardStep.currentStep === 2
                    ? "bg-pink-500/20 text-[#fc79bd] font-bold"
                    : wizardStep.currentStep > 2
                    ? "bg-slate-800/60 text-emerald-400 font-medium"
                    : "bg-transparent text-slate-400 hover:text-slate-300"
                }`}
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    wizardStep.currentStep === 2
                      ? "bg-[#fc79bd] text-slate-900"
                      : wizardStep.currentStep > 2
                      ? "bg-emerald-500 text-slate-900"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {wizardStep.currentStep > 2 ? "✓" : "2"}
                </div>
                <span>Sabores</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => wizardStep.onSelectStep?.(3)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left transition-colors border-0 cursor-pointer ${
                wizardStep.currentStep === 3
                  ? "bg-pink-500/20 text-[#fc79bd] font-bold"
                  : "bg-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  wizardStep.currentStep === 3
                    ? "bg-[#fc79bd] text-slate-900"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {wizardStep.isFixedRecipe ? "2" : "3"}
              </div>
              <span>Confirmación</span>
            </button>
          </div>
        </div>
      )}

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
  );
}

