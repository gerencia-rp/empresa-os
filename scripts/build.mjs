// Build script para Empresa OS.
// Concatena los .js en orden + minifica con esbuild + hash sha256 corto.
// Genera dist/ listo para deploy en Vercel como static site.
//
// Mantiene los globals (function declarations + window.*) porque NO usa
// import/export — solo concatena.

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { transform } from "esbuild";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

// Orden DE CARGA — el mismo que tenía index.html.
// IMPORTANTE: ui-toolkit antes que cualquiera que use window.esc/toast.
//             deal-rules antes que loan-calculator y property-analyzer.
const BUNDLE_FILES = [
  "ui-toolkit.js",
  "ui/icons.js",         // 🧩 iconos Lucide inline + StatusDot + loaders (jul-2026)
  "ui/kit.js",           // 🎨 UI kit del sistema de diseño (kitMoney/kitHero/… — Fase 0)
  "ui/kit-decision.js",  // 🧭 O4: TermTooltip + DrillDown + NextAction + Tarjeta-KPI (auditoría 13-jul)
  "ui/report-engine.js", // 📄 O6: motor de reportes PDF (auditoría 13-jul)
  "lib/deal-rules.js",
  "app.js",
  "estimator.js",
  "rental-predictor.js",
  "loan-calculator.js",
  "property-analyzer.js",
  "remodel-pro.js",
  "rm/rm-tab-editor.js",
  "rm/rm-tab-seguimiento.js",
  "rm/rm-tab-versions.js",
  "rm/rm-tab-assets.js",
  "rm/rm-tab-sow.js",
  "rm/rm-tab-gantt.js",
  "rm/rm-export.js",
  "rm/rm-sync-planner.js",
  "remodel-forecast.js",
  "remodel-inspeccion.js",
  "weekly-planner.js",
  "pm/cronograma.js",
  "pm/pos-theme.js",
  "pm/command-center.js",
  "pm/ff-command-center.js",
  "pm/ff-underwriting.js",
  "pm/ff-arv-engine.js",
  "pm/ff-arv-pro.js",
  "pm/ff-ingreso-modelos.js",
  "pm/ff-unificada-pro.js",
  "pm/ff-analitica.js",
  "os/os.js",
  "os/os-lineage-views.js",
  "os/os-lineage.js",
  "os/os-cartera.js",
  "os/os-cobros.js",
  "os/os-admin.js",
  "os/os-cierre-engine.js",
  "os/os-ct-sabueso.js",
  "os/inv-engine.js",
  "os/inv-admin.js",
  "os/os-ia.js",
  "remodel-command-center.js",
  "remodel-reportes.js",
  "clickup-dashboard.js",
  "pm-dashboard.js",
  "education.js",
  "edu/edu-fm-bloques.js",
  "edu/edu-fm-vista-plan.js",
  "edu/edu-fm-diagnostico.js",
  "edu/edu-presentations.js",
  "edu/edu-credit.js",
  "edu/edu-calendar.js",
  "edu/edu-reports.js",
  "edu/edu-ceo-dashboard.js",
  "edu-whatsapp.js",
  // 🆕 Property Management module
  "pm/pm-main.js"
];

// Archivos que se copian tal cual (no van al bundle)
const STATIC_COPY = [
  "ui/tokens.css",       // 🎨 tokens canónicos (index.html los linkea)
  "ui/icons.js",         // 🧩 iconos para las páginas standalone (viral/diag/mi-plan/…)
  "propuesta.html",
  "inversionista.html",
  "os/inv-engine.js",
  "os/inv-portal.js",
  "config.public.js",
  "viral.html",
  "viral-memory.js",
  "viral.js",
  "viral-opera.js",
  "viral-context-builder.js",
  "viral-validator.js",
  "viral-agente.js",
  "viral-metrics.js",
  "base_conocimiento.json",
  "viral-data/opera-imperio-data.json",
  "viral-data/opera-imperio-data-v2.json",
  "diag.html",
  "mi-plan.html",
  "inversionista.html",
  "diagnostico.html",
  "diagnostico.js",
  "favicon.ico",
  "manifest.webmanifest",
  "sw.js",
  "icon-192.png",
  "icon-512.png",
  "supabase/cleaning-planner-schema.sql",  // copia para que el banner de error pueda servirlo al copy-to-clipboard
  "supabase/cleaning-planner-cleanup-seed.sql"  // borrar seed de prueba
];

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readMaybe(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

async function copyIfExists(src, dst) {
  if (await fileExists(src)) {
    await ensureDir(path.dirname(dst));
    await fs.copyFile(src, dst);
    return true;
  }
  return false;
}

async function main() {
  console.log("📦 Build empezando...");
  const t0 = Date.now();

  // Limpiar dist
  await fs.rm(DIST, { recursive: true, force: true });
  await ensureDir(DIST);

  // 1) Concatenar bundle JS
  const parts = [];
  for (const file of BUNDLE_FILES) {
    const full = path.join(ROOT, file);
    if (!await fileExists(full)) {
      console.warn(`  ⚠️  no existe: ${file}`);
      continue;
    }
    const src = await fs.readFile(full, "utf8");
    // Comentario separador en el bundle para que sea legible debugger
    parts.push(`\n/* ──── ${file} ──── */\n`);
    parts.push(src);
  }
  const bundleRaw = parts.join("\n");

  // 2) Minify con esbuild (preserva globals, no envuelve en IIFE)
  console.log("  ⏳ minificando con esbuild...");
  const { code: bundleMin } = await transform(bundleRaw, {
    minify: true,
    target: "es2020",
    keepNames: true,  // preserva nombres de funciones (críticos para onclick="foo()")
    legalComments: "none"
  });

  // 3) Hash sha256 corto (12 chars) para cache busting permanente
  const hash = createHash("sha256").update(bundleMin).digest("hex").slice(0, 12);
  const bundleName = `assets/bundle.${hash}.js`;
  const bundlePath = path.join(DIST, bundleName);
  await ensureDir(path.dirname(bundlePath));
  await fs.writeFile(bundlePath, bundleMin, "utf8");

  // 4) Procesar index.html: reemplaza el bloque <!--[BUNDLE]--> ... <!--[/BUNDLE]-->
  //    por un solo <script src="assets/bundle.[hash].js"></script>
  const indexHtml = await fs.readFile(path.join(ROOT, "index.html"), "utf8");
  const replaced = indexHtml.replace(
    /<!--\[BUNDLE\]-->[\s\S]*?<!--\[\/BUNDLE\]-->/,
    `<script src="/${bundleName}"></script>`   // absoluto: en deep-links (/rentas/…) un path relativo resolvería a /rentas/assets/… (404)
  );
  await fs.writeFile(path.join(DIST, "index.html"), replaced, "utf8");

  // 5) Copiar archivos estáticos
  let copied = 0;
  for (const f of STATIC_COPY) {
    if (await copyIfExists(path.join(ROOT, f), path.join(DIST, f))) copied++;
  }

  // 6) Stats
  const bundleSizeKB = (Buffer.byteLength(bundleMin) / 1024).toFixed(1);
  const rawSizeKB = (Buffer.byteLength(bundleRaw) / 1024).toFixed(1);
  const dt = Date.now() - t0;
  console.log(`\n✅ Build listo en ${dt}ms`);
  console.log(`   bundle: ${bundleName} (${bundleSizeKB} KB minified, ${rawSizeKB} KB raw)`);
  console.log(`   static: ${copied} archivos copiados`);
  console.log(`   output: ${path.relative(ROOT, DIST)}/\n`);
}

main().catch(e => {
  console.error("❌ Build falló:", e);
  process.exit(1);
});
