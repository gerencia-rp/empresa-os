# 🚀 Plan de Potenciación de Claude — Mac Nuevo

Guía paso a paso para tener Claude trabajando al 100% en TU proyecto. Hacelo de arriba para abajo. Tiempo total estimado: 30-40 min.

---

## 📦 Archivos que vas a usar

En la carpeta donde te entrego este plan vas a encontrar:

1. **`CLAUDE.md`** — memoria persistente del proyecto (va a la raíz del repo)  
2. **`claude-code-settings.json`** — settings óptimos de Claude Code (va a `~/.claude/settings.json`)  
3. **`PLAN_POTENCIACION_CLAUDE.md`** — este archivo

---

## 🎯 PARTE A — Instalación base (10 min)

### Paso A.1 — Mover CLAUDE.md al repo

**En Terminal del Mac nuevo:**

```shell
# Copiar el archivo que te entregué al repo
cp ~/Downloads/CLAUDE.md ~/Desktop/CLAUDE\ CODE/empresa-os/CLAUDE.md

# Verificar
cat ~/Desktop/CLAUDE\ CODE/empresa-os/CLAUDE.md | head -20
```

(Si descargaste el archivo a otra carpeta, ajustá la ruta de origen.)

### Paso A.2 — Commit CLAUDE.md al repo

```shell
cd ~/Desktop/CLAUDE\ CODE/empresa-os
git add CLAUDE.md
git commit -m "docs: agregar CLAUDE.md como memoria persistente del proyecto"
git push origin main
```

✅ Ahora cada sesión nueva de Claude Code en este repo lo va a leer automáticamente.

### Paso A.3 — Instalar settings de Claude Code

```shell
# Crear directorio si no existe
mkdir -p ~/.claude

# Copiar settings
cp ~/Downloads/claude-code-settings.json ~/.claude/settings.json

# Verificar
cat ~/.claude/settings.json
```

### Paso A.4 — Probar que Claude Code arranca con todo

```shell
cd ~/Desktop/CLAUDE\ CODE/empresa-os
claude
```

En el prompt de Claude Code, pegá:

```
Hola. Confirmame que leíste CLAUDE.md y que entendiste:
1. Qué stack uso
2. Cuál es el mapeo Airtable → DB final (Inquilinos = ?)
3. Por qué WRITEBACK_SAFE_MODE es importante
4. La regla del dedup de units en el calendario
```

Si Claude responde correctamente con info del CLAUDE.md → ✅ todo OK.

---

## 📁 PARTE B — Migrar contexto del Cowork viejo (10 min)

### Paso B.1 — Rescatar archivos .md del Mac viejo

**En el Mac VIEJO:**

1. Abrí Claude Desktop  
2. Andá a **Cowork**  
3. Abrí la sesión **"Review and improve web app"**  
4. En el panel derecho, sección **"Carpeta de trabajo"**, click en el icono de carpeta (📁) arriba a la derecha  
5. Se abre Finder en la carpeta de trabajo  
6. **Comprimí esa carpeta:** click derecho → "Comprimir"  
7. Vas a tener un `.zip` con todos los .md

### Paso B.2 — Transferir al Mac nuevo

Opciones (elegí la más cómoda):

**a) AirDrop:** click derecho en el `.zip` → Compartir → AirDrop → seleccionar Mac nuevo **b) iCloud Drive:** mové el `.zip` a iCloud Drive → en Mac nuevo, descargarlo **c) USB:** copiá el `.zip` al USB → enchufá al Mac nuevo

### Paso B.3 — Mover .md al repo en Mac nuevo

**En el Mac NUEVO:**

```shell
# Crear carpeta destino
mkdir -p ~/Desktop/CLAUDE\ CODE/empresa-os/docs/cowork-context

# Descomprimir el .zip donde lo bajaste (ajustá la ruta)
cd ~/Downloads
unzip "Review and improve web app.zip" -d cowork-md-temp/

# Mover .md al repo
mv cowork-md-temp/*.md ~/Desktop/CLAUDE\ CODE/empresa-os/docs/cowork-context/

# Verificar
ls -la ~/Desktop/CLAUDE\ CODE/empresa-os/docs/cowork-context/

# Limpiar temporal
rm -rf cowork-md-temp/
```

### Paso B.4 — Commit al repo

```shell
cd ~/Desktop/CLAUDE\ CODE/empresa-os
git add docs/cowork-context/
git commit -m "docs: migrar contexto de Cowork del Mac viejo (.md files)"
git push origin main
```

✅ Ahora el contexto histórico está en el repo y disponible para futuras sesiones.

---

## 💾 PARTE C — Migrar sesiones JSONL de Claude Code (opcional, 5 min)

