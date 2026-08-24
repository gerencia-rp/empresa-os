# AGENTS.md — Empresa OS (Rental Profits)

## Fuente de verdad

Antes de trabajar, lee **completo** `CLAUDE.md`. Es la memoria persistente y la fuente de verdad del proyecto: arquitectura, estado de producción, reglas de negocio, seguridad, diseño, comandos y lecciones aprendidas. No lo traduzcas ni reemplaces nombres técnicos de proveedores, modelos, rutas, funciones o endpoints.

Si este archivo y `CLAUDE.md` parecen contradecirse, detente, muestra la contradicción y pide confirmación. No resuelvas el conflicto modificando producción ni reinterpretando la arquitectura.

## Convenciones del repositorio

- Rama de producción: `main`. Un push a `main` puede desplegar automáticamente en Vercel.
- Runtime declarado: Node `20.x`. No uses el Node global 26 para regenerar dependencias o lockfiles.
- Package manager: npm; conserva `package-lock.json`.
- Comandos principales: `npm run dev`, `npm run build` y `npm run ci:gate`.
- Antes de proponer un cambio, revisa `git status`, la rama actual y el diff existente. No sobrescribas cambios locales ni archivos sin seguimiento.
- Mantén las convenciones de commits y el checklist de `CLAUDE.md`.

## Guardrails obligatorios

- No hagas push, merge, deploy ni cambios de rama con trabajo activo sin aprobación explícita del usuario.
- No ejecutes migraciones, `supabase db push`, despliegues de Edge Functions, cambios de secrets, cron/jobs ni escrituras de datos sin aprobación explícita.
- No modifiques variables, dominios o configuración de Vercel ni Supabase sin aprobación explícita.
- No uses producción para probar. Empieza con análisis de solo lectura y verificaciones locales.
- Nunca muestres, copies a reportes, commits o logs valores de `.env`, tokens, cookies, claves o credenciales.
- No ejecutes comandos destructivos ni descartes cambios locales. Si una acción puede afectar producción, explica el impacto y pide aprobación antes de ejecutarla.

## Verificación mínima

Para cambios de código, ejecuta las verificaciones relevantes descritas en `CLAUDE.md`; como base, `npm run ci:gate` y `npm run build` cuando correspondan. Reporta por separado lo verificado localmente y lo que siga pendiente de validación externa o de producción.
