# 03 - Alcance del Proyecto

Define los módulos desarrollados y las exclusiones explícitas adoptadas para el sistema.

---

## 1. Alcance Incluido

### Módulo de Catálogo y Experiencia de Cliente
* **Vitrina de productos (`/`):** Catálogo interactivo de tortas modelo, diferenciando tortas personalizables (receta abierta) de tradicionales (receta fija).
* **Cotizador dinámico:** Selección de peso (1 a 2 kg) con porciones sugeridas y personalización adaptativa según producto (bizcochuelo, rellenos clásicos/premium y coberturas en tortas abiertas; toppings y dedicatoria en tortas fijas).
* **Cálculo reactivo:** Actualización en tiempo real del presupuesto total según peso e insumos seleccionados.
* **Confirmación y comprobante:** Formulario de contacto, visualización de datos bancarios (Alias/CBU) y adjunto de comprobante de transferencia con foto de referencia decorativa opcional.

### Módulo de Gestión de Cupos y Concurrencia (ACID)
* **Calendario con semáforo:** Disponibilidad diaria en tiempo real (disponible, cupos críticos, agotado o bloqueado).
* **Reserva temporal (TTL 60 min):** Retención preventiva del cupo mientras el cliente gestiona y sube su comprobante bancario.
* **Control de concurrencia:** Transacciones atómicas en PostgreSQL (Supabase) para evitar sobreventa ante clics simultáneos en la misma fecha.

### Módulo de Panel de Taller (`/admin`)
* **Tablero de comandas:** Control del ciclo de vida del pedido (*Pendiente*, *Confirmado*, *En producción*, *Listo para retiro*).
* **Validación de pagos:** Visor de comprobantes de transferencia para confirmación o rechazo manual del pago.
* **Gestión de calendario:** Calibración de cupos máximos diarios y bloqueo manual de fechas.
* **Administración de catálogo:** Ajuste de precio base por kilo, alta/baja de insumos con recargos y switches (*flags*) para definir qué opciones admite cada torta modelo.

### Canal de Alertas Operativas (Telegram)
* **Alertas al pastelero:** Notificación push inmediata por Telegram Bot API ante nuevos pedidos con comprobante adjunto.
* **Avisos al cliente:** Notificación automática cuando el comprobante es validado o cuando el pedido está listo para retirar.

---

## 2. Exclusiones Explícitas

### Pasarela de Pago Automática (Mercado Pago / Stripe)
* **Funcional:** Evita comisiones financieras (3% a 8%) en un emprendimiento local. Se prioriza transferencia bancaria directa (CBU/Alias) con validación mediante comprobante.
* **Técnica:** Prescinde de *webhooks*, reintentos e idempotencia en el MVP, validando el pago mediante inspección visual del comprobante.

### Bot Conversacional Interactivo (Chatbot de WhatsApp / Telegram)
* **Funcional:** Personalizar tortas requiere soporte visual (capas, fotos y calendario). Un bot de texto genera confusión y pedidos mal estructurados.
* **Técnica:** La reactividad visual pertenece a una web UI *Mobile-First*. Telegram se reserva solo como canal *push* unidireccional de alertas.

### Logística y Gestión de Envíos a Domicilio
* **Funcional:** Las tortas artesanales son frágiles y requieren frío. El taller opera con retiro en local (*take-away*) para asegurar la calidad del producto.
* **Técnica:** Elimina dependencias de mapas (GPS), cálculo de fletes y tracking de repartidores, enfocando el desarrollo en producción y cupos.