Solo si querés tener el historial de chats de Claude Code del Mac viejo. Es opcional porque ya tenés CLAUDE.md \+ .md de contexto que cubren lo importante.

### Paso C.1 — En el Mac VIEJO

```shell
# Verificar que existan sesiones
ls ~/.claude/projects/

# Comprimir todas las sesiones
cd ~
tar -czf claude-code-sessions.tar.gz .claude/projects/

# Ver tamaño
du -sh claude-code-sessions.tar.gz
```

Transferí `claude-code-sessions.tar.gz` al Mac nuevo (AirDrop / iCloud / USB).

### Paso C.2 — En el Mac NUEVO

```shell
# Backup de las sesiones nuevas (si ya hay)
mv ~/.claude/projects ~/.claude/projects.backup 2>/dev/null

# Descomprimir
cd ~
tar -xzf ~/Downloads/claude-code-sessions.tar.gz

# Verificar
ls ~/.claude/projects/
```

**Importante:** los nombres de carpetas son hash del path del proyecto. Si el path del repo es DIFERENTE en el Mac nuevo, las sesiones NO van a aparecer asociadas al repo nuevo. Si querés que aparezcan, renombrá la carpeta:

```shell
# Buscar la carpeta del repo viejo
ls ~/.claude/projects/ | grep empresa-os

# Renombrarla al hash del path nuevo (calculá con esto en el Mac nuevo):
cd ~/Desktop/CLAUDE\ CODE/empresa-os && pwd | sed 's|/|-|g'
# Eso devuelve algo tipo: -Users-nicolaslara-Desktop-CLAUDE-CODE-empresa-os
# Renombrá la carpeta vieja a ese nombre

mv ~/.claude/projects/<nombre-viejo> ~/.claude/projects/<nombre-nuevo>
```

✅ Ahora cuando abras Claude Code en el repo vas a ver las sesiones viejas.

---

## 🔌 PARTE D — Conectar MCPs (10 min)

MCPs (Model Context Protocol) son conectores que le dan a Claude acceso directo a herramientas. Vamos a conectar 3 que aportan mucho:

### Paso D.1 — Supabase MCP

Permite a Claude correr queries SQL directos a tu DB sin escribir código.

```shell
# Instalar globalmente (Node)
npm install -g @supabase/mcp-server-supabase
```

Después configurá en `~/.claude/settings.json` (o vía Claude Desktop → Settings → Connectors):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://nezbaljfhhyznhltpjnk.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<tu-service-role-key>"
      }
    }
  }
}
```

⚠️ **El service role key** lo sacás de [https://supabase.com/dashboard/project/nezbaljfhhyznhltpjnk/settings/api](https://supabase.com/dashboard/project/nezbaljfhhyznhltpjnk/settings/api) → "service\_role" (NO el "anon").

⚠️ **Nunca commitees este archivo si tiene la key.** El service role key es full admin.

### Paso D.2 — GitHub MCP

Permite manejar issues, PRs, branches sin terminal.

Andá a [https://github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)** → scopes: `repo`, `read:org`, `workflow`. Generá. Copialo.

Agregá a `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<tu-token>"
      }
    }
  }
}
```

### Paso D.3 — Vercel MCP

Para ver logs de deploys, env vars, status.

```shell
npm install -g vercel
vercel login
```

(Vercel no tiene MCP oficial maduro al momento, pero el CLI con `vercel logs` ya te da mucho desde Claude Code.)

### Paso D.4 — Verificar MCPs

Cerrá y reabrí Claude Code. Pegale:

```
Listame los MCPs que tenés conectados y para cada uno qué podés hacer.
```

Tiene que mencionar Supabase, GitHub, y otros que tengas configurados.

---

## 🎓 PARTE E — Activar Skills (3 min)

Las skills son mini-instructivos especializados. En Claude Desktop / Cowork están disponibles por defecto. Verificá que estas estén activas para tu uso:

### Skills clave para tu workflow:

**Engineering:**

- `engineering:debug` — debugging estructurado  
- `engineering:code-review` — review de cambios  
- `engineering:incident-response` — cuando algo se rompe en prod  
- `engineering:testing-strategy` — diseñar tests

**Data:**

- `data:sql-queries` — escribir SQL  
- `data:analyze` — análisis de data  
- `data:explore-data` — perfilar tablas

**Productivity:**

- `productivity:task-management` — manejar TASKS.md  
- `productivity:memory-management` — gestionar memoria

**Operations:**

- `operations:runbook` — crear runbooks  
- `operations:status-report` — reportes de estado

### Cómo activarlas:

En Claude Desktop → **Cowork** → **Personalizar** → **Skills** → activá las que querés.

O cuando necesitás una, simplemente decile a Claude:

"Usá la skill de engineering:debug para diagnosticar este error"

Y Claude la carga sola.

---

## 🎯 PARTE F — Workflow potenciado (probarlo) (5 min)

Ahora que está TODO listo, probá un task complejo para ver la diferencia.

### Probá esto en Claude Code:

```
Necesito hacer una mejora al PM:

