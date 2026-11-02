"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepNumber, AccordionStep } from "@/components/pedido/types";
import { HeaderHome } from "@/components/HeaderHome";
import { SidebarNav } from "@/components/SidebarNav";
import { Stepper } from "@/components/pedido/Stepper";
import { Paso1FechaPeso } from "@/components/pedido/Paso1FechaPeso";
import { Paso2Sabores } from "@/components/pedido/Paso2Sabores";
import { Paso3Detalles } from "@/components/pedido/Paso3Detalles";
import { BottomBar } from "@/components/pedido/BottomBar";
import { SuccessModal } from "@/components/pedido/SuccessModal";
import { ToastNotification } from "@/components/pedido/ToastNotification";
import { createNuevoPedido } from "@/lib/services/pedidos";
import { getInsumosPorTorta, getTortaPorSlug, getPrecioBaseKg, InsumoDB, TipoInsumo } from "@/lib/services/catalogo";
import { sendTelegramNotification } from "@/lib/services/telegram";
import { createClient } from "@/lib/supabase/client";
import { extractLocalPhone } from "@/lib/phone";

interface InsumosDefaults {
  baseName: string;
  fillingsNames: string[];
  coverageName: string;
  toppingName?: string;
}

const DEFAULT_RECIPES_BY_SLUG: Record<string, InsumosDefaults> = {
  "torta-tematica": {
    baseName: "vainilla",
    fillingsNames: ["dulce de leche"],
    coverageName: "fondant",
  },
  "torta-frutos-rojos": {
    baseName: "",
    fillingsNames: ["crema pastelera", "crema chantilly"],
    coverageName: "chantilly",
    toppingName: "mix de frutos rojos",
  },
  "jardin-de-frutos": {
    baseName: "",
    fillingsNames: ["crema pastelera", "crema chantilly"],
    coverageName: "chantilly",
    toppingName: "mix de frutos rojos",
  },
};

const DEFAULT_GENERIC_RECIPE: InsumosDefaults = {
  baseName: "vainilla",
  fillingsNames: ["dulce de leche"],
  coverageName: "fondant",
};

function findInsumoByName(
  insumosList: InsumoDB[],
  tipo: TipoInsumo,
  targetName: string
): InsumoDB | undefined {
  const normTarget = targetName.toLowerCase().trim();
  const filtered = insumosList.filter((i) => i.tipo === tipo);
  return (
    filtered.find((i) => i.nombre.toLowerCase().trim() === normTarget) ||
    filtered.find((i) => i.nombre.toLowerCase().includes(normTarget)) ||
    filtered[0]
  );
}

function sortInsumosWithDefaults(
  insumosList: InsumoDB[],
  recipeConfig: InsumosDefaults
): InsumoDB[] {
  const normBase = recipeConfig.baseName.toLowerCase().trim();
  const normFillings = recipeConfig.fillingsNames.map((f) => f.toLowerCase().trim());
  const normCoverage = recipeConfig.coverageName.toLowerCase().trim();
  const normTopping = (recipeConfig.toppingName || "").toLowerCase().trim();

  const sortCategory = (tipo: TipoInsumo, fallbackMatch: (i: InsumoDB) => boolean) => {
    return insumosList
      .filter((i) => i.tipo === tipo)
      .sort((a, b) => {
        // 1. Prioridad: marcado explícitamente como es_default
        if (a.es_default && !b.es_default) return -1;
        if (!a.es_default && b.es_default) return 1;
        // 2. Fallback: coincidencia por receta estática
        const aDef = fallbackMatch(a);
        const bDef = fallbackMatch(b);
        if (aDef && !bDef) return -1;
        if (!aDef && bDef) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
  };

  const bases = sortCategory("bizcochuelo", (i) => i.nombre.toLowerCase().trim() === normBase);
  const rellenos = sortCategory("relleno", (i) => normFillings.includes(i.nombre.toLowerCase().trim()));
  const coberturas = sortCategory("cobertura", (i) => i.nombre.toLowerCase().trim() === normCoverage);
  const toppings = sortCategory("topping", (i) => i.nombre.toLowerCase().trim() === normTopping);

  return [...bases, ...rellenos, ...coberturas, ...toppings];
}

export default function PedidoWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <div className="size-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PedidoWizardContent />
    </Suspense>
  );
}

function PedidoWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // URL Query Parameters para tortas modelo
  const tortaSlug = searchParams.get("torta") || "";
  const tortaNombre = searchParams.get("nombre") || "";
  const queryPrecio = searchParams.get("precio");
  const [basePricePerKg, setBasePricePerKg] = useState<number>(() => {
    return queryPrecio ? parseInt(queryPrecio, 10) : 18500;
  });
  const isFixedRecipe = searchParams.get("tipo") === "receta_fija";
  const queryImagen = searchParams.get("imagen") || "";
  const [tortaImagen, setTortaImagen] = useState<string>(queryImagen);

  useEffect(() => {
    if (tortaSlug) {
      getTortaPorSlug(tortaSlug).then((t) => {
        if (!queryImagen && t?.imagen_url) setTortaImagen(t.imagen_url);
        if (!queryPrecio && t?.precio_base_kg && t.precio_base_kg > 0) {
          setBasePricePerKg(t.precio_base_kg);
          setBaseWeightPrice(Math.round(t.precio_base_kg * 1.5));
        }
      });
    }
  }, [queryImagen, tortaSlug, queryPrecio]);

  // Cargar precio base por kg configurado en taller si no viene por query
  useEffect(() => {
    if (!queryPrecio) {
      getPrecioBaseKg().then((price) => {
        if (price && price > 0) {
          setBasePricePerKg(price);
          setBaseWeightPrice(Math.round(price * 1.5));
        }
      });
    }
  }, [queryPrecio]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // Wizard flow state
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [activeAccordion, setActiveAccordion] = useState<AccordionStep>(1);
  const [doneAccordions, setDoneAccordions] = useState<Set<AccordionStep>>(new Set());

  // Insumos desde Supabase
  const [insumos, setInsumos] = useState<InsumoDB[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState<boolean>(true);

  // Step 1 state
  const [deliveryDateStr, setDeliveryDateStr] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [isDeliveryDateAvailable, setIsDeliveryDateAvailable] = useState<boolean>(true);
  const [selectedWeight, setSelectedWeight] = useState<number>(1.5);
  const [baseWeightPrice, setBaseWeightPrice] = useState<number>(() => {
    return queryPrecio ? Math.round(basePricePerKg * 1.5) : 26000;
  });

  // Step 2 state
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [selectedFillings, setSelectedFillings] = useState<string[]>([]);
  const [selectedCoverage, setSelectedCoverage] = useState<string | null>(null);
  const [selectedTopping, setSelectedTopping] = useState<string | null>(null);

  // Cargar catálogo de insumos activos y preseleccionar defaults
  useEffect(() => {
    async function loadActiveInsumos() {
      setLoadingInsumos(true);
      try {
        const data = await getInsumosPorTorta(tortaSlug);

        // Si es torta personalizable, ordenar para que las opciones default aparezcan primeras
        const recipeConfig = DEFAULT_RECIPES_BY_SLUG[tortaSlug] || DEFAULT_GENERIC_RECIPE;
        const sortedData =
          !isFixedRecipe && data.length > 0 ? sortInsumosWithDefaults(data, recipeConfig) : data;
        setInsumos(sortedData);

        // Preselección de opción default (exactamente 1 por categoría o fallback al primer activo)
        if (!isFixedRecipe && sortedData.length > 0) {
          // 1. Bizcochuelo base default
          setSelectedBase((prev) => {
            if (prev) return prev;
            const explicitDefault = sortedData.find((i) => i.tipo === "bizcochuelo" && i.es_default);
            if (explicitDefault) return explicitDefault.id;

            if (recipeConfig.baseName) {
              const match = findInsumoByName(sortedData, "bizcochuelo", recipeConfig.baseName);
              if (match) return match.id;
            }
            const firstBase = sortedData.find((i) => i.tipo === "bizcochuelo");
            return firstBase ? firstBase.id : "";
          });

          // 2. Relleno default: exactamente 1 opción por defecto (o 2 si hay múltiples defaults)
          setSelectedFillings((prev) => {
            if (prev.length > 0) return prev;
            const explicitDefaults = sortedData.filter((i) => i.tipo === "relleno" && i.es_default);
            if (explicitDefaults.length > 0) return explicitDefaults.map((i) => i.id).slice(0, 2);

            const primaryName = recipeConfig.fillingsNames[0];
            const match = primaryName ? findInsumoByName(sortedData, "relleno", primaryName) : null;
            if (match) return [match.id];
            const firstRelleno = sortedData.find((i) => i.tipo === "relleno");
            return firstRelleno ? [firstRelleno.id] : [];
          });

          // 3. Cobertura default: exactamente 1 opción por defecto
          setSelectedCoverage((prev) => {
            if (prev) return prev;
            const explicitDefault = sortedData.find((i) => i.tipo === "cobertura" && i.es_default);
            if (explicitDefault) return explicitDefault.id;

            if (recipeConfig.coverageName) {
              const match = findInsumoByName(sortedData, "cobertura", recipeConfig.coverageName);
              if (match) return match.id;
            }
            const firstCoverage = sortedData.find((i) => i.tipo === "cobertura");
            return firstCoverage ? firstCoverage.id : null;
          });

          // 4. Topping default: exactamente 1 opción por defecto
          setSelectedTopping((prev) => {
            if (prev) return prev;
            const explicitDefault = sortedData.find((i) => i.tipo === "topping" && i.es_default);
            if (explicitDefault) return explicitDefault.id;

            if (recipeConfig.toppingName) {
              const match = findInsumoByName(sortedData, "topping", recipeConfig.toppingName);
              if (match) return match.id;
            }
            const firstTopping = sortedData.find((i) => i.tipo === "topping");
            return firstTopping ? firstTopping.id : null;
          });
        }
      } catch (err) {
        console.error("Error al cargar insumos activos:", err);
      } finally {
        setLoadingInsumos(false);
      }
    }
    loadActiveInsumos();
  }, [isFixedRecipe, tortaSlug]);

  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);

  // Cargar datos de usuario para autocompletar contacto y header
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const defaultName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          const defaultPhone =
            user.user_metadata?.phone_number ||
            (typeof window !== "undefined"
              ? localStorage.getItem(`user_phone_${user.id}`) || localStorage.getItem("ultimo_pedido_telefono")
              : "") ||
            "";

          setCurrentUser({
            id: user.id,
            email: user.email,
            name: defaultName,
          });

          // Chequear admin
          const { data: adminRecord } = await supabase
            .from("admins")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
          if (adminRecord) {
            setIsAdminUser(true);
          }

          if (defaultName) setNombre(defaultName);
          if (defaultPhone) setTelefono(defaultPhone);
        } else if (typeof window !== "undefined") {
          const tel = localStorage.getItem("ultimo_pedido_telefono");
          if (tel) setTelefono(tel);
        }
      } catch (e) {
        console.error("Error cargando datos del usuario:", e);
      }
    }
    loadUserData();
  }, [supabase]);

  // Objetos seleccionados y cálculo dinámico de precio con recargos
  const selectedBaseObj = insumos.find((i) => i.id === selectedBase);
  const selectedFillingsObjs = insumos.filter((i) => selectedFillings.includes(i.id));
  const selectedCoverageObj = insumos.find((i) => i.id === selectedCoverage);
  const selectedToppingObj = insumos.find((i) => i.id === selectedTopping);

  const totalRecargos =
    (selectedBaseObj?.recargo_extra || 0) +
    selectedFillingsObjs.reduce((acc, curr) => acc + (curr.recargo_extra || 0), 0) +
    (selectedCoverageObj?.recargo_extra || 0) +
    (selectedToppingObj?.recargo_extra || 0);

  const selectedPrice = baseWeightPrice + totalRecargos;

  // Step 3 state
  const [nombre, setNombre] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [referenciaFile, setReferenciaFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdPedidoId, setCreatedPedidoId] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  const handleSelectDate = (dateStr: string, formattedDisplay: string) => {
    setDeliveryDateStr(dateStr);
    setDeliveryDate(formattedDisplay);
  };

  const handleSelectWeight = (weight: number, price: number) => {
    setSelectedWeight(weight);
    setBaseWeightPrice(price);
  };

  const handleToggleFilling = (id: string) => {
    setSelectedFillings((prev) => {
      if (tortaSlug === "torta-frutos-rojos") {
        return [id];
      }
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  // Secciones personalizables dinámicas (más de 1 opción)
  const basesInsumos = insumos.filter((i) => i.tipo === "bizcochuelo");
  const rellenosInsumos = insumos.filter((i) => i.tipo === "relleno");
  const coberturasInsumos = insumos.filter((i) => i.tipo === "cobertura");
  const toppingsInsumos = insumos.filter((i) => i.tipo === "topping");

  const customizableKeys: Array<"bizcochuelo" | "relleno" | "cobertura" | "topping"> = [];
  if (basesInsumos.length > 1) customizableKeys.push("bizcochuelo");
  if (rellenosInsumos.length > 1) customizableKeys.push("relleno");
  if (coberturasInsumos.length > 1) customizableKeys.push("cobertura");
  if (toppingsInsumos.length > 1) customizableKeys.push("topping");

  const handleCompleteAccordion = (step: AccordionStep, next: AccordionStep) => {
    setDoneAccordions((prev) => new Set(prev).add(step));
    setActiveAccordion(next);
  };

  const handleBack = () => {
    if (currentStep === 3) {
      if (isFixedRecipe) {
        setCurrentStep(1);
      } else {
        setCurrentStep(2);
        const count = customizableKeys.length;
        setActiveAccordion((count > 0 ? count : 1) as AccordionStep);
      }
    } else if (currentStep === 2) {
      if (activeAccordion > 1) {
        setActiveAccordion((prev) => (prev - 1) as AccordionStep);
      } else {
        setCurrentStep(1);
      }
    } else {
      router.push("/");
    }
  };

  const handleSelectStep = (step: StepNumber) => {
    if (step === 1) {
      setCurrentStep(1);
      return;
    }
    if (!deliveryDateStr) {
      showToast("Por favor selecciona una fecha de entrega en el Paso 1.");
      return;
    }
    if (!isDeliveryDateAvailable) {
      showToast("La fecha seleccionada no tiene cupos disponibles o se encuentra bloqueada. Por favor elegí otro día.");
      return;
    }
    if (isFixedRecipe) {
      // En receta fija el stepper de 2 pasos mapea el paso 2 a confirmación (step 3)
      setCurrentStep(3);
      return;
    }
    if (step === 2) {
      setCurrentStep(2);
      setActiveAccordion(1);
      return;
    }
    if (step === 3) {
      if (!isFixedRecipe) {
        if (basesInsumos.length > 1 && !selectedBase) {
          showToast("Por favor selecciona el bizcochuelo base en el Paso 2.");
          return;
        }
        if (rellenosInsumos.length > 1 && selectedFillings.length === 0) {
          showToast(
            tortaSlug === "torta-frutos-rojos"
              ? "Por favor selecciona la base / relleno en el Paso 2."
              : "Por favor selecciona al menos 1 relleno artesanal en el Paso 2."
          );
          return;
        }
        if (coberturasInsumos.length > 1 && !selectedCoverage) {
          showToast("Por favor selecciona la cobertura exterior en el Paso 2.");
          return;
        }
        if (toppingsInsumos.length > 1 && !selectedTopping) {
          showToast("Por favor selecciona el topping o fruta en el Paso 2.");
          return;
        }
      }
      setCurrentStep(3);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!deliveryDateStr) {
        showToast("Por favor selecciona una fecha de entrega disponible.");
        return;
      }
      if (!isDeliveryDateAvailable) {
        showToast("La fecha seleccionada no tiene cupos disponibles o se encuentra bloqueada. Por favor elegí otro día en el calendario.");
        return;
      }
      if (isFixedRecipe) {
        // En recetas fijas salteamos el paso 2 directamente al paso 3
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setCurrentStep(2);
      setActiveAccordion(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      if (isFixedRecipe || customizableKeys.length === 0) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const currentKey = customizableKeys[activeAccordion - 1];
      if (currentKey === "bizcochuelo" && !selectedBase) {
        showToast("Por favor selecciona el bizcochuelo base de tu torta.");
        return;
      }
      if (currentKey === "relleno" && selectedFillings.length === 0) {
        showToast("Por favor selecciona al menos 1 relleno artesanal.");
        return;
      }
      if (currentKey === "cobertura" && !selectedCoverage) {
        showToast("Por favor selecciona la cobertura exterior de tu torta.");
        return;
      }
      if (currentKey === "topping" && !selectedTopping) {
        showToast("Por favor selecciona el topping o fruta de tu torta.");
        return;
      }

      setDoneAccordions((prev) => new Set(prev).add(activeAccordion));

      if (activeAccordion < customizableKeys.length) {
        setActiveAccordion((prev) => (prev + 1) as AccordionStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (currentStep === 3) {
      if (!isDeliveryDateAvailable) {
        showToast("La fecha de entrega seleccionada ya no tiene cupos disponibles. Por favor seleccioná otra fecha.");
        setCurrentStep(1);
        return;
      }
      if (!nombre.trim()) {
        showToast("Por favor ingresa tu nombre de contacto.");
        return;
      }
      const localDigits = extractLocalPhone(telefono);
      if (!localDigits || localDigits.length < 8) {
        showToast("Por favor ingresa un número de WhatsApp válido (código de área + número).");
        return;
      }

      setSubmitting(true);
      try {
        const insumosIds = isFixedRecipe
          ? []
          : [selectedBase, ...selectedFillings, selectedCoverage, selectedTopping].filter(
              (x): x is string => Boolean(x)
            );

        const fullNotas = [
          tortaNombre ? `[Modelo: ${tortaNombre}${isFixedRecipe ? " - Receta Tradicional" : ""}]` : "",
          notas.trim(),
        ].filter(Boolean).join("\n");

        const pedido = await createNuevoPedido({
          cliente_nombre: nombre.trim(),
          cliente_telefono: telefono.trim(),
          fecha_entrega: deliveryDateStr,
          peso_kg: selectedWeight,
          total_estimado: selectedPrice,
          sena_requerida: selectedPrice,
          insumosIds,
          notas: fullNotas,
          fotoReferenciaFile: referenciaFile,
        });

        setCreatedPedidoId(pedido.id);
        const { data: { user } } = await supabase.auth.getUser();
        if (typeof window !== "undefined") {
          if (user) {
            const userOrdersKey = `user_orders_${user.id}`;
            const existingUserOrders: string[] = JSON.parse(localStorage.getItem(userOrdersKey) || "[]");
            if (!existingUserOrders.includes(pedido.id)) {
              localStorage.setItem(userOrdersKey, JSON.stringify([pedido.id, ...existingUserOrders].slice(0, 50)));
            }
            localStorage.setItem(`user_phone_${user.id}`, telefono.trim());
          } else {
            const guestOrdersKey = "guest_orders";
            const existingGuestOrders: string[] = JSON.parse(localStorage.getItem(guestOrdersKey) || "[]");
            if (!existingGuestOrders.includes(pedido.id)) {
              localStorage.setItem(guestOrdersKey, JSON.stringify([pedido.id, ...existingGuestOrders].slice(0, 50)));
            }
          }
        }

        if (user) {
          supabase.auth.updateUser({
            data: {
              phone_number: telefono.trim(),
              full_name: nombre.trim(),
            },
          }).catch((e) => console.warn("Error sincronizando metadata usuario:", e));
        }

        // Alerta asíncrona a Telegram
        const codigoPedido = `#${pedido.id.slice(0, 8).toUpperCase()}`;
        sendTelegramNotification(
          `🎂 *¡Nuevo Pedido Recibido! (${codigoPedido})*\n\n` +
          (tortaNombre ? `🍰 *Modelo:* ${tortaNombre}${isFixedRecipe ? " (Receta Tradicional)" : ""}\n` : "") +
          `👤 *Cliente:* ${nombre.trim()}\n` +
          `📱 *Teléfono:* ${telefono.trim()}\n` +
          `📅 *Entrega:* ${deliveryDateStr}\n` +
          `⚖️ *Peso:* ${selectedWeight} kg\n` +
          `💰 *Total a Transferir:* $${selectedPrice.toLocaleString("es-AR")}\n` +
          (fullNotas ? `📝 *Notas:* ${fullNotas}\n` : "") +
          (pedido.foto_referencia_url ? `🖼️ [Ver Foto de Referencia](${pedido.foto_referencia_url})\n` : "") +
          `ℹ️ _Pago pendiente de comprobante en Mis Pedidos_`
        ).catch((err) => console.error("Telegram notification error:", err));

        setIsSuccessModalOpen(true);
      } catch (err) {
        console.error("Error al confirmar pedido:", err);
        showToast("Ocurrió un error al procesar tu pedido. Por favor intenta nuevamente.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getNextLabel = () => {
    if (currentStep === 1) return isFixedRecipe ? "Continuar a Confirmación" : "Elegir Sabores";
    if (currentStep === 2) {
      if (isFixedRecipe) return "Continuar al Resumen";
      const totalSections = customizableKeys.length;
      if (totalSections === 0 || activeAccordion >= totalSections) {
        return "Continuar al Resumen";
      }
      const nextKey = customizableKeys[activeAccordion];
      if (nextKey === "relleno") return "Continuar a Rellenos";
      if (nextKey === "cobertura") return "Continuar a Cobertura";
      if (nextKey === "topping") return "Continuar a Toppings";
      return "Continuar al Resumen";
    }
    if (currentStep === 3) return "Confirmar y Reservar Cupo";
    return "Siguiente Paso";
  };

  return (
    <div className="bg-[#f8fafc] font-body-md text-[#0f172a] flex flex-col min-h-screen">
      {/* ── Custom Toast Notification ── */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* ── Header idéntico y consistente ── */}
      <HeaderHome user={currentUser} isAdmin={isAdminUser} />

      {/* ── Barra horizontal de pasos (Stepper) ── */}
      <Stepper currentStep={currentStep} onSelectStep={handleSelectStep} isFixedRecipe={isFixedRecipe} />

      {/* ── Layout unificado: Sidebar Izquierdo + Área de Cotización + Resumen Sticky ── */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Sidebar vertical izquierdo consistente con la tienda */}
        <SidebarNav currentPath="/pedido" isAdmin={isAdminUser} />

        {/* Contenido principal del cotizador */}
        <main className="flex-1 px-4 md:px-8 pt-4 md:pt-6 pb-[100px] md:pb-16 w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8 w-full max-w-5xl">
            {/* Columna central: Pasos del Wizard */}
            <div className="flex-1 w-full min-w-0">
              {currentStep === 1 && (
                <Paso1FechaPeso
                  selectedDateStr={deliveryDateStr}
                  onSelectDate={handleSelectDate}
                  selectedWeight={selectedWeight}
                  onSelectWeight={handleSelectWeight}
                  tortaNombre={tortaNombre}
                  tortaImagen={tortaImagen}
                  basePricePerKg={basePricePerKg}
                  onAvailabilityChange={setIsDeliveryDateAvailable}
                />
              )}

              {currentStep === 2 && (
                <Paso2Sabores
                  insumos={insumos}
                  loadingInsumos={loadingInsumos}
                  selectedBase={selectedBase}
                  onSelectBase={setSelectedBase}
                  selectedFillings={selectedFillings}
                  onToggleFilling={handleToggleFilling}
                  selectedCoverage={selectedCoverage}
                  onSelectCoverage={setSelectedCoverage}
                  selectedTopping={selectedTopping}
                  onSelectTopping={setSelectedTopping}
                  activeAccordion={activeAccordion}
                  setActiveAccordion={setActiveAccordion}
                  doneAccordions={doneAccordions}
                  onCompleteAccordion={handleCompleteAccordion}
                  onNext={handleNext}
                  isFixedRecipe={isFixedRecipe}
                  tortaNombre={tortaNombre}
                  tortaSlug={tortaSlug}
                  onConfirmFixedRecipe={() => {
                    setCurrentStep(3);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {currentStep === 3 && (
                <Paso3Detalles
                  deliveryDate={deliveryDate}
                  selectedWeight={selectedWeight}
                  selectedPrice={selectedPrice}
                  selectedBaseNombre={selectedBaseObj?.nombre}
                  selectedFillingsNombres={selectedFillingsObjs.map((f) => f.nombre)}
                  selectedCoverageNombre={selectedCoverageObj?.nombre}
                  selectedToppingNombre={selectedToppingObj?.nombre}
                  nombre={nombre}
                  onChangeNombre={setNombre}
                  telefono={telefono}
                  onChangeTelefono={setTelefono}
                  notas={notas}
                  onChangeNotas={setNotas}
                  referenciaFile={referenciaFile}
                  onUploadReferencia={setReferenciaFile}
                  tortaNombre={tortaNombre}
                  tortaSlug={tortaSlug}
                  tortaImagen={tortaImagen}
                  isFixedRecipe={isFixedRecipe}
                />
              )}
            </div>

            {/* Columna derecha: Resumen Sticky en Desktop */}
            <aside className="hidden lg:flex flex-col w-80 lg:w-88 shrink-0 sticky top-20 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 select-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100">
                Resumen de tu Pedido
              </h3>

              {/* Ficha rápida de la torta */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="size-16 rounded-xl bg-pink-50 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                  {tortaImagen ? (
                    <img src={tortaImagen} alt={tortaNombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-2xl">🎂</div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-pink-700 uppercase">Modelo</span>
                  <h4 className="text-sm font-bold text-slate-900 truncate m-0">{tortaNombre}</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedWeight} kg · {isFixedRecipe ? "Receta Clásica" : "Personalizada"}
                  </span>
                </div>
              </div>

              {/* Lista de selecciones actuales */}
              <div className="space-y-2 text-xs py-3 border-y border-slate-100 text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Entrega:</span>
                  <span className="font-semibold text-slate-800">
                    {deliveryDateStr || "Sin seleccionar"}
                  </span>
                </div>

                {!isFixedRecipe && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Bizcochuelo:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">
                        {selectedBaseObj?.nombre || "Vainilla"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Rellenos:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">
                        {selectedFillingsObjs.map((f) => f.nombre).join(", ") || "A elección"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cobertura:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">
                        {selectedCoverageObj?.nombre || "Fondant"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Total estimado */}
              <div className="mt-4 pt-2">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-xs text-slate-500 font-medium">Total a transferir</span>
                  <span className="text-2xl font-bold text-pink-700">
                    ${selectedPrice.toLocaleString("es-AR")}
                  </span>
                </div>

                {/* Botón principal de acción para Desktop */}
                <button
                  type="button"
                  disabled={submitting || (currentStep === 1 && !isDeliveryDateAvailable)}
                  onClick={handleNext}
                  className="w-full bg-[#1e293b] hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    <>
                      <span>{getNextLabel()}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M2 7H12M12 7L8 3M12 7L8 11"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2 m-0">
                  Reserva sujeta a validación de comprobante
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* ── Bottom Fixed Action Bar ── */}
      <BottomBar
        currentStep={currentStep}
        selectedPrice={selectedPrice}
        loading={submitting}
        nextLabel={getNextLabel()}
        onNext={handleNext}
      />

      {/* ── Success Confirmation Modal ── */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        deliveryDate={deliveryDate}
        selectedWeight={selectedWeight}
        selectedPrice={selectedPrice}
        pedidoId={createdPedidoId}
        onClose={() => setIsSuccessModalOpen(false)}
      />
    </div>
  );
}
