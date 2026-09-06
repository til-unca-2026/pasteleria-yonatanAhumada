# 01 - Introducción y Objetivos

## Contexto del Problema
En los emprendimientos de pastelería artesanal y repostería por encargo, el modelo comercial depende de la personalización de cada producto y de una capacidad de producción diaria acotada. Actualmente, la captura de pedidos se realiza de forma manual y desestructurada mediante canales de mensajería informal como WhatsApp. El intercambio constante de mensajes para acordar el peso en kilos, sabores de bizcochuelo, rellenos, coberturas y fechas de entrega genera demoras operativas y pérdida de tiempo de producción.

## Problemática Identificada
La falta de una herramienta centralizada produce diversos inconvenientes operativos:
* **Riesgo de sobreventa:** Al no existir un control automatizado de la capacidad diaria, se aceptan compromisos que superan el límite de producción, generando cancelaciones o retrasos.
* **Fragmentación de la información:** Los datos clave del pedido (kilos exactos, combinaciones de relleno, imágenes de referencia para la decoración y comprobantes de seña) quedan dispersos en historiales de chat, elevando el margen de error en la elaboración.
* **Falta de previsión de insumos:** La ausencia de datos estructurados impide planificar con anticipación la compra de materia prima necesaria para las entregas de cada fecha.
* **Incertidumbre del cliente:** El comprador no cuenta con un canal directo e inmediato para consultar la disponibilidad real de fechas ni el estado de su reserva.

## Propuesta de Solución
Se propone el desarrollo de una aplicación web complementada con un canal de notificaciones y seguimiento vía bot de Telegram. La plataforma web permitirá al cliente personalizar su pedido de forma secuencial (selección de peso en kilos, masa, rellenos y carga de imagen de referencia) y reservar únicamente en fechas con cupos disponibles. 

Para el administrador, el sistema proveerá un panel centralizado para gestionar el límite de cupos diarios, validar señas y consultar el consolidado de producción por fecha. La integración con Telegram actuará como canal asíncrono de comunicación para enviar confirmaciones y actualizaciones de estado del pedido en tiempo real.

---

## Objetivo General
Desarrollar e implementar un sistema web integrado con un bot de Telegram que centralice la toma de pedidos personalizados de pastelería por peso en kilos, automatice el control de cupos de producción por fecha y gestione el seguimiento de estados del pedido para optimizar la planificación del emprendimiento.

## Objetivos Específicos
* **Diseñar una interfaz web interactiva (Constructor de Producto):** Permitir al cliente armar su pedido paso a paso seleccionando peso en kilos, masa base, rellenos, cobertura y adjuntando una imagen de referencia con cálculo automático del precio estimado y la seña requerida.
* **Implementar un módulo de gestión de capacidad y cupos:** Bloquear de forma automática las fechas de entrega que alcancen el límite diario de pedidos definido por el administrador para evitar la sobreventa.
* **Desarrollar un panel administrativo centralizado:** Proveer vistas para la validación de comprobantes de seña, cambio de estados del pedido (*Pendiente*, *Señado*, *En producción*, *Listo para retiro*) y visualización de la lista consolidada de pedidos por fecha.
* **Integrar un canal asíncrono vía Bot de Telegram:** Enviar notificaciones automáticas al cliente sobre el cambio de estado de su pedido (aprobación de seña y aviso de retiro) y simular consultas rápidas de estado mediante comandos.
* **Desplegar la solución en un entorno accesible:** Configurar y publicar el backend, base de datos y frontend en un servicio en la nube garantizando disponibilidad pública mediante una URL funcional.