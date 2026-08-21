#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  run-all.sh — AUTO-RUNNER desatendido de Flipping Rentals OS
#  Corre TODOS los prompts de la carpeta cola/ en orden, uno tras otro,
#  con Claude Code en modo headless (--dangerously-skip-permissions),
#  sin que tengas que pegar nada a mano. Deja logs y un RESUMEN al final.
#
#  USO:
#     cd ~/Desktop/LA-BOVEDA-DEPLOY-FINAL   (o donde esté esta carpeta)
#     export RP_QA_EMAIL='...'         # usuario QA de solo-lectura (recomendado)
#     export RP_QA_PASSWORD='...'
#     export RP_QA_ADMIN_EMAIL='...'   # admin, para verificar logueado
#     export RP_QA_ADMIN_PASSWORD='...'
#     bash run-all.sh
#
#  NOTA DE SEGURIDAD: este script NUNCA guarda tus contraseñas. Las lee
#  de las variables de entorno que tú exportas y se las pasa al agente
#  como referencia. No las escribas dentro de este archivo ni las subas
#  a git. Ideal: un usuario QA dedicado con clave desechable.
# ═══════════════════════════════════════════════════════════════════

set -uo pipefail

BRANCH="feat/portal-inversionista-v2"
MODEL="opus"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLA="$HERE/cola"
LOGS="$HERE/logs"
STAMP="$(date +%Y%m%d-%H%M%S)"
RESUMEN="$HERE/RESUMEN-EJECUCION-$STAMP.md"

mkdir -p "$LOGS"

echo "═══════════════════════════════════════════"
echo "  AUTO-RUNNER — Flipping Rentals OS"
echo "  $(date)"
echo "═══════════════════════════════════════════"

# ── 1. Ubicar el repo empresa-os (no hace falta mover esta carpeta) ─
# Prioridad: variable RP_REPO → esta carpeta o su padre → lugares comunes → buscar.
find_repo() {
  # 1) override manual
  if [ -n "${RP_REPO:-}" ] && [ -f "${RP_REPO}/app.js" ]; then echo "$RP_REPO"; return; fi
  # 2) esta carpeta o su padre (si la copiaron dentro del repo)
  if [ -f "$HERE/app.js"    ]; then echo "$HERE"; return; fi
  if [ -f "$HERE/../app.js" ]; then (cd "$HERE/.." && pwd); return; fi
  # 3) ubicaciones típicas en Mac
  for d in "$HOME/Desktop/empresa-os" "$HOME/Documents/empresa-os" \
           "$HOME/empresa-os" "$HOME/Downloads/empresa-os" \
           "$HOME/Desktop/LA-BOVEDA-DEPLOY-FINAL" "$HOME/Projects/empresa-os"; do
    if [ -f "$d/app.js" ]; then echo "$d"; return; fi
  done
  # 4) búsqueda acotada (rápida) en el home
  local hit
  hit="$(find "$HOME" -maxdepth 5 -type f -name app.js -path '*empresa-os*' 2>/dev/null | head -n1)"
  if [ -n "$hit" ]; then dirname "$hit"; return; fi
  hit="$(find "$HOME" -maxdepth 5 -type f -name app.js 2>/dev/null | head -n1)"
  if [ -n "$hit" ]; then dirname "$hit"; return; fi
}

REPO0="$(find_repo)"
if [ -z "${REPO0:-}" ]; then
  echo "⚠  No pude localizar el repo empresa-os (la carpeta con app.js, os/, pm/)."
  echo "   Pásame su ruta y volvé a correr, ej.:"
  echo "     export RP_REPO=\"\$HOME/Documents/empresa-os\""
  echo "     bash run-all.sh"
  exit 1
fi
echo "→ Repo detectado: $REPO0"

# ── 2. Elegir el WORKTREE correcto ─────────────────────────────────
# Este repo usa git worktrees: 'empresa-os' está en main (prod viejo) y
# 'empresa-os-admin' es un worktree con la rama de trabajo (dominio del CEO).
# La rama feat/portal-inversionista-v2 ya está checked-out en uno de ellos:
# hay que TRABAJAR EN ESE, no intentar checkout (git lo bloquea).
resolve_worktree() {
  local base="$1" cur="" wt=""
  while IFS= read -r line; do
    case "$line" in
      "worktree "*) cur="${line#worktree }" ;;
      "branch refs/heads/"*)
        [ "${line#branch refs/heads/}" = "$BRANCH" ] && wt="$cur" ;;
    esac
  done < <(git -C "$base" worktree list --porcelain 2>/dev/null)
  echo "$wt"
}

