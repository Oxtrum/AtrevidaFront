# ARCHIVOS CLAVE - RUTAS ABSOLUTAS Y CONTENIDOS

## ARCHIVOS DE CONFIGURACIÓN GLOBAL

### 1. app/globals.css
**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/globals.css`
**Líneas:** 452
**Contenido:**
- Variables CSS para todo el sistema de diseño
- Colores base (#09090b fondo, #fafafa texto)
- Colores de marca legacy (#EC008C, #92278F, #14AEEF, #FFE600)
- Glassmorphism surfaces y borders
- Gradientes premium
- Sombras tintadas
- Transiciones con spring physics
- Clases de utilidad (.af-glass, .af-badge, .af-stripe)
- Animaciones globales (@keyframes)
- Estilos de scrollbar personalizado

### 2. app/layout.tsx
**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/layout.tsx`
**Líneas:** 38
**Contenido:**
- Root layout que aplica a toda la app
- Importa fonts: Geist y Geist_Mono de Google
- Importa globals.css
- Incluye ToastContainer para notificaciones
- Estructura HTML: html + body flex

### 3. postcss.config.mjs
**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/postcss.config.mjs`
**Contenido:**
```javascript
{
  "@tailwindcss/postcss": {}
}
```

### 4. next.config.ts
**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/next.config.ts`
**Contenido:**
- Config de imagen: qualities: [100, 75]

### 5. package.json
**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/package.json`
**Dependencias principales:**
- next@16.2.2
- react@19.2.4
- react-dom@19.2.4
- gsap@3.14.2
- lucide-react@1.8.0
- tailwindcss@4
- @tailwindcss/postcss@4

---

## RUTAS DEL ADMIN - ARCHIVOS PRINCIPALES

### ADMIN LOGIN

**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/login/page.tsx`
**Líneas:** 223
**Client Component** ('use client')
**Características:**
- Formulario con username/password
- Eye toggle para mostrar contraseña
- Animaciones GSAP: orbs flotantes, card entrada, stagger de elementos
- Error handling con animación shake
- Loading state
- POST a /api/admin/login
- Guarda token en localStorage
- Redirecciona a /admin/dashboard

**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/login/page.module.css` (456 líneas)

---

### ADMIN DASHBOARD

**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/dashboard/page.tsx`
**Líneas:** 283
**Client Component** ('use client')
**Características:**
- 4 Stat cards (Reservas hoy, semana, pendientes, completadas)
- 4 Action cards con badges y CTA
- Greeting dinámico según hora
- Botón logout
- Animaciones GSAP entrada

**Acciones:**
- Importar Datos → POST /api/admin/importar
- Gestionar Reservas → router.push('/admin/reservas')
- Reportes → alert('Próximamente')
- Configuración → alert('Próximamente')

**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/dashboard/page.module.css` (509 líneas)

---

### ADMIN RESERVAS (LISTADO)

**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/page.tsx`
**Líneas:** 251
**Client Component** ('use client')
**Características:**
- Toggle de vista: Calendario / Lista
- Filtros: Local, Fecha Desde, Fecha Hasta, Tipo, Cliente
- Calendario admin o tabla de reservas
- Hook useReservasFiltradas para obtener datos
- Hook useLocales para opciones de local

**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/page.module.css` (370 líneas)

---

### ADMIN RESERVAS - CREAR

**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/crear/page.tsx`
**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/crear/page.module.css` (108 líneas)

---

### ADMIN RESERVAS - EDITAR

**Ruta:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/editar/[id]/page.tsx`
**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/admin/reservas/editar/[id]/page.module.css` (324 líneas)

---

## COMPONENTES ADMIN

### AdminHeader

**Archivo:** `/home/skully/Progra/Atrevida/AtrevidaFront/components/AdminHeader/Header.tsx`
**Líneas:** 199
**Client Component** ('use client')
**Características:**
- Logo fijo (z-index: 1000)
- Nav links: Inicio, Reservas
- Logout button con icono
- Mobile hamburger menu
- Blur dinámico en scroll
- Gradient line en scroll
- Animaciones GSAP entrada

**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/components/AdminHeader/Header.module.css` (413 líneas)

