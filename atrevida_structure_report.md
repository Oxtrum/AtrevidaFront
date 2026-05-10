# ANÁLISIS COMPLETO DE LA ESTRUCTURA DEL PROYECTO ATREVIDAFIT

## 1. ESTRUCTURA DE CARPETAS DEL PROYECTO

```
AtrevidaFront/
├── app/                              # Next.js App Router (estructura de rutas)
│   ├── admin/                        # SECCIÓN ADMINISTRATIVA
│   │   ├── login/                    # Ruta: /admin/login
│   │   │   ├── page.tsx              # Página de login del admin
│   │   │   └── page.module.css       # Estilos CSS Module (456 líneas)
│   │   ├── dashboard/                # Ruta: /admin/dashboard
│   │   │   ├── page.tsx              # Panel principal del admin
│   │   │   └── page.module.css       # Estilos CSS Module (509 líneas)
│   │   └── reservas/                 # Ruta: /admin/reservas
│   │       ├── page.tsx              # Gestión de reservas
│   │       ├── page.module.css       # Estilos (370 líneas)
│   │       ├── crear/                # Ruta: /admin/reservas/crear
│   │       │   ├── page.tsx
│   │       │   └── page.module.css   # (108 líneas)
│   │       └── editar/[id]/          # Ruta: /admin/reservas/editar/[id]
│   │           ├── page.tsx
│   │           └── page.module.css   # (324 líneas)
│   ├── api/                          # API Routes (Backend)
│   │   ├── admin/
│   │   │   ├── login/route.ts        # POST /api/admin/login
│   │   │   └── importar/route.ts     # POST /api/admin/importar
│   │   ├── bd/                       # Base de datos
│   │   │   ├── reservas/route.ts
│   │   │   ├── reservas/calendario/route.ts
│   │   │   ├── servicios/route.ts
│   │   │   ├── combos/route.ts
│   │   │   └── locales/route.ts
│   │   └── reservas/route.ts
│   ├── reservas/                     # SECCIÓN PÚBLICA DE RESERVAS
│   │   ├── page.tsx
│   │   ├── crear/
│   │   └── page.module.css
│   ├── layout.tsx                    # Root Layout (38 líneas)
│   ├── globals.css                   # Estilos globales (452 líneas)
│   └── page.tsx                      # Página de inicio /
├── components/                       # Componentes React reutilizables
│   ├── AdminHeader/
│   │   ├── Header.tsx                # Header del admin (199 líneas)
│   │   └── Header.module.css         # Estilos del header
│   ├── AdminReservas/
│   │   ├── ReservasTable.tsx         # Tabla de reservas (160 líneas)
│   │   ├── ReservasTable.module.css  # Estilos de tabla
│   │   ├── EditarReservaModal.module.css
│   │   └── index.ts
│   ├── Calendar/
│   │   ├── Calendar.tsx
│   │   ├── CalendarAdmin.tsx
│   │   ├── CalendarPublico.tsx
│   │   ├── CalendarGrid.tsx
│   │   ├── TimeSlot.tsx
│   │   ├── TimeSlotAdmin.tsx
│   │   ├── TimeSlotPublico.tsx
│   │   ├── ReservationCard.tsx
│   │   ├── SlotBadges.tsx
│   │   ├── Calendar.module.css
│   │   └── index.ts
│   ├── ReservationForm/
│   │   ├── index.tsx
│   │   ├── DaySelector.tsx
│   │   ├── ServiceSelect.tsx
│   │   ├── TimeSlotPicker.tsx
│   │   ├── constants.ts
│   │   ├── useReservationForm.ts
│   │   └── ReservationForm.module.css
│   ├── Shared/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Toast.tsx
│   │   ├── Shared.module.css
│   │   └── index.ts
│   ├── Custom/
│   │   ├── CustomSelect.tsx
│   │   └── CustomSelect.module.css
│   ├── Header/                       # Header público
│   ├── Footer/
│   ├── Hero/
│   ├── Servicios/
│   ├── Contacto/
│   ├── CtaBanner/
│   ├── Nosotros/
│   └── Testimonios/
├── lib/                              # Lógica compartida
│   ├── api/
│   │   ├── client.ts
│   │   ├── index.ts
│   │   ├── reservas.ts
│   │   └── servicios.ts
│   ├── hooks/
│   │   ├── useCrearReserva.ts
│   │   ├── useLocales.ts
│   │   ├── useReservas.ts
│   │   ├── useReservasCalendario.ts
│   │   ├── useReservasFiltradas.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── calendarHelpers.ts
│   │   ├── hoursAvailability.ts
│   │   └── reservationValidation.ts
│   └── constants/
│       └── reservationForm.ts
├── types/                            # Tipos TypeScript
│   └── reserva.ts
├── public/                           # Assets estáticos
├── AGENTS.md                         # Guía para agentes de IA
├── package.json                      # Dependencias
├── postcss.config.mjs               # Config PostCSS para Tailwind
├── next.config.ts                    # Config de Next.js
├── tsconfig.json                     # Config TypeScript
└── eslint.config.mjs               # Config ESLint

```