WT="$(resolve_worktree "$REPO0")"
if [ -n "$WT" ] && [ -f "$WT/app.js" ]; then
  REPO="$WT"
  echo "→ La rama $BRANCH ya vive en el worktree: $REPO"
  echo "  (trabajo ahí; ese es el que ve el CEO en empresa-os-admin.vercel.app)"
  cd "$REPO"
  git pull --ff-only 2>/dev/null || echo "⚠  git pull sin fast-forward; seguí igual."
else
  REPO="$REPO0"
  cd "$REPO"
  CURR="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  if [ "$CURR" != "$BRANCH" ]; then
    echo "→ Cambiando a $BRANCH (estabas en $CURR)"
    if ! git checkout "$BRANCH" 2>/tmp/rp_co.err; then
      cat /tmp/rp_co.err
      echo "⚠  No pude cambiar de rama en $REPO."
      echo "   Suele ser porque la rama está en OTRO worktree (ej. empresa-os-admin)."
      echo "   Pásame esa carpeta directamente y corré de nuevo:"
      echo "     export RP_REPO=\"\$HOME/Desktop/CLAUDE CODE/empresa-os-admin\""
      echo "     bash run-all.sh"
      exit 1
    fi
  fi
  git pull --ff-only 2>/dev/null || echo "⚠  git pull sin fast-forward; seguí igual."
fi
echo "→ Rama OK: $BRANCH  ·  carpeta de trabajo: $REPO"

# Copiar el paquete de diagnóstico DENTRO de la carpeta de trabajo (para que los
# agentes lo lean), salvo que esta carpeta ya viva ahí.
DEST="$REPO/DIAGNOSTICO-EMPRESA-OS"
if [ "$(cd "$HERE" && pwd)" != "$(cd "$DEST" 2>/dev/null && pwd || echo _nope_)" ]; then
  echo "→ Copiando el diagnóstico a $DEST"
  mkdir -p "$DEST"
  cp -R "$HERE/"* "$DEST/" 2>/dev/null || true
fi

# ── 3. Claude Code instalado ───────────────────────────────────────
if ! command -v claude >/dev/null 2>&1; then
  echo "⚠  'claude' no está instalado. Instala Claude Code y volvé a correr."
  exit 1
fi

# ── 4. Credenciales (solo aviso; nunca se guardan) ─────────────────
CREDS_OK=1
for v in RP_QA_ADMIN_EMAIL RP_QA_ADMIN_PASSWORD; do
  if [ -z "${!v:-}" ]; then CREDS_OK=0; fi
done
if [ "$CREDS_OK" = "1" ]; then
  echo "→ Credenciales de verificación detectadas (admin: ${RP_QA_ADMIN_EMAIL})."
else
  echo "→ Sin credenciales exportadas: el agente hará el trabajo de código,"
  echo "  pero la verificación logueada la harás tú al final. (Opcional.)"
fi

# ── 5. Preámbulo común que se antepone a CADA pasada ───────────────
# (cada run headless es sesión nueva, por eso se recuerda el contexto clave)
read -r -d '' PREAMBLE <<PRE || true
CONTEXTO FIJO (respetalo en TODO el run, no lo repreguntes):
- Repo empresa-os, rama de trabajo: $BRANCH. Deploy que MIRA el CEO:
  empresa-os-admin.vercel.app. Al terminar cada lote: commit Y push a la rama,
  y deploy a empresa-os-admin (npx vercel --prod --yes --scope rental-profits).
- Airtable = fuente de verdad ("un dato, una fuente"): no recalcular lo que la fuente ya tiene.
- Diagnóstico ya hecho en cola/, DIAGNOSTICO-59-AJUSTES.md y HALLAZGOS-EXPERTOS-agentes.md
  (usalos, no arranques de cero). Estado del proceso: AUDITORIA-RENTAL-PROFITSS.md.
- Credenciales de verificación (si necesitás entrar logueado) están en variables de
  entorno del proceso: RP_QA_ADMIN_EMAIL / RP_QA_ADMIN_PASSWORD (y RP_QA_* de solo-lectura).
  Leelas del entorno; NO las imprimas ni las comitees.

