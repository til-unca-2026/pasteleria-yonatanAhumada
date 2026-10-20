"use client";

import React, { useRef, useState } from "react";

interface ComprobanteUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  confirmed: boolean;
  comprobanteUrl?: string | null;
}

export function ComprobanteUploader({
  file,
  onFileChange,
  confirmed,
  comprobanteUrl,
}: ComprobanteUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileChange(f);
  };

  const isSent = confirmed || !!comprobanteUrl;

  return (
    <div className="px-[16px] py-[14px]">
      <span className="font-semibold text-[#0f172a] text-[12px] block mb-[8px]">
        Subir comprobante de transferencia
      </span>

      {isSent ? (
        <div className="rounded-[10px] border-2 border-[#10B981] bg-[#f0fdf4] p-[16px] flex flex-col items-center gap-[6px] animate-in fade-in duration-200">
          <div className="bg-[#10B981] rounded-full size-[36px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 9L7.5 12.5L14 5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-[#065f46] text-[13px]">
            ¡Comprobante enviado!
          </span>
          <span className="font-normal text-[#64748b] text-[11px] text-center">
            Tu pago está en revisión por el taller. Recibirás la confirmación de tu cupo por Telegram.
          </span>
          {comprobanteUrl && (
            <a
              href={comprobanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-700 font-semibold underline mt-1"
            >
              Ver comprobante adjunto
            </a>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`rounded-[10px] border-2 border-dashed p-[20px] flex flex-col items-center gap-[8px] cursor-pointer transition-all ${
            dragging
              ? "border-[#a43073] bg-[#fdf2f8]"
              : file
              ? "border-[#10B981] bg-[#f0fdf4]"
              : "border-[#cbd5e1] bg-[#f8fafc] hover:border-[#a43073] hover:bg-[#fdf2f8]"
          }`}
        >
          {file ? (
            <>
              <div className="bg-[#10B981] rounded-full size-[36px] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8L6.5 11.5L13 4"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-semibold text-[#065f46] text-[12px] text-center max-w-[240px] truncate">
                {file.name}
              </span>
              <span className="font-normal text-[#94a3b8] text-[10px]">Toca para cambiar</span>
            </>
          ) : (
            <>
              <div className="bg-[#f1f5f9] rounded-[10px] size-[44px] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 15V7M11 7L8 10M11 7L14 10"
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16C2.9 15.4 2 14.3 2 13C2 11.1 3.5 9.5 5.4 9.5C5.7 7.5 7.5 6 9.5 6C10.8 6 11.9 6.6 12.7 7.5"
                    stroke="#64748b"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 9.5C15.9 9.8 17.5 11.2 17.8 13C18.6 13.2 19.3 13.9 19.5 14.8"
                    stroke="#64748b"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="font-semibold text-[#334155] text-[12px] text-center">
                Subir comprobante de transferencia
              </span>
              <span className="font-normal text-[#94a3b8] text-[10px] text-center">
                JPG, PNG o PDF · Arrastrá o tocá para elegir
              </span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}
    </div>
  );
}