---

## 2. RUTAS DEL ADMIN Y PÁGINAS

### Rutas Administrativas:

| Ruta | Archivo | Descripción | Autenticación |
|------|---------|-------------|----------------|
| `/admin/login` | `app/admin/login/page.tsx` | Página de inicio de sesión | No requerida |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Panel principal del admin | Requerida (token en localStorage) |
| `/admin/reservas` | `app/admin/reservas/page.tsx` | Gestión de todas las reservas | Requerida |
| `/admin/reservas/crear` | `app/admin/reservas/crear/page.tsx` | Crear nueva reserva | Requerida |
| `/admin/reservas/editar/[id]` | `app/admin/reservas/editar/[id]/page.tsx` | Editar reserva existente | Requerida |

### API Routes:

| Ruta | Método | Archivo | Descripción |
|------|--------|---------|-------------|
| `/api/admin/login` | POST | `app/api/admin/login/route.ts` | Autenticación (mock actual) |
| `/api/admin/importar` | POST | `app/api/admin/importar/route.ts` | Importar datos desde Google Sheets |
| `/api/bd/reservas` | GET/POST | `app/api/bd/reservas/route.ts` | CRUD de reservas |
| `/api/bd/reservas/calendario` | GET | `app/api/bd/reservas/calendario/route.ts` | Datos calendario |
| `/api/bd/servicios` | GET | `app/api/bd/servicios/route.ts` | Obtener servicios |
| `/api/bd/locales` | GET | `app/api/bd/locales/route.ts` | Obtener locales |
| `/api/bd/combos` | GET | `app/api/bd/combos/route.ts` | Obtener combos |

---

## 3. LAYOUT GLOBAL PARA EL ADMIN

### Root Layout (`app/layout.tsx`):
- **No existe layout específico para admin**
- El layout raíz aplica a toda la app
- Usa fuentes de Google: Geist y Geist_Mono
- Incluye componente ToastContainer para notificaciones globales
- Estructura básica HTML con body flex

**Limitación Identificada:**
No hay un layout layout.tsx en `/app/admin/` que proporcione una envoltura específica para todas las páginas del admin. Esto significa que:
- La navbar/header se importa manualmente en cada página
- No hay un wrapper global para el admin
- Cada página maneja su propia navegación

---

## 4. ARCHIVOS DE ESTILOS GLOBALES, CONFIGURACIÓN TAILWIND Y TEMAS

### Archivo Global CSS (`app/globals.css` - 452 líneas):

#### Variables CSS del Sistema de Diseño:

**Colores Base:**
```css
--color-background: #09090b;          /* Fondo oscuro casi negro */
--color-foreground: #fafafa;          /* Texto blanco */
--af-bg: #09090b;                    /* Background principal */
--af-text: #fafafa;                  /* Texto principal */
```

**Colores de Marca (Desaturados):**
```css
--af-accent-primary: #dc2626;         /* Rojo profundo */
--af-accent-secondary: #0ea5e9;       /* Azul eléctrico (apagado) */
--af-accent-tertiary: #10b981;        /* Verde esmeralda (apagado) */

/* Legacy (para transición): */
--af-pink: #c2185b;                   /* Rosa apagado */
--af-purple: #7c3aed;                 /* Púrpura apagado */
--af-blue: #0ea5e9;                   /* Azul apagado */
--af-yellow: #ca8a04;                 /* Amarillo apagado */
```

