# Paquetes públicos (combos) — sección landing

## Contexto

Los flyers de AtrevidaFit venden "paquetes" (combos) con precio, sesiones y servicios
incluidos. El backend ya los expone en `GET /bd/combos` (envuelto en `ApiResponse`), y ya
tienen campo `imagen` (nombre de archivo servido desde `public/paquetes/`). Falta una sección
pública en el landing que los muestre. Alcance: **solo catálogo display + CTA WhatsApp**
(`77411855`); la compra/plan y el agendado con `plan_id` quedan admin-side (no se construye
funnel online).

## Requisitos

- **Dinámico**: si el admin sube/quita paquetes, la sección lo refleja al recargar (fetch
  en cliente cada carga). El layout no debe romperse con cualquier cantidad N de paquetes.
- **Animaciones**: entrada con GSAP + ScrollTrigger, igual que `components/Servicios`.
- **Mínimo código, clean, reuso de estilos**.

## Diseño

**Enfoque**: Client Component (mismo patrón que `components/Servicios/Servicios.tsx`).

- **Datos**: `lib/api/combos.ts` → `getCombosDB()` que hace `GET /api/bd/combos` (proxy Next
  ya existente en `app/api/bd/combos/route.ts`). Tipo `ComboCatalogo` en `types/` reflejando
  el backend (`id, nombre, descripcion, imagen, precio_paquete, precio_final, moneda,
  sesiones_totales, servicios[], locales[]`). Filtrar `.filter(c => c.imagen)` → solo los
  paquetes con imagen.
- **Componente** `components/Paquetes/Paquetes.tsx` (`'use client'`):
  - `useEffect` carga los combos (estado loading + vacío que no rompe).
  - GSAP anima `querySelectorAll` de las cards presentes con stagger (count-agnostic, como
    Servicios). Si 0 cards, se salta.
  - Reutiliza las clases de cabecera de `Servicios.module.css` (container, sectionHeader,
    sectionBadge, sectionTitle, titleAccent, sectionSubtitle) importándolas → sin duplicar
    el chrome de sección.
  - Grid propio `Paquetes.module.css`: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
    (reflota para cualquier N).
  - **Card por combo**: imagen (`next/image`, `src={/paquetes/${c.imagen}}`) + nombre +
    precio grande en Bs (`precio_final` + `moneda`) + badge de sesiones (`sesiones_totales`) +
    lista de servicios incluidos (`servicios[].servicio_texto`) + chips de locales
    (`locales[].nombre`) + botón WhatsApp (`https://wa.me/59177411855?text=Hola, me interesa el paquete <nombre>`).
- **Montaje**: `<Paquetes/>` en `app/page.tsx` entre `<Servicios/>` y `<Nosotros/>`.
- Sin cambios en `next.config.ts` (imágenes locales). Sin dependencias nuevas.

## Fuera de alcance

Compra online, UI de planes, wiring de `plan_id` en reservas públicas, precio regular tachado.

## Verificación

- `npm run dev`: la sección muestra los paquetes con su flyer, precio Bs, sesiones, servicios
  y CTA WhatsApp; animación de entrada al hacer scroll; imágenes cargan (no 404).
- Simular quita/alta: cambiar `activo`/imagen de un combo en la DB → recargar → la sección
  refleja el cambio sin romperse.
- `npm run lint` (gate TS + eslint).
