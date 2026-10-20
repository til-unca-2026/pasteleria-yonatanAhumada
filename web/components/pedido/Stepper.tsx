import React from "react";
import { StepNumber } from "./types";

interface StepperProps {
  currentStep: StepNumber;
  onSelectStep: (step: StepNumber) => void;
}

export function StepBadge({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-[5px]">
      {state === "done" ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.4" stroke="#10B981" strokeWidth="1.2" />
          <path
            d="M4 7L6 9L10 5"
            stroke="#10B981"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <div
          className={`rounded-full size-[16px] flex items-center justify-center ${
            state === "active" ? "bg-[#1e293b]" : "bg-[#f1f5f9]"
          }`}
        >
          <span
            className={`text-[10px] leading-none ${
              state === "active" ? "text-white font-bold" : "text-[#94a3b8] font-medium"
            }`}
          >
            {n}
          </span>
        </div>
      )}
      <span
        className={`text-[12px] ${
          state === "active" ? "font-bold text-[#0f172a]" : "font-normal text-[#94a3b8]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function Stepper({ currentStep, onSelectStep }: StepperProps) {
  return (
    <div className="w-full bg-white border-b border-[#e2e8f0] flex items-center justify-between px-[16px] py-[10px] max-w-md mx-auto">
      <button
        type="button"
        onClick={() => onSelectStep(1)}
        className="bg-transparent border-0 cursor-pointer p-0"
      >
        <StepBadge
          n={1}
          label="Fecha & Peso"
          state={currentStep > 1 ? "done" : currentStep === 1 ? "active" : "pending"}
        />
      </button>

      <span className="text-[#cbd5e1] text-[11px]">/</span>

      <button
        type="button"
        onClick={() => onSelectStep(2)}
        className="bg-transparent border-0 cursor-pointer p-0"
      >
        <StepBadge
          n={2}
          label="Sabores"
          state={currentStep > 2 ? "done" : currentStep === 2 ? "active" : "pending"}
        />
      </button>

      <span className="text-[#cbd5e1] text-[11px]">/</span>

      <button
        type="button"
        onClick={() => onSelectStep(3)}
        className="bg-transparent border-0 cursor-pointer p-0"
      >
        <StepBadge
          n={3}
          label="Confirmación"
          state={currentStep === 3 ? "active" : "pending"}
        />
      </button>
    </div>
  );
}
