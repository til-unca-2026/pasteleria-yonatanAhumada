# 01 - Introducción

## Contexto del Problema
En los emprendimientos de pastelería artesanal y repostería por encargo, el modelo comercial depende de la personalización de cada producto y de una capacidad de producción diaria acotada. Actualmente, la captura de pedidos se realiza de forma manual y desestructurada mediante canales de mensajería informal como WhatsApp. El intercambio constante de mensajes para acordar el peso en kilos, sabores de bizcochuelo, rellenos, coberturas y fechas de entrega genera demoras operativas y pérdida de tiempo de producción.

## Problemática Identificada
La falta de una herramienta centralizada produce diversos inconvenientes operativos:
* **Riesgo de sobreventa:** Al no existir un control automatizado de la capacidad diaria, se aceptan compromisos que superan el límite de producción, generando cancelaciones o retrasos.
* **Fragmentación de la información:** Los datos clave del pedido (kilos exactos, combinaciones de relleno, imágenes de referencia para la decoración y comprobantes de transferencia) quedan dispersos en historiales de chat, elevando el margen de error en la elaboración.
* **Falta de previsión de insumos:** La ausencia de datos estructurados impide planificar con anticipación la compra de materia prima necesaria para las entregas de cada fecha.
* **Incertidumbre del cliente:** El comprador no cuenta con un canal directo e inmediato para consultar la disponibilidad real de fechas ni el estado de su reserva.

## Propuesta de Solución
Se propone el desarrollo de una aplicación web complementada con un canal de notificaciones y seguimiento vía bot de Telegram. La plataforma web permitirá al cliente visualizar un catálogo de productos modelo, personalizar su pedido de forma guiada según la receta y reservar únicamente en fechas con cupos disponibles. 

Para el administrador, el sistema proveerá un panel centralizado para gestionar el límite de cupos diarios, validar transferencias y consultar el consolidado de producción por fecha. La integración con Telegram actuará como canal asíncrono de comunicación para emitir alertas operativas al pastelero y enviar actualizaciones de estado del pedido al cliente en tiempo real.