"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getTodasLasTortas,
  updateTortaActivo,
  updateTorta,
  createTorta,
  deleteTorta,
  getInsumosIdsPorTorta,
  setInsumoCompatibilidad,
  uploadTortaImagen,
  getInsumos,
  createInsumo,
  uploadInsumoImagen,
  updateInsumo,
  TortaDB,
  InsumoDB,
  TipoInsumo,
} from "@/lib/services/catalogo";

const INSUMO_CATEGORIES: { label: string; key: TipoInsumo; emoji: string }[] = [
  { label: "Bizcochuelos", key: "bizcochuelo", emoji: "🍰" },
  { label: "Rellenos", key: "relleno", emoji: "🍯" },
  { label: "Coberturas", key: "cobertura", emoji: "🧁" },
  { label: "Toppings", key: "topping", emoji: "🍓" },
];

export function CatalogoTab() {
  const router = useRouter();
  const [tortas, setTortas] = useState<TortaDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Navegación: lista de tortas (Mockup 2.3) vs Editor de Torta (Mockup 2.4)
  const [selectedTorta, setSelectedTorta] = useState<TortaDB | null>(null);
  const [isCreatingTorta, setIsCreatingTorta] = useState<boolean>(false);

  // Formulario de edición/creación de Torta (Mockup 2.4)
  const [editNombre, setEditNombre] = useState<string>("");
  const [editPrecioKg, setEditPrecioKg] = useState<string>("18000");
  const [editDescripcion, setEditDescripcion] = useState<string>("");
  const [editTipo, setEditTipo] = useState<"personalizable" | "receta_fija">("personalizable");
  const [editImagenUrl, setEditImagenUrl] = useState<string>("");
  const [editImagenFile, setEditImagenFile] = useState<File | null>(null);
  const [editImagenPreview, setEditImagenPreview] = useState<string | null>(null);
  const [savingTorta, setSavingTorta] = useState<boolean>(false);
  const [deletingTortaId, setDeletingTortaId] = useState<string | null>(null);
  const [tortaToDelete, setTortaToDelete] = useState<TortaDB | null>(null);

  // Insumos compatibles y tabs (Mockup 2.4)
  const [allInsumos, setAllInsumos] = useState<InsumoDB[]>([]);
  const [compatibleIds, setCompatibleIds] = useState<Set<string>>(new Set());
  const [activeInsumoTab, setActiveInsumoTab] = useState<number>(0);

  // Modal para agregar nuevo insumo desde el editor
  const [isModalInsumoOpen, setIsModalInsumoOpen] = useState<boolean>(false);
  const [nuevoInsumoNombre, setNuevoInsumoNombre] = useState<string>("");
  const [nuevoInsumoTipo, setNuevoInsumoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [nuevoInsumoRecargo, setNuevoInsumoRecargo] = useState<string>("0");
  const [nuevoInsumoFile, setNuevoInsumoFile] = useState<File | null>(null);
  const [nuevoInsumoPreview, setNuevoInsumoPreview] = useState<string | null>(null);
  const [guardandoInsumo, setGuardandoInsumo] = useState<boolean>(false);

  // Modal para editar insumo existente
  const [editingInsumo, setEditingInsumo] = useState<InsumoDB | null>(null);
  const [editInsumoNombre, setEditInsumoNombre] = useState<string>("");
  const [editInsumoTipo, setEditInsumoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [editInsumoRecargo, setEditInsumoRecargo] = useState<string>("0");
  const [editInsumoFile, setEditInsumoFile] = useState<File | null>(null);
  const [editInsumoPreview, setEditInsumoPreview] = useState<string | null>(null);
  const [guardandoEditInsumo, setGuardandoEditInsumo] = useState<boolean>(false);
  const editInsumoFileInputRef = useRef<HTMLInputElement>(null);

  const tortaFileInputRef = useRef<HTMLInputElement>(null);
  const insumoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [tortasData, insumosData] = await Promise.all([
        getTodasLasTortas(),
        getInsumos(),
      ]);
      setTortas(tortasData);
      setAllInsumos(insumosData);
    } catch (err) {
      console.error("Error al cargar catálogo de tortas e insumos:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Eliminar Torta de Supabase ──
  const handleConfirmDeleteTorta = async () => {
    if (!tortaToDelete) return;
    const id = tortaToDelete.id;
    setDeletingTortaId(id);
    try {
      await deleteTorta(id);
      setTortas((prev) => prev.filter((t) => t.id !== id));
      setTortaToDelete(null);
    } catch (err) {
      console.error("Error al eliminar torta:", err);
      alert("Ocurrió un error al eliminar la torta.");
    } finally {
      setDeletingTortaId(null);
    }
  };

  // ── Switch de visibilidad rápida de Torta en Mockup 2.3 ──
  const handleToggleTortaActivo = async (id: string, currentActive: boolean) => {
    const nextStatus = !currentActive;
    setTortas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: nextStatus } : t))
    );

    try {
      await updateTortaActivo(id, nextStatus);
    } catch (err) {
      console.error("Error al actualizar estado activo de torta:", err);
      setTortas((prev) =>
        prev.map((t) => (t.id === id ? { ...t, activo: currentActive } : t))
      );
    }
  };

  // ── Navegar al editor de Torta existente (/admin/catalogo/[id]) ──
  const handleSelectTortaForEdit = (torta: TortaDB) => {
    router.push(`/admin/catalogo/${torta.id}`);
  };

  // ── Navegar al creador de Nueva Torta (/admin/catalogo/nueva) ──
  const handleStartCreateTorta = () => {
    router.push("/admin/catalogo/nueva");
  };

  // ── Volver a la lista de Tortas ──
  const handleBackToList = () => {
    setSelectedTorta(null);
    setIsCreatingTorta(false);
    setEditImagenFile(null);
    setEditImagenPreview(null);
  };

  // ── Subir/Cambiar Foto de Torta ──
  const handleTortaImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImagenFile(file);
      setEditImagenPreview(URL.createObjectURL(file));
    }
  };

  // ── Alternar compatibilidad de un insumo para la torta activa ──
  const handleToggleCompatibilidad = async (insumoId: string) => {
    const nextSet = new Set(compatibleIds);
    const isNowCompatible = !nextSet.has(insumoId);

    if (isNowCompatible) {
      nextSet.add(insumoId);
    } else {
      nextSet.delete(insumoId);
    }
    setCompatibleIds(nextSet);

    if (selectedTorta) {
      try {
        await setInsumoCompatibilidad(selectedTorta.id, insumoId, isNowCompatible);
      } catch (err) {
        console.error("Error al actualizar compatibilidad de insumo:", err);
      }
    }
  };

  // ── Guardar Cambios o Crear Torta (Mockup 2.4 Botón "Guardar") ──
  const handleSaveTorta = async () => {
    if (!editNombre.trim()) {
      alert("Por favor ingresa un nombre para la torta.");
      return;
    }

    const precio = Number(editPrecioKg) || 18000;
    setSavingTorta(true);

    try {
      let finalImageUrl = editImagenUrl;
      if (editImagenFile) {
        finalImageUrl = await uploadTortaImagen(editImagenFile);
      }

      if (isCreatingTorta) {
        const nueva = await createTorta({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim(),
          precio_base_kg: precio,
          tipo: editTipo,
          imagen_url: finalImageUrl,
          activo: true,
        });

        // Guardar relaciones de compatibilidad
        await Promise.all(
          Array.from(compatibleIds).map((insId) =>
            setInsumoCompatibilidad(nueva.id, insId, true)
          )
        );

        setTortas((prev) => [...prev, nueva]);
      } else if (selectedTorta) {
        const updated = await updateTorta(selectedTorta.id, {
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim(),
          precio_base_kg: precio,
          tipo: editTipo,
          imagen_url: finalImageUrl,
        });

        setTortas((prev) =>
          prev.map((t) => (t.id === selectedTorta.id ? updated : t))
        );
      }

      handleBackToList();
    } catch (err) {
      console.error("Error al guardar la torta:", err);
      alert("Ocurrió un error al guardar la torta en Supabase.");
    } finally {
      setSavingTorta(false);
    }
  };

  // ── Crear nuevo insumo desde el editor ──
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

      if (selectedTorta) {
        await setInsumoCompatibilidad(selectedTorta.id, created.id, true);
      }

      setNuevoInsumoNombre("");
      setNuevoInsumoRecargo("0");
      setNuevoInsumoFile(null);
      setNuevoInsumoPreview(null);
      setIsModalInsumoOpen(false);
    } catch (err) {
      console.error("Error al crear insumo:", err);
      alert("Error al registrar insumo.");
    } finally {
      setGuardandoInsumo(false);
    }
  };

  const handleInsumoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNuevoInsumoFile(file);
      setNuevoInsumoPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenEditInsumo = (insumo: InsumoDB) => {
    setEditingInsumo(insumo);
    setEditInsumoNombre(insumo.nombre);
    setEditInsumoTipo(insumo.tipo);
    setEditInsumoRecargo(insumo.recargo_extra.toString());
    setEditInsumoFile(null);
    setEditInsumoPreview(insumo.imagen_url || null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditInsumoFile(file);
      setEditInsumoPreview(URL.createObjectURL(file));
    }
  };

  const handleGuardarEditInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsumo || !editInsumoNombre.trim()) return;

    setGuardandoEditInsumo(true);
    try {
      let finalImageUrl = editInsumoPreview;
      if (editInsumoFile) {
        finalImageUrl = await uploadInsumoImagen(editInsumoFile);
      }

      const updated = await updateInsumo(editingInsumo.id, {
        nombre: editInsumoNombre.trim(),
        tipo: editInsumoTipo,
        recargo_extra: Number(editInsumoRecargo) || 0,
        imagen_url: finalImageUrl,
      });

      setAllInsumos((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
      );

      setEditingInsumo(null);
    } catch (err) {
      console.error("Error al actualizar insumo:", err);
      alert("Error al actualizar el insumo.");
    } finally {
      setGuardandoEditInsumo(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER: VISTA 2.4 - CONFIGURACIÓN DE TORTA E INSUMOS COMPATIBLES
  // ════════════════════════════════════════════════════════════════
  if (selectedTorta || isCreatingTorta) {
    const currentTabKey = INSUMO_CATEGORIES[activeInsumoTab].key;
    const categoryInsumos = allInsumos.filter((i) => i.tipo === currentTabKey);

    return (
      <div className="flex flex-col w-full animate-in fade-in duration-200 pb-12">
        {/* Subheader con botón Volver y Guardar */}
        <div className="px-[16px] pt-[12px] pb-[10px] flex items-center justify-between border-b border-slate-200/80 bg-white sticky top-[56px] z-30 shadow-2xs">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Volver</span>
          </button>

          <span className="font-bold text-slate-800 text-xs truncate max-w-[170px]">
            {isCreatingTorta ? "Nueva Torta" : editNombre || "Configurar Torta"}
          </span>

          <button
            type="button"
            onClick={handleSaveTorta}
            disabled={savingTorta}
            className="border border-[#a43073] text-[#a43073] bg-[#fdf2f8] hover:bg-[#fce7f3] active:scale-95 transition-all font-bold text-xs px-3.5 py-1 rounded-full cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {savingTorta ? "Guardando..." : "Guardar"}
          </button>
        </div>

        <div className="px-[16px] pt-[14px] space-y-[16px]">
          {/* ── CARD 1: Datos Básicos (Mockup 2.4) ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-[16px] shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-[12px]">Datos Básicos</h3>

            <div className="flex gap-[14px] mb-[12px]">
              {/* Imagen y botón Cambiar */}
              <div className="w-[100px] shrink-0 flex flex-col items-center">
                <div className="size-[100px] rounded-[10px] overflow-hidden bg-slate-100 border border-slate-200 relative">
                  <img
                    src={editImagenPreview || editImagenUrl || "/tortas/torta-tematica.jpg"}
                    alt={editNombre || "Torta"}
                    className="size-full object-cover"
                  />
                </div>
                <input
                  ref={tortaFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTortaImageChange}
                  className="hidden"
                  id="foto-torta-input"
                />
                <button
                  type="button"
                  onClick={() => tortaFileInputRef.current?.click()}
                  className="w-full mt-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-white text-[11px] font-semibold rounded-[6px] border-0 cursor-pointer shadow-2xs transition-colors"
                >
                  Cambiar
                </button>
              </div>

              {/* Nombre y Precio por Kg */}
              <div className="flex-1 min-w-0 space-y-[10px]">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Nombre de la Torta
                  </label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    placeholder="ej. Torta Temática / Celebración"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-[8px] text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Precio por Kg ($ ARS)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      value={editPrecioKg}
                      onChange={(e) => setEditPrecioKg(e.target.value)}
                      placeholder="18000"
                      className="w-full pl-6 pr-2.5 py-1.5 border border-slate-200 rounded-[8px] text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Tipo de Receta
                  </label>
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as "personalizable" | "receta_fija")}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-[8px] text-xs font-medium text-slate-700 focus:outline-none focus:border-pink-500 bg-white"
                  >
                    <option value="personalizable">Personalizable (Receta abierta)</option>
                    <option value="receta_fija">Receta Fija (Tradicional)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Descripción
              </label>
              <textarea
                rows={2}
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                placeholder="Diseñada especialmente para tu celebración..."
                className="w-full px-2.5 py-2 border border-slate-200 rounded-[8px] text-xs text-slate-800 focus:outline-none focus:border-pink-500 bg-white resize-none"
              />
            </div>
          </div>

          {/* ── CARD 2: Insumos Compatibles (Mockup 2.4) ── */}
          <div className="bg-white rounded-[14px] border border-[#e2e8f0] p-[16px] shadow-xs">
            <div className="flex items-center justify-between mb-[12px]">
              <div>
                <h3 className="font-bold text-slate-900 text-sm m-0">Insumos Compatibles</h3>
                <span className="text-[11px] text-slate-400">
                  Activa qué opciones admite este modelo
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNuevoInsumoTipo(currentTabKey);
                  setIsModalInsumoOpen(true);
                }}
                className="bg-[#1e293b] hover:bg-[#334155] rounded-full px-3 py-1.5 flex items-center gap-1.5 cursor-pointer border-0 shadow-2xs transition-colors text-white"
              >
                <span className="font-bold text-xs leading-none">+</span>
                <span className="font-semibold text-white text-[11px]">Nuevo Insumo</span>
              </button>
            </div>

            {/* Pestañas de categorías de insumos */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-[12px] pb-1">
              {INSUMO_CATEGORIES.map((tab, idx) => {
                const count = allInsumos.filter((i) => i.tipo === tab.key).length;
                const isActive = idx === activeInsumoTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveInsumoTab(idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-[#1e293b] text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`ml-1 text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Listado de insumos de la categoría con switches de compatibilidad */}
            <div className="space-y-[8px]">
              {categoryInsumos.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No hay insumos registrados en esta categoría.
                </div>
              ) : (
                categoryInsumos.map((insumo) => {
                  const isCompatible = compatibleIds.has(insumo.id);
                  return (
                    <div
                      key={insumo.id}
                      className={`rounded-[10px] border p-2.5 flex items-center justify-between gap-3 transition-colors ${
                        isCompatible
                          ? "bg-white border-slate-200 shadow-2xs"
                          : "bg-slate-50/60 border-slate-200/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-[36px] rounded-[8px] bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                          {insumo.imagen_url ? (
                            <img
                              src={insumo.imagen_url}
                              alt={insumo.nombre}
                              className="size-full object-cover"
                            />
                          ) : (
                            INSUMO_CATEGORIES[activeInsumoTab].emoji
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 text-xs block truncate">
                            {insumo.nombre}
                          </span>
                          <span
                            className={`text-[10px] font-medium ${
                              insumo.recargo_extra > 0 ? "text-purple-600" : "text-emerald-600"
                            }`}
                          >
                            {insumo.recargo_extra > 0
                              ? `+$${insumo.recargo_extra.toLocaleString("es-AR")}`
                              : "Sin costo extra"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botón para editar insumo */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditInsumo(insumo)}
                          className="size-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer border border-slate-200"
                          title="Editar precio, nombre o foto"
                        >
                          ✏️
                        </button>

                        {/* Switch de compatibilidad */}
                        <button
                          type="button"
                          onClick={() => handleToggleCompatibilidad(insumo.id)}
                          className={`w-[36px] h-[20px] rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                            isCompatible ? "bg-[#10B981]" : "bg-[#cbd5e1]"
                          }`}
                          aria-label={`Alternar compatibilidad de ${insumo.nombre}`}
                        >
                          <div
                            className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow-xs transition-transform ${
                              isCompatible ? "right-[2px]" : "left-[2px]"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Modal Nuevo Insumo ── */}
        {isModalInsumoOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Agregar Nuevo Insumo
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                El nuevo ingrediente quedará disponible para asignar a tortas modelo.
              </p>

              <form onSubmit={handleCrearNuevoInsumo} className="space-y-3.5">
                {/* Selector de Foto del Insumo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Foto del Insumo (Opcional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                      {nuevoInsumoPreview ? (
                        <img
                          src={nuevoInsumoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl opacity-60">📷</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={insumoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleInsumoFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => insumoFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 block w-full mb-1 cursor-pointer"
                      >
                        {nuevoInsumoPreview ? "Cambiar foto" : "Subir foto"}
                      </button>
                      {nuevoInsumoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setNuevoInsumoFile(null);
                            setNuevoInsumoPreview(null);
                          }}
                          className="text-[11px] text-red-500 hover:underline block cursor-pointer"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoría / Tipo
                  </label>
                  <select
                    value={nuevoInsumoTipo}
                    onChange={(e) => setNuevoInsumoTipo(e.target.value as TipoInsumo)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="bizcochuelo">🍰 Bizcochuelo (Masa)</option>
                    <option value="relleno">🍯 Relleno</option>
                    <option value="cobertura">🧁 Cobertura</option>
                    <option value="topping">🍓 Topping / Decoración</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre del Insumo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Frutos Rojos, Ganache 70%..."
                    value={nuevoInsumoNombre}
                    onChange={(e) => setNuevoInsumoNombre(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
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
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Coloca 0 si no tiene costo adicional.
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalInsumoOpen(false);
                      setNuevoInsumoFile(null);
                      setNuevoInsumoPreview(null);
                    }}
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

        {/* ── Modal Editar Insumo ── */}
        {editingInsumo && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Editar Insumo
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Modificá el precio extra, categoría, nombre o foto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInsumo(null)}
                  className="size-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarEditInsumo} className="space-y-3.5">
                {/* Selector de Foto del Insumo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Foto del Insumo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                      {editInsumoPreview ? (
                        <img
                          src={editInsumoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl opacity-60">📷</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={editInsumoFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => editInsumoFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 block w-full mb-1 cursor-pointer"
                      >
                        {editInsumoPreview ? "Cambiar foto" : "Subir foto"}
                      </button>
                      {editInsumoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditInsumoFile(null);
                            setEditInsumoPreview(null);
                          }}
                          className="text-[11px] text-red-500 hover:underline block cursor-pointer"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoría / Tipo
                  </label>
                  <select
                    value={editInsumoTipo}
                    onChange={(e) => setEditInsumoTipo(e.target.value as TipoInsumo)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="bizcochuelo">🍰 Bizcochuelo (Masa)</option>
                    <option value="relleno">🍯 Relleno</option>
                    <option value="cobertura">🧁 Cobertura</option>
                    <option value="topping">🍓 Topping / Decoración</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nombre del Insumo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Frutos Rojos, Ganache 70%..."
                    value={editInsumoNombre}
                    onChange={(e) => setEditInsumoNombre(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Recargo Extra ($ ARS)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={editInsumoRecargo}
                      onChange={(e) => setEditInsumoRecargo(e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Coloca 0 si no tiene costo adicional.
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingInsumo(null)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoEditInsumo || !editInsumoNombre.trim()}
                    className="flex-1 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {guardandoEditInsumo ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER: VISTA 2.3 - TABLERO CATÁLOGO DE TORTAS (admin_catalogo_v2.png)
  // ════════════════════════════════════════════════════════════════
  const activasCount = tortas.filter((t) => t.activo).length;

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-200 pb-12">
      {/* ── Header: Gestión de Productos & + Nueva Torta ── */}
      <div className="px-[16px] pt-[14px] flex items-center justify-between mb-[10px]">
        <div>
          <div className="font-semibold text-[#a43073] text-[11px] tracking-[0.5px] uppercase mb-[2px]">
            GESTIÓN DE PRODUCTOS
          </div>
          <div className="font-bold text-[#0f172a] text-[20px] leading-tight">
            Catálogo de Tortas
          </div>
          <div className="text-[12px] text-[#64748b]">
            {tortas.length} tortas publicadas
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartCreateTorta}
          className="bg-[#1e293b] hover:bg-[#334155] rounded-full px-[14px] py-[8px] flex items-center gap-[6px] cursor-pointer border-0 shadow-sm transition-colors text-white shrink-0"
        >
          <span className="font-bold text-base leading-none">+</span>
          <span className="font-semibold text-white text-[12px]">Nueva Torta</span>
        </button>
      </div>

      {/* ── Subheader Pill: Todas las tortas / X activas ── */}
      <div className="px-[16px] mb-[14px]">
        <div className="bg-white rounded-[10px] border border-[#e2e8f0] px-[14px] py-[8px] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-[8px]">
            <div className="size-[8px] rounded-full bg-[#10B981]" />
            <span className="text-[12px] font-medium text-slate-700">Todas las tortas</span>
          </div>
          <span className="text-[11px] font-semibold text-[#a43073] bg-[#fdf2f8] border border-[#fbcfe8] px-[10px] py-[2px] rounded-full">
            {activasCount} activas
          </span>
        </div>
      </div>

      {/* ── Grilla Responsiva de Tortas (2 col mobile, 3 tablet, 4 desktop) ── */}
      <div className="px-4 md:px-0">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Cargando catálogo de tortas...</span>
          </div>
        ) : tortas.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200 p-6">
            <p className="font-medium text-slate-700 mb-1">Aún no hay tortas publicadas</p>
            <p className="text-xs text-slate-400 mb-4">Haz clic en "+ Nueva Torta" para publicar la primera.</p>
            <button
              onClick={handleStartCreateTorta}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              + Nueva Torta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-4 mb-16">
            {tortas.map((torta) => (
              <div
                key={torta.id}
                className={`bg-white rounded-[12px] border border-[#e2e8f0] p-[10px] shadow-[0px_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between transition-all ${
                  !torta.activo ? "opacity-60 bg-slate-50/60" : ""
                }`}
              >
                <div>
                  <div className="w-full aspect-square rounded-[8px] overflow-hidden bg-slate-100 border border-slate-200 mb-[8px] relative flex items-center justify-center">
                    {torta.imagen_url ? (
                      <img
                        src={torta.imagen_url}
                        alt={torta.nombre}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-2 text-center">
                        <span className="text-2xl mb-1">🎂</span>
                        <span className="text-[10px] text-slate-400 font-medium">Sin foto</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-[#0f172a] text-[13px] leading-snug line-clamp-2 min-h-[34px] mb-[4px]">
                    {torta.nombre}
                  </h4>
                  <div className="mb-[6px]">
                    <span
                      className={`inline-block text-[10px] font-semibold px-[8px] py-[2px] rounded-full ${
                        torta.tipo === "personalizable"
                          ? "bg-[#fdf2f8] text-[#a43073] border border-[#fbcfe8]"
                          : "bg-[#fffbeb] text-[#92400e] border border-[#fef3c7]"
                      }`}
                    >
                      {torta.tipo === "personalizable" ? "Personalizable" : "Receta Fija"}
                    </span>
                  </div>
                  <div className="font-bold text-[#0f172a] text-[13px] mb-[10px]">
                    ${Number(torta.precio_base_kg).toLocaleString("es-AR")}{" "}
                    <span className="text-[11px] font-normal text-slate-500">/ kg</span>
                  </div>
                </div>

                {/* Acciones: Editar, Eliminar y Switch activo */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectTortaForEdit(torta)}
                      className="bg-[#fdf2f8] hover:bg-[#fce7f3] text-[#a43073] border border-[#fbcfe8] rounded-lg px-2 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Editar torta"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTortaToDelete(torta)}
                      className="size-7 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                      title="Eliminar torta del catálogo"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleTortaActivo(torta.id, torta.activo)}
                    style={{ width: 38, height: 22, minWidth: 38 }}
                    className={`rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                      torta.activo ? "bg-[#10B981]" : "bg-[#cbd5e1]"
                    }`}
                    aria-label={`Alternar visibilidad de ${torta.nombre}`}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        top: 2,
                        left: torta.activo ? "calc(100% - 20px)" : 2,
                        position: "absolute",
                      }}
                      className="rounded-full bg-white shadow-xs transition-all duration-200"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Confirmación para Eliminar Torta ── */}
      {tortaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="size-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              ¿Eliminar "{tortaToDelete.nombre}"?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              Esta torta se borrará de forma permanente del catálogo y de la base de datos de Supabase.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTortaToDelete(null)}
                disabled={Boolean(deletingTortaId)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTorta}
                disabled={Boolean(deletingTortaId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl border-0 cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deletingTortaId ? "Eliminando..." : "Eliminar Torta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