---

### ReservasTable

**Archivo:** `/home/skully/Progra/Atrevida/AtrevidaFront/components/AdminReservas/ReservasTable.tsx`
**Líneas:** 160
**Client Component** ('use client')
**Props:**
- reservas: ReservaBD[]
- total: number
- loading: boolean
- error: string | null

**Estados:**
- Loading: spinner
- Error: mensaje con icono
- Empty: sin reservas
- Success: tabla con filas

**Estilos:** `/home/skully/Progra/Atrevida/AtrevidaFront/components/AdminReservas/ReservasTable.module.css` (16668 líneas)

---

## API ROUTES

### POST /api/admin/login

**Archivo:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/api/admin/login/route.ts`
**Líneas:** 20
**Estado:** Mock authentication
**Acepta:** username, password
**Retorna:**
```json
{
  "success": true,
  "token": "mock-admin-token-12345",
  "user": { "username": "...", "role": "admin" }
}
```

---

### POST /api/admin/importar

**Archivo:** `/home/skully/Progra/Atrevida/AtrevidaFront/app/api/admin/importar/route.ts`
**Requiere:** Authorization header con token Bearer

---

## IMPORTS CLAVE EN COMPONENTES

### Header Admin
```typescript
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { LogOut } from 'lucide-react';
import styles from './Header.module.css';
```

### Dashboard Admin
```typescript
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { CalendarDays, BarChart2, Clock, CheckCircle2, Download, CalendarCheck, BarChart3, Settings, Calendar, LogOut, ArrowRight } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
```

### Reservas Admin
```typescript
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { DiaSemana } from '@/types/reserva';
import { CalendarAdmin } from '@/components/Calendar';
import { useLocales } from '@/lib/hooks/useLocales';
import { useReservasFiltradas } from '@/lib/hooks/useReservasFiltradas';
import { ReservasTable } from '@/components/AdminReservas';
import { CustomSelect } from '@/components/Custom/CustomSelect';
import { Input } from '@/components/Shared';
import Header from '@/components/AdminHeader/Header';
```

---

## VARIABLES CSS MÁS USADAS EN ADMIN

```css
/* Colores principales */
#030303              /* Fondo páginas admin */
#EC008C              /* Rosa primaria (botones, borders) */
#92278F              /* Púrpura (gradientes) */
#14AEEF              /* Azul (accents) */
#FFE600              /* Amarillo (badges) */

/* CSS Variables */
var(--af-bg)         /* #09090b - Fondo */
var(--af-text)       /* #fafafa - Texto */
var(--af-border)     /* Bordes sutiles */
var(--af-glass)      /* Vidrio para cards */
var(--af-blur)       /* blur(16px) */
var(--af-shadow-md)  /* Sombra media */
```

---

## RUTAS PROTEGIDAS - AUTENTICACIÓN

Todas las rutas del admin (excepto login) verifican:
```typescript
const token = localStorage.getItem('adminToken');
if (!token) {
  router.push('/admin/login');
}
```

Token almacenado en localStorage con clave: `adminToken`

---

## ANIMACIONES GSAP UTILIZADAS

### En Login:
- Fade-in de página
- Scale + fade de card
- Stagger de elementos interiores
- Float loops de orbs
- Shake en error
- Flash en success

### En Dashboard:
- Fade-in header
- Stagger fade-in de stats
- Scale fade-in de cards
- Float loops de orbs

### En Header Admin:
- Slide in del logo
- Fade-in de nav links
- Scale in de botón logout
- Fade in de gradient line

---

## COLORES DE TARJETAS DE ACCIÓN (Dashboard)

Cada card tiene:
- `--card-color`: color primario (#EC008C, #92278F, #14AEEF, #FFE600)
- `--card-color-rgb`: versión RGB para opacidades

La tarjeta usa el color para:
- Top bar
- Border en hover
- Icon background
- Glow effect

