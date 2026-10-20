"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepNumber, AccordionStep } from "@/components/pedido/types";
import { HeaderPedido } from "@/components/pedido/HeaderPedido";
import { Stepper } from "@/components/pedido/Stepper";
import { Paso1FechaPeso } from "@/components/pedido/Paso1FechaPeso";
import { Paso2Sabores } from "@/components/pedido/Paso2Sabores";
import { Paso3Detalles } from "@/components/pedido/Paso3Detalles";
import { BottomBar } from "@/components/pedido/BottomBar";
import { SuccessModal } from "@/components/pedido/SuccessModal";
import { ToastNotification } from "@/components/pedido/ToastNotification";
import { createNuevoPedido } from "@/lib/services/pedidos";
import { getInsumosPorTorta, InsumoDB, TipoInsumo } from "@/lib/services/catalogo";
import { sendTelegramNotification } from "@/lib/services/telegram";
import { createClient } from "@/lib/supabase/client";
import { extractLocalPhone } from "@/lib/phone";

interface InsumosDefaults {
  baseName: string;
  fillingsNames: string[];
  coverageName: string;
}

const DEFAULT_RECIPES_BY_SLUG: Record<string, InsumosDefaults> = {
  "torta-tematica": {
    baseName: "vainilla",
    fillingsNames: ["dulce de leche"],
    coverageName: "fondant",
  },
  "torta-frutos-rojos": {
    baseName: "vainilla",
    fillingsNames: ["durazno"],
    coverageName: "chantilly",
  },
  "jardin-de-frutos": {
    baseName: "vainilla",
    fillingsNames: ["durazno"],
    coverageName: "chantilly",
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

  const bases = insumosList
    .filter((i) => i.tipo === "bizcochuelo")
    .sort((a, b) => {
      const aDef = a.nombre.toLowerCase().trim() === normBase;
      const bDef = b.nombre.toLowerCase().trim() === normBase;
      if (aDef && !bDef) return -1;
      if (!aDef && bDef) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const rellenos = insumosList
    .filter((i) => i.tipo === "relleno")
    .sort((a, b) => {
      const aDef = normFillings.includes(a.nombre.toLowerCase().trim());
      const bDef = normFillings.includes(b.nombre.toLowerCase().trim());
      if (aDef && !bDef) return -1;
      if (!aDef && bDef) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  const coberturas = insumosList
    .filter((i) => i.tipo === "cobertura")
    .sort((a, b) => {
      const aDef = a.nombre.toLowerCase().trim() === normCoverage;
      const bDef = b.nombre.toLowerCase().trim() === normCoverage;
      if (aDef && !bDef) return -1;
      if (!aDef && bDef) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

  return [...bases, ...rellenos, ...coberturas];
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
  const basePricePerKg = queryPrecio ? parseInt(queryPrecio, 10) : 18500;
  const isFixedRecipe = searchParams.get("tipo") === "receta_fija";

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
  const [selectedWeight, setSelectedWeight] = useState<number>(1.5);
  const [baseWeightPrice, setBaseWeightPrice] = useState<number>(() => {
    return queryPrecio ? Math.round(basePricePerKg * 1.5) : 26000;
  });

  // Step 2 state
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [selectedFillings, setSelectedFillings] = useState<string[]>([]);
  const [selectedCoverage, setSelectedCoverage] = useState<string | null>(null);

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

        // Preselección de opciones default más comunes si es torta personalizable
        if (!isFixedRecipe && sortedData.length > 0) {
          setSelectedBase((prev) => {
            if (prev) return prev;
            const match = findInsumoByName(sortedData, "bizcochuelo", recipeConfig.baseName);
            return match ? match.id : "";
          });

          setSelectedFillings((prev) => {
            if (prev.length > 0) return prev;
            const matches: string[] = [];
            for (const fName of recipeConfig.fillingsNames) {
              const match = findInsumoByName(sortedData, "relleno", fName);
              if (match && !matches.includes(match.id)) {
                matches.push(match.id);
              }
            }
            return matches.length > 0
              ? matches
              : (sortedData.find((i) => i.tipo === "relleno") ? [sortedData.find((i) => i.tipo === "relleno")!.id] : []);
          });

          setSelectedCoverage((prev) => {
            if (prev) return prev;
            const match = findInsumoByName(sortedData, "cobertura", recipeConfig.coverageName);
            return match ? match.id : null;
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

  // Cargar datos de usuario para autocompletar contacto
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

  const totalRecargos =
    (selectedBaseObj?.recargo_extra || 0) +
    selectedFillingsObjs.reduce((acc, curr) => acc + (curr.recargo_extra || 0), 0) +
    (selectedCoverageObj?.recargo_extra || 0);

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
      if (prev.includes(id)) return prev.filter((r) => r !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleCompleteAccordion = (step: AccordionStep, next: AccordionStep) => {
    setDoneAccordions((prev) => new Set(prev).add(step));
    setActiveAccordion(next);
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      setActiveAccordion(3);
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
    if (step === 2) {
      if (!deliveryDateStr) {
        showToast("Por favor selecciona una fecha de entrega antes de pasar a sabores.");
        return;
      }
      setCurrentStep(2);
      setActiveAccordion(1);
      return;
    }
    if (step === 3) {
      if (!deliveryDateStr) {
        showToast("Por favor selecciona una fecha de entrega en el Paso 1.");
        return;
      }
      if (!isFixedRecipe) {
        if (!selectedBase) {
          showToast("Por favor selecciona el bizcochuelo base en el Paso 2.");
          return;
        }
        if (selectedFillings.length === 0) {
          showToast("Por favor selecciona al menos 1 relleno artesanal en el Paso 2.");
          return;
        }
        if (!selectedCoverage) {
          showToast("Por favor selecciona la cobertura exterior en el Paso 2.");
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
      setCurrentStep(2);
      setActiveAccordion(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      if (isFixedRecipe) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (activeAccordion === 1) {
        if (!selectedBase) {
          showToast("Por favor selecciona el bizcochuelo base de tu torta.");
          return;
        }
        handleCompleteAccordion(1, 2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (activeAccordion === 2) {
        if (selectedFillings.length === 0) {
          showToast("Por favor selecciona al menos 1 relleno artesanal.");
          return;
        }
        handleCompleteAccordion(2, 3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (activeAccordion === 3) {
        if (!selectedCoverage) {
          showToast("Por favor selecciona la cobertura exterior de tu torta.");
          return;
        }
        setDoneAccordions((prev) => new Set(prev).add(3));
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (currentStep === 3) {
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
          : [selectedBase, ...selectedFillings, selectedCoverage].filter(
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
        sendTelegramNotification(
          `🎂 *¡Nuevo Pedido Recibido!*\n\n` +
          (tortaNombre ? `🍰 *Modelo:* ${tortaNombre}${isFixedRecipe ? " (Receta Tradicional)" : ""}\n` : "") +
          `👤 *Cliente:* ${nombre.trim()}\n` +
          `📱 *Teléfono:* ${telefono.trim()}\n` +
          `📅 *Entrega:* ${deliveryDateStr}\n` +
          `⚖️ *Peso:* ${selectedWeight} kg\n` +
          `💰 *Total a Transferir:* $${selectedPrice.toLocaleString("es-AR")}\n` +
          (fullNotas ? `📝 *Notas:* ${fullNotas}\n` : "") +
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
    if (currentStep === 1) return isFixedRecipe ? "Ver Receta Tradicional" : "Elegir Sabores";
    if (currentStep === 2) {
      if (isFixedRecipe) return "Continuar al Resumen";
      if (activeAccordion === 1) return "Continuar a Rellenos";
      if (activeAccordion === 2) return "Continuar a Cobertura";
      if (activeAccordion === 3) return "Continuar a Resumen";
    }
    return "Siguiente Paso";
  };

  return (
    <div className="bg-[#f8fafc] font-body-md text-[#0f172a] flex flex-col min-h-screen">
      {/* ── Custom Toast Notification ── */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* ── Header ── */}
      <HeaderPedido currentStep={currentStep} onBack={handleBack} />

      {/* ── Stepper ── */}
      <Stepper currentStep={currentStep} onSelectStep={handleSelectStep} />

      {/* ── Main Content Container ── */}
      <main className="flex-1 w-full max-w-md mx-auto px-[16px] pt-[16px] pb-[100px]">
        {currentStep === 1 && (
          <Paso1FechaPeso
            selectedDateStr={deliveryDateStr}
            onSelectDate={handleSelectDate}
            selectedWeight={selectedWeight}
            onSelectWeight={handleSelectWeight}
            tortaNombre={tortaNombre}
            basePricePerKg={basePricePerKg}
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
            activeAccordion={activeAccordion}
            setActiveAccordion={setActiveAccordion}
            doneAccordions={doneAccordions}
            onCompleteAccordion={handleCompleteAccordion}
            onNext={handleNext}
            isFixedRecipe={isFixedRecipe}
            tortaNombre={tortaNombre}
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
            nombre={nombre}
            onChangeNombre={setNombre}
            telefono={telefono}
            onChangeTelefono={setTelefono}
            notas={notas}
            onChangeNotas={setNotas}
            referenciaFile={referenciaFile}
            onUploadReferencia={setReferenciaFile}
            tortaNombre={tortaNombre}
            isFixedRecipe={isFixedRecipe}
          />
        )}
      </main>

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
