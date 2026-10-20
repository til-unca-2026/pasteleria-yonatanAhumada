"use client";

import React from "react";

interface HeaderMisPedidosProps {
  onBack: () => void;
  title?: string;
  userInitial?: string;
}

export function HeaderMisPedidos({
  onBack,
  title = "Mis Pedidos",
  userInitial = "A",
}: HeaderMisPedidosProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#1e293b] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12)]">
      <div className="h-[56px] max-w-md mx-auto flex items-center px-[16px] gap-[12px] justify-between">
        <button
          onClick={onBack}
          className="bg-[#334155] hover:bg-[#475569] transition-colors rounded-full size-[32px] flex items-center justify-center border-0 cursor-pointer shrink-0"
          aria-label="Volver al inicio"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M8 11L3.5 6.5L8 2"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span className="flex-1 text-center font-semibold text-white text-[15px] tracking-[0.1px]">
          {title}
        </span>

        {/* User Avatar */}
        <div className="size-[32px] rounded-full bg-gradient-to-br from-[#f472b6] to-[#a43073] flex items-center justify-center shrink-0 border-2 border-[rgba(255,255,255,0.15)] shadow-sm">
          <span className="font-bold text-white text-[13px] leading-none">{userInitial}</span>
        </div>
      </div>
    </header>
  );
}
