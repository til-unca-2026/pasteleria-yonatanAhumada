# 04 - Metodología y Arquitectura del Sistema

## 1. Elección y Justificación del Stack Tecnológico

La selección técnica busca simplificar el desarrollo unificando todo en un único lenguaje (TypeScript) y centralizando los servicios de backend:

* **Next.js (React + TypeScript):**
  * *Por qué:* Permite construir tanto la interfaz del cliente (configurador de tortas paso a paso) como el panel de administración en un solo proyecto unificado (*Full-Stack*). TypeScript evita errores en los cálculos de precios, pesos y señas.
* **Tailwind CSS:**
  * *Por qué:* Facilita el diseño *Mobile-First* adaptado a celulares de forma rápida y con bajo peso.
* **Supabase (PostgreSQL + Auth + Storage):**
  * *Por qué:* Resuelve tres necesidades críticas en una sola plataforma:
    1. **Base de Datos Relacional (PostgreSQL):** Garantiza consistencia transaccional (ACID) para evitar sobreventa de cupos si dos clientes intentan reservar la misma fecha en simultáneo.
    2. **Storage:** Permite almacenar de forma segura las fotos de comprobantes de transferencia y fotos de referencia de decoración.
    3. **Autenticación:** Protege el acceso al panel administrativo del taller sin programar un sistema de autenticación desde cero.
* **Telegram Bot API:**
  * *Por qué:* Notifica al instante al pastelero ante nuevos pedidos y avisa al cliente cuando su seña fue aprobada, sin los costos ni trabas comerciales de la API de WhatsApp.
* **Vercel:**
  * *Por qué:* Plataforma de despliegue continuo vinculada a GitHub que publica automáticamente los cambios de forma gratuita.

---

## 2. Diagrama de Arquitectura del Sistema

Muestra los componentes principales del sistema y cómo se comunican entre sí:

```mermaid
flowchart TD
    subgraph CLIENTES["1. Capa de Usuarios (Mobile-First)"]
        A1["📱 Cliente Web<br/>(Configurador de Pedidos)"]
        A2["💻 Pastelero / Admin<br/>(Panel de Control de Taller)"]
    end

    subgraph APLICACION["2. Capa de Aplicación (Next.js en Vercel)"]
        B1["⚡ Frontend y Vistas<br/>(React + Tailwind)"]
        B2["🛡️ Lógica de Servidor y API<br/>(Server Actions / Route Handlers)"]
        B1 --> B2
    end

    subgraph SERVICIOS["3. Capa de Persistencia y BaaS (Supabase)"]
        C1[("🗄️ PostgreSQL<br/>(Pedidos, Cupos, Insumos)")]
        C2["📁 Supabase Storage<br/>(Comprobantes y Fotos)"]
        C3["🔐 Supabase Auth<br/>(Sesión Administrador)"]
    end

    subgraph MENSAJERIA["4. Servicios Externos"]
        D["✈️ Telegram Bot API<br/>(Alertas al Taller)"]
    end

    %% Conexiones
    A1 -->|Envía pedido y comprobante| B1
    A2 -->|Consulta comandas y gestiona cupos| B1

    B2 -->|Transacciones y consultas| C1
    B2 -->|Guarda imágenes| C2
    B2 -->|Valida credenciales| C3
    B2 -->|Dispara notificación de nuevo pedido| D
```

---
