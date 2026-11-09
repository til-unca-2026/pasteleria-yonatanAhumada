import React from "react";
import { useRouter } from "next/navigation";

interface SuccessModalProps {
  isOpen: boolean;
  deliveryDate: string;
  selectedWeight: number;
  selectedPrice: number;
  pedidoId?: string | null;
  onClose: () => void;
}

export function SuccessModal({
  isOpen,
  deliveryDate,
  selectedWeight,
  selectedPrice,
  pedidoId,
  onClose,
}: SuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const formatCurrency = (val: number) => "$" + val.toLocaleString("es-AR");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#e2e8f0] flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-[18px] text-[#0f172a] font-bold mb-1">
          ¡Pedido Configurado!
        </h3>
        <p className="text-[13px] text-[#64748b] mb-4">
          Tu reserva para el{" "}
          <strong className="text-[#0f172a]">{deliveryDate}</strong> ({selectedWeight} kg)
          está lista. Para confirmarla, transfiere el total de{" "}
          <strong className="text-[#a43073]">{formatCurrency(selectedPrice)}</strong> y adjunta el comprobante en Mis Pedidos.
        </p>

        <div className="w-full p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-left mb-4 flex flex-col gap-1 text-[12px]">
          <div className="flex justify-between">
            <span className="text-[#64748b]">Total a Transferir:</span>
            <span className="font-bold text-[#0f172a]">
              {formatCurrency(selectedPrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748b]">Modalidad:</span>
            <span className="font-bold text-emerald-600">
              Pago Único (100%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748b]">Seguimiento:</span>
            <span className="font-medium text-[#0f172a]">Bot de Telegram</span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          {pedidoId && (
            <a
              href={`https://t.me/PasteleriaAhumadaBot?start=${pedidoId}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-colors shadow-xs text-decoration-none flex items-center justify-center gap-1.5"
            >
              <span>✈️ Recibir avisos en Telegram</span>
            </a>
          )}
          <button
            onClick={() => router.push(pedidoId ? `/mis-pedidos?id=${pedidoId}` : "/mis-pedidos")}
            className="w-full h-11 rounded-xl bg-[#1e293b] text-white font-semibold text-[13px] hover:bg-[#334155] transition-all cursor-pointer border-0 shadow-md"
            type="button"
          >
            Ver estado en Mis Pedidos
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-10 rounded-xl bg-[#f1f5f9] text-[#0f172a] font-semibold text-[12px] hover:bg-[#e2e8f0] transition-all cursor-pointer border-0"
            type="button"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
