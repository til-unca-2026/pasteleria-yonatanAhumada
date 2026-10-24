"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRecepcionAbierta, updateRecepcionAbierta } from "@/lib/services/cupos";
import { AdminLayout, Tab } from "@/components/admin/AdminLayout";
import { PedidosTab } from "@/components/admin/PedidosTab";
import { CuposTab } from "@/components/admin/CuposTab";
import { CatalogoTab } from "@/components/admin/CatalogoTab";
import { MetricasTab } from "@/components/admin/MetricasTab";

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const supabase = createClient();
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && ["pedidos", "cupos", "catalogo", "metricas"].includes(tabParam)
      ? tabParam
      : "pedidos"
  );
  const [isReceptionOpen, setIsReceptionOpen] = useState<boolean>(true);

  useEffect(() => {
    if (tabParam && ["pedidos", "cupos", "catalogo", "metricas"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    async function verifyAdmin() {
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

      // Cargar estado de recepción de pedidos
      const abierta = await getRecepcionAbierta();
      setIsReceptionOpen(abierta);

      setLoading(false);
    }

    verifyAdmin();
  }, [router, supabase]);

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

  const getTitle = (tab: Tab) => {
    switch (tab) {
      case "pedidos":
        return "Pedidos Activos";
      case "cupos":
        return "Gestión de Cupos";
      case "catalogo":
        return "Catálogo y Precios";
      case "metricas":
        return "Métricas y Rendimiento";
      default:
        return "Panel de Control";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium tracking-wide">Verificando acceso de administrador...</span>
      </div>
    );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onBack={() => router.push("/")}
      title={getTitle(activeTab)}
      isReceptionOpen={isReceptionOpen}
      onToggleReception={handleToggleReception}
    >
      {activeTab === "pedidos" && <PedidosTab />}

      {activeTab === "cupos" && <CuposTab />}

      {activeTab === "catalogo" && <CatalogoTab />}

      {activeTab === "metricas" && <MetricasTab />}
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium tracking-wide">Cargando panel...</span>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