**Colores de Texto:**
```css
--af-muted: rgba(250, 250, 250, 0.65);    /* Texto semitransparente */
--af-dim: rgba(250, 250, 250, 0.40);      /* Texto muy apagado */
```

**Superficies (Glass Effect):**
```css
--af-surface-1: rgba(15, 15, 15, 0.50);   /* Vidrio suave */
--af-surface-2: rgba(15, 15, 15, 0.70);   /* Vidrio medio */
--af-surface-3: rgba(15, 15, 15, 0.90);   /* Vidrio oscuro */
```

**Bordes:**
```css
--af-border: rgba(228, 228, 231, 0.10);       /* Borde sutil */
--af-border-hover: rgba(220, 38, 38, 0.30);   /* Borde en hover */
--af-border-focus: rgba(220, 38, 38, 0.50);   /* Borde en focus */
--af-border-subtle: rgba(250, 250, 250, 0.06); /* Borde muy sutil */
```

**Gradientes Premium:**
```css
--af-grad-brand: linear-gradient(135deg, #ca8a04 0%, #dc2626 40%, #7c3aed 70%, #0ea5e9 100%);
--af-grad-cta: linear-gradient(135deg, #dc2626 0%, #7c3aed 100%);
--af-grad-accent: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
--af-grad-subtle: linear-gradient(135deg, rgba(250, 250, 250, 0.1) 0%, rgba(250, 250, 250, 0.05) 100%);
```

**Sombras Tintadas:**
```css
--af-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--af-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.10);
--af-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
--af-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.20);
--af-shadow-accent: 0 8px 16px rgba(220, 38, 38, 0.15);
```

**Inputs/Controles:**
```css
--af-input-bg: rgba(9, 9, 11, 0.50);
--af-input-bg-hov: rgba(220, 38, 38, 0.04);
--af-input-bg-foc: rgba(220, 38, 38, 0.08);
--af-input-radius: 12px;
--af-input-pad: 0.875rem 1.125rem;
```

**Border Radii:**
```css
--af-radius-pill: 9999px;
--af-radius-lg: 20px;
--af-radius-md: 12px;
--af-radius-sm: 8px;
```

**Transiciones (Spring Physics):**
```css
--af-ease: cubic-bezier(0.16, 1, 0.3, 1);
--af-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--af-t-fast: all 0.2s var(--af-ease);
--af-t-mid: all 0.3s var(--af-ease);
--af-t-slow: all 0.5s var(--af-ease);
```

**Glass & Blur:**
```css
--af-glass: rgba(9, 9, 11, 0.80);
--af-glass-sm: rgba(9, 9, 11, 0.60);
--af-blur: blur(16px);
```

#### Clases CSS Globales Disponibles:

- `.af-glass` - Card con efecto vidrio líquido
- `.af-glass-subtle` - Variante sutil del vidrio
- `.af-badge` - Badge amarillo estándar
- `.af-badge-dot` - Punto animado con pulse
- `.af-stripe` - Línea degradada (arcoíris)
- `.af-title-gradient` - Título con gradiente animado

#### Animaciones Globales:

- `@keyframes pulse-dot` - Pulse con escala
- `@keyframes shimmer` - Shimmer 2D
- `@keyframes fade-in-up` - Entrada desde abajo
- `@keyframes scale-in` - Entrada con escala
- `@keyframes slide-in-right` - Slide desde derecha
- `@keyframes float` - Flotación suave

- `.animate-fade-in-up` - Clase de animación
- `.animate-scale-in` - Clase de animación
- `.animate-slide-in-right` - Clase de animación
- `.animate-float` - Clase de animación

### PostCSS Config (`postcss.config.mjs`):
```javascript
{
  "@tailwindcss/postcss": {}
}
```

### Next.js Config (`next.config.ts`):
- Configuración de calidades de imagen: [100, 75]
- Soporte para next/image con quality={100}

---

## 5. SISTEMA DE THEMING/TEMA ACTUAL

### Análisis del Theming:

**TEMA ACTUAL: MODO OSCURO GLOBAL**

1. **No hay context de tema dinámico**
   - No existe `ThemeProvider` o similar
   - No hay alternancia light/dark
   - Todo está diseñado para modo oscuro

