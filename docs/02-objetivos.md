# 02 - Objetivos del Proyecto

## Objetivo General
Desarrollar e implementar un sistema web orientado a dispositivos móviles (*Mobile-First*) integrado con Supabase y la API de Telegram, que centralice la cotización paramétrica de tortas artesanales a partir de un catálogo interactivo, automatice el control transaccional de cupos de producción para evitar la sobreventa y gestione el seguimiento operativo del taller mediante comprobantes de transferencia.

---

## Objetivos Específicos

* **OE 1 (Catálogo y Cotización Paramétrica):** Diseñar e implementar una interfaz guiada que exponga las tortas modelo del taller y permita al cliente configurar su pedido según peso (kilos) e insumos (recetas abiertas o de fórmula fija), calculando en tiempo real el presupuesto estimado y formalizando la reserva mediante transferencia bancaria.
* **OE 2 (Control de Capacidad y Concurrencia ACID):** Desarrollar un módulo de gestión de cupos diarios con calendario semaforizado y transaccionalidad estricta en PostgreSQL, implementando retención temporal de cupos y previniendo la sobreventa de fechas de producción.
* **OE 3 (Gestión Operativa de Taller):** Construir un panel administrativo centralizado para el seguimiento del ciclo de vida de las comandas (*Pendiente*, *Confirmado*, *En producción*, *Listo*), la auditoría visual de comprobantes de transferencia y la administración del catálogo de insumos y tarifas.
* **OE 4 (Comunicación y Alertas Asíncronas):** Integrar un servicio de mensajería automatizado mediante Telegram Bot API para emitir alertas operativas inmediatas al pastelero ante nuevos pedidos y notificar al cliente las actualizaciones sobre el estado de su orden.
* **OE 5 (Analítica y Rendimiento Productivo):** Desarrollar un módulo de métricas operativas que consolide volúmenes de facturación, porcentajes de ocupación de la capacidad diaria y demanda agregada de insumos para facilitar la planificación del taller.