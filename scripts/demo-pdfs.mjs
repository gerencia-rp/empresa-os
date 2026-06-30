// Demo LOCAL: genera los 3 PDFs (semanal, mensual, guía) con Chrome headless
// (mismo engine chromium que usa la Vercel function con @sparticuz/chromium).
// Uso:  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... OUT=/tmp/out node scripts/demo-pdfs.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { reportConfig, fetchWeeklyData, fetchMonthlyData, fetchWelcomeGuideData } from "../api/_pm-report-data.mjs";
import { weeklyReportHTML, monthlyReportHTML, welcomeGuideHTML } from "../api/_pm-report-templates.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.OUT || "/tmp/pm-pdfs";
const BARKBRIDGE = process.env.PROPERTY_ID || "24367c6e-b2b8-4ed0-9f97-14c33b8c4c98";
mkdirSync(OUT, { recursive: true });

function renderPDF(html, name) {
  const htmlPath = `${OUT}/${name}.html`;
  const pdfPath = `${OUT}/${name}.pdf`;
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ], { stdio: "ignore" });
  console.log("✅", pdfPath);
  return pdfPath;
}

const cfg = reportConfig();
const now = new Date();

// SEMANAL (operación)
const weekly = await fetchWeeklyData(cfg, now);
renderPDF(weeklyReportHTML(weekly), "reporte-semanal");
console.log("   semanal:", `ocup ${weekly.occupancy.pct}% · ${weekly.occupancy.free} libres · ${weekly.criticalAlerts.length} alertas críticas`);

// MENSUAL (finanzas) — mayo 2026 (último mes completo con datos)
const monthly = await fetchMonthlyData(cfg, 2026, 5, now);
renderPDF(monthlyReportHTML(monthly), "reporte-mensual");
console.log("   mensual:", `ingresos $${monthly.income} · gastos $${monthly.expenseTotal} · cashflow $${monthly.cashflow} · ${monthly.losses.length} en pérdida`);

// GUÍA DE BIENVENIDA — 4916 Barkbridge (unidad principal)
const guide = await fetchWelcomeGuideData(cfg, BARKBRIDGE);
renderPDF(welcomeGuideHTML(guide), "guia-bienvenida-barkbridge");
console.log("   guía:", `${guide.address} · WiFi ${guide.wifiName} · keypad ${guide.accessCode}`);