Quiero un dashboard en /pm/dashboard que muestre:
1. Ocupación general % (calculado: bookings activos / units totales)
2. Pagos del mes (cobrado vs pendiente vs retrasado)
3. Top 5 propiedades con más ingresos del mes
4. Alertas (contratos por vencer en 30 días)

Quiero que:
- Leas CLAUDE.md y entiendas el contexto antes de empezar
- Hagas un plan PRIMERO (no toques código todavía)
- Identifiques qué archivos vas a tocar y por qué
- Identifiques qué edge functions vas a llamar
- Me digas qué riesgos ves y cómo los mitigás
- Después me pidas aprobación para empezar a codear
```

Lo que esperás ver:

- Claude lee CLAUDE.md primero  
- Identifica que el stack es Vanilla JS (no React)  
- Plantea cambios en `pm/pm-dashboard.js`  
- Considera usar las edge functions existentes (`pm-compute-performance`, `pm-alerts`)  
- Pide confirmación antes de tocar nada  
- Menciona la regla de dedup de units para no romper cálculos

Si responde así → 🎉 **Claude está trabajando al máximo en TU contexto.**

---

## 📊 Checklist final

Al terminar las 6 partes vas a tener:

- [ ] CLAUDE.md en el repo (PARTE A)  
- [ ] settings.json de Claude Code (PARTE A)  
- [ ] Auto-load de contexto al abrir Claude Code (PARTE A)  
- [ ] Archivos .md del Cowork viejo migrados al repo (PARTE B)  
- [ ] (Opcional) Sesiones JSONL históricas migradas (PARTE C)  
- [ ] Supabase MCP conectado (PARTE D)  
- [ ] GitHub MCP conectado (PARTE D)  
- [ ] Vercel CLI logueado (PARTE D)  
- [ ] Skills relevantes activas (PARTE E)  
- [ ] Workflow potenciado probado (PARTE F)

---

## 🔄 Mantenimiento (importante)

### Mantener CLAUDE.md vivo

Cada vez que tomen una decisión técnica importante, agregala a CLAUDE.md. Ejemplo:

```
"Claude, acabamos de decidir que los pagos en mora se notifican por WhatsApp después de 3 días. Actualizá CLAUDE.md con esta regla en la sección correspondiente."
```

### Sincronizar entre máquinas (si en algún momento tenés 2 setups)

Como CLAUDE.md está en git, basta con `git pull` para tener la última versión en cualquier Mac.

### Refrescar contexto

Si una sesión de Claude se vuelve "tonta" o pierde el hilo:

```
"Olvidá lo que estábamos haciendo. Releé CLAUDE.md completo y resumime lo que entendiste antes de continuar."
```

---

## 💡 Comandos útiles que vale la pena recordar

```shell
# Ver memoria de Claude Code (sesiones)
ls ~/.claude/projects/

# Ver settings activos
cat ~/.claude/settings.json | jq

# Iniciar Claude Code con un prompt inicial
cd ~/Desktop/CLAUDE\ CODE/empresa-os
claude "leé CLAUDE.md y dame un brief del estado actual del PM"

# Limpiar caché si Claude se cuelga
rm -rf ~/.claude/.cache/
```

---

## 🆘 Si algo no funciona

1. **Claude Code no carga CLAUDE.md:**  
     
   - Verificá que esté en la raíz: `ls ~/Desktop/CLAUDE\ CODE/empresa-os/CLAUDE.md`  
   - Probá decirle explícitamente: "leé CLAUDE.md"

   

2. **MCP no conecta:**  
     
   - Verificá settings: `cat ~/.claude/settings.json | jq`  
   - Reiniciá Claude Code (Cmd+Q \+ reabrir)  
   - Probá los comandos del MCP manualmente: `npx @supabase/mcp-server-supabase`

   

3. **Sesiones del Mac viejo no aparecen:**  
     
   - Verificá que copiaste `~/.claude/projects/` (no solo el repo)  
   - El path del proyecto debe coincidir entre Macs (o renombrar carpeta)

   

4. **Auto-accept de edits no funciona:**  
     
   - En Claude Code, comando: `/config` para ver settings activos  
   - O cambiá `autoAcceptEdits: true` en settings.json

---

*Plan creado: 28 Jun 2026 — Sesión de migración Mac nuevo* *Última actualización: 28 Jun 2026*  
