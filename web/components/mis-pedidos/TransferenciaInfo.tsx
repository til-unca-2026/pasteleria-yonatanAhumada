"use client";

import React, { useState } from "react";

interface TransferenciaInfoProps {
  total: number;
  seña: number;
  cbu?: string;
  alias?: string;
  titular?: string;
}

export function TransferenciaInfo({
  total,
  seña,
  cbu = "0000003100012345678901",
  alias = "pasteleria.taller",
  titular = "Yonatan Ahumada",
}: TransferenciaInfoProps) {
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

  const copy = (text: string, which: "cbu" | "alias") => {
    navigator.clipboard.writeText(text);
    if (which === "cbu") {
      setCopiedCbu(true);
      setTimeout(() => setCopiedCbu(false), 2000);
    } else {
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    }
  };

  const formatCurrency = (val: number) => "$" + val.toLocaleString("es-AR");

  return (
    <div className="px-[16px] py-[12px] bg-[#f8fafc] border-b border-[#f1f5f9]">
      <div className="flex items-center justify-between mb-[10px]">
        <div>
          <span className="font-normal text-[#64748b] text-[11px] block">Monto Total a Transferir:</span>
          <strong className="font-bold text-[#0f172a] text-[17px]">{formatCurrency(total)}</strong>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
            ✓ 1 Solo Pago
          </span>
        </div>
      </div>

      {/* Titular */}
      <div className="bg-white rounded-[8px] border border-[#e2e8f0] px-[12px] py-[8px] flex items-center justify-between mb-[6px]">
        <div>
          <span className="font-medium text-[#94a3b8] text-[10px] tracking-[0.3px] uppercase block leading-none mb-[3px]">
            Titular de la cuenta
          </span>
          <span className="font-semibold text-[#0f172a] text-[12px]">
            {titular}
          </span>
        </div>
      </div>

      {/* CBU */}
      <div className="bg-white rounded-[8px] border border-[#e2e8f0] px-[12px] py-[9px] flex items-center justify-between mb-[6px]">
        <div>
          <span className="font-medium text-[#94a3b8] text-[10px] tracking-[0.3px] uppercase block leading-none mb-[3px]">
            CBU
          </span>
          <span className="font-semibold text-[#0f172a] text-[12px] tracking-[0.5px]">
            {cbu}
          </span>
        </div>
        <button
          type="button"
          onClick={() => copy(cbu, "cbu")}
          className="bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#e2e8f0] rounded-[6px] px-[10px] py-[5px] font-semibold text-[11px] text-[#0f172a] cursor-pointer transition-colors"
        >
          {copiedCbu ? "✓ Copiado" : "Copiar"}
        </button>
      </div>

      {/* Alias */}
      <div className="bg-white rounded-[8px] border border-[#e2e8f0] px-[12px] py-[9px] flex items-center justify-between">
        <div>
          <span className="font-medium text-[#94a3b8] text-[10px] tracking-[0.3px] uppercase block leading-none mb-[3px]">
            Alias
          </span>
          <span className="font-semibold text-[#0f172a] text-[13px]">{alias}</span>
        </div>
        <button
          type="button"
          onClick={() => copy(alias, "alias")}
          className="bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#e2e8f0] rounded-[6px] px-[10px] py-[5px] font-semibold text-[11px] text-[#0f172a] cursor-pointer transition-colors"
        >
          {copiedAlias ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
