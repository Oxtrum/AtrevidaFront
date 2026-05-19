<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Commands
- `npm run dev` - Start dev server at http://localhost:3000
- `npm run build` - Production build
- `npm run lint` - Run ESLint (uses nextVitals + nextTs configs)

## Tech Stack
- Next.js 16.2.2 with App Router
- React 19.2.4
- Tailwind CSS 4 (via @tailwindcss/postcss)
- GSAP for animations
- Lucide React for icons

## Structure
- `app/` - Main app directory with pages, layouts, and API routes
- `app/page.tsx` - Home page (Atrevida tourism site)
- `app/reservas/` - Public reservation pages
- `app/admin/` - Admin section (login, dashboard, reservas)
- `app/api/` - API routes for BD (database), reservas, admin

## Key Notes
- No TypeScript typecheck command in package.json - only `lint`
- No test framework configured
- Strict mode enabled in tsconfig.json
- Path alias: `@/*` maps to root `./`
- ESLint uses flat config (`eslint.config.mjs`)

## UI/UX Guidance
- Use the `design-taste-frontend` skill for UI decisions
- Follow metric-based design rules and component architecture
- Use CSS hardware acceleration where appropriate

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