2. **Colores Heredados del Tema Público:**
   - Los colores legacy están en `globals.css`:
     - `#EC008C` (Rosa atrevida público)
     - `#92278F` (Púrpura público)
     - `#14AEEF` (Azul público)
     - `#FFE600` (Amarillo público)
   - Estos se heredan en el admin

3. **Scroll Bar Personalizado:**
```css
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #EC008C, #92278F);
}
```

4. **Selection (Highlight):**
```css
::selection {
  background: #EC008C;
  color: #000000;
}
```

### CONCLUSIÓN SOBRE THEMING:
- Sistema de theming es **puramente basado en CSS Variables**
- **NO hay soporte para light mode**
- **NO hay Context/Provider de tema**
- Todo está hardcodeado para modo oscuro
- Los colores del admin heredan los colores públicos antiguos

---

## 6. COMPONENTES DEL ADMIN

### Componentes Admin Específicos:

#### `components/AdminHeader/Header.tsx` (199 líneas)
- **Propósito:** Navbar fija del admin
- **Características:**
  - Logo + ATREVIDAFIT text
  - Nav links: "Inicio", "Reservas"
  - Botón Logout con icono
  - Mobile hamburger menu
  - Gradiente line en scroll
  - Animaciones GSAP al cargar
  - Fixed z-index: 1000
  - Blur dinámico en scroll

#### `components/AdminReservas/ReservasTable.tsx` (160 líneas)
- **Propósito:** Tabla de reservas admin
- **Características:**
  - Loading state con spinner
  - Error state con icono
  - Empty state
  - Filtrado por tipo (Mesa/Bicicleta)
  - Animación GSAP de filas
  - Responsive design

#### `components/AdminReservas/EditarReservaModal.module.css`
- Modal para editar reservas (estilos)

### Componentes Compartidos Utilizados en Admin:

#### `components/Calendar/CalendarAdmin.tsx`
- Calendario específico para vista admin
- Manejo de slots de reserva
- Interacción con horarios

#### `components/Custom/CustomSelect.tsx`
- Select custom estilizado
- Usado en filtros admin

#### `components/Shared/`
- `Button.tsx` - Botones reutilizables
- `Input.tsx` - Inputs estilizados
- `Toast.tsx` - Notificaciones
- `Shared.module.css` - Estilos compartidos

---

## 7. ESTILOS CSS Y HERENCIA DEL TEMA OSCURO

### CSS Modules del Admin:

| Archivo | Líneas | Propósito |
|---------|--------|----------|
| `app/admin/login/page.module.css` | 456 | Estilos página login |
| `app/admin/dashboard/page.module.css` | 509 | Estilos dashboard |
| `app/admin/reservas/page.module.css` | 370 | Estilos gestión reservas |
| `app/admin/reservas/crear/page.module.css` | 108 | Estilos crear reserva |
| `app/admin/reservas/editar/[id]/page.module.css` | 324 | Estilos editar reserva |
| `components/AdminHeader/Header.module.css` | 413 | Estilos header admin |
| `components/AdminReservas/ReservasTable.module.css` | 16668 | Estilos tabla reservas |

### Características CSS del Admin:

**1. Login Page (`page.module.css`):**
- Background mesh radial gradients (púrpura, azul, rosa)
- Orbs flotantes con blur (3 orbs)
- Card glass con blur(24px)
- Gradient top line
- Inputs con glow effects
- Button con gradiente #EC008C → #92278F
- Error box roja

**2. Dashboard Page:**
- Stats grid con colores variables
- Action cards con hover glow
- Card bar de color según tipo
- Badges "Sincronizar", "Pronto"
- Arrow CTA en cards
- Ambient orbs animados

**3. Admin Header:**
- Logo con filter drop-shadow
- Nav links con hover gradient
- Logout button con icono
- Hamburger menu mobile
- Shimmer animation en logo text
- Gradient line fija

**4. Reservas Table:**
- Glass morphism design
- Row hover effects
- Tipo badges (Mesa/Bicicleta)
- Status indicators
- Loading spinner
- Empty/Error states

### Herencia del Tema Oscuro:

