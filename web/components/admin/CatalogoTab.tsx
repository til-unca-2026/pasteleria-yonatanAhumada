"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getInsumos,
  createInsumo,
  updateInsumoActivo,
  deleteInsumo,
  uploadInsumoImagen,
  getPrecioBaseKg,
  updatePrecioBaseKg,
  InsumoDB,
  TipoInsumo,
} from "@/lib/services/catalogo";

const CATEGORY_TABS: { label: string; key: TipoInsumo; emoji: string }[] = [
  { label: "Bizcochuelos", key: "bizcochuelo", emoji: "🍰" },
  { label: "Rellenos", key: "relleno", emoji: "🍯" },
  { label: "Coberturas", key: "cobertura", emoji: "🧁" },
];

export function CatalogoTab() {
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [items, setItems] = useState<InsumoDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Precio base por kilo (Tarifario)
  const [precioBaseKg, setPrecioBaseKg] = useState<number>(13000);
  const [isEditingPrecio, setIsEditingPrecio] = useState<boolean>(false);
  const [tempPrecioBase, setTempPrecioBase] = useState<string>("13000");
  const [guardandoPrecio, setGuardandoPrecio] = useState<boolean>(false);

  // Modal para nuevo insumo
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [nuevoNombre, setNuevoNombre] = useState<string>("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [nuevoRecargo, setNuevoRecargo] = useState<string>("0");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInsumos();
  }, []);

  async function loadInsumos() {
    setLoading(true);
    try {
      const [data, precio] = await Promise.all([getInsumos(), getPrecioBaseKg()]);
      setItems(data);
      setPrecioBaseKg(precio);
      setTempPrecioBase(precio.toString());
    } catch (err) {
      console.error("Error al cargar insumos o precio base:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleGuardarPrecioBase = async () => {
    const val = Number(tempPrecioBase);
    if (!val || val <= 0) {
      alert("Ingresa un precio válido mayor a 0.");
      return;
    }
    setGuardandoPrecio(true);
    try {
      await updatePrecioBaseKg(val);
      setPrecioBaseKg(val);
      setIsEditingPrecio(false);
    } catch (err) {
      console.error("Error actualizando precio base:", err);
      alert("Error al actualizar el precio base en Supabase.");
    } finally {
      setGuardandoPrecio(false);
    }
  };

  const toggleItemActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activo: nextStatus } : item))
    );

    try {
      await updateInsumoActivo(id, nextStatus);
    } catch (err) {
      console.error("Error al actualizar activo:", err);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, activo: currentStatus } : item))
      );
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar permanentemente "${nombre}"?`)) return;
    try {
      await deleteInsumo(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error al eliminar insumo:", err);
      alert("No se pudo eliminar el insumo.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setImagenFile(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImagenFile(null);
    setImagenPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setNuevoNombre("");
    setNuevoRecargo("0");
    setImagenFile(null);
    setImagenPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsModalOpen(false);
  };

  const handleCrearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    setGuardando(true);
    try {
      let imageUrl: string | null = null;
      if (imagenFile) {
        imageUrl = await uploadInsumoImagen(imagenFile);
      }

      const created = await createInsumo({
        nombre: nuevoNombre.trim(),
        tipo: nuevoTipo,
        recargo_extra: Number(nuevoRecargo) || 0,
        activo: true,
        imagen_url: imageUrl,
      });

      setItems((prev) => [...prev, created]);
      resetForm();
    } catch (err) {
      console.error("Error al crear insumo:", err);
      alert("Error al guardar en Supabase. Verifica que el bucket 'catalogo' exista.");
    } finally {
      setGuardando(false);
    }
  };

  const currentCategoryKey = CATEGORY_TABS[activeCategory].key;
  const filteredItems = items.filter((i) => i.tipo === currentCategoryKey);
  const activeCount = filteredItems.filter((i) => i.activo).length;

  const tabCounts = CATEGORY_TABS.map(
    (tab) => items.filter((item) => item.tipo === tab.key).length
  );

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-200">
      {/* ── Subtitle and Add Item Button ── */}
      <div className="px-[16px] pt-[14px] flex items-center justify-between mb-[14px]">
        <div>
          <div className="font-medium text-[#64748b] text-[11px] tracking-[0.5px] uppercase mb-[2px]">
            TALLER & INSUMOS
          </div>
          <div className="font-bold text-[#0f172a] text-[20px]">
            Catálogo y Tarifario
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setNuevoTipo(CATEGORY_TABS[activeCategory].key);
            setIsModalOpen(true);
          }}
          className="bg-[#1e293b] hover:bg-[#334155] rounded-full px-[14px] py-[7px] flex items-center gap-[6px] cursor-pointer border-0 shadow-sm transition-colors text-white"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-semibold text-white text-[12px]">Nuevo Ítem</span>
        </button>
      </div>

      {/* ── Tarjeta Precio Base por Kilo (Tarifario) ── */}
      <div className="px-[16px] mb-[16px]">
        <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[16px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-[12px]">
              <div className="bg-[#ffd8e7] rounded-[10px] size-[38px] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a43073" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-[8px]">
                  <span className="font-bold text-[#0f172a] text-[17px] leading-[22px]">
                    ${precioBaseKg.toLocaleString("es-AR")} / kg
                  </span>
                  <span className="bg-[#f1f5f9] text-[#475569] font-semibold text-[10px] px-[8px] py-[2px] rounded-full">
                    Base
                  </span>
                </div>
                <div className="font-normal text-[#64748b] text-[12px] mt-[2px]">
                  Aplica a todas las combinaciones estándar del cotizador
                </div>
              </div>
            </div>

            {isEditingPrecio ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  value={tempPrecioBase}
                  onChange={(e) => setTempPrecioBase(e.target.value)}
                  className="w-[85px] border border-slate-300 rounded-[8px] px-2 py-1 text-xs font-bold"
                  placeholder="13000"
                />
                <button
                  type="button"
                  onClick={handleGuardarPrecioBase}
                  disabled={guardandoPrecio}
                  className="bg-[#1e293b] hover:bg-[#334155] text-white px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold cursor-pointer border-0"
                >
                  {guardandoPrecio ? "..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPrecio(false)}
                  className="text-slate-400 hover:text-slate-600 px-1 py-1 text-xs cursor-pointer border-0 bg-transparent"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempPrecioBase(precioBaseKg.toString());
                  setIsEditingPrecio(true);
                }}
                className="flex items-center gap-[6px] border border-[#e2e8f0] rounded-[8px] px-[12px] py-[6px] bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="font-semibold text-[#0f172a] text-[12px]">Ajustar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-[8px] px-[16px] mb-[16px] overflow-x-auto no-scrollbar">
        {CATEGORY_TABS.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveCategory(i)}
            className={`flex items-center gap-[6px] px-[14px] py-[7px] rounded-full cursor-pointer whitespace-nowrap text-[13px] transition-colors ${
              i === activeCategory
                ? "bg-[#1e293b] text-white font-semibold border-0 shadow-sm"
                : "bg-white text-[#64748b] font-normal border border-[#e2e8f0] hover:border-slate-300"
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[11px] text-[#94a3b8]">
              {tabCounts[i]}
            </span>
          </button>
        ))}
      </div>

      <div className="px-[16px]">
        {/* ── List Header ── */}
        <div className="flex items-center justify-between mb-[10px]">
          <div>
            <div className="font-bold text-[#0f172a] text-[15px]">
              {CATEGORY_TABS[activeCategory].label} ({filteredItems.length})
            </div>
            <div className="font-normal text-[#64748b] text-[12px]">
              Disponibles para los clientes en tiempo real
            </div>
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="bg-[#10B981] rounded-full size-[7px]" />
            <span className="font-semibold text-[#10B981] text-[12px]">
              {activeCount} Activos
            </span>
          </div>
        </div>

        {/* ── Items List ── */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="size-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Cargando catálogo...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200 p-6">
            <p className="font-medium text-slate-700 mb-1">Aún no hay {CATEGORY_TABS[activeCategory].label.toLowerCase()}</p>
            <p className="text-xs text-slate-400 mb-4">Puedes agregar el primero haciendo clic en "Nuevo Ítem".</p>
            <button
              onClick={() => {
                setNuevoTipo(CATEGORY_TABS[activeCategory].key);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              + Agregar {CATEGORY_TABS[activeCategory].label}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px] mb-[16px]">
            {filteredItems.map((r) => (
              <div
                key={r.id}
                className={`bg-white rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[12px] flex items-center gap-[12px] transition-opacity ${
                  !r.activo ? "opacity-60 bg-slate-50/50" : ""
                }`}
              >
                <div className="shrink-0 size-[52px] rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center overflow-hidden text-[24px]">
                  {r.imagen_url ? (
                    <img
                      src={r.imagen_url}
                      alt={r.nombre}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{CATEGORY_TABS[activeCategory].emoji}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[6px] mb-[2px]">
                    <span
                      className={`font-semibold text-[14px] truncate ${
                        !r.activo ? "text-[#94a3b8]" : "text-[#0f172a]"
                      }`}
                    >
                      {r.nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-[6px]">
                    <span
                      className={`font-semibold text-[12px] ${
                        r.recargo_extra > 0 ? "text-purple-600" : "text-emerald-600"
                      }`}
                    >
                      {r.recargo_extra > 0
                        ? `+$${Number(r.recargo_extra).toLocaleString("es-AR")} recargo`
                        : "Sin costo extra"}
                    </span>
                    {!r.activo && (
                      <span className="font-normal text-[#ef4444] text-[11px]">
                        • Pausado (Sin stock)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-[8px] shrink-0">
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => toggleItemActive(r.id, r.activo)}
                    className={`w-[36px] h-[20px] rounded-full relative cursor-pointer border-0 transition-colors p-0 ${
                      r.activo ? "bg-[#10B981]" : "bg-[#e2e8f0]"
                    }`}
                    aria-label={`Alternar activación de ${r.nombre}`}
                  >
                    <div
                      className={`absolute top-[2px] size-[16px] rounded-full bg-white shadow-xs transition-transform ${
                        r.activo ? "right-[2px]" : "left-[2px]"
                      }`}
                    />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id, r.nombre)}
                    className="bg-transparent border-0 cursor-pointer p-1 text-slate-300 hover:text-red-500 transition-colors"
                    title="Eliminar insumo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Sync notice box ── */}
        <div className="flex items-start gap-[8px] bg-[#fdf2f8] rounded-[10px] p-[12px] mb-[16px] border border-[#fbcfe8]/40">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-[1px]">
            <circle cx="8" cy="8" r="7" stroke="#a43073" strokeWidth="1.2" />
            <path d="M8 7V11M8 5.5V5" stroke="#a43073" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="font-normal text-[#64748b] text-[11px] leading-[15px]">
            Los insumos agregados y sus cambios de disponibilidad se sincronizan en tiempo real con el cotizador de pedidos.
          </span>
        </div>
      </div>

      {/* ── Modal Nuevo Insumo ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Agregar Nuevo Insumo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Completa los datos para habilitar una nueva opción en el catálogo.
            </p>

            <form onSubmit={handleCrearInsumo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Categoría / Tipo
                </label>
                <select
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value as TipoInsumo)}
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
                  placeholder="ej. Frutos Rojos, Ganache 70%..."
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Foto / Imagen del Insumo (Opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="foto-insumo-input"
                />
                {imagenPreview ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <img
                      src={imagenPreview}
                      alt="Vista previa"
                      className="size-12 rounded object-cover border border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-slate-700 font-medium truncate block">
                        {imagenFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="foto-insumo-input"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-pink-400 rounded-lg text-xs text-slate-500 hover:text-pink-600 cursor-pointer transition-colors bg-slate-50/50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Seleccionar foto desde el dispositivo</span>
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Recargo Extra ($ ARS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={nuevoRecargo}
                  onChange={(e) => setNuevoRecargo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Coloca 0 si no tiene recargo extra.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {guardando ? "Subiendo..." : "Guardar Insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