════════ DECISIONES YA TOMADAS POR EL CEO (no las repreguntes) ════════
1. DÉFICIT — fuente ÚNICA = ff_deals.deficit_total de Airtable (verificado en Supabase:
   suma \$297,690 en casas rentando). La app NO lo recalcula más. Significado: "caja
   metida que aún no se recupera; se recupera al refinanciar/vender". Casas en rehab/
   adquiridas tienen deficit_total = null → mostrar "en proceso, aún no estabilizada",
   NO inventar número. Prohibir las otras 3-4 fórmulas (net_total del draw, draws−gastos−
   downpayment, etc.). Convención: déficit = magnitud positiva de caja atrapada.
2. HORIZONTES de escenarios = 3 / 5 / 8 años, FIJO en TODO el sistema (una sola constante
   HORIZONTES; eliminar los 4/6/8 donde existan).
3. CONSOLIDAR DEPLOY / FUSIÓN = AUTORIZADO (decisión del CEO). Base = la RAMA (números
   correctos + Portal v2 + arreglos de auditoría). Se le montan encima Jarvis/Agent Network
   y el REBRAND "royal/cálida" de main (ese es el diseño ganador). En TODO conflicto de
   datos/lógica/números GANA la rama. La ejecuta el prompt cola/02-merge-consolidacion.md
   con doble respaldo, rama merge/consolidacion aparte, gate de re-verificación de números
   y auto-revert si algo regresa. NO cambiar el dominio de prod (queda como paso manual).
4. RENTA REAL para salud financiera (NOI/DSCR/CoC) = RENT-ROLL ACTUAL: lo que la casa
   cobra HOY según el contrato/reserva vigente (pm_payments del mes en curso), NO el
   promedio trailing-12 ni la renta modelada. La modelada solo para proyección, etiquetada.
5. CEREBRO IA = proveedor Anthropic (Claude), reusando la key ya existente en los secrets
   de Supabase (ANTHROPIC_API_KEY, confirmada presente). Prompt base: experto en TODO el
   negocio (Fix&Flip, Remodelación, Rentas, Portal Inversor), conectado a Airtable/Supabase/
   QuickBooks, líder del equipo de bots, responde simple "como a un niño". Omnipresente.
6. SEGURIDAD (auth en edge functions de escritura): el CEO la despliega manualmente por
   CLI. NO re-ejecutes ese deploy; dalo por hecho.

════════ MODO AUTÓNOMO — NO TE DETENGAS ════════
- Al empezar, LEÉ AUDITORIA-RENTAL-PROFITSS.md y continuá desde el próximo lote/ajuste
  PENDIENTE (no rehagas lo ya hecho ni lo ya committeado).
- Ejecutá TODOS los ajustes (los 59 / lotes B1–B8) de corrido, en orden de prioridad.
  NO pares a preguntar: las decisiones ya están arriba. Avanzá el MÁXIMO posible.
- Reglas que sí frenan un ítem puntual (saltalo, documentalo y SEGUÍ con los demás):
  borrar datos de producción, ejecutar pagos/write-backs a Airtable/QuickBooks,
  conflictos reales de merge, o algo que quede sin key/secret. Todo lo demás: hacelo.
- No comitees secretos. Toda fórmula verificada a mano con un caso real. Verificá en
  carga NORMAL logueada (sin forzar osInit). "Ocultar, no borrar" para pestañas.
- Al final de esta pasada, escribí el avance en AUDITORIA-RENTAL-PROFITSS.md. Cuando NO
  queden ajustes ejecutables pendientes, escribí EXACTAMENTE esta línea al final:
      === AUDITORIA COMPLETA ===

Ahora continuá la auditoría-corrección de punta a punta:
PRE

# ── 6. Construir la cola de prompts ────────────────────────────────
if [ ! -d "$COLA" ] || [ -z "$(ls -A "$COLA"/*.md 2>/dev/null)" ]; then
  echo "⚠  No hay prompts en $COLA. Debe existir cola/01-*.md, cola/02-*.md, ..."
  exit 1
fi

# (bash 3.2 de macOS no tiene 'mapfile'; usamos while-read compatible)
FILES=()
while IFS= read -r _line; do
  [ -n "$_line" ] && FILES+=("$_line")
