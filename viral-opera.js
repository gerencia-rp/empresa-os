/* Opera tu Imperio — OS de marca personal de Nicolás Lara.
   Tabs estáticas (render desde viral-data/opera-imperio-data.json) + state machine localStorage.
   Se carga DESPUÉS de viral.js. Reusa el sistema de tabs/paneles de viral.js vía window.OPERA_RENDERERS. */

// ---------- Carga de la data maestra ----------
let OPERA = null, OPERA_LOADING = null;
function ensureOpera() {
  if (OPERA) return Promise.resolve(OPERA);
  if (!OPERA_LOADING) {
    OPERA_LOADING = fetch('viral-data/opera-imperio-data.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => (OPERA = d));
  }
  return OPERA_LOADING;
}

// ---------- Estado persistente (localStorage) ----------
const OSTATE = {
  get(k, def) { try { const v = JSON.parse(localStorage.getItem('opera_' + k)); return v == null ? def : v; } catch { return def; } },
  set(k, v) { localStorage.setItem('opera_' + k, JSON.stringify(v)); },
};
function operaToggleCheck(id, on) {
  const m = OSTATE.get('checks', {}); m[id] = !!on; OSTATE.set('checks', m);
  const row = document.querySelector('[data-check="' + id + '"]');
  if (row) row.classList.toggle('opacity-50', !!on);
}
function operaChecked(id) { return !!OSTATE.get('checks', {})[id]; }
window.operaToggleCheck = operaToggleCheck;

// Bloque "fórmula amplificada" inyectado al prompt de los generadores
window.operaAmplify = function () {
  if (!OPERA) return '';
  const a = OPERA.arquetipo;
  return `\n\n=== FÓRMULA AMPLIFICADA · VOZ DE MARCA "OPERA TU IMPERIO" ===
Arquetipo: ${a.nombre} (${a.fusion}). ${a.descripcion}
Enemigo a atacar (al ARQUETIPO, NUNCA a personas): ${a.enemigoComun.nombre} — ${a.enemigoComun.quienesSon.join('; ')}.
Contraste Ellos vs Vos: ${a.enemigoComun.tablaEllosVsVos.map(r => r.ellos + ' → ' + r.vos).join(' | ')}.
Frases bandera (insertá alguna): ${a.frasesRecurrentes.bandera.join(' / ')}.
Cierres posibles: ${a.frasesRecurrentes.cierre.join(' / ')}.
Palabras de marca: ${a.palabrasDeMarca.join(', ')}.
Palabras PROHIBIDAS (jamás): ${a.palabrasProhibidas.map(p => p.palabra).join(', ')}.
Eco histórico (aplicá mecánicas reales): Apple manifiesto, MrBeast retención 3s, De Beers eslogan permanente, Bernays pseudo-evento, Bukele resultados visibles.
El eslogan "OPERA TU IMPERIO" debe aparecer o insinuarse. Tono rioplatense, directo. Mostrá sistema/métricas, no humo.`;
};

// Guardar piezas generadas por la IA en la biblioteca (localStorage)
window.operaSave = function (kind, obj) {
  if (!obj) return;
  const saved = OSTATE.get('saved', []);
  const title = obj.titulo || obj.titulo_principal || obj.thumbnail || obj.tema || obj.titulo_secuencia || '(sin título)';
  saved.unshift({ kind, title, obj, ts: Date.now() });
  OSTATE.set('saved', saved.slice(0, 100));
};
function operaRemoveSaved(idx) {
  const saved = OSTATE.get('saved', []);
  saved.splice(idx, 1); OSTATE.set('saved', saved);
  const out = document.getElementById('tab-biblioteca');
  if (out) { out.dataset.rendered = ''; renderBiblioteca(); }
}
function operaCopySaved(idx) {
  const it = OSTATE.get('saved', [])[idx]; if (!it) return;
  navigator.clipboard.writeText(JSON.stringify(it.obj, null, 2));
}
window.operaRemoveSaved = operaRemoveSaved;
window.operaCopySaved = operaCopySaved;

// ---------- Helpers de render ----------
const E = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function oHero(title, sub) {
  return `<div class="mb-5">
    <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-accent leading-tight">${E(title)}</h2>
    ${sub ? `<p class="text-sm text-zinc-400 mt-1">${E(sub)}</p>` : ''}
  </div>`;
}
function oCard(title, body, sub) {
  return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-5 mb-4">
    ${title ? `<h3 class="font-display text-lg font-bold text-accent mb-1">${title}</h3>` : ''}
    ${sub ? `<p class="text-xs text-zinc-400 mb-3">${sub}</p>` : (title ? '<div class="mb-3"></div>' : '')}
    ${body}</div>`;
}
function oList(arr, color) {
  const c = color || 'text-accent';
  return `<ul class="space-y-1.5 text-sm text-zinc-200">${(arr || []).map(x =>
    `<li class="flex gap-2"><span class="${c} shrink-0">▸</span><span>${typeof x === 'string' ? x : E(x)}</span></li>`).join('')}</ul>`;
}
function oChips(arr, cls) {
  const k = cls || 'bg-accent/15 text-accent border border-accent/25';
  return `<div class="flex flex-wrap gap-1.5">${(arr || []).map(x =>
    `<span class="text-xs px-2 py-1 rounded-lg ${k}">${E(x)}</span>`).join('')}</div>`;
}

// =========================================================
//  TAB: MANIFIESTO
// =========================================================
function renderManifiesto() {
  const out = document.getElementById('tab-manifiesto');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const m = OPERA.marca, id = OPERA.identidad;
    const manifiestoHTML = id.manifiesto.map(l =>
      l === '' ? '<div class="h-3"></div>' :
      `<p class="font-display text-lg sm:text-xl text-light leading-snug">${E(l)}</p>`).join('');
    const variantes = id.variantesEslogan.map(v => `
      <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3">
        <div class="font-display text-accent font-bold">${E(v.frase)}</div>
        <div class="text-[11px] text-zinc-500 mt-0.5">${E(v.contexto)}</div>
      </div>`).join('');
    out.innerHTML =
      oHero(m.nombre, m.subtitulo) +
      `<div class="bg-gradient-to-br from-primary to-dark border border-accent/30 rounded-2xl p-6 mb-4 text-center">
        <div class="font-display text-3xl sm:text-5xl font-black text-accent tracking-wide">${E(id.esloganPrincipal)}</div>
        <div class="text-sm text-light/70 mt-2">${E(m.tagline)}</div>
      </div>` +
      oCard('📖 Narrativa oficial', `<p class="text-sm text-zinc-200 leading-relaxed">${E(id.narrativaOficial)}</p>`) +
      oCard('✊ Manifiesto', `<div class="space-y-0.5">${manifiestoHTML}</div>`) +
      oCard('🎚️ Variantes del eslogan', `<div class="grid sm:grid-cols-2 gap-2">${variantes}</div>`, 'Cuándo usar cada una');
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error cargando data: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: IDENTIDAD
// =========================================================
function renderIdentidad() {
  const out = document.getElementById('tab-identidad');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const a = OPERA.arquetipo, en = a.enemigoComun, fr = a.frasesRecurrentes;
    const dosCols = (titA, arrA, titB, arrB) => `<div class="grid sm:grid-cols-2 gap-3">
      <div class="bg-billete/20 border border-billete/40 rounded-lg p-3"><div class="text-[11px] uppercase font-bold text-emerald-300 mb-2">${titA}</div>${oList(arrA, 'text-emerald-400')}</div>
      <div class="bg-bordeaux/20 border border-bordeaux/40 rounded-lg p-3"><div class="text-[11px] uppercase font-bold text-red-300 mb-2">${titB}</div>${oList(arrB, 'text-red-400')}</div>
    </div>`;
    const tabla = en.tablaEllosVsVos.map(r => `
      <tr class="border-t border-zinc-800">
        <td class="py-2 pr-3 text-red-300/90">${E(r.ellos)}</td>
        <td class="py-2 text-emerald-300">${E(r.vos)}</td>
      </tr>`).join('');
    const prohibidas = a.palabrasProhibidas.map(p => `
      <div class="flex items-baseline gap-2 text-sm">
        <span class="text-red-400 line-through decoration-red-700/60">${E(p.palabra)}</span>
        <span class="text-[11px] text-zinc-500">(${E(p.razon)})</span>
      </div>`).join('');
    const tonos = a.tonoPorCanal.map(t => `
      <div class="border-t border-zinc-800 py-2">
        <span class="text-accent font-semibold text-sm">${E(t.canal)}</span>
        <span class="text-sm text-zinc-300"> — ${E(t.tono)}</span>
      </div>`).join('');
    const frasesGrupo = (tit, arr, c) => `<div class="mb-3"><div class="text-[11px] uppercase font-bold ${c} mb-1.5">${tit}</div>${oList(arr)}</div>`;
    out.innerHTML =
      oHero('El arquetipo: ' + a.nombre, a.fusion) +
      oCard('🧬 Quién sos', `<p class="text-sm text-zinc-200 leading-relaxed mb-3">${E(a.descripcion)}</p>` +
        dosCols('Lo que SOS', a.loQueSos, 'Lo que NO sos', a.loQueNoSos)) +
      oCard('⚔️ El enemigo común: ' + E(en.nombre),
        `<div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">Quiénes son</div>${oList(en.quienesSon, 'text-red-400')}
        <div class="text-[11px] uppercase font-bold text-zinc-400 mt-4 mb-2">Ellos vs Vos</div>
        <table class="w-full text-sm"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th class="pb-1">Ellos (especuladores)</th><th class="pb-1">Vos (operador)</th></tr></thead><tbody>${tabla}</tbody></table>
        <div class="text-[11px] uppercase font-bold text-zinc-400 mt-4 mb-2">Frases anti-enemigo</div>${oList(en.frasesAntiEnemigo)}
        <div class="mt-3 bg-bordeaux/20 border border-bordeaux/40 rounded-lg p-3 text-xs text-red-200"><b>⚖️ Regla ética:</b> ${E(en.reglaEtica)}</div>`) +
      oCard('💬 Frases recurrentes',
        frasesGrupo('🚩 Bandera', fr.bandera, 'text-accent') +
        frasesGrupo('🌉 Puente', fr.puente, 'text-sky-400') +
        frasesGrupo('🎬 Cierre', fr.cierre, 'text-emerald-400')) +
      oCard('🔤 Palabras', `<div class="grid sm:grid-cols-2 gap-4">
        <div><div class="text-[11px] uppercase font-bold text-red-300 mb-2">Prohibidas</div><div class="space-y-1">${prohibidas}</div></div>
        <div><div class="text-[11px] uppercase font-bold text-emerald-300 mb-2">De marca</div>${oChips(a.palabrasDeMarca)}</div>
      </div>`) +
      oCard('🎙️ Tono por canal', tonos);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: VISUAL
// =========================================================
function renderVisual() {
  const out = document.getElementById('tab-visual');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const v = OPERA.visual, s = v.simbolo, p = v.paletaColores, t = v.tipografia, ve = v.vestimenta, g = v.gestos;
    const hexSVG = `<svg viewBox="0 0 100 100" class="h-24 w-24 mx-auto"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke="#C8A864" stroke-width="4"/><polygon points="50,24 72,37 72,63 50,76 28,63 28,37" fill="none" stroke="#C8A864" stroke-width="2.5" opacity=".6"/><text x="50" y="60" text-anchor="middle" font-family="Playfair Display,serif" font-size="28" font-weight="800" fill="#C8A864">NL</text></svg>`;
    const swatch = (c) => `<div class="rounded-lg overflow-hidden border border-zinc-800">
      <div class="h-12" style="background:${E(c.hex)}"></div>
      <div class="p-2"><div class="text-sm font-semibold">${E(c.nombre)}</div><div class="text-[11px] text-zinc-500">${E(c.hex)}</div><div class="text-[11px] text-zinc-400 mt-0.5">${E(c.uso)}</div></div>
    </div>`;
    const escenarios = ve.escenarios.map(e => {
      const el = Object.entries(e.elementos || {}).map(([k, val]) =>
        `<div class="text-xs"><span class="text-accent capitalize">${E(k)}:</span> <span class="text-zinc-300">${E(val)}</span></div>`).join('');
      return `<div class="bg-primary/40 border border-zinc-800 rounded-lg p-3">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="font-semibold text-sm">${E(e.nombre)}</div>
          ${e.porcentaje ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">${E(e.porcentaje)}</span>` : ''}
        </div>
        <div class="text-[11px] text-zinc-500 italic mb-2">${E(e.look)}</div>
        <div class="space-y-0.5">${el}</div>
      </div>`;
    }).join('');
    const uniforme = Object.entries(ve.uniformeSteveJobs || {}).map(([k, val]) =>
      `<div class="flex gap-2 text-sm"><span class="text-accent font-bold w-10 shrink-0">${E(k)}</span><span class="text-zinc-300">${E(val)}</span></div>`).join('');
    const gestoBlock = (tit, arr, c) => `<div class="mb-3"><div class="text-[11px] uppercase font-bold ${c || 'text-accent'} mb-1.5">${tit}</div>${oList(arr)}</div>`;
    out.innerHTML =
      oHero('Identidad visual', 'Símbolo, paleta, tipografía, vestuario y lenguaje corporal') +
      oCard('💎 Símbolo: ' + E(s.nombre),
        `<div class="grid sm:grid-cols-[140px_1fr] gap-4 items-start">
          <div class="bg-dark rounded-xl p-3">${hexSVG}</div>
          <div>
            <div class="text-[11px] uppercase font-bold text-zinc-400 mb-1.5">Significado</div>${oList(s.significado)}
            <div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">Dónde va</div>${oList(s.ubicacion)}
            <div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">Versiones</div>${oChips(s.versiones)}
          </div>
        </div>`) +
      oCard('🎨 Paleta de colores',
        `<div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">Primarios</div>
        <div class="grid grid-cols-3 gap-2 mb-4">${p.primarios.map(swatch).join('')}</div>
        <div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">Secundarios</div>
        <div class="grid grid-cols-3 gap-2 mb-4">${p.secundarios.map(swatch).join('')}</div>
        <div class="text-[11px] uppercase font-bold text-red-300 mb-2">Prohibidos</div>${oList(p.prohibidos, 'text-red-400')}`) +
      oCard('🔠 Tipografía',
        `<div class="grid sm:grid-cols-2 gap-3 mb-3">
          <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="text-[11px] text-zinc-500">DISPLAY</div><div class="font-display text-xl text-light">${E(t.display)}</div></div>
          <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="text-[11px] text-zinc-500">BODY</div><div class="text-xl text-light">${E(t.body)}</div></div>
        </div>${oList(t.reglas)}`) +
      oCard('👔 Vestuario',
        `<div class="grid sm:grid-cols-3 gap-3 mb-4">
          <div><div class="text-[11px] uppercase font-bold text-zinc-400 mb-1.5">Principios</div>${oList(ve.principios)}</div>
          <div><div class="text-[11px] uppercase font-bold text-emerald-300 mb-1.5">Siempre</div>${oList(ve.siempre, 'text-emerald-400')}</div>
          <div><div class="text-[11px] uppercase font-bold text-red-300 mb-1.5">Nunca</div>${oList(ve.nunca, 'text-red-400')}</div>
        </div>
        <div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">6 escenarios</div>
        <div class="grid sm:grid-cols-2 gap-3 mb-3">${escenarios}</div>
        <div class="bg-accent/10 border border-accent/25 rounded-lg p-3"><div class="text-[11px] uppercase font-bold text-accent mb-1.5">Uniforme Steve Jobs</div><div class="space-y-1">${uniforme}</div></div>`) +
      oCard('🤚 Lenguaje corporal y gestos',
        `<div class="grid sm:grid-cols-2 gap-x-6">
          <div>${gestoBlock('Cómo pararte', g.comoPararte)}${gestoBlock('Cómo mirar a cámara', g.comoMirarCamara)}${gestoBlock('Manos SÍ', g.manosSi, 'text-emerald-400')}${gestoBlock('Respiración', g.respiracion)}</div>
          <div>${gestoBlock('Manos NO', g.manosNo, 'text-red-400')}${gestoBlock('Cómo entrar', g.comoEntrar)}${gestoBlock('Cómo cerrar', g.comoCerrar)}</div>
        </div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: PSICOLOGÍA
// =========================================================
function renderPsicologia() {
  const out = document.getElementById('tab-psicologia');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const ps = OPERA.psicologia;
    const leyes = ps.leyesUniversales.map(l => `
      <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3 flex gap-3">
        <div class="font-display text-2xl font-black text-accent/70 shrink-0 w-8">${l.ley}</div>
        <div><div class="font-semibold text-sm">${E(l.nombre)}</div><div class="text-xs text-zinc-400 mt-0.5">${E(l.explicacion)}</div></div>
      </div>`).join('');
    const tacticas = ps.tacticasAplicadas.map(t => `
      <tr class="border-t border-zinc-800 align-top">
        <td class="py-2 pr-2 text-zinc-600 text-xs">${t.id}</td>
        <td class="py-2 pr-3 text-xs text-accent whitespace-nowrap">${E(t.maestro)}</td>
        <td class="py-2 pr-3 text-sm">${E(t.tecnica)}</td>
        <td class="py-2 text-xs text-zinc-300">${E(t.tuAccion)}</td>
      </tr>`).join('');
    const casos = ps.casosHistoricos.map(c => {
      const blocks = [];
      if (c.contexto) blocks.push(`<p class="text-sm text-zinc-300 mb-2">${E(c.contexto)}</p>`);
      if (c.notaEtica) blocks.push(`<div class="bg-bordeaux/20 border border-bordeaux/40 rounded p-2 text-[11px] text-red-200 mb-2"><b>⚖️</b> ${E(c.notaEtica)}</div>`);
      if (c.mecanica) blocks.push(`<div class="text-[11px] uppercase font-bold text-zinc-400 mb-1">Mecánica</div>${oList(c.mecanica)}`);
      if (c.metricas) blocks.push(`<div class="mt-2 text-sm text-emerald-300"><b>📈 Resultado:</b> ${E(c.metricas)}</div>`);
      if (c.leccionesParaNicolas) blocks.push(`<div class="text-[11px] uppercase font-bold text-accent mt-3 mb-1">Lecciones para vos</div>${oList(c.leccionesParaNicolas)}`);
      return `<details class="bg-primary/40 border border-zinc-800 rounded-lg p-4 mb-2">
        <summary class="cursor-pointer font-semibold text-sm flex items-center gap-2">
          <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-accent/15 text-accent">${E(c.categoria)}</span>
          ${E(c.nombre)}
        </summary>
        <div class="mt-3">${blocks.join('')}</div>
      </details>`;
    }).join('');
    out.innerHTML =
      oHero('Psicología y propaganda', 'Las leyes, tácticas y campañas históricas que alimentan tu sistema') +
      oCard('⚖️ 7 leyes universales', `<div class="space-y-2">${leyes}</div>`) +
      oCard('🎯 32 tácticas aplicadas',
        `<div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th></th><th>Maestro</th><th>Técnica</th><th>Tu acción</th></tr></thead><tbody>${tacticas}</tbody></table></div>`) +
      oCard('📚 Casos históricos profundos', casos, 'Tocá cada caso para desplegarlo');
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: MIS REDES
// =========================================================
function redCard(net, label, icon) {
  const stat = (k, v) => v == null ? '' : `<div class="text-center"><div class="font-display text-xl font-bold text-accent">${E(typeof v === 'number' ? v.toLocaleString('es') : v)}</div><div class="text-[10px] text-zinc-500 uppercase">${k}</div></div>`;
  const stats = [
    stat('Seguidores', net.seguidores ?? net.subscribers),
    stat('Posts', net.publicaciones ?? net.videos),
    stat(net.likesAcumulados != null ? 'Likes' : 'Seguidos', net.likesAcumulados ?? net.seguidos),
  ].join('');
  const bioNueva = Array.isArray(net.bioNueva) ? net.bioNueva.map(l => `<div>${E(l)}</div>`).join('') : '';
  return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-4 mb-4">
    <div class="flex items-center justify-between gap-2 mb-3">
      <div><div class="font-display text-lg font-bold">${icon} ${E(label)}</div><a href="${E(net.url)}" target="_blank" class="text-xs text-sky-400 hover:underline">${E(net.handle)}</a></div>
      ${net.objetivoMesUno ? `<div class="text-right"><div class="text-[10px] text-zinc-500 uppercase">Meta 30 días</div><div class="text-accent font-bold">${net.objetivoMesUno.toLocaleString('es')}</div></div>` : ''}
    </div>
    <div class="grid grid-cols-3 gap-2 mb-3 bg-dark/50 rounded-lg py-2">${stats}</div>
    ${net.displayActual ? `<div class="text-xs text-zinc-400 mb-1"><b>Display actual:</b> ${E(net.displayActual)}</div>` : ''}
    ${net.bioActual ? `<div class="text-xs text-zinc-400 mb-2"><b>Bio actual:</b> ${E(net.bioActual)}</div>` : ''}
    ${net.problemas ? `<div class="text-[11px] uppercase font-bold text-red-300 mb-1">Problemas</div>${oList(net.problemas, 'text-red-400')}` : ''}
    ${net.displayNuevo ? `<div class="mt-3 text-xs"><b class="text-emerald-300">Display nuevo:</b> ${E(net.displayNuevo)}</div>` : ''}
    ${bioNueva ? `<div class="mt-2 bg-billete/15 border border-billete/40 rounded-lg p-3 text-sm text-emerald-100"><div class="text-[10px] uppercase text-emerald-300 font-bold mb-1">Bio nueva</div>${bioNueva}</div>` : ''}
  </div>`;
}
function renderRedes() {
  const out = document.getElementById('tab-redes');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const r = OPERA.misRedes, k = OPERA.kpis, yt = r.youtube;
    const ytSel = OSTATE.get('yt_handle', 'B');
    const opciones = yt.decisionPendiente.map(o => {
      const sel = o.opcion === ytSel;
      const rec = /RECOMENDADA/i.test(o.accion) || o.opcion === 'B';
      return `<button onclick="operaPickYT('${o.opcion}')" data-yt="${o.opcion}" class="text-left bg-primary/40 border ${sel ? 'border-accent' : 'border-zinc-800'} rounded-lg p-3 transition">
        <div class="flex items-center gap-2 mb-1">
          <span class="h-4 w-4 rounded-full border-2 ${sel ? 'border-accent bg-accent' : 'border-zinc-600'} shrink-0"></span>
          <span class="font-bold text-sm">Opción ${E(o.opcion)}</span>
          ${rec ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent uppercase">Recomendada</span>' : ''}
          ${sel ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 uppercase">Tu decisión</span>' : ''}
        </div>
        <div class="text-sm text-zinc-200">${E(o.accion)}</div>
        <div class="text-[11px] text-emerald-400/80 mt-1">✓ ${E(o.ventaja)}</div>
        <div class="text-[11px] text-red-400/70">✗ ${E(o.desventaja)}</div>
      </button>`;
    }).join('');
    const acciones = r.accionesInmediatas.map(a => {
      const on = operaChecked(a.id);
      return `<label data-check="${a.id}" class="flex items-start gap-2 py-1.5 cursor-pointer ${on ? 'opacity-50' : ''}">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="operaToggleCheck('${a.id}', this.checked)" class="mt-0.5 accent-[#C8A864]">
        <span class="text-sm">${E(a.accion)} <span class="text-[11px] text-zinc-500">· ${E(a.tiempo)}</span></span>
      </label>`;
    }).join('');
    const objetivos = Object.entries(k.objetivosDia30).map(([key, val]) => {
      const txt = typeof val === 'object' ? Object.entries(val).map(([kk, vv]) => `${kk}: ${vv}`).join(' · ') : val;
      return `<div class="border-t border-zinc-800 py-2 text-sm"><span class="text-accent capitalize">${E(key)}:</span> <span class="text-zinc-300">${E(txt)}</span></div>`;
    }).join('');
    out.innerHTML =
      oHero('Mis redes', 'Estado verificado, bios nuevas y decisiones') +
      redCard(r.instagram, 'Instagram', '📸') +
      redCard(r.tiktok, 'TikTok', '🎵') +
      redCard(yt, 'YouTube', '▶️') +
      oCard('🔀 Decisión: handle de YouTube', `<div class="grid gap-2">${opciones}</div>`, 'Tu decisión queda guardada en este navegador') +
      oCard('✅ Acciones inmediatas', `<div class="divide-y divide-zinc-800/50">${acciones}</div>`) +
      oCard('🎯 Objetivos a 30 días', objetivos);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}
function operaPickYT(op) {
  OSTATE.set('yt_handle', op);
  const out = document.getElementById('tab-redes');
  if (out) { out.dataset.rendered = ''; renderRedes(); }
}
window.operaPickYT = operaPickYT;

// =========================================================
//  TAB: BIBLIOTECA  (15 reels + 10 carruseles + 5 historias + 5 YT + 10 TikToks)
// =========================================================
const ESTADOS = ['pendiente', 'producida', 'publicada'];
const ESTADO_STYLE = {
  pendiente: 'bg-zinc-800 text-zinc-300',
  producida: 'bg-amber-900/50 text-amber-300',
  publicada: 'bg-emerald-900/50 text-emerald-300',
};
let BIBLIO_FILTER = 'todos';
function biblioEstado(id, def) { return OSTATE.get('estados', {})[id] || def || 'pendiente'; }
function operaCycleEstado(id, def) {
  const m = OSTATE.get('estados', {});
  const cur = m[id] || def || 'pendiente';
  m[id] = ESTADOS[(ESTADOS.indexOf(cur) + 1) % ESTADOS.length];
  OSTATE.set('estados', m);
  const out = document.getElementById('tab-biblioteca');
  if (out) { out.dataset.rendered = ''; renderBiblioteca(); }
}
function operaFilterBiblio(f) {
  BIBLIO_FILTER = f;
  const out = document.getElementById('tab-biblioteca');
  if (out) { out.dataset.rendered = ''; renderBiblioteca(); }
}
window.operaCycleEstado = operaCycleEstado;
window.operaFilterBiblio = operaFilterBiblio;
function copyPiece(type, id) {
  const piece = (OPERA.biblioteca[type] || []).find(p => p.id === id);
  if (!piece) return;
  const lines = Object.entries(piece).filter(([k]) => !['id', 'estado'].includes(k)).map(([k, v]) =>
    `${k.toUpperCase()}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  navigator.clipboard.writeText(lines.join('\n'));
  const btn = document.querySelector('[data-copy="' + id + '"]');
  if (btn) { const t = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = t, 1200); }
}
window.copyPiece = copyPiece;
function pieceHeader(type, id, title, tag) {
  const est = biblioEstado(id);
  return `<div class="flex items-start justify-between gap-2 mb-2">
    <div class="min-w-0"><div class="font-semibold text-sm truncate">${E(title)}</div>${tag ? `<div class="text-[10px] uppercase tracking-wide text-accent/70">${E(tag)}</div>` : ''}</div>
    <div class="flex items-center gap-1 shrink-0">
      <button data-copy="${id}" onclick="copyPiece('${type}','${id}')" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📋</button>
      <button onclick="operaCycleEstado('${id}')" class="text-[10px] uppercase px-2 py-1 rounded ${ESTADO_STYLE[est]}">${est}</button>
    </div>
  </div>`;
}
function pieceWrap(type, piece, inner, title, tag) {
  return `<div class="bg-primary/40 border border-zinc-800 rounded-xl p-4">${pieceHeader(type, piece.id, title, tag)}${inner}</div>`;
}
function reelInner(r) {
  const row = (lbl, val, c) => val ? `<div class="text-xs mt-1"><span class="${c || 'text-zinc-500'} font-semibold">${lbl}</span> ${E(val)}</div>` : '';
  return row('🎣 Hook:', r.hook, 'text-accent') + row('🗣️ Chisme:', r.chisme) + row('💎 Valor:', r.valor, 'text-emerald-400') +
    row('📣 CTA:', r.cta, 'text-purple-300') + row('🏛️', r.mecanicaHistorica, 'text-zinc-600');
}
function renderBiblioteca() {
  const out = document.getElementById('tab-biblioteca');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const b = OPERA.biblioteca;
    const all = [].concat(b.reels, b.carruseles, b.historias, b.youtube, b.tiktoks);
    const counts = { todos: all.length, pendiente: 0, producida: 0, publicada: 0 };
    all.forEach(p => counts[biblioEstado(p.id)]++);
    const pass = (p) => BIBLIO_FILTER === 'todos' || biblioEstado(p.id) === BIBLIO_FILTER;
    const filtros = ['todos', 'pendiente', 'producida', 'publicada'].map(f =>
      `<button onclick="operaFilterBiblio('${f}')" class="text-xs px-3 py-1.5 rounded-lg ${BIBLIO_FILTER === f ? 'bg-accent text-primary font-semibold' : 'bg-zinc-800 text-zinc-300'}">${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})</button>`).join('');

    const grid = (items, fn) => `<div class="grid sm:grid-cols-2 gap-3">${items.filter(pass).map(fn).join('') || '<p class="text-xs text-zinc-600">— nada en este filtro —</p>'}</div>`;
    const sec = (icon, tit, html) => `<div class="mb-6"><h3 class="font-display text-lg font-bold text-accent mb-3">${icon} ${tit}</h3>${html}</div>`;

    const reels = grid(b.reels, r => pieceWrap('reels', r, reelInner(r), r.thumbnail, r.pilar));
    const carr = grid(b.carruseles, c => {
      const slides = Array.isArray(c.slides) ? `<ol class="text-xs text-zinc-400 mt-1 list-decimal list-inside space-y-0.5">${c.slides.map(s => `<li>${E(s)}</li>`).join('')}</ol>` :
        `<div class="text-xs text-zinc-500 mt-1">${E(c.slides)} slides</div>`;
      return pieceWrap('carruseles', c, (c.cover ? `<div class="text-xs text-accent">Cover: ${E(c.cover)}</div>` : '') + slides, c.tema);
    });
    const hist = grid(b.historias, h => {
      const fr = h.frames || {};
      const frHTML = Object.entries(fr).map(([k, v]) => `<div class="text-xs mt-0.5"><span class="text-accent font-bold">${k}:</span> ${E(v)}</div>`).join('');
      return pieceWrap('historias', h, `<div class="text-[10px] uppercase text-emerald-300 mb-1">${E(h.objetivo)}</div>${frHTML}`, h.tema);
    });
    const yt = grid(b.youtube, v => {
      const estr = Array.isArray(v.estructura) ? `<ul class="text-xs text-zinc-400 mt-1 space-y-0.5">${v.estructura.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : '';
      return pieceWrap('youtube', v, `<div class="text-xs text-zinc-500">${E(v.duracion)}${v.pilar ? ' · ' + E(v.pilar) : ''}</div>${estr}`, v.titulo);
    });
    const tt = grid(b.tiktoks, t => pieceWrap('tiktoks', t, '', t.hook, 'TikTok'));

    const saved = OSTATE.get('saved', []);
    const savedSec = saved.length ? sec('⭐', 'Guardados por vos (' + saved.length + ')',
      `<div class="grid sm:grid-cols-2 gap-3">${saved.map((it, idx) => `
        <div class="bg-primary/40 border border-accent/25 rounded-xl p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0"><div class="font-semibold text-sm truncate">${E(it.title)}</div><div class="text-[10px] uppercase text-accent/70">${E(it.kind)}</div></div>
            <div class="flex gap-1 shrink-0">
              <button onclick="operaCopySaved(${idx})" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📋</button>
              <button onclick="operaRemoveSaved(${idx})" class="text-xs px-2 py-1 rounded bg-bordeaux/40 text-red-200 hover:bg-bordeaux/60">🗑</button>
            </div>
          </div>
        </div>`).join('')}</div>`) : '';
    out.innerHTML =
      oHero('Biblioteca de contenido', '45 piezas listas para grabar · marcá su estado a medida que producís') +
      `<div class="flex flex-wrap gap-2 mb-5 sticky top-0 bg-dark/0 z-10">${filtros}</div>` +
      savedSec +
      sec('🎬', 'Reels (' + b.reels.length + ')', reels) +
      sec('🖼️', 'Carruseles (' + b.carruseles.length + ')', carr) +
      sec('📲', 'Historias H.I.L.O. (' + b.historias.length + ')', hist) +
      sec('▶️', 'YouTube (' + b.youtube.length + ')', yt) +
      sec('🎵', 'TikToks (' + b.tiktoks.length + ')', tt);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: RE-LAUNCH
// =========================================================
function renderRelaunch() {
  const out = document.getElementById('tab-relaunch');
  if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const rl = OPERA.reLaunch;
    const pre = rl.preLaunch.map(p => {
      const cid = 'pre-' + p.dia, on = operaChecked(cid);
      return `<label data-check="${cid}" class="flex items-start gap-2 py-1.5 cursor-pointer ${on ? 'opacity-50' : ''}">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="operaToggleCheck('${cid}', this.checked)" class="mt-0.5 accent-[#C8A864]">
        <span class="text-sm"><span class="text-accent font-bold">Día ${p.dia}</span> — ${E(p.accion)}</span>
      </label>`;
    }).join('');
    const ld = rl.launchDay;
    const ldCid = 'launch-0', ldOn = operaChecked(ldCid);
    const PILAR_COLOR = { 'Criterio ★': 'text-accent', 'Números': 'text-sky-300', 'Financiamiento': 'text-emerald-300', 'Mentalidad': 'text-purple-300', 'Sistema': 'text-amber-300', 'Casos': 'text-pink-300', 'El juego': 'text-orange-300', 'Modelos': 'text-teal-300', 'Alcance': 'text-zinc-400' };
    const semanas = rl.calendario30Dias.map(s => {
      const dias = s.dias.map(d => {
        const cid = 'cal-s' + s.semana + '-' + d.dia, on = operaChecked(cid);
        const pc = PILAR_COLOR[d.pilar] || 'text-zinc-400';
        return `<label data-check="${cid}" class="flex items-start gap-2 py-1 cursor-pointer ${on ? 'opacity-50' : ''}">
          <input type="checkbox" ${on ? 'checked' : ''} onchange="operaToggleCheck('${cid}', this.checked)" class="mt-0.5 accent-[#C8A864]">
          <span class="text-xs"><span class="text-zinc-500 w-8 inline-block">${E(d.dia)}</span> ${E(d.pieza)} <span class="${pc} text-[10px]">· ${E(d.pilar)}</span></span>
        </label>`;
      }).join('');
      return `<div class="bg-primary/40 border border-zinc-800 rounded-lg p-3">
        <div class="flex items-center justify-between mb-1.5"><div class="font-semibold text-sm">Semana ${s.semana}</div><span class="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">${E(s.tema)}</span></div>
        <div class="divide-y divide-zinc-800/40">${dias}</div>
      </div>`;
    }).join('');
    out.innerHTML =
      oHero('Re-Launch · plan 30 días', 'Pre-launch (-7 a 0), día de lanzamiento y calendario de 4 semanas con tracking') +
      oCard('⏳ Pre-Launch (-7 a -1)', `<div class="divide-y divide-zinc-800/50">${pre}</div>`) +
      oCard('🚀 Día de lanzamiento',
        `<label data-check="${ldCid}" class="flex items-start gap-2 cursor-pointer ${ldOn ? 'opacity-50' : ''} mb-2">
          <input type="checkbox" ${ldOn ? 'checked' : ''} onchange="operaToggleCheck('${ldCid}', this.checked)" class="mt-1 accent-[#C8A864]">
          <span class="text-sm font-semibold">${E(ld.principal)}</span>
        </label>
        <div class="text-sm text-zinc-300 mb-1">📌 ${E(ld.stories)}</div>
        <div class="bg-accent/10 border border-accent/25 rounded-lg p-3 text-sm text-accent mt-2">📣 ${E(ld.cta)}</div>`) +
      oCard('🗓️ Calendario 30 días', `<div class="grid sm:grid-cols-2 gap-3">${semanas}</div>`, 'Marcá cada pieza al publicarla');
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  Amplificación de la tab Estrategia (eco histórico de las fórmulas)
// =========================================================
function amplificarEstrategia() {
  const out = document.getElementById('tab-estrategia');
  if (!out || out.dataset.opera) return;
  ensureOpera().then(() => {
    if (out.dataset.opera) return;
    out.dataset.opera = '1';
    const ecos = [
      { f: 'REEL (Julio): Hook → Chisme → Valor → CTA', eco: 'Apple "Think Different" (manifiesto sobre features) + MrBeast (retención obsesiva primeros 3s). El chisme tapa el valor igual que Bernays escondía al patrocinador.' },
      { f: 'REEL que vende (Sell Your Knowledge)', eco: 'Dollar Shave Club: producto/sistema en cámara desde el segundo 1 + honestidad brutal en el hook. Hormozi: valor masivo gratis con funnel claro.' },
      { f: 'HISTORIAS · Método H.I.L.O.', eco: 'Obama 2008: la lista (DM/WhatsApp) como activo #1. La interacción (encuestas/quiz) = inteligencia de audiencia antes de vender (Goebbels, técnica neutra).' },
      { f: 'YOUTUBE (Richard): idea = remix + título por palanca + miniatura por capas', eco: 'MrBeast: 50+ variantes de thumbnail A/B. Uncle Sam "I Want YOU": contacto visual directo + gesto enfático en la miniatura. De Beers: eslogan permanente en cada pieza.' },
    ];
    const card = document.createElement('div');
    card.className = 'bg-primary/40 border border-accent/15 rounded-xl p-5 mt-4';
    card.innerHTML = `<h3 class="font-display text-lg font-bold text-accent mb-3">🏛️ Eco histórico de las 4 fórmulas</h3>
      <div class="space-y-3">${ecos.map(x => `
        <div class="border-l-2 border-accent/40 pl-3">
          <div class="text-sm font-semibold text-light">${E(x.f)}</div>
          <div class="text-xs text-zinc-400 mt-0.5">${E(x.eco)}</div>
        </div>`).join('')}</div>`;
    const container = out.querySelector('.space-y-4') || out;
    container.appendChild(card);
  });
}

// =========================================================
//  Dispatcher + init
// =========================================================
window.OPERA_RENDERERS = {
  manifiesto: renderManifiesto,
  identidad: renderIdentidad,
  visual: renderVisual,
  psicologia: renderPsicologia,
  redes: renderRedes,
  relaunch: renderRelaunch,
  biblioteca: renderBiblioteca,
  estrategia: amplificarEstrategia,
  calendario: bannerCalendario,
};
function bannerCalendario() {
  const sec = document.getElementById('tab-calendario');
  if (!sec || sec.dataset.opera) return;
  sec.dataset.opera = '1';
  const b = document.createElement('div');
  b.className = 'bg-accent/10 border border-accent/25 rounded-xl p-3 mb-4 text-sm text-accent flex items-center justify-between gap-2';
  b.innerHTML = `<span>📌 ¿Buscás el plan fijo de 30 días con tracking? Está en la tab <b>🚀 Re-Launch</b>.</span>
    <button onclick="document.querySelector('[data-tab=relaunch]').click()" class="text-xs px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 shrink-0">Ir a Re-Launch</button>`;
  sec.insertBefore(b, sec.firstChild);
}
document.addEventListener('DOMContentLoaded', () => {
  ensureOpera();
  renderManifiesto(); // tab por defecto
});
