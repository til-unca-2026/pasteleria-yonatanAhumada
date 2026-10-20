import React from "react";
import { StepNumber } from "./types";

interface HeaderPedidoProps {
  currentStep: StepNumber;
  onBack: () => void;
}

export function HeaderPedido({ currentStep, onBack }: HeaderPedidoProps) {
  const stepLabels: Record<StepNumber, string> = {
    1: "Paso 1: Fecha y Peso",
    2: "Paso 2: Sabores",
    3: "Confirmar Pedido",
  };

  return (
    <header className="sticky top-0 w-full z-40 bg-[#1e293b] shadow-[0px_1px_4px_rgba(0,0,0,0.1)] border-b border-[#334155]/50">
      <div className="h-[48px] max-w-md mx-auto flex items-center justify-between px-[16px]">
        <button
          type="button"
          onClick={onBack}
          className="bg-[#334155] rounded-full size-[28px] flex items-center justify-center border-0 cursor-pointer shrink-0 hover:bg-[#475569] transition-colors"
          title="Volver"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M7.5 10.5L3 6L7.5 1.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {currentStep === 3 ? (
          <span className="font-semibold text-white text-[13px] tracking-[0.1px] text-center leading-tight">
            <span className="text-[#fc79bd]">PASTELERÍA</span>
            <span className="text-[#94a3b8] font-normal"> · </span>
            Confirmar Pedido
          </span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-[#f472b6] text-[10px] tracking-[0.5px] uppercase leading-[10px]">
              PASTELERÍA
            </span>
            <div className="flex items-baseline gap-[5px]">
              <span className="font-semibold text-white text-[13px] leading-[17px]">
                Armar Pedido
              </span>
              <span className="font-normal text-[#94a3b8] text-[10px]">
                · {stepLabels[currentStep]}
              </span>
            </div>
          </div>
        )}

        <div className="size-[28px] flex items-center justify-center">
          {currentStep !== 3 ? (
            <div className="bg-[#334155] rounded-full size-[28px] flex items-center justify-center shrink-0">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2" />
                <path d="M6 3.5V6L7.5 7.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="size-[28px]" />
          )}
        </div>
      </div>
    </header>
  );
}
