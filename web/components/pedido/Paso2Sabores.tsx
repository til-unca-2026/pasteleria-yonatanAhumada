import React, { useState } from "react";
import { AccordionStep } from "./types";
import { InsumoDB } from "@/lib/services/catalogo";

export const MAX_RELLENOS = 2;

function CheckBadge() {
  return (
    <div className="absolute top-[4px] right-[4px] bg-[#1e293b] rounded-[4px] size-[16px] flex items-center justify-center z-10">
      <svg width="8" height="7" viewBox="0 0 9 7" fill="none">
        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function EmptyBadge() {
  return <div className="absolute top-[4px] right-[4px] bg-white/90 rounded-[4px] size-[16px] border border-[#cbd5e1] z-10" />;
}

function ConfirmBtn({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      type="button"
      className={`w-full rounded-[8px] border py-[9px] flex items-center justify-center gap-[6px] transition-all ${
        enabled
          ? "bg-[#1e293b] text-white border-[#1e293b] cursor-pointer hover:bg-[#334155]"
          : "bg-[#f8fafc] border-[#e2e8f0] text-[#94a3b8] opacity-50 cursor-not-allowed"
      }`}
    >
      <span className="font-semibold text-[11px]">{label}</span>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d="M2 5H8M5 2L8 5L5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Acordeon({
  n,
  title,
  subtitle,
  done,
  active,
  onOpen,
  badge,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  done: boolean;
  active: boolean;
  onOpen: () => void;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-[12px] overflow-hidden transition-all ${
        active
          ? "border-2 border-[#0f172a] shadow-[0px_2px_6px_rgba(0,0,0,0.07)]"
          : "border border-[rgba(226,232,240,0.9)] shadow-[0px_1px_2px_rgba(0,0,0,0.04)]"
      }`}
    >
      {/* Row header */}
      <button
        onClick={onOpen}
        type="button"
        className={`w-full flex items-center justify-between px-[12px] py-[12px] border-0 cursor-pointer text-left transition-colors ${
          active ? "bg-[rgba(248,250,252,0.8)] border-b border-[rgba(226,232,240,0.8)]" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-[10px]">
          {/* Step bubble */}
          {done ? (
            <div className="bg-[rgba(16,185,129,0.15)] rounded-full size-[24px] flex items-center justify-center shrink-0">
              <svg width="11" height="9" viewBox="0 0 12 10" fill="none">
                <path
                  d="M1 5L4.5 8.5L11 1"
                  stroke="#10B981"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <div
              className={`rounded-full flex items-center justify-center shrink-0 size-[24px] ${
                active ? "bg-[#1e293b]" : "bg-[#f1f5f9]"
              }`}
            >
              <span className={`font-bold text-[11px] leading-none ${active ? "text-white" : "text-[#64748b]"}`}>
                {n}
              </span>
            </div>
          )}
          {/* Labels */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-[6px]">
              <span className="font-bold text-[#0f172a] text-[12px] leading-[15px]">{title}</span>
              {done && <span className="font-normal text-[#10B981] text-[10px]">✓ Listo</span>}
            </div>
            <span className="font-normal text-[#64748b] text-[10px] leading-[13px]">{subtitle}</span>
          </div>
        </div>
        {/* Right side: badge or chevron */}
        {badge && !done ? (
          badge
        ) : (
          <div className="flex items-center gap-[3px] pl-[6px]">
            {done ? (
              <span className="font-semibold text-pink-600 text-[11px]">Cambiar</span>
            ) : (
              <span className="font-medium text-[#64748b] text-[11px]">{active ? "" : "Elegir"}</span>
            )}
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path
                d={active ? "M7 5L4 2L1 5" : "M1 1L4 4L7 1"}
                stroke={done ? "#db2777" : "#94a3b8"}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </button>
      {/* Expandable body */}
      {active && <div className="bg-white p-[10px]">{children}</div>}
    </div>
  );
}

export interface Paso2Props {
  insumos?: InsumoDB[];
  loadingInsumos?: boolean;
  selectedBase: string;
  onSelectBase: (baseId: string) => void;
  selectedFillings: string[];
  onToggleFilling: (fillingId: string) => void;
  selectedCoverage: string | null;
  onSelectCoverage: (coverageId: string) => void;
  selectedTopping?: string | null;
  onSelectTopping?: (toppingId: string) => void;
  activeAccordion: AccordionStep;
  setActiveAccordion: (step: AccordionStep) => void;
  doneAccordions: Set<AccordionStep>;
  onCompleteAccordion: (step: AccordionStep, next: AccordionStep) => void;
  onNext: () => void;
  isFixedRecipe?: boolean;
  tortaNombre?: string;
  tortaSlug?: string;
  onConfirmFixedRecipe?: () => void;
}

export function Paso2Sabores({
  insumos = [],
  loadingInsumos = false,
  selectedBase,
  onSelectBase,
  selectedFillings,
  onToggleFilling,
  selectedCoverage,
  onSelectCoverage,
  selectedTopping = null,
  onSelectTopping,
  activeAccordion,
  setActiveAccordion,
  doneAccordions,
  onCompleteAccordion,
  onNext,
  isFixedRecipe = false,
  tortaNombre,
  tortaSlug,
  onConfirmFixedRecipe,
}: Paso2Props) {
  if (isFixedRecipe) {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-[14px] border border-amber-200/80 shadow-[0px_2px_8px_rgba(245,158,11,0.08)] p-5 text-center">
          <div className="size-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl border border-amber-200">
            ✨
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2.5 py-0.5 rounded-full inline-block mb-2">
            Receta Tradicional de la Casa
          </span>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {tortaNombre || "Torta de Receta Clásica"}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto mb-4">
            Esta especialidad se prepara respetando la receta e insumos originales del taller. No requiere elección de capas o rellenos adicionales.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Elaborada artesanalmente en el día</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Materia prima de primera calidad</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Decoración fiel al modelo seleccionado</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onConfirmFixedRecipe || onNext}
            className="w-full bg-[#1e293b] hover:bg-[#334155] text-white py-3 px-4 rounded-[10px] font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Confirmar Receta y Continuar al Resumen</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const bases = insumos
    .filter((i) => i.tipo === "bizcochuelo")
    .sort((a, b) => {
      const aSel = a.id === selectedBase;
      const bSel = b.id === selectedBase;
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const rellenos = insumos
    .filter((i) => i.tipo === "relleno")
    .sort((a, b) => {
      const aSel = selectedFillings.includes(a.id);
      const bSel = selectedFillings.includes(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const coberturas = insumos
    .filter((i) => i.tipo === "cobertura")
    .sort((a, b) => {
      const aSel = a.id === selectedCoverage;
      const bSel = b.id === selectedCoverage;
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const toppings = insumos
    .filter((i) => i.tipo === "topping")
    .sort((a, b) => {
      const aSel = a.id === selectedTopping;
      const bSel = b.id === selectedTopping;
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const baseObj = bases.find((b) => b.id === selectedBase);
  const rellenosObjs = rellenos.filter((r) => selectedFillings.includes(r.id));
  const coberturaObj = coberturas.find((c) => c.id === selectedCoverage);
  const toppingObj = toppings.find((t) => t.id === selectedTopping);

  const rellenosOk = selectedFillings.length > 0;
  const coberturaOk = selectedCoverage !== null;
  const toppingOk = selectedTopping !== null || toppings.length === 0;

  // Insumos fijos (solo 1 opción disponible en el modelo, no personalizables)
  const fixedBase = bases.length === 1 ? bases[0] : null;
  const fixedRelleno = rellenos.length === 1 ? rellenos[0] : null;
  const fixedCobertura = coberturas.length === 1 ? coberturas[0] : null;
  const fixedTopping = toppings.length === 1 ? toppings[0] : null;

  // Grupos personalizables (más de 1 opción para elegir)
  const canCustomizeBases = bases.length > 1;
  const canCustomizeRellenos = rellenos.length > 1;
  const canCustomizeCoberturas = coberturas.length > 1;
  const canCustomizeToppings = toppings.length > 1;

  interface ActiveSectionConfig {
    key: "bizcochuelo" | "relleno" | "cobertura" | "topping";
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    isDone: boolean;
    canConfirm: boolean;
    renderContent: () => React.ReactNode;
  }

  const activeSections: ActiveSectionConfig[] = [];

  if (canCustomizeBases) {
    const sectionNum = activeSections.length + 1;
    activeSections.push({
      key: "bizcochuelo",
      title: "Bizcochuelo Base",
      subtitle: baseObj ? baseObj.nombre : "Elegí tu masa",
      isDone: doneAccordions.has(sectionNum as AccordionStep) && !!selectedBase,
      canConfirm: !!selectedBase,
      renderContent: () => (
        <div className="grid grid-cols-3 gap-[8px] mb-[8px]">
          {bases.map((b) => {
            const sel = selectedBase === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBase(b.id)}
                className={`rounded-[8px] p-[8px] flex flex-col items-start border cursor-pointer transition-all relative ${
                  sel
                    ? "border-2 border-[#1e293b] bg-slate-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="w-full h-[52px] rounded-[6px] mb-[6px] relative overflow-hidden bg-pink-50 flex items-center justify-center border border-slate-100">
                  {b.imagen_url ? (
                    <img src={b.imagen_url} alt={b.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[20px]">🍰</span>
                  )}
                  {sel ? <CheckBadge /> : <EmptyBadge />}
                </div>
                <span className="font-bold text-[#0f172a] text-[10px] leading-[13px] line-clamp-1">
                  {b.nombre}
                </span>
                {b.recargo_extra > 0 && (
                  <span className="font-semibold text-pink-600 text-[9px] mt-0.5">
                    +${b.recargo_extra.toLocaleString("es-AR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    });
  }

  const isFrutosRojos = tortaSlug === "torta-frutos-rojos";

  if (canCustomizeRellenos) {
    const sectionNum = activeSections.length + 1;
    activeSections.push({
      key: "relleno",
      title: "Rellenos Artesanales",
      subtitle:
        rellenosObjs.length > 0
          ? rellenosObjs.map((r) => r.nombre).join(" + ")
          : isFrutosRojos
          ? "Elegí tu relleno"
          : "Elegí hasta 2 sabores",
      badge: !isFrutosRojos ? (
        <div
          className={`rounded-full border px-[9px] py-[3px] flex items-center gap-[4px] ${
            selectedFillings.length > 0 ? "bg-[#fdf2f8] border-[#fbcfe8]" : "bg-[#f1f5f9] border-[#e2e8f0]"
          }`}
        >
          <div className={`rounded-full size-[6px] ${selectedFillings.length > 0 ? "bg-[#ec4899]" : "bg-[#94a3b8]"}`} />
          <span className={`font-semibold text-[10px] ${selectedFillings.length > 0 ? "text-[#be185d]" : "text-[#64748b]"}`}>
            {selectedFillings.length}/{MAX_RELLENOS}
          </span>
        </div>
      ) : undefined,
      isDone: doneAccordions.has(sectionNum as AccordionStep) && rellenosOk,
      canConfirm: rellenosOk,
      renderContent: () => (
        <div className={`grid ${rellenos.length <= 2 ? "grid-cols-2" : "grid-cols-3"} gap-[10px] mb-[8px]`}>
          {rellenos.map((r) => {
            const sel = selectedFillings.includes(r.id);
            const disabled = !sel && !isFrutosRojos && selectedFillings.length >= MAX_RELLENOS;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => !disabled && onToggleFilling(r.id)}
                disabled={disabled}
                className={`rounded-[10px] p-[10px] flex flex-col items-start border cursor-pointer transition-all relative ${
                  sel
                    ? "border-2 border-[#1e293b] bg-slate-50 shadow-sm"
                    : disabled
                    ? "border-slate-200 bg-slate-50/50 opacity-40 cursor-not-allowed"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="w-full h-[70px] rounded-[8px] mb-[8px] relative overflow-hidden bg-amber-50 flex items-center justify-center border border-slate-100">
                  {r.imagen_url ? (
                    <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[24px]">🍯</span>
                  )}
                  {sel ? <CheckBadge /> : <EmptyBadge />}
                </div>
                <span className="font-bold text-[#0f172a] text-[11px] leading-[14px] line-clamp-1 capitalize">
                  {r.nombre}
                </span>
                {r.recargo_extra > 0 && (
                  <span className="font-semibold text-pink-600 text-[9px] mt-0.5">
                    +${r.recargo_extra.toLocaleString("es-AR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    });
  }

  if (canCustomizeCoberturas) {
    const sectionNum = activeSections.length + 1;
    activeSections.push({
      key: "cobertura",
      title: "Cobertura Exterior",
      subtitle:
        coberturaObj
          ? coberturaObj.nombre
          : "Elegí la cobertura exterior",
      isDone: doneAccordions.has(sectionNum as AccordionStep) && coberturaOk,
      canConfirm: coberturaOk,
      renderContent: () => (
        <div className={`grid ${coberturas.length <= 2 ? "grid-cols-2" : "grid-cols-3"} gap-[10px] mb-[8px]`}>
          {coberturas.map((c) => {
            const sel = selectedCoverage === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCoverage(c.id)}
                className={`rounded-[10px] p-[10px] flex flex-col items-start border cursor-pointer transition-all relative ${
                  sel
                    ? "border-2 border-[#1e293b] bg-slate-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="w-full h-[70px] rounded-[8px] mb-[8px] relative overflow-hidden bg-purple-50 flex items-center justify-center border border-slate-100">
                  {c.imagen_url ? (
                    <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[24px]">🧁</span>
                  )}
                  {sel ? <CheckBadge /> : <EmptyBadge />}
                </div>
                <span className="font-bold text-[#0f172a] text-[11px] leading-[14px] line-clamp-1 capitalize">
                  {c.nombre}
                </span>
                {c.recargo_extra > 0 && (
                  <span className="font-semibold text-pink-600 text-[9px] mt-0.5">
                    +${c.recargo_extra.toLocaleString("es-AR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    });
  }

  if (canCustomizeToppings && onSelectTopping) {
    const sectionNum = activeSections.length + 1;
    activeSections.push({
      key: "topping",
      title: "Topping / Frutas",
      subtitle:
        toppingObj
          ? toppingObj.nombre
          : "Elegí el topping o fruta de terminación",
      isDone: doneAccordions.has(sectionNum as AccordionStep) && toppingOk,
      canConfirm: toppingOk,
      renderContent: () => (
        <div className={`grid ${toppings.length <= 2 ? "grid-cols-2" : "grid-cols-3"} gap-[10px] mb-[8px]`}>
          {toppings.map((t) => {
            const sel = selectedTopping === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTopping(t.id)}
                className={`rounded-[10px] p-[10px] flex flex-col items-start border cursor-pointer transition-all relative ${
                  sel
                    ? "border-2 border-[#1e293b] bg-slate-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="w-full h-[70px] rounded-[8px] mb-[8px] relative overflow-hidden bg-rose-50 flex items-center justify-center border border-slate-100">
                  {t.imagen_url ? (
                    <img src={t.imagen_url} alt={t.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[24px]">🍓</span>
                  )}
                  {sel ? <CheckBadge /> : <EmptyBadge />}
                </div>
                <span className="font-bold text-[#0f172a] text-[11px] leading-[14px] line-clamp-1 capitalize">
                  {t.nombre}
                </span>
                {t.recargo_extra > 0 && (
                  <span className="font-semibold text-pink-600 text-[9px] mt-0.5">
                    +${t.recargo_extra.toLocaleString("es-AR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    });
  }

  if (loadingInsumos) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs">Cargando catálogo de sabores...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] w-full animate-in fade-in duration-200">
      {/* Renderizado dinámico de los acordeones personalizables */}
      {activeSections.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-slate-200 p-6 text-center">
          <span className="text-2xl mb-2 block">🎂</span>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Receta sin opciones personalizables adicionales
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Este modelo se elabora con los insumos artesanales estandarizados del taller.
          </p>
          <ConfirmBtn
            label="Continuar al Resumen"
            enabled={true}
            onClick={onNext}
          />
        </div>
      ) : (
        activeSections.map((sec, idx) => {
          const stepNum = (idx + 1) as AccordionStep;
          const isLast = idx === activeSections.length - 1;
          const nextStepNum = (idx + 2) as AccordionStep;
          const nextTitle = !isLast ? activeSections[idx + 1].title : "";
          const canOpen = idx === 0 || doneAccordions.has(idx as AccordionStep);

          return (
            <Acordeon
              key={sec.key}
              n={idx + 1}
              title={`${idx + 1}. ${sec.title}`}
              subtitle={sec.subtitle}
              done={sec.isDone}
              active={activeAccordion === stepNum}
              onOpen={() => canOpen && setActiveAccordion(stepNum)}
              badge={sec.badge}
            >
              {sec.renderContent()}
              <ConfirmBtn
                label={
                  isLast
                    ? "Confirmar y Continuar a Resumen"
                    : `Confirmar y Continuar a ${nextTitle}`
                }
                enabled={sec.canConfirm}
                onClick={() => {
                  onCompleteAccordion(stepNum, nextStepNum);
                  if (isLast) {
                    onNext();
                  }
                }}
              />
            </Acordeon>
          );
        })
      )}
    </div>
  );
}