done < <(ls -1 "$COLA"/*.md 2>/dev/null | sort)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "⚠  No hay prompts en $COLA (cola/01-*.md, cola/02-*.md, ...)."
  exit 1
fi
echo "→ ${#FILES[@]} prompt(s) en cola, se corren en este orden:"
for f in "${FILES[@]}"; do echo "     · $(basename "$f")"; done
echo ""

# ── 7. Correr en LOOP hasta que la auditoría esté completa ─────────
# Cada 'claude -p' es una sesión que en algún momento cierra su turno. Para que
# NO se detenga a mitad, repetimos la cola en pasadas: en cada pasada el agente
# lee AUDITORIA-RENTAL-PROFITSS.md y continúa con el próximo ajuste pendiente.
# El loop para cuando el agente escribe "=== AUDITORIA COMPLETA ===" o al tope.
MAX_PASSES="${RP_MAX_PASSES:-12}"
# El loop para cuando el ÚLTIMO prompt de la cola declara su fin. Si la cola incluye
# el merge (02), el fin lo marca "=== MERGE COMPLETO ==="; si solo está la auditoría,
# lo marca "=== AUDITORIA COMPLETA ===".
SENTINEL_AUDIT="=== AUDITORIA COMPLETA ==="
SENTINEL_MERGE="=== MERGE COMPLETO ==="

echo "# RESUMEN DE EJECUCIÓN — $STAMP" >  "$RESUMEN"
echo ""                                >> "$RESUMEN"
echo "Modo autónomo en loop (hasta $MAX_PASSES pasadas o hasta AUDITORIA COMPLETA)." >> "$RESUMEN"
echo "" >> "$RESUMEN"

pass=0
done_flag=0
while [ "$pass" -lt "$MAX_PASSES" ]; do
  pass=$((pass+1))
  echo "═══════════════════════════════════════════"
  echo "  PASADA $pass / $MAX_PASSES"
  echo "═══════════════════════════════════════════"
  echo "## Pasada $pass" >> "$RESUMEN"

  i=0
  for f in "${FILES[@]}"; do
    i=$((i+1))
    name="$(basename "$f" .md)"
    log="$LOGS/${STAMP}__p${pass}__${name}.log"
    echo "  [p$pass · $i/${#FILES[@]}] $name  → log: $log"

    PROMPT="$PREAMBLE
(Esta es la PASADA $pass. Continuá desde el próximo ajuste pendiente y avanzá lo más posible.)

$(cat "$f")"

    if claude -p "$PROMPT" \
          --dangerously-skip-permissions \
          --model "$MODEL" \
          --verbose 2>&1 | tee "$log"; then
      echo "- ✅ p$pass $name (log p${pass}__${name})" >> "$RESUMEN"
    else
      echo "- ⚠️ p$pass $name salió con error (log p${pass}__${name})" >> "$RESUMEN"
    fi

    # Solo el ÚLTIMO prompt de la cola decide el fin del loop.
    if [ "$i" -eq "${#FILES[@]}" ]; then
      if grep -qF "$SENTINEL_MERGE" "$log" 2>/dev/null || grep -qF "$SENTINEL_AUDIT" "$log" 2>/dev/null; then
        done_flag=1
      fi
    fi
    echo ""
  done

  if [ "$done_flag" = "1" ]; then
    echo "→ ✅ El agente declaró: AUDITORIA COMPLETA. Corto el loop."
    echo "" >> "$RESUMEN"; echo "**AUDITORIA COMPLETA declarada en la pasada $pass.**" >> "$RESUMEN"
    break
  fi
  echo "→ Pasada $pass terminada sin señal de fin; sigo con la siguiente."
done

if [ "$done_flag" != "1" ]; then
  echo "⚠  Llegué al tope de $MAX_PASSES pasadas sin 'AUDITORIA COMPLETA'."
  echo "   Puede faltar trabajo o haber ítems bloqueados (revisá el RESUMEN y los logs)."
  echo "   Para seguir: volvé a correr 'bash run-all.sh' (continúa desde donde quedó),"
  echo "   o subí el tope: export RP_MAX_PASSES=20"
  { echo ""; echo "**Tope de pasadas alcanzado sin declararse completa.** Revisar logs / reanudar."; } >> "$RESUMEN"
fi

# ── 8. Cierre ──────────────────────────────────────────────────────
{
  echo ""
  echo "## Estado del repo al terminar"
  echo '```'
  git -C "$REPO" log --oneline -8 2>/dev/null
  echo '```'
  echo ""
  echo "Rama: $BRANCH · Deploy a verificar: https://empresa-os-admin.vercel.app"
} >> "$RESUMEN"

echo "═══════════════════════════════════════════"
echo "  TODO CORRIDO. Resumen → $RESUMEN"
echo "  Logs por prompt → $LOGS/"
echo "  Verificá en: https://empresa-os-admin.vercel.app (logueado normal)"
echo "═══════════════════════════════════════════"