1. **Background Base:** `#030303` o `#09090b`
2. **Texto:** `#F5F5F5` (casi blanco)
3. **Glassmorphism:** Fondos semi-transparentes con blur
4. **Colores de Marca Legacy:**
   - Rosa: `#EC008C` (primaria)
   - Púrpura: `#92278F` (secundaria)
   - Azul: `#14AEEF` (terciaria)
   - Amarillo: `#FFE600` (badge)

---

## 8. RESUMEN DE ARCHIVOS PRINCIPALES

### Rutas Administrativas (10 archivos):
```
/admin/login           → page.tsx + page.module.css
/admin/dashboard       → page.tsx + page.module.css
/admin/reservas        → page.tsx + page.module.css
/admin/reservas/crear  → page.tsx + page.module.css
/admin/reservas/editar/[id] → page.tsx + page.module.css
```

### Componentes Admin (4 componentes):
```
AdminHeader/Header.tsx
AdminHeader/Header.module.css
AdminReservas/ReservasTable.tsx
AdminReservas/ReservasTable.module.css
AdminReservas/EditarReservaModal.module.css
AdminReservas/index.ts
```

### API Routes (7 endpoints):
```
/api/admin/login
/api/admin/importar
/api/bd/reservas
/api/bd/reservas/calendario
/api/bd/servicios
/api/bd/locales
/api/bd/combos
```

### Configuración Global:
```
app/globals.css (452 líneas - CSS Variables + utilidades)
app/layout.tsx (38 líneas - Root layout)
postcss.config.mjs (Tailwind CSS v4)
next.config.ts (Config Next.js)
package.json (Dependencias: GSAP, Lucide-React, Next 16, React 19)
```

---

## 9. TECNOLOGÍAS Y LIBRERÍAS

### Dependencies:
- **Next.js** 16.2.2 - Framework React
- **React** 19.2.4 - UI Library
- **GSAP** 3.14.2 - Animaciones avanzadas
- **Lucide-React** 1.8.0 - Iconos

### DevDependencies:
- **Tailwind CSS** ^4 - Utility CSS
- **@tailwindcss/postcss** ^4 - PostCSS plugin
- **TypeScript** ^5 - Type safety
- **ESLint** ^9 - Linting

### Architecture Pattern:
- **Next.js App Router** (no Pages Router)
- **Server Components** por defecto
- **Client Components** con 'use client'
- **CSS Modules** para estilos locales
- **CSS Variables** para theming

---

## 10. PUNTOS CLAVE IDENTIFICADOS

### Fortalezas:
1. ✅ Sistema de diseño coherente con CSS Variables
2. ✅ Animaciones fluidas con GSAP
3. ✅ Componentes reutilizables
4. ✅ TypeScript para type safety
5. ✅ Responsive design
6. ✅ Glass morphism moderno

### Limitaciones/Áreas de Mejora:
1. ❌ No hay layout global para admin (/app/admin/layout.tsx)
2. ❌ No hay theming dinámico (light/dark)
3. ❌ No hay Context/Provider para estado global
4. ❌ Autenticación es mock (tokens en localStorage)
5. ❌ Herencia de colores legacy complica el theming
6. ❌ No hay componentes reutilizables para forms
7. ❌ CSS duplicado en múltiples CSS Modules

---

## RUTAS DEL ADMIN - RESUMEN VISUAL

```
/admin
├── /login (GET)
│   └── FormulariosLogin + Animaciones GSAP
│   └── POST → /api/admin/login
│   └── Guarda token en localStorage
│
├── /dashboard (GET - Requiere token)
│   └── 4 Stat Cards (Reservas hoy, semana, pendientes, completadas)
│   └── 4 Action Cards (Importar, Gestionar, Reportes, Config)
│   └── Header Admin
│
├── /reservas (GET - Requiere token)
│   ├── Vista: Calendario (por defecto)
│   ├── Vista: Lista (toggle)
│   ├── Filtros: Local, Fecha, Tipo, Cliente
│   ├── Tabla de reservas con estado
│   └── Botón: + Nueva Reserva
│
├── /reservas/crear (GET - Requiere token)
│   └── Formulario: Local, Fecha, Hora, Tipo, Cliente, Teléfono
│   └── POST → /api/bd/reservas
│
└── /reservas/editar/[id] (GET - Requiere token)
    └── Formulario edición (pre-poblado)
    └── PUT → /api/bd/reservas
```

