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
  getInsumosRelPorTorta,
  setInsumoCompatibilidad,
  setInsumoDefault,
  uploadTortaImagen,
  getInsumos,
  createInsumo,
  uploadInsumoImagen,
  updateInsumoActivo,
  updateInsumo,
  deleteInsumo,
  TortaDB,
  InsumoDB,
  TipoInsumo,
} from "@/lib/services/catalogo";
import { getRecepcionAbierta, updateRecepcionAbierta } from "@/lib/services/cupos";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

const INSUMO_CATEGORIES: { label: string; key: TipoInsumo; emoji: string }[] = [
  { label: "Bizcochuelos", key: "bizcochuelo", emoji: "🍰" },
  { label: "Rellenos", key: "relleno", emoji: "🍯" },
  { label: "Coberturas", key: "cobertura", emoji: "🧁" },
  { label: "Toppings", key: "topping", emoji: "🍓" },
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
  const [precioKg, setPrecioKg] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [tipo, setTipo] = useState<"personalizable" | "receta_fija">("personalizable");
  const [imagenUrl, setImagenUrl] = useState<string>("");
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Insumos, Compatibilidades y Defaults (Mockup 2.4)
  const [allInsumos, setAllInsumos] = useState<InsumoDB[]>([]);
  const [compatibleIds, setCompatibleIds] = useState<Set<string>>(new Set());
  const [defaultInsumoIds, setDefaultInsumoIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null);

  // Modal para confirmar desvinculación de insumo
  const [insumoADesvincular, setInsumoADesvincular] = useState<{ id: string; nombre: string } | null>(null);

  // Modal para confirmar baja / eliminación definitiva de insumo del catálogo
  const [insumoAEliminar, setInsumoAEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [eliminandoInsumo, setEliminandoInsumo] = useState<boolean>(false);

  // Modal para "Editar Insumo"
  const [editingInsumo, setEditingInsumo] = useState<InsumoDB | null>(null);
  const [editInsumoNombre, setEditInsumoNombre] = useState<string>("");
  const [editInsumoTipo, setEditInsumoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [editInsumoRecargo, setEditInsumoRecargo] = useState<string>("0");
  const [editInsumoFile, setEditInsumoFile] = useState<File | null>(null);
  const [editInsumoPreview, setEditInsumoPreview] = useState<string | null>(null);
  const [guardandoEditInsumo, setGuardandoEditInsumo] = useState<boolean>(false);
  const editInsumoFileInputRef = useRef<HTMLInputElement>(null);

  // Modal para "+ Asignar Insumo del Catálogo"
  const [isModalAsignarOpen, setIsModalAsignarOpen] = useState<boolean>(false);
  const [asignarSearch, setAsignarSearch] = useState<string>("");

  // Modal para "+ Nuevo Insumo"
  const [isModalInsumoOpen, setIsModalInsumoOpen] = useState<boolean>(false);
  const [nuevoInsumoNombre, setNuevoInsumoNombre] = useState<string>("");
  const [nuevoInsumoTipo, setNuevoInsumoTipo] = useState<TipoInsumo>("bizcochuelo");
  const [nuevoInsumoRecargo, setNuevoInsumoRecargo] = useState<string>("0");
  const [nuevoInsumoFile, setNuevoInsumoFile] = useState<File | null>(null);
  const [nuevoInsumoPreview, setNuevoInsumoPreview] = useState<string | null>(null);
  const [guardandoInsumo, setGuardandoInsumo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insumoFileInputRef = useRef<HTMLInputElement>(null);

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

        // Auto-clasificación si existen frutas registradas como cobertura
        const frutasParaTopping = insumosList.filter(
          (i) =>
            i.tipo === "cobertura" &&
            (i.nombre.toLowerCase().includes("fruto") ||
              i.nombre.toLowerCase().includes("frutilla") ||
              i.nombre.toLowerCase().includes("arandano"))
        );
        if (frutasParaTopping.length > 0) {
          for (const item of frutasParaTopping) {
            try {
              await supabase.from("insumos").update({ tipo: "topping" }).eq("id", item.id);
              item.tipo = "topping";
            } catch (e) {
              console.warn("Aviso migrando insumo a topping:", e);
            }
          }
        }
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
            setImagenUrl(t.imagen_url || "");
            setImagenPreview(t.imagen_url || null);

            const rels = await getInsumosRelPorTorta(t.id);
            setCompatibleIds(new Set(rels.map((r) => r.insumo_id)));
            setDefaultInsumoIds(
              new Set(rels.filter((r) => r.es_default).map((r) => r.insumo_id))
            );
          }
        } else {
          // Si es nueva, comienza completamente limpia sin datos inventados
          setNombre("");
          setPrecioKg("");
          setDescripcion("");
          setImagenUrl("");
          setImagenPreview(null);
          setImagenFile(null);
          setCompatibleIds(new Set());
          setDefaultInsumoIds(new Set());
        }
      } catch (err) {
        console.error("Error al cargar configuración de torta:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isNueva, tortaIdParam, router, supabase]);

  // Selección automática del primer insumo vinculado de la pestaña activa para el panel destacado
  useEffect(() => {
    const currentCategory = INSUMO_CATEGORIES[activeTab]?.key;
    const firstOfCategory = allInsumos.find(
      (i) => i.tipo === currentCategory && compatibleIds.has(i.id)
    );
    if (firstOfCategory) {
      setSelectedInsumoId(firstOfCategory.id);
    } else {
      setSelectedInsumoId(null);
    }
  }, [activeTab, allInsumos, compatibleIds]);

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

  // 1. Alternar disponibilidad / stock del insumo (activo / pausado sin stock) - NO elimina de la torta
  const handleToggleInsumoActivo = async (insumoId: string, currentActivo: boolean) => {
    const nextStatus = !currentActivo;
    setAllInsumos((prev) =>
      prev.map((i) => (i.id === insumoId ? { ...i, activo: nextStatus } : i))
    );
    try {
      await updateInsumoActivo(insumoId, nextStatus);
    } catch (err) {
      console.error("Error al actualizar disponibilidad de insumo:", err);
      // Revertir estado local en caso de error
      setAllInsumos((prev) =>
        prev.map((i) => (i.id === insumoId ? { ...i, activo: currentActivo } : i))
      );
    }
  };

  // 2. Vincular insumo existente a esta torta
  const handleVincularInsumo = async (insumoId: string) => {
    const nextSet = new Set(compatibleIds);
    nextSet.add(insumoId);
    setCompatibleIds(nextSet);
    setSelectedInsumoId(insumoId);

    if (torta) {
      try {
        await setInsumoCompatibilidad(torta.id, insumoId, true);
      } catch (err) {
        console.error("Error al vincular insumo a torta:", err);
      }
    }
  };

  // 3. Quitar insumo de la receta de esta torta (desvincular permanentemente)
  const handleDesvincularInsumo = async (insumoId: string) => {
    const nextSet = new Set(compatibleIds);
    nextSet.delete(insumoId);
    setCompatibleIds(nextSet);

    const nextDefSet = new Set(defaultInsumoIds);
    nextDefSet.delete(insumoId);
    setDefaultInsumoIds(nextDefSet);

    if (selectedInsumoId === insumoId) {
      setSelectedInsumoId(null);
    }

    if (torta) {
      try {
        await setInsumoCompatibilidad(torta.id, insumoId, false);
      } catch (err) {
        console.error("Error al desvincular insumo de torta:", err);
      }
    }
  };

  // 4. Alternar si este insumo es la receta default / base para esta torta
  const handleToggleInsumoDefault = async (insumoId: string, tipo: TipoInsumo) => {
    const isCurrentlyDefault = defaultInsumoIds.has(insumoId);
    const nextSet = new Set(defaultInsumoIds);

    // Insumos de la misma categoría vinculados a esta torta
    const sameCatInsumos = allInsumos.filter((i) => i.tipo === tipo && compatibleIds.has(i.id));
    const sameCatIds = sameCatInsumos.map((i) => i.id);

    if (isCurrentlyDefault) {
      nextSet.delete(insumoId);
    } else {
      // Reemplaza cualquier otro default de la misma categoría
      sameCatIds.forEach((id) => nextSet.delete(id));
      nextSet.add(insumoId);
    }
    setDefaultInsumoIds(nextSet);

    if (torta) {
      try {
        await setInsumoDefault(
          torta.id,
          insumoId,
          !isCurrentlyDefault,
          sameCatIds.filter((id) => id !== insumoId)
        );
      } catch (err) {
        console.error("Error al configurar insumo por defecto:", err);
      }
    }
  };

  // Guardar Cambios en Torta (Botón "Guardar" de cabecera)
  const handleGuardar = async () => {
    if (!nombre.trim()) {
      alert("Por favor ingresa un nombre para la torta.");
      return;
    }

    const precio = Number(precioKg);
    if (!precioKg.trim() || isNaN(precio) || precio <= 0) {
      alert("Por favor ingresa un precio por kg válido (mayor a 0).");
      return;
    }
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

      router.push("/admin?tab=catalogo");
    } catch (err: any) {
      console.error("Error al guardar la torta:", err);
      alert("Error al guardar en Supabase: " + (err?.message || "Error desconocido"));
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

  // Abrir modal de edición con los datos actuales del insumo
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

  // Dar de baja / eliminar insumo del catálogo definitivamente
  const handleConfirmarBajaInsumo = async () => {
    if (!insumoAEliminar) return;
    setEliminandoInsumo(true);
    try {
      await deleteInsumo(insumoAEliminar.id);
      setAllInsumos((prev) => prev.filter((i) => i.id !== insumoAEliminar.id));
      setCompatibleIds((prev) => {
        const next = new Set(prev);
        next.delete(insumoAEliminar.id);
        return next;
      });
      setDefaultInsumoIds((prev) => {
        const next = new Set(prev);
        next.delete(insumoAEliminar.id);
        return next;
      });
      if (selectedInsumoId === insumoAEliminar.id) {
        setSelectedInsumoId(null);
      }
      setEditingInsumo(null);
      setInsumoAEliminar(null);
    } catch (err: any) {
      console.error("Error al dar de baja el insumo:", err);
      alert("Error al eliminar el insumo: " + (err?.message || "Error desconocido"));
    } finally {
      setEliminandoInsumo(false);
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

  const currentCategoryKey = INSUMO_CATEGORIES[activeTab]?.key || "bizcochuelo";
  const linkedCategoryInsumos = allInsumos.filter(
    (i) => i.tipo === currentCategoryKey && compatibleIds.has(i.id)
  );
  const featuredInsumo =
    allInsumos.find((i) => i.id === selectedInsumoId) ||
    linkedCategoryInsumos[0] ||
    null;
  const isFeaturedCompatible = featuredInsumo
    ? compatibleIds.has(featuredInsumo.id)
    : false;
  const isFeaturedDefault = featuredInsumo
    ? defaultInsumoIds.has(featuredInsumo.id)
    : false;

  const unlinkedCategoryInsumos = allInsumos.filter((i) => {
    const matchCategory = i.tipo === currentCategoryKey;
    const notLinked = !compatibleIds.has(i.id);
    const matchSearch = asignarSearch.trim()
      ? i.nombre.toLowerCase().includes(asignarSearch.toLowerCase())
      : true;
    return matchCategory && notLinked && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f8fafc] text-[#0f172a] relative">
      {/* ── Top Header Oscuro con Volver y Guardar (Mockup 2.4) ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#1e293b] shadow-md">
        <div className="h-[56px] mx-auto flex items-center px-4 justify-between" style={{ maxWidth: 430 }}>
          <button
            type="button"
            onClick={() => router.push("/admin?tab=catalogo")}
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
      <main className="flex-1 w-full mx-auto pt-[68px] pb-[130px] px-4 space-y-4" style={{ maxWidth: 430 }}>
        {/* ── SECCIÓN 1: Datos Básicos ── */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-2 px-0.5">Datos Básicos</h2>
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs">
            <div className="flex gap-3 mb-3">
              {/* Foto con botón "Cambiar" o caja para subir si no hay imagen */}
              {imagenPreview || imagenUrl ? (
                <div className="shrink-0 flex flex-col" style={{ width: 110, minWidth: 110 }}>
                  <div
                    className="rounded-t-xl overflow-hidden bg-slate-100 border border-slate-200 border-b-0 relative"
                    style={{ width: 110, height: 95 }}
                  >
                    <img
                      src={imagenPreview || imagenUrl}
                      alt={nombre || "Torta"}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
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
                    style={{ width: 110, height: 32 }}
                    className="bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-semibold rounded-b-xl border border-[#1e293b] cursor-pointer shadow-xs transition-colors flex items-center justify-center text-center"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="shrink-0" style={{ width: 110, minWidth: 110 }}>
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
                    style={{ width: 110, height: 127 }}
                    className="w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-400 hover:bg-pink-50/20 bg-slate-50 flex flex-col items-center justify-center gap-1.5 p-2 text-center cursor-pointer transition-colors group"
                  >
                    <div className="size-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-pink-500 group-hover:border-pink-300 transition-colors shadow-2xs">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-pink-600 leading-tight">
                      Subir foto
                    </span>
                    <span className="text-[9px] text-slate-400 leading-tight">
                      Opcional
                    </span>
                  </button>
                </div>
              )}

              {/* Campos: Nombre y Precio por Kg */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre de la Torta
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Torta Selva Negra"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-pink-500 bg-white shadow-2xs"
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
                      placeholder="Ej: 18000"
                      className="w-full pl-6 pr-12 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-pink-500 bg-white shadow-2xs"
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
                placeholder="Descripción o detalles especiales (opcional)..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-pink-500 bg-white resize-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN 2: Insumos Compatibles (Mockup 2.4) ── */}
        <div>
          {/* Header con título y botones de acción */}
          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-base font-bold text-slate-800 m-0">Insumos Compatibles</h2>
              <span className="text-xs text-slate-400 font-medium">
                {compatibleIds.size} {compatibleIds.size === 1 ? "vinculado" : "vinculados"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsModalAsignarOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors text-xs font-semibold"
                title="Vincular un insumo ya existente del catálogo"
              >
                <span className="text-pink-600 font-bold text-sm leading-none">+</span>
                <span>Asignar Existente</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNuevoInsumoTipo(currentCategoryKey);
                  setIsModalInsumoOpen(true);
                }}
                className="bg-[#1e293b] hover:bg-[#334155] rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-2xs transition-colors text-white text-xs font-semibold"
              >
                <span className="font-bold text-sm leading-none">+</span>
                <span>Nuevo Insumo</span>
              </button>
            </div>
          </div>

          {/* Selector de categorías en cuadrícula 2x2 (sin scroll, todo a 1 toque) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {INSUMO_CATEGORIES.map((tab, idx) => {
              const count = allInsumos.filter((i) => i.tipo === tab.key && compatibleIds.has(i.id)).length;
              const isActive = idx === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-between border ${
                    isActive
                      ? "bg-[#1e293b] text-white border-[#1e293b] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                  }`}
                >
                  <span className="font-semibold truncate">{tab.label}</span>
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive
                        ? "bg-slate-700 text-slate-200"
                        : count > 0
                        ? "bg-pink-50 text-pink-600 border border-pink-200"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Item destacado con interruptor switch y acciones ergonómicas para móviles */}
          {featuredInsumo ? (
            <div className="rounded-2xl border border-slate-200/90 p-3 mb-3 bg-white shadow-xs">
              {/* Fila superior: Foto, Nombre completo y Conmutador de disponibilidad */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="rounded-xl bg-amber-50/50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xl"
                    style={{ width: 50, height: 50, minWidth: 50, maxWidth: 50 }}
                  >
                    {featuredInsumo.imagen_url ? (
                      <img
                        src={featuredInsumo.imagen_url}
                        alt={featuredInsumo.nombre}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      INSUMO_CATEGORIES[activeTab]?.emoji || "🍰"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm capitalize leading-snug">
                        {featuredInsumo.nombre}
                      </span>
                      {isFeaturedDefault && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shrink-0">
                          ★ Base
                        </span>
                      )}
                    </div>
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

                {/* Switch de disponibilidad / stock */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-semibold hidden sm:inline ${
                      featuredInsumo.activo ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {featuredInsumo.activo ? "Disponible" : "Sin stock"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleInsumoActivo(featuredInsumo.id, featuredInsumo.activo)}
                    style={{ width: 44, height: 24, minWidth: 44 }}
                    className={`rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                      featuredInsumo.activo ? "bg-[#10B981]" : "bg-slate-300"
                    }`}
                    aria-label={`Alternar stock de ${featuredInsumo.nombre}`}
                    title={
                      featuredInsumo.activo
                        ? "Disponible: Clic para pausar por falta de stock"
                        : "Sin stock: Clic para habilitar disponibilidad"
                    }
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        top: 2,
                        left: featuredInsumo.activo ? "calc(100% - 22px)" : 2,
                        position: "absolute",
                      }}
                      className="rounded-full bg-white shadow-xs transition-all duration-200"
                    />
                  </button>
                </div>
              </div>

              {/* Fila inferior: Botones de acción táctiles cómodos de tocar */}
              <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEditInsumo(featuredInsumo)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Editar precio, nombre o foto de este insumo"
                >
                  <span>✏️</span>
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleInsumoDefault(featuredInsumo.id, featuredInsumo.tipo)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors border flex items-center justify-center gap-1.5 shadow-2xs ${
                    isFeaturedDefault
                      ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                  title={isFeaturedDefault ? "Quitar de receta base" : "Marcar como receta base / default para esta torta"}
                >
                  <span className={isFeaturedDefault ? "text-amber-600" : "text-slate-400"}>★</span>
                  <span>{isFeaturedDefault ? "Receta base" : "Hacer base"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInsumoADesvincular({
                      id: featuredInsumo.id,
                      nombre: featuredInsumo.nombre,
                    });
                  }}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors border border-transparent hover:border-rose-100"
                  title="Desvincular de esta torta"
                >
                  Quitar
                </button>
              </div>
            </div>
          ) : null}

          {/* Grilla con SOLO los insumos vinculados a esta torta */}
          {linkedCategoryInsumos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center bg-white shadow-2xs">
              <span className="text-3xl mb-1.5 block">{INSUMO_CATEGORIES[activeTab]?.emoji || "🍰"}</span>
              <p className="text-xs font-bold text-slate-800 mb-0.5">
                No hay {INSUMO_CATEGORIES[activeTab]?.label.toLowerCase()} vinculados
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3.5 leading-relaxed">
                Esta torta no tiene opciones de esta categoría. Podés agregar insumos ya creados en el catálogo o crear uno nuevo.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalAsignarOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                >
                  + Asignar del Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoInsumoTipo(currentCategoryKey);
                    setIsModalInsumoOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                >
                  + Crear Nuevo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {linkedCategoryInsumos.map((insumo) => {
                const isSelected = insumo.id === selectedInsumoId;

                return (
                  <div
                    key={insumo.id}
                    onClick={() => setSelectedInsumoId(insumo.id)}
                    className={`relative rounded-xl border p-2 flex flex-col items-center text-center cursor-pointer transition-all shadow-xs ${
                      isSelected
                        ? "border-pink-500 bg-pink-50/20 ring-2 ring-pink-400"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                    } ${!insumo.activo ? "opacity-60 grayscale-[35%]" : ""}`}
                  >
                    {/* Indicador de estado de stock y receta base en esquina superior izquierda */}
                    <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                      <span
                        className={`inline-block size-2 rounded-full ring-2 ring-white ${
                          insumo.activo ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        title={insumo.activo ? "Disponible" : "Sin stock / Pausado"}
                      />
                      {defaultInsumoIds.has(insumo.id) && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-[8px] font-bold text-amber-800 shadow-2xs">
                          ★ Base
                        </span>
                      )}
                    </div>

                    {/* Botón para quitar de la receta de esta torta */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsumoADesvincular({
                          id: insumo.id,
                          nombre: insumo.nombre,
                        });
                      }}
                      className="absolute top-1.5 right-1.5 size-5 rounded-full bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs z-10"
                      title="Quitar de la receta de esta torta"
                    >
                      ✕
                    </button>

                    <div
                      className="rounded-lg bg-slate-100 overflow-hidden mb-1.5 flex items-center justify-center text-lg w-full"
                      style={{ height: 68 }}
                    >
                      {insumo.imagen_url ? (
                        <img
                          src={insumo.imagen_url}
                          alt={insumo.nombre}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        INSUMO_CATEGORIES[activeTab]?.emoji || "🍰"
                      )}
                    </div>

                    <span className="text-xs font-semibold text-slate-700 line-clamp-1 truncate w-full capitalize">
                      {insumo.nombre}
                    </span>
                    {insumo.activo ? (
                      insumo.recargo_extra > 0 ? (
                        <span className="text-[10px] font-semibold text-pink-600">
                          +${insumo.recargo_extra.toLocaleString("es-AR")}
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal text-slate-400">
                          Incluido
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-500">
                        Sin stock
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Modal personalizado de Confirmación para Quitar Insumo ── */}
      <ConfirmModal
        isOpen={!!insumoADesvincular}
        title={`¿Quitar "${insumoADesvincular?.nombre}" de la receta?`}
        description="Este ingrediente dejará de formar parte de las opciones disponibles para esta torta. Podrás volver a vincularlo en cualquier momento desde «+ Asignar»."
        confirmLabel="Quitar de la torta"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setInsumoADesvincular(null)}
        onConfirm={() => {
          if (insumoADesvincular) {
            handleDesvincularInsumo(insumoADesvincular.id);
            setInsumoADesvincular(null);
          }
        }}
      />

      {/* ── Modal de Confirmación para Dar de Baja Insumo del Catálogo ── */}
      <ConfirmModal
        isOpen={!!insumoAEliminar}
        title={`¿Dar de baja "${insumoAEliminar?.nombre}" del catálogo?`}
        description="Esta acción eliminará definitivamente el ingrediente del catálogo de taller y se desvinculará de todas las recetas de tortas asociadas."
        confirmLabel="Dar de baja insumo"
        cancelLabel="Cancelar"
        variant="danger"
        loading={eliminandoInsumo}
        onCancel={() => setInsumoAEliminar(null)}
        onConfirm={handleConfirmarBajaInsumo}
      />

      {/* ── Modal "Editar Insumo" (Precio, Nombre, Tipo, Foto) ── */}
      {editingInsumo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
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
              {/* Foto del Insumo */}
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
                    step="100"
                    placeholder="0"
                    value={editInsumoRecargo}
                    onChange={(e) => setEditInsumoRecargo(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Se sumará al precio final cuando el cliente elija este insumo.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInsumo(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEditInsumo || !editInsumoNombre.trim()}
                  className="flex-1 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-xs font-bold text-white cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                >
                  {guardandoEditInsumo ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setInsumoAEliminar({
                      id: editingInsumo.id,
                      nombre: editingInsumo.nombre,
                    });
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline bg-transparent border-0 cursor-pointer p-1"
                >
                  Dar de baja este insumo del catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal "+ Asignar Insumo del Catálogo" ── */}
      {isModalAsignarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Asignar {INSUMO_CATEGORIES[activeTab]?.label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Insumos existentes en el catálogo listos para vincular.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalAsignarOpen(false)}
                className="size-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-2.5">
              <input
                type="text"
                placeholder={`Buscar en catálogo...`}
                value={asignarSearch}
                onChange={(e) => setAsignarSearch(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500 bg-white"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1 space-y-1">
              {unlinkedCategoryInsumos.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {asignarSearch.trim()
                    ? "No se encontraron insumos con ese nombre."
                    : `No hay más ${INSUMO_CATEGORIES[activeTab]?.label.toLowerCase()} disponibles para vincular.`}
                </div>
              ) : (
                unlinkedCategoryInsumos.map((ins) => (
                  <div
                    key={ins.id}
                    className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 rounded-lg gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                        {ins.imagen_url ? (
                          <img src={ins.imagen_url} alt={ins.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">{INSUMO_CATEGORIES[activeTab]?.emoji || "🍰"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate capitalize">
                          {ins.nombre}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {ins.recargo_extra > 0
                            ? `+$${ins.recargo_extra.toLocaleString("es-AR")} recargo`
                            : "Sin costo extra"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditInsumo(ins)}
                        className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer border border-slate-200"
                        title="Editar o dar de baja insumo"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVincularInsumo(ins.id)}
                        className="px-3 py-1 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs"
                      >
                        + Vincular
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalAsignarOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal "+ Nuevo Insumo" con Subida de Foto y Toppings ── */}
      {isModalInsumoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Agregar Nuevo Insumo
            </h3>
            <p className="text-xs text-slate-500 mb-3.5">
              Se registrará en el catálogo y quedará vinculado a esta torta.
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
                  Coloca 0 si no tiene recargo extra.
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

      {/* ── Bottom Bar con Master Switch y Navegación (Mockup 2.4) ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0] shadow-md pb-safe">
        <div className="mx-auto" style={{ maxWidth: 430 }}>
          {/* Fila superior: Conmutador de recepción */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <div
                className={`size-2.5 rounded-full ${
                  isReceptionOpen ? "bg-[#10B981]" : "bg-slate-400"
                }`}
                style={{ width: 10, height: 10 }}
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
              style={{ width: 44, height: 24, minWidth: 44 }}
              className={`rounded-full relative cursor-pointer border-0 transition-colors p-0 shrink-0 ${
                isReceptionOpen ? "bg-[#10B981]" : "bg-slate-300"
              }`}
              aria-label="Alternar recepción de pedidos"
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  top: 2,
                  left: isReceptionOpen ? "calc(100% - 22px)" : 2,
                  position: "absolute",
                }}
                className="rounded-full bg-white shadow-xs transition-all duration-200"
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
