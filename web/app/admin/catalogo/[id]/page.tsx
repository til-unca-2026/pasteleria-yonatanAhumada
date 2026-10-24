"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getTortaPorId,
  updateTorta,
  createTorta,
  getInsumosIdsPorTorta,
  setInsumoCompatibilidad,
  uploadTortaImagen,
  getInsumos,
  createInsumo,
  uploadInsumoImagen,
  TortaDB,
  InsumoDB,
  TipoInsumo,
} from "@/lib/services/catalogo";
import { getRecepcionAbierta, updateRecepcionAbierta } from "@/lib/services/cupos";

const INSUMO_CATEGORIES: { label: string; key: TipoInsumo; emoji: string }[] = [
  { label: "Bizcochuelos", key: "bizcochuelo", emoji: "🍰" },
  { label: "Rellenos", key: "relleno", emoji: "🍯" },
  { label: "Coberturas", key: "cobertura", emoji: "🧁" },
];

export default function ConfigurarTortaPage() {
  const router = useRouter();
  const params = useParams();
  const tortaIdParam = params?.id as string;
  const isNueva = tortaIdParam === "nueva";

  const supabase = createClient();
  const [loading, setLoading] = useState<boolean>(true);
  const [isReceptionOpen, setIsReceptionOpen] = useState<boolean>(true);

  // Datos de la Torta
  const [torta, setTorta] = useState<TortaDB | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [precioKg, setPrecioKg] = useState<string>("18000");
  const [descripcion, setDescripcion] = useState<string>("");
  const [tipo, setTipo] = useState<"personalizable" | "receta_fija">("personalizable");
  const [imagenUrl, setImagenUrl] = useState<string>("/tortas/torta-tematica.jpg");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Insumos y Compatibilidades (Mockup 2.4)
  const [allInsumos, setAllInsumos] = useState<InsumoDB[]>([]);
  const [compatibleIds, setCompatibleIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

  // Modal para "+ Nuevo Insumo"
  const [isModalInsumoOpen, setIsModalInsumoOpen] = useState<boolean>(false);
  const [nuevoInsumoNombre, setNuevoInsumoNombre] = useState<string>("");
  const [nuevoInsumoTipo, setNuevoInsumoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [nuevoInsumoRecargo, setNuevoInsumoRecargo] = useState<string>("0");
  const [nuevoInsumoFile, setNuevoInsumoFile] = useState<File | null>(null);
  const [guardandoInsumo, setGuardandoInsumo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Verificar admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login?next=/admin");
          return;
        }

        const { data: adminRecord } = await supabase
          .from("admins")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!adminRecord) {
          router.replace("/");
          return;
        }

        // 2. Cargar estado de recepción de pedidos
        getRecepcionAbierta().then(setIsReceptionOpen);

        // 3. Cargar todos los insumos disponibles
        const insumosList = await getInsumos();
        setAllInsumos(insumosList);

        // 4. Si es edición, cargar datos de la torta y compatibilidades
        if (!isNueva && tortaIdParam) {
          const t = await getTortaPorId(tortaIdParam);
          if (t) {
            setTorta(t);
            setNombre(t.nombre);
            setPrecioKg(t.precio_base_kg.toString());
            setDescripcion(t.descripcion || "");
            setTipo(t.tipo);
            setImagenUrl(t.imagen_url || "/tortas/torta-tematica.jpg");
            setImagenPreview(t.imagen_url || null);

            const compIds = await getInsumosIdsPorTorta(t.id);
            if (compIds.length > 0) {
              setCompatibleIds(new Set(compIds));
            } else {
              setCompatibleIds(new Set(insumosList.map((i) => i.id)));
            }
          }
        } else {
          // Si es nueva, preseleccionar todos los insumos
          setCompatibleIds(new Set(insumosList.map((i) => i.id)));
        }
      } catch (err) {
        console.error("Error al cargar configuración de torta:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isNueva, tortaIdParam, router, supabase]);

  // Selección automática de primer insumo de la pestaña activa para el panel destacado
  useEffect(() => {
    const currentCategory = INSUMO_CATEGORIES[activeTab].key;
    const firstOfCategory = allInsumos.find((i) => i.tipo === currentCategory);
    if (firstOfCategory) {
      setSelectedInsumoId(firstOfCategory.id);
    }
  }, [activeTab, allInsumos]);

  // Toggle de recepción de pedidos en footer
  const handleToggleReception = async () => {
    const nextVal = !isReceptionOpen;
    setIsReceptionOpen(nextVal);
    try {
      await updateRecepcionAbierta(nextVal);
    } catch (err) {
      console.error("Error al actualizar recepción de pedidos:", err);
      setIsReceptionOpen(!nextVal);
    }
  };

  // Cambiar foto de torta
  const handleTortaImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  // Alternar compatibilidad de un insumo
  const handleToggleCompatibilidad = async (insumoId: string) => {
    const nextSet = new Set(compatibleIds);
    const isNowCompatible = !nextSet.has(insumoId);

    if (isNowCompatible) {
      nextSet.add(insumoId);
    } else {
      nextSet.delete(insumoId);
    }
    setCompatibleIds(nextSet);

    if (torta) {
      try {
        await setInsumoCompatibilidad(torta.id, insumoId, isNowCompatible);
      } catch (err) {
        console.error("Error al actualizar compatibilidad de insumo:", err);
      }
    }
  };

  // Guardar Cambios en Torta (Botón "Guardar" de cabecera)
  const handleGuardar = async () => {
    if (!nombre.trim()) {
      alert("Por favor ingresa un nombre para la torta.");
      return;
    }

    const precio = Number(precioKg) || 18000;
    setSaving(true);

    try {
      let finalImageUrl = imagenUrl;
      if (imagenFile) {
        finalImageUrl = await uploadTortaImagen(imagenFile);
      }

      if (isNueva) {
        const nueva = await createTorta({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio_base_kg: precio,
          tipo,
          imagen_url: finalImageUrl,
          activo: true,
        });

        // Guardar relaciones de compatibilidad
        await Promise.all(
          Array.from(compatibleIds).map((insId) =>
            setInsumoCompatibilidad(nueva.id, insId, true)
          )
        );
      } else if (torta) {
        await updateTorta(torta.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio_base_kg: precio,
          tipo,
          imagen_url: finalImageUrl,
        });
      }

      router.push("/admin");
    } catch (err) {
      console.error("Error al guardar la torta:", err);
      alert("Ocurrió un error al guardar la torta en Supabase.");
    } finally {
      setSaving(false);
    }
  };

  // Crear nuevo insumo desde modal
  const handleCrearNuevoInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoInsumoNombre.trim()) return;

    setGuardandoInsumo(true);
    try {
      let imgUrl: string | null = null;
      if (nuevoInsumoFile) {
        imgUrl = await uploadInsumoImagen(nuevoInsumoFile);
      }

      const created = await createInsumo({
        nombre: nuevoInsumoNombre.trim(),
        tipo: nuevoInsumoTipo,
        recargo_extra: Number(nuevoInsumoRecargo) || 0,
        activo: true,
        imagen_url: imgUrl,
      });

      setAllInsumos((prev) => [...prev, created]);
      setCompatibleIds((prev) => new Set(prev).add(created.id));
      setSelectedInsumoId(created.id);

      if (torta) {
        await setInsumoCompatibilidad(torta.id, created.id, true);
      }

      setNuevoInsumoNombre("");
      setNuevoInsumoRecargo("0");
      setNuevoInsumoFile(null);
      setIsModalInsumoOpen(false);
    } catch (err) {
      console.error("Error al crear insumo:", err);
      alert("Error al registrar insumo.");
    } finally {
      setGuardandoInsumo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium tracking-wide">Cargando configuración de torta...</span>
      </div>
    );
  }

  const currentCategoryKey = INSUMO_CATEGORIES[activeTab].key;
  const categoryInsumos = allInsumos.filter((i) => i.tipo === currentCategoryKey);
  const featuredInsumo =
    categoryInsumos.find((i) => i.id === selectedInsumoId) || categoryInsumos[0];
  const isFeaturedCompatible = featuredInsumo
    ? compatibleIds.has(featuredInsumo.id)
    : false;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-[#0f172a] relative">
      {/* ── Top Header Oscuro con Volver y Guardar (Mockup 2.4) ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#1e293b] shadow-md">
        <div className="h-[56px] max-w-md mx-auto flex items-center px-[16px] justify-between">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1 text-white bg-transparent border-0 cursor-pointer text-xs font-semibold hover:text-pink-300 transition-colors p-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Volver</span>
          </button>

          <span className="font-bold text-white text-[15px] truncate max-w-[200px]">
            {isNueva ? "Nueva Torta" : "Configuración de Torta"}
          </span>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="border-[1.5px] border-[#fc79bd] text-[#fc79bd] bg-transparent hover:bg-[#fc79bd]/15 active:scale-95 transition-all font-bold text-xs px-4 py-1 rounded-full cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </header>

      {/* ── Main Container (Mockup 2.4 - admin_catalogo_id.png) ── */}
      <main className="flex-1 w-full max-w-md mx-auto pt-[68px] pb-[124px] px-4 space-y-5">
        {/* ── SECCIÓN 1: Datos Básicos ── */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-2 px-0.5">Datos Básicos</h2>
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs">
            <div className="flex gap-3 mb-3">
              {/* Foto con botón "Cambiar" directamente acoplado */}
              <div className="w-[108px] shrink-0 flex flex-col">
                <div className="w-[108px] h-[92px] rounded-t-xl overflow-hidden bg-slate-100 border border-slate-200 border-b-0 relative">
                  <img
                    src={imagenPreview || imagenUrl || "/tortas/torta-tematica.jpg"}
                    alt={nombre || "Torta"}
                    className="size-full object-cover"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTortaImageChange}
                  className="hidden"
                  id="foto-torta-change"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-semibold rounded-b-xl border border-[#1e293b] cursor-pointer shadow-xs transition-colors text-center"
                >
                  Cambiar
                </button>
              </div>

              {/* Campos: Nombre y Precio por Kg */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre de la Torta
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Torta Temática / Celebración"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 bg-white shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Precio por Kg
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      value={precioKg}
                      onChange={(e) => setPrecioKg(e.target.value)}
                      placeholder="18000"
                      className="w-full pl-6 pr-12 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 bg-white shadow-2xs"
                    />
                    <span className="absolute right-3 text-xs text-slate-400 font-medium">/ kg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campo: Descripción */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Descripción
              </label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Diseñada especialmente para tu celebración."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-pink-500 bg-white resize-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Insumos Compatibles (Mockup 2.4) ── */}
        <div>
          {/* Header con botón "+ Nuevo Insumo" */}
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-base font-bold text-slate-800 m-0">Insumos Compatibles</h2>
            <button
              type="button"
              onClick={() => {
                setNuevoInsumoTipo(currentCategoryKey);
                setIsModalInsumoOpen(true);
              }}
              className="bg-[#1e293b] hover:bg-[#334155] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer border-0 shadow-xs transition-colors text-white"
            >
              <span className="font-bold text-xs leading-none">+</span>
              <span className="font-semibold text-white text-xs">Nuevo Insumo</span>
            </button>
          </div>

          {/* Selector modular de pestañas (Bizcochuelos, Rellenos, Coberturas) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-1.5 pb-0.5">
            {INSUMO_CATEGORIES.map((tab, idx) => {
              const count = allInsumos.filter((i) => i.tipo === tab.key).length;
              const isActive = idx === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shadow-xs ${
                    isActive
                      ? "bg-[#1e293b] text-white"
                      : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[11px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Indicador de scroll horizontal (como en mockup) */}
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-3 opacity-60">
            <span className="text-[8px]">◀</span>
            <div className="w-24 h-1 bg-slate-300 rounded-full" />
            <span className="text-[8px]">▶</span>
          </div>

          {/* Item destacado con interruptor switch */}
          {featuredInsumo ? (
            <div className="rounded-2xl border border-slate-200/90 p-3 mb-3 bg-white flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-[54px] rounded-xl bg-amber-50/50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                  {featuredInsumo.imagen_url ? (
                    <img
                      src={featuredInsumo.imagen_url}
                      alt={featuredInsumo.nombre}
                      className="size-full object-cover"
                    />
                  ) : (
                    INSUMO_CATEGORIES[activeTab].emoji
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 text-sm block truncate capitalize">
                    {featuredInsumo.nombre}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      featuredInsumo.recargo_extra > 0 ? "text-purple-600" : "text-emerald-600"
                    }`}
                  >
                    {featuredInsumo.recargo_extra > 0
                      ? `+$${featuredInsumo.recargo_extra.toLocaleString("es-AR")} recargo`
                      : "Sin costo extra"}
                  </span>
                </div>
              </div>

              {/* Conmutador individual de compatibilidad */}
              <button
                type="button"
                onClick={() => handleToggleCompatibilidad(featuredInsumo.id)}
                className={`w-[44px] h-[24px] rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                  isFeaturedCompatible ? "bg-[#10B981]" : "bg-slate-300"
                }`}
                aria-label={`Alternar compatibilidad de ${featuredInsumo.nombre}`}
              >
                <div
                  className={`absolute top-[2px] size-[20px] rounded-full bg-white shadow-xs transition-transform ${
                    isFeaturedCompatible ? "right-[2px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
          ) : null}

          {/* Grilla 3 columnas de selección rápida con dot semáforo */}
          <div className="grid grid-cols-3 gap-2.5">
            {categoryInsumos.map((insumo) => {
              const isCompatible = compatibleIds.has(insumo.id);
              const isSelected = insumo.id === selectedInsumoId;

              return (
                <div
                  key={insumo.id}
                  onClick={() => setSelectedInsumoId(insumo.id)}
                  className={`relative rounded-xl border p-2 flex flex-col items-center text-center cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? "border-pink-500 bg-pink-50/20 ring-2 ring-pink-400"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Dot indicador de compatibilidad: Verde si compatible, Gris si no */}
                  <div
                    className={`absolute top-2 right-2 size-3.5 rounded-full border-2 border-white shadow-xs ${
                      isCompatible ? "bg-[#10B981]" : "bg-slate-400"
                    }`}
                    title={isCompatible ? "Compatible con este modelo" : "No compatible"}
                  />

                  <div className="size-[64px] rounded-lg bg-slate-100 overflow-hidden mb-1.5 flex items-center justify-center text-lg">
                    {insumo.imagen_url ? (
                      <img
                        src={insumo.imagen_url}
                        alt={insumo.nombre}
                        className="size-full object-cover"
                      />
                    ) : (
                      INSUMO_CATEGORIES[activeTab].emoji
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-700 line-clamp-1 truncate w-full capitalize">
                    {insumo.nombre}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── Modal "+ Nuevo Insumo" ── */}
      {isModalInsumoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Agregar Nuevo Insumo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              El ingrediente se registrará y quedará disponible para esta torta.
            </p>

            <form onSubmit={handleCrearNuevoInsumo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Categoría / Tipo
                </label>
                <select
                  value={nuevoInsumoTipo}
                  onChange={(e) => setNuevoInsumoTipo(e.target.value as TipoInsumo)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-pink-500"
                >
                  <option value="bizcochuelo">Bizcochuelo (Masa)</option>
                  <option value="relleno">Relleno</option>
                  <option value="cobertura">Cobertura</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre del Insumo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Ganache 70%, Frutos Rojos..."
                  value={nuevoInsumoNombre}
                  onChange={(e) => setNuevoInsumoNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Recargo Extra ($ ARS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={nuevoInsumoRecargo}
                  onChange={(e) => setNuevoInsumoRecargo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Coloca 0 si no tiene recargo extra.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalInsumoOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoInsumo}
                  className="flex-1 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {guardandoInsumo ? "Guardando..." : "Crear Insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bottom Bar con Master Switch y Navegación (Mockup 2.4) ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0] shadow-md pb-safe">
        <div className="max-w-md mx-auto">
          {/* Fila superior: Conmutador de recepción */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div
                className={`size-2.5 rounded-full ${
                  isReceptionOpen ? "bg-[#10B981]" : "bg-slate-400"
                }`}
              />
              <span className="font-medium text-slate-500 text-xs">
                Recepción de pedidos:{" "}
                <strong className={isReceptionOpen ? "text-[#059669]" : "text-slate-600"}>
                  {isReceptionOpen ? "ABIERTO" : "CERRADO"}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleReception}
              className={`w-[44px] h-[24px] rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                isReceptionOpen ? "bg-[#10B981]" : "bg-slate-300"
              }`}
              aria-label="Alternar recepción de pedidos"
            >
              <div
                className={`absolute top-[2px] size-[20px] rounded-full bg-white shadow-xs transition-transform ${
                  isReceptionOpen ? "right-[2px]" : "left-[2px]"
                }`}
              />
            </button>
          </div>

          {/* Navegación por pestañas */}
          <nav className="h-[52px] flex items-center justify-around px-[8px]">
            <Link
              href="/admin?tab=pedidos"
              className="flex flex-col items-center gap-[2px] px-[12px] py-[4px] rounded-[8px] text-decoration-none text-[#94a3b8] hover:text-[#0f172a]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="#94a3b8" strokeWidth="1.3" />
                <path d="M7 6H13M7 10H13M7 14H10" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] leading-[12px]">Pedidos</span>
            </Link>

            <Link
              href="/admin?tab=cupos"
              className="flex flex-col items-center gap-[2px] px-[12px] py-[4px] rounded-[8px] text-decoration-none text-[#94a3b8] hover:text-[#0f172a]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="3" width="16" height="15" rx="2" stroke="#94a3b8" strokeWidth="1.3" />
                <path d="M6 2V4M14 2V4M2 8H18" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] leading-[12px]">Cupos</span>
            </Link>

            <Link
              href="/admin?tab=catalogo"
              className="flex flex-col items-center gap-[2px] px-[12px] py-[4px] rounded-[8px] text-decoration-none font-semibold text-[#0f172a]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="#0f172a" strokeWidth="1.3" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="#0f172a" strokeWidth="1.3" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="#0f172a" strokeWidth="1.3" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="#0f172a" strokeWidth="1.3" />
              </svg>
              <span className="text-[10px] leading-[12px]">Catálogo</span>
            </Link>

            <Link
              href="/admin?tab=metricas"
              className="flex flex-col items-center gap-[2px] px-[12px] py-[4px] rounded-[8px] text-decoration-none text-[#94a3b8] hover:text-[#0f172a]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 14V10M8 14V7M12 14V9M16 14V5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] leading-[12px]">Métricas</span>
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
