// ════════════════════════════════════════════════════════════════
// 🔍 SONDA QA de diseño (12-jul) — pegar en la consola del navegador.
// Audita la pantalla actual contra el canon: desbordes reales (excluye
// contenedores con scroll propio), contraste dark-on-dark (excluye degradés
// y background-clip:text), y valores mudos (NaN/undefined/🟡).
// Uso:  __qaRoot('nombre')                    → overlay activo u #os-root
//       __qaRoot('nombre', '#cc-overlay')     → raíz explícita
// Con esta sonda se barrieron las 35+ pantallas del OS en ambos temas.
// ════════════════════════════════════════════════════════════════
window.__qaRoot = (nombre, rootSel) => {
  const root = document.querySelector(rootSel || '#rc-overlay, #cc-overlay, #ff-overlay') || document.getElementById('os-root') || document.body;
  const iss = []; const vw = innerWidth;
  const scrollea = el => { let p = el.parentElement; while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; p = p.parentElement; } return false; };
  const els = [...root.querySelectorAll('*')].filter(e => e.getClientRects().length);
  // 1) desbordes reales del viewport
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width > 40 && (r.right > vw + 3 || r.left < -3) && !/leaflet|canvas/i.test(e.className + e.tagName) && !scrollea(e)) {
      iss.push('OVF→ ' + (e.id || String(e.className).slice(0, 30) || e.tagName)); if (iss.length > 6) break;
    }
  }
  // 2) contraste: texto con luminancia ~igual al fondo (dark-on-dark / light-on-light)
  const lum = c => { const m = c && c.match(/[\d.]+/g); if (!m) return null; if (m.length > 3 && +m[3] < .5) return null; return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  let n = 0;
  for (const e of els) {
    if (n > 900) break;
    const t = e.childNodes[0]; if (!t || t.nodeType !== 3) continue;
    const txt = t.textContent.trim(); if (txt.length < 3 || !/[a-zA-Z0-9$]/.test(txt)) continue; n++;
    const cs = getComputedStyle(e); if (+cs.opacity < .4) continue;
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;   // números en degradé
    const col = lum(cs.color); if (col == null) continue;
    let bg = null, p = e, grad = false;
    while (p && p !== root.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.backgroundImage !== 'none') { grad = true; break; }                        // sobre degradé no se evalúa acá
      const b = pcs.backgroundColor;
      if (b && !/rgba\(0, 0, 0, 0\)/.test(b)) { const a = b.match(/rgba?\([^)]*,\s*([\d.]+)\)/); if (!a || +a[1] > .5) { bg = lum(b); break; } }
      p = p.parentElement;
    }
    if (!grad && bg != null && Math.abs(col - bg) < 45) { iss.push('CONTRASTE "' + txt.slice(0, 22) + '"'); if (iss.length > 16) break; }
  }
  // 3) valores mudos — incluye Infinity/null: así se autodetecta el bug 3B (una casa en
  // rehab mostraba "DSCR -Infinity" / "Equilibrio Infinity%" y la sonda no lo veía).
  const bad = (root.innerText.match(/\bNaN\b|\bundefined\b|-?\bInfinity\b|\bnull\b|🟡/g) || []);
  if (bad.length) iss.push('VALORES: ' + [...new Set(bad)].join(','));
  return (nombre || location.pathname) + ': ' + (iss.length ? iss.slice(0, 10).join(' | ') : '✓ OK');
};
console.log('🔍 sonda lista — __qaRoot("nombre") en la pantalla que quieras auditar');
