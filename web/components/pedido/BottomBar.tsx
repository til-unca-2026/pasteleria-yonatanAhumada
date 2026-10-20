import React from "react";
import { StepNumber } from "./types";

interface BottomBarProps {
  currentStep: StepNumber;
  selectedPrice: number;
  loading?: boolean;
  nextLabel?: string;
  onNext: () => void;
}

export function BottomBar({
  currentStep,
  selectedPrice,
  loading = false,
  nextLabel,
  onNext,
}: BottomBarProps) {
  const formatCurrency = (val: number) => {
    return "$" + val.toLocaleString("es-AR");
  };

  if (currentStep === 3) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e2e8f0] shadow-[0px_-4px_8px_rgba(15,23,42,0.06)] px-[16px] pt-[12px] pb-[14px] pb-safe">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            disabled={loading}
            onClick={onNext}
            className="w-full bg-[#1e293b] rounded-[10px] h-[48px] flex items-center justify-center gap-[8px] cursor-pointer border-0 shadow-[0px_4px_10px_rgba(15,23,42,0.15)] active:scale-[0.98] transition-all hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2 text-white">
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold text-sm">Registrando pedido...</span>
              </div>
            ) : (
              <>
                <span className="font-semibold text-white text-[14px] tracking-[0.1px]">
                  Confirmar y Reservar Cupo
                </span>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7H12M12 7L8 3M12 7L8 11"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
          <p className="font-normal text-[#94a3b8] text-[11px] text-center mt-[6px] mb-0 leading-[15px]">
            Seguimiento automático directo a tu celular.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e2e8f0] shadow-[0px_-4px_8px_rgba(15,23,42,0.06)] px-[16px] pt-[13px] pb-[12px] pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-[4px]">
            <span className="font-normal text-[#64748b] text-[12px] leading-[16px]">
              Total a transferir:
            </span>
            <span className="font-bold text-[#0f172a] text-[18px] leading-[28px] tracking-[-0.45px]">
              {formatCurrency(selectedPrice)}
            </span>
          </div>
          <div className="flex items-center gap-[4px]">
            <span className="font-medium text-emerald-600 text-[11px] leading-[14px]">
              ✓ Pago único por transferencia
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="bg-[#1e293b] rounded-[8px] h-[40px] px-[20px] flex items-center gap-[6px] cursor-pointer border-0 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] hover:bg-[#334155] transition-colors"
        >
          <span className="font-medium text-white text-[14px] leading-[20px]">
            {nextLabel || "Siguiente Paso"}
          </span>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M2 5.5H9M9 5.5L6 2.5M9 5.5L6 8.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
