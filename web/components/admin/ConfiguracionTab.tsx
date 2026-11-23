"use client";

import React, { useEffect, useState } from "react";
import {
  DEFAULT_TALLER_CONFIG,
  getTallerConfig,
  TallerConfig,
  updateTallerConfig,
} from "@/lib/services/configuracion";

export function ConfiguracionTab() {
  const [form, setForm] = useState<TallerConfig>(DEFAULT_TALLER_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getTallerConfig();
      setForm(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.cbu.trim() || !form.alias.trim() || !form.titular.trim()) {
      setFeedback({
        type: "err",
        text: "Completá CBU/CVU, Alias y Titular para que los clientes puedan transferir.",
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await updateTallerConfig(form);
      setForm(saved);
      setFeedback({
        type: "ok",
        text: "Configuración guardada. Ya se refleja en Mis Pedidos y en las notificaciones.",
      });
    } catch {
      setFeedback({
        type: "err",
        text: "No se pudo guardar la configuración. Verificá tu conexión o permisos.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
        <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Cargando configuración del taller...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="pt-2 pb-24 flex flex-col gap-5 w-full animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 m-0">Configuración del Taller</h2>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            Editá los datos bancarios para transferencias y la información de retiro para tus clientes.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-pink-700 text-white text-xs font-bold border-0 cursor-pointer transition-colors shadow-xs disabled:opacity-50 shrink-0"
        >
          {saving ? "Guardando..." : "Guardar Configuración"}
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold border ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Card 1: Datos Bancarios */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">Datos Bancarios (Pago Único)</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Se muestran en Mis Pedidos para que el cliente realice la transferencia.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Titular de la cuenta
            </label>
            <input
              type="text"
              value={form.titular}
              onChange={(e) => setForm({ ...form, titular: e.target.value })}
              placeholder="Ej: Yonatan Ahumada"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Alias
            </label>
            <input
              type="text"
              value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })}
              placeholder="Ej: pasteleria.taller"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              CBU / CVU
            </label>
            <input
              type="text"
              value={form.cbu}
              onChange={(e) => setForm({ ...form, cbu: e.target.value })}
              placeholder="22 dígitos"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Card 2: Contacto y Retiro */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 m-0">Contacto y Retiro en Taller</h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Información incluida en avisos de pedido listo y consultas.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              WhatsApp del taller
            </label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="Ej: +54 9 385 453-4214"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dirección de retiro
            </label>
            <input
              type="text"
              value={form.direccion_retiro}
              onChange={(e) => setForm({ ...form, direccion_retiro: e.target.value })}
              placeholder="Ej: Av. Belgrano 1234, Santiago del Estero"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Horarios de entrega / retiro
            </label>
            <input
              type="text"
              value={form.horario_retiro}
              onChange={(e) => setForm({ ...form, horario_retiro: e.target.value })}
              placeholder="Ej: Lunes a Sábados de 10:00 a 13:00 y 17:00 a 20:00 hs"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
