# 00 · PASO A PASO — Cómo correr todo esto (AUTO, sin pegar nada)

Este paquete corre **solo** en la terminal: `run-all.sh` toma todos los prompts de la
carpeta `cola/`, los ejecuta **uno tras otro** con Claude Code en modo headless
(sin pedir permisos), y deja logs + un RESUMEN al final. Tú solo exportas las
credenciales y corres **un** comando.

---

## Contenido de la carpeta

| Archivo / carpeta | Qué es |
|---|---|
| `run-all.sh` | **El auto-runner.** Valida rama, corre toda la `cola/` sola y deja logs + RESUMEN. |
| `cola/` | Los prompts que se corren **en orden** (01, 02, 03…). Ya trae `01-auditoria-maestra.md`. |
| `DIAGNOSTICO-59-AJUSTES.md` | Los 59 ajustes verificados (causa, evidencia, fix). |
| `HALLAZGOS-EXPERTOS-agentes.md` | Auditoría de código con archivo y línea. |
| `PROMPT-rediseno-UX-portal-inversor.md` | Spec de rediseño UX del portal. |
| `PROMPT-MAESTRO-equipo-agentes.md` | Copia del prompt maestro (el mismo que está en `cola/01`). |
| `CUESTIONARIO-FUENTES-*.xlsx` | Para que Juan / Carlos / Alejandra confirmen de dónde sale cada dato. |
| `logs/` y `RESUMEN-EJECUCION-*.md` | Se crean al correr. |

---

## PASO 1 — No tienes que mover nada

El runner **busca el repo `empresa-os` solo** (Desktop, Documents, Home, Downloads…) y
copia el diagnóstico adentro automáticamente. Deja el ZIP descomprimido donde quieras
(ej. Desktop).

Si tu repo está en un lugar raro y no lo encuentra, se lo dices con una línea antes de
correr:

```
export RP_REPO="$HOME/Documents/empresa-os"   # <- la ruta donde está tu empresa-os
```

(Para saber la ruta: en Finder, clic derecho sobre la carpeta `empresa-os` → "Obtener
información" → mira "Ubicación".)

## PASO 2 — Exportar credenciales (una vez, en esa terminal)

> El script **nunca** guarda estas claves: las lee del entorno y se las pasa al agente
> solo para que pueda verificar logueado. No las escribas dentro de ningún archivo ni
> las subas a git. Ideal: un usuario QA dedicado con clave desechable.

```
export RP_QA_EMAIL='qa-...@rentalprofitss.com'
export RP_QA_PASSWORD='...'
export RP_QA_ADMIN_EMAIL='gerencia@rentalprofitss.com'
export RP_QA_ADMIN_PASSWORD='...'
```

(Si no las exportas, igual corre: hace todo el trabajo de código y la verificación
logueada la haces tú al final.)

## PASO 3 — Correr TODO con un comando

```
bash run-all.sh
```

Eso hace, solo:
1. Confirma que estás en la rama `feat/portal-inversionista-v2` (si no, la cambia).
2. Recorre `cola/*.md` en orden y por cada uno abre Claude Code headless con
   `--dangerously-skip-permissions` en **Opus**, le antepone el contexto fijo del
   negocio y lo deja ejecutar de punta a punta.
3. Cada prompt commitea+pushea a la rama y despliega a **empresa-os-admin**.
4. Guarda un log por prompt en `logs/` y un `RESUMEN-EJECUCION-*.md` al final.

## PASO 4 — Revisar

Abre el `RESUMEN-EJECUCION-*.md` y entra a **empresa-os-admin.vercel.app**
(logueado normal) para ver los cambios. Los `logs/` tienen el detalle de cada prompt.

---

## Cómo agregar más prompts a la fila

¿Quieres que corra algo más después? Suelta un `.md` nuevo en `cola/` con número:
`cola/02-lo-que-sea.md`, `cola/03-otra-cosa.md`… El runner los corre en ese orden.
Así encadenas todo lo que quieras sin tocar el script.

---

## DECISIONES que conviene dejar resueltas antes de correr

1. **Horizontes**: unificar en **3/5/8** o **4/6/8** (hoy conviven los dos).
   Recomendación: **3/5/8**.
2. **Cerebro IA**: proveedor/API (Anthropic u OpenAI) + prompt base.
3. **Deuda Airtable (~$4.98M) vs QuickBooks (~$5.97M)**: reconciliar el ~$1M.
4. **Ledger / Documentos / Mensajes**: se ocultan, no se borran (reversible).

Si no las dejas resueltas, el agente las marcará como pendientes en el reporte final
y no asumirá por su cuenta.

---

## Reglas que el runner NO rompe

- Nunca push a `main`; todo va a la rama.
- Nunca borra datos de producción (Airtable/QuickBooks/Supabase) sin pedírtelo.
- Nunca comitea claves/tokens; contraseñas solo por variable de entorno.
- Pagos y write-backs a Airtable/QuickBooks **nunca** automáticos (dry-run + firma).
- Ningún número sin trazabilidad a su fuente ("un dato, una fuente").
- Toda fórmula (déficit, NOI, DSCR, TIR, EVM/CPI/SPI, cartera, nómina) verificada a mano.
