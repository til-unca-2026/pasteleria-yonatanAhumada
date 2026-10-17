# 04 - Arquitectura Visual y Prototipo de Interfaz (Mockups)

> **Prototipo Interactivo Navegable:**  
> [Ver y probar prototipo en Figma](https://www.figma.com/make/Wp04wzTJ50wfd8wJXp4Amq/Prototipo-de-pantallas?t=Bh26kAapyL9rnE35-20&fullscreen=1)
> * [Prototipo Exploratorio Inicial / Versión Antigua (Stitch)](https://stitch.withgoogle.com/preview/16141327618063099485?node-id=8821e23528da4905863aba7a7c3440f4)

El diseño de interfaz fue proyectado bajo un enfoque estricto **Mobile-First**, optimizando la densidad de información, la legibilidad y la reducción de fricción en la toma de pedidos.

A continuación se documentan las pantallas finales estructuradas en dos módulos operativos, vinculadas formalmente con los objetivos específicos del proyecto.

---

## Módulo 1: Flujo de Cotización y Reserva (Cliente)

### 1.1 Portada y Catálogo de Productos (`/`)
![Catálogo de Tortas](assets/mockups/home_v2.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)`.
* **Descripción:** Vitrina interactiva de tortas modelo con indicador en tiempo real de recepción de pedidos. Expone tarjetas de producto con precio base por kg diferenciado, etiquetas de personalización (*100% Personalizable* para recetas abiertas vs *Receta Tradicional* para recetas fijas) y botones de acción contextuales (*Personalizar* o *Pedir clásica*). Incluye barra de navegación inferior persistente con accesos a Catálogo y Mis Pedidos.

### 1.2 Selección de Fecha y Peso (`/pedido/paso-1`)
![Paso 1 - Fecha y Peso](assets/mockups/02-paso1-fecha-peso.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)` y `OE 2 (Control de Capacidad y Demanda)`.
* **Descripción:** Selector de fecha de entrega con validación de cupos en vivo y tarjetas de selección de peso base con porciones sugeridas. Incluye barra fija inferior con el importe total a transferir bajo la modalidad de pago único anticipado.

### 1.3 Selección de Sabores y Rellenos (`/pedido/paso-2`)
![Paso 2 - Sabores](assets/mockups/03-paso2-sabores.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)`.
* **Descripción:** Configuración guiada por etapas mediante componentes colapsables. Toda la navegación de avance se centraliza en el botón de acción inferior.

### 1.4 Resumen, Contacto y Transferencia (`/pedido/paso-3`)
![Paso 3 - Confirmación](assets/mockups/04-paso3-confirmacion.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)` y `OE 4 (Comunicación Asíncrona)`.
* **Descripción:** Resumen consolidado del pedido, formulario de datos de contacto, notas adicionales, contenedor para adjuntar comprobante de transferencia o imagen de referencia, datos bancarios con botón de copia rápida de alias/CBU y reserva temporal de cupo por 2 horas.

---

## Módulo 2: Panel Administrativo de Taller (Operador)

### 2.1 Gestión Diaria de Comandas (`/admin/pedidos`)
![Pedidos Activos](assets/mockups/05-admin-pedidos.png)
* **Objetivo Asociado:** `OE 3 (Gestión Operativa de Taller)`.
* **Descripción:** Tablero de control de pedidos en curso, indicador de cupos diarios con barra de porcentaje, conmutador maestro de recepción, tarjetas individuales por comanda con filtros de estado y acción rápida para validación de comprobantes de pago.

### 2.2 Gestión de Cupos y Capacidad (`/admin/cupos`)
![Gestión de Cupos](assets/mockups/06-admin-cupos.png)
* **Objetivo Asociado:** `OE 2 (Control de Capacidad y Demanda)`.
* **Descripción:** Configuración de capacidad diaria estándar, mini calendario semanal con semáforo de disponibilidad y selector puntual por fecha con interruptor para bloqueo preventivo de reservas.

### 2.3 Administración del Catálogo de Tortas (`/admin/catalogo`)
![Catálogo de Tortas en Admin](assets/mockups/admin_catalogo_v2.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)` y `OE 3 (Gestión Operativa de Taller)`.
* **Descripción:** Tablero de control de productos publicados con contador de tortas activas, botón para incorporar nuevas tortas (*+ Nueva Torta*), switches de visibilidad inmediata por producto y accesos a la edición individual de cada modelo.

### 2.4 Configuración de Torta e Insumos Compatibles (`/admin/catalogo/[id]`)
![Edición de Torta e Insumos](assets/mockups/admin_catalogo_id.png)
* **Objetivo Asociado:** `OE 1 (Personalización y Cotización)` y `OE 3 (Gestión Operativa de Taller)`.
* **Descripción:** Editor detallado de la torta seleccionada: carga de fotografía, nombre comercial, tarifa por kilo y descripción. Incluye selector modular de insumos compatibles agrupados por pestañas (Bizcochuelos, Rellenos, Coberturas) con conmutadores individuales para habilitar o restringir combinaciones y botón para crear nuevos ingredientes.

### 2.5 Tablero Analítico (`/admin/analitica`)
![Métricas](assets/mockups/08-admin-analitica.png)
* **Objetivo Asociado:** `OE 5 (Analítica y Rendimiento)`.
* **Descripción:** Métricas de rendimiento del negocio: balance de facturación total proyectada frente a pagos cobrados, gráfico de ocupación semanal del taller y ranking de insumos más solicitados para previsión de compras.