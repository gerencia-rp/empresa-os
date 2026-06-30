/* Flippeá con método — OS de marca personal de Nicolás Lara · DATA v2.
   Tabs estáticas/interactivas (render desde viral-data/opera-imperio-data-v2.json) + state machine localStorage.
   Se carga DESPUÉS de viral.js. Reusa el sistema de tabs/paneles de viral.js vía window.OPERA_RENDERERS. */

// ---------- Carga de la data maestra (v2) ----------
let OPERA = null, OPERA_LOADING = null;
function ensureOpera() {
  if (OPERA) return Promise.resolve(OPERA);
  if (!OPERA_LOADING) {
    OPERA_LOADING = fetch('viral-data/opera-imperio-data-v2.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => (OPERA = d));
  }
  return OPERA_LOADING;
}
// La tab Visual no existe en v2: se alimenta del bloque `visual` del v1 (sin leer el resto).
function ensureVisual() {
  return ensureOpera().then(() => {
    if (OPERA.visual) return;
    return fetch('viral-data/opera-imperio-data.json').then(r => r.json())
      .then(v1 => { OPERA.visual = v1.visual; OPERA._visualFromV1 = true; })
      .catch(() => { OPERA.visual = null; });
  });
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

// ---------- Helpers de render ----------
const E = (s) => (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const NUM = (n) => (n == null || isNaN(n) ? '' : Number(n).toLocaleString('es'));
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
    `<li class="flex gap-2"><span class="${c} shrink-0">▸</span><span>${typeof x === 'string' ? E(x) : E(x)}</span></li>`).join('')}</ul>`;
}
function oChips(arr, cls) {
  const k = cls || 'bg-accent/15 text-accent border border-accent/25';
  return `<div class="flex flex-wrap gap-1.5">${(arr || []).map(x => `<span class="text-xs px-2 py-1 rounded-lg ${k}">${E(x)}</span>`).join('')}</div>`;
}
function checkList(items, prefix) {
  return `<div class="divide-y divide-zinc-800/50">${items.map((it, i) => {
    const cid = prefix + '-' + i, on = operaChecked(cid);
    return `<label data-check="${cid}" class="flex items-start gap-2 py-1.5 cursor-pointer ${on ? 'opacity-50' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="operaToggleCheck('${cid}', this.checked)" class="mt-0.5 accent-[#C8A864]">
      <span class="text-sm">${E(it)}</span></label>`;
  }).join('')}</div>`;
}

// Bloque "fórmula amplificada" inyectado al prompt de los generadores
window.operaAmplify = function () {
  if (!OPERA) return '';
  const a = OPERA.arquetipo, en = a.enemigos;
  return `\n\n=== FÓRMULA AMPLIFICADA · MARCA "FLIPPEÁ CON MÉTODO" ===
Framework central a inyectar donde encaje: ${OPERA.identidad.framework} (5 fases: preparación, adquisición, ejecución, salida, escala).
Arquetipo: ${a.nombre} (${a.fusion}). ${a.descripcion}
Frase maestra: "${OPERA.identidad.fraseMaestra}".
Enemigo principal (visible): ${en.principal.nombre} — ${en.principal.descripcion}.
Enemigo invisible (columna vertebral): ${en.invisible.nombre} — ${en.invisible.descripcion} Todo output debe terminar en algo aplicable HOY.
Frases bandera (insertá alguna): ${a.frasesRecurrentes.bandera.join(' / ')}.
Cierres posibles: ${a.frasesRecurrentes.cierre.join(' / ')}.
Palabras de marca: ${a.palabrasDeMarca.join(', ')}.
Palabras PROHIBIDAS (jamás): ${a.palabrasProhibidas.join(', ')}.
Foco 95% Fix & Flip; las 4 empresas se mencionan solo como CREDIBILIDAD (5%). Tono rioplatense, directo, con números/casos reales. El eslogan "Flippeá con método" debe aparecer o insinuarse.`;
};
// Bloque de avatar destino para los generadores
window.operaAvatarBlock = function (avatarId) {
  if (!OPERA || !avatarId) return '';
  const av = OPERA.avatares[avatarId]; if (!av) return '';
  return `\n\n=== AVATAR DESTINO: ${av.nombre} ===
Perfil: ${av.perfil}
Dolores: ${av.pain.join('; ')}.
Ángulo de marketing: ${av.anguloMarketing}. Lead magnet asociado: ${av.leadMagnet}.
Adaptá el tono a este avatar (${avatarId === 'avatar2' ? 'seguridad + reducción de riesgo + primer flip' : 'eficiencia + sistema + escalamiento'}).`;
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
  const saved = OSTATE.get('saved', []); saved.splice(idx, 1); OSTATE.set('saved', saved);
  const out = document.getElementById('tab-biblioteca'); if (out) { out.dataset.rendered = ''; renderBiblioteca(); }
}
function operaCopySaved(idx) {
  const it = OSTATE.get('saved', [])[idx]; if (!it) return;
  navigator.clipboard.writeText(JSON.stringify(it.obj, null, 2));
}
window.operaRemoveSaved = operaRemoveSaved;
window.operaCopySaved = operaCopySaved;

// =========================================================
//  TAB: MANIFIESTO
// =========================================================
function renderManifiesto() {
  const out = document.getElementById('tab-manifiesto'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const m = OPERA.marca, id = OPERA.identidad;
    const manifiestoHTML = id.manifiesto.map(l => l === '' ? '<div class="h-3"></div>' :
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
        <div class="text-sm text-light/70 mt-2">${E(id.tagline)}</div>
        <div class="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-accent/15 text-accent border border-accent/30">${E(id.framework)}</div>
      </div>` +
      oCard('⚡ Frase maestra', `<p class="font-display text-xl text-light">${E(id.fraseMaestra)}</p>`) +
      oCard('🎯 Promesa principal', `<p class="text-sm text-zinc-200 leading-relaxed">${E(id.promesaPrincipal)}</p>`) +
      oCard('📖 Narrativa oficial', `<p class="text-sm text-zinc-200 leading-relaxed">${E(id.narrativaOficial)}</p>`) +
      oCard('✊ Manifiesto', `<div class="space-y-0.5">${manifiestoHTML}</div>`) +
      oCard('🎚️ Variantes del eslogan', `<div class="grid sm:grid-cols-2 gap-2">${variantes}</div>`, 'Cuándo usar cada una') +
      oCard('🧱 Foco del mensaje', `<div class="grid sm:grid-cols-2 gap-3 text-sm">
        <div class="bg-billete/15 border border-billete/40 rounded-lg p-3"><b class="text-emerald-300">95% — ${E(m.focoPrincipal)}</b><div class="text-zinc-300 mt-1">El protagonista del contenido.</div></div>
        <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><b class="text-accent">5% — Credibilidad</b><div class="text-zinc-300 mt-1">${E(m.subcomunicacion)}</div></div>
      </div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error cargando data: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: IDENTIDAD (enemigo dual + tácticos)
// =========================================================
function renderIdentidad() {
  const out = document.getElementById('tab-identidad'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const a = OPERA.arquetipo, en = a.enemigos, fr = a.frasesRecurrentes;
    const enemyCard = (e, badge, color) => `
      <div class="bg-primary/40 border ${color} rounded-lg p-4">
        <div class="flex items-center gap-2 mb-1"><span class="text-[10px] uppercase px-2 py-0.5 rounded ${badge}">${E(e.tipo)}</span></div>
        <div class="font-display text-lg font-bold">${E(e.nombre)}</div>
        <p class="text-sm text-zinc-300 mt-1">${E(e.descripcion)}</p>
        <div class="text-[11px] text-zinc-500 mt-2">${E(e.comoAtacarlos || e.comoAtacarlo)}</div>
        <div class="mt-2">${oList(e.frasesAntiEnemigo, color.includes('bordeaux') ? 'text-red-400' : 'text-accent')}</div>
      </div>`;
    const tacticos = en.tacticos.map(t => `
      <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3">
        <div class="font-semibold text-sm text-light">${E(t.nombre)}</div>
        <div class="text-[11px] text-zinc-500 italic">${E(t.pain)}</div>
        <div class="text-sm text-red-300/90 mt-1.5">“${E(t.frase)}”</div>
        <div class="text-xs text-emerald-300 mt-1.5">✓ ${E(t.tuSolucion)}</div>
      </div>`).join('');
    const frasesGrupo = (tit, arr, c) => `<div class="mb-3"><div class="text-[11px] uppercase font-bold ${c} mb-1.5">${tit}</div>${oList(arr)}</div>`;
    out.innerHTML =
      oHero('El arquetipo: ' + a.nombre, a.fusion) +
      oCard('🧬 Quién sos', `<p class="text-sm text-zinc-200 leading-relaxed">${E(a.descripcion)}</p>`) +
      oCard('⚔️ Los dos enemigos', `<div class="grid sm:grid-cols-2 gap-3">
        ${enemyCard(en.principal, 'bg-bordeaux/40 text-red-200', 'border-bordeaux/40')}
        ${enemyCard(en.invisible, 'bg-zinc-700 text-zinc-200', 'border-accent/30')}
      </div>`, 'Principal = la cara visible · Invisible = la columna vertebral de todo el mensaje') +
      oCard('🎯 Los 10 enemigos tácticos', `<div class="grid sm:grid-cols-2 gap-3">${tacticos}</div>`, 'Cada uno: dolor + frase + tu solución') +
      oCard('💬 Frases recurrentes',
        frasesGrupo('🚩 Bandera', fr.bandera, 'text-accent') +
        frasesGrupo('🌉 Puente', fr.puente, 'text-sky-400') +
        frasesGrupo('🎬 Cierre', fr.cierre, 'text-emerald-400')) +
      oCard('🔤 Palabras', `<div class="grid sm:grid-cols-2 gap-4">
        <div><div class="text-[11px] uppercase font-bold text-red-300 mb-2">Prohibidas</div>${oChips(a.palabrasProhibidas, 'bg-bordeaux/20 text-red-300 border border-bordeaux/40 line-through')}</div>
        <div><div class="text-[11px] uppercase font-bold text-emerald-300 mb-2">De marca</div>${oChips(a.palabrasDeMarca)}</div>
      </div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: VISUAL (data del v1 como fallback)
// =========================================================
function renderVisual() {
  const out = document.getElementById('tab-visual'); if (!out || out.dataset.rendered) return;
  ensureVisual().then(() => {
    out.dataset.rendered = '1';
    const v = OPERA.visual;
    if (!v) { out.innerHTML = oHero('Identidad visual') + `<p class="text-sm text-zinc-400">No se pudo cargar la data visual.</p>`; return; }
    const s = v.simbolo, p = v.paletaColores, t = v.tipografia, ve = v.vestimenta, g = v.gestos;
    const hexSVG = `<svg viewBox="0 0 100 100" class="h-24 w-24 mx-auto"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke="#C8A864" stroke-width="4"/><polygon points="50,24 72,37 72,63 50,76 28,63 28,37" fill="none" stroke="#C8A864" stroke-width="2.5" opacity=".6"/><text x="50" y="60" text-anchor="middle" font-family="Playfair Display,serif" font-size="28" font-weight="800" fill="#C8A864">NL</text></svg>`;
    const swatch = (c) => `<div class="rounded-lg overflow-hidden border border-zinc-800"><div class="h-12" style="background:${E(c.hex)}"></div><div class="p-2"><div class="text-sm font-semibold">${E(c.nombre)}</div><div class="text-[11px] text-zinc-500">${E(c.hex)}</div><div class="text-[11px] text-zinc-400 mt-0.5">${E(c.uso)}</div></div></div>`;
    const escenarios = (ve.escenarios || []).map(e => {
      const el = Object.entries(e.elementos || {}).map(([k, val]) => `<div class="text-xs"><span class="text-accent capitalize">${E(k)}:</span> <span class="text-zinc-300">${E(val)}</span></div>`).join('');
      return `<div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="flex items-center justify-between gap-2 mb-1"><div class="font-semibold text-sm">${E(e.nombre)}</div>${e.porcentaje ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent shrink-0">${E(e.porcentaje)}</span>` : ''}</div><div class="text-[11px] text-zinc-500 italic mb-2">${E(e.look)}</div><div class="space-y-0.5">${el}</div></div>`;
    }).join('');
    const gestoBlock = (tit, arr, c) => arr ? `<div class="mb-3"><div class="text-[11px] uppercase font-bold ${c || 'text-accent'} mb-1.5">${tit}</div>${oList(arr)}</div>` : '';
    out.innerHTML =
      oHero('Identidad visual', 'Símbolo, paleta, tipografía, vestuario y lenguaje corporal') +
      (OPERA._visualFromV1 ? '' : '') +
      oCard('💎 Símbolo: ' + E(s.nombre), `<div class="grid sm:grid-cols-[140px_1fr] gap-4 items-start"><div class="bg-dark rounded-xl p-3">${hexSVG}</div><div><div class="text-[11px] uppercase font-bold text-zinc-400 mb-1.5">Significado</div>${oList(s.significado)}<div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">Dónde va</div>${oList(s.ubicacion)}<div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">Versiones</div>${oChips(s.versiones)}</div></div>`) +
      oCard('🎨 Paleta de colores', `<div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">Primarios</div><div class="grid grid-cols-3 gap-2 mb-4">${p.primarios.map(swatch).join('')}</div><div class="text-[11px] uppercase font-bold text-zinc-400 mb-2">Secundarios</div><div class="grid grid-cols-3 gap-2 mb-4">${p.secundarios.map(swatch).join('')}</div><div class="text-[11px] uppercase font-bold text-red-300 mb-2">Prohibidos</div>${oList(p.prohibidos, 'text-red-400')}`) +
      oCard('🔠 Tipografía', `<div class="grid sm:grid-cols-2 gap-3 mb-3"><div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="text-[11px] text-zinc-500">DISPLAY</div><div class="font-display text-xl text-light">${E(t.display)}</div></div><div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="text-[11px] text-zinc-500">BODY</div><div class="text-xl text-light">${E(t.body)}</div></div></div>${oList(t.reglas)}`) +
      oCard('👔 Vestuario', `<div class="grid sm:grid-cols-3 gap-3 mb-4"><div><div class="text-[11px] uppercase font-bold text-zinc-400 mb-1.5">Principios</div>${oList(ve.principios)}</div><div><div class="text-[11px] uppercase font-bold text-emerald-300 mb-1.5">Siempre</div>${oList(ve.siempre, 'text-emerald-400')}</div><div><div class="text-[11px] uppercase font-bold text-red-300 mb-1.5">Nunca</div>${oList(ve.nunca, 'text-red-400')}</div></div><div class="grid sm:grid-cols-2 gap-3">${escenarios}</div>`) +
      oCard('🤚 Lenguaje corporal', `<div class="grid sm:grid-cols-2 gap-x-6">${gestoBlock('Cómo pararte', g.comoPararte) + gestoBlock('Mirada a cámara', g.comoMirarCamara) + gestoBlock('Manos SÍ', g.manosSi, 'text-emerald-400') + gestoBlock('Respiración', g.respiracion)}${gestoBlock('Manos NO', g.manosNo, 'text-red-400') + gestoBlock('Cómo entrar', g.comoEntrar) + gestoBlock('Cómo cerrar', g.comoCerrar)}</div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: PSICOLOGÍA (v2: leyes con herramienta + tácticas con tuVersion/herramientaApp)
// =========================================================
function renderPsicologia() {
  const out = document.getElementById('tab-psicologia'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const ps = OPERA.psicologia;
    const leyes = ps.leyesUniversales.map(l => `
      <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3 flex gap-3">
        <div class="font-display text-2xl font-black text-accent/70 shrink-0 w-8">${l.ley}</div>
        <div><div class="font-semibold text-sm">${E(l.nombre)}</div><div class="text-xs text-zinc-400 mt-0.5">${E(l.explicacion)}</div>
        <div class="text-[11px] text-emerald-300/80 mt-1">🛠️ ${E(l.herramienta)}</div></div>
      </div>`).join('');
    const tacticas = ps.tacticasAplicadas.map(t => `
      <tr class="border-t border-zinc-800 align-top">
        <td class="py-2 pr-2 text-zinc-600 text-xs">${t.id}</td>
        <td class="py-2 pr-3 text-xs text-accent whitespace-nowrap">${E(t.maestro)}</td>
        <td class="py-2 pr-3 text-sm">${E(t.tecnica)}</td>
        <td class="py-2 pr-3 text-xs text-zinc-300">${E(t.tuVersion)}</td>
        <td class="py-2 text-[11px] text-emerald-300/80">${E(t.herramientaApp)}</td>
      </tr>`).join('');
    out.innerHTML =
      oHero('Psicología aplicada', 'Cada ley/táctica tiene su herramienta concreta en la app') +
      oCard('⚖️ 7 leyes universales', `<div class="space-y-2">${leyes}</div>`) +
      oCard('🎯 16 tácticas aplicadas', `<div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-[10px] uppercase text-zinc-600 text-left"><th></th><th>Maestro</th><th>Técnica</th><th>Tu versión</th><th>Herramienta app</th></tr></thead><tbody>${tacticas}</tbody></table></div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: MIS REDES (v2)
// =========================================================
function renderRedes() {
  const out = document.getElementById('tab-redes'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const r = OPERA.misRedes, k = OPERA.kpis, ig = r.instagram, tt = r.tiktok, yt = r.youtube;
    const bio = (arr) => `<div class="bg-billete/15 border border-billete/40 rounded-lg p-3 text-sm text-emerald-100"><div class="text-[10px] uppercase text-emerald-300 font-bold mb-1">Bio nueva</div>${arr.map(l => `<div>${E(l)}</div>`).join('')}</div>`;
    const highlights = (ig.highlights || []).map(h => `<div class="bg-primary/40 border border-zinc-800 rounded-lg p-2 text-center"><div class="text-xl">${E(h.icono)}</div><div class="text-[11px] font-bold">${E(h.nombre)}</div><div class="text-[10px] text-zinc-500">${E(h.contenido)}</div></div>`).join('');
    const reelsFijos = (ig.reelsFijos || []).map(rf => `<div class="text-sm"><span class="text-accent font-bold">#${rf.pos}</span> ${E(rf.tipo)}</div>`).join('');
    const kpiRow = (lbl, base, obj) => `<div class="border-t border-zinc-800 py-2 flex items-center justify-between text-sm"><span class="text-zinc-300">${lbl}</span><span><span class="text-zinc-500">${NUM(base)}</span> → <span class="text-accent font-bold">${NUM(obj)}</span></span></div>`;
    out.innerHTML =
      oHero('Mis redes', 'Bios nuevas, highlights y decisión de handle') +
      oCard('📸 Instagram · ' + E(ig.handle),
        `<div class="text-sm text-zinc-400 mb-2">${NUM(ig.seguidores)} seguidores · Foto: ${E(ig.fotoPerfil)}</div>${bio(ig.bioNueva)}
        <div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">Highlights nuevos</div><div class="grid grid-cols-3 sm:grid-cols-6 gap-2">${highlights}</div>
        <div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1.5">3 reels fijos</div>${reelsFijos}`) +
      oCard('🎵 TikTok · ' + E(tt.handle), `<div class="text-sm text-zinc-400 mb-2">Display nuevo: <b class="text-light">${E(tt.displayNuevo)}</b></div>${bio(tt.bioNueva)}`) +
      oCard('▶️ YouTube · ' + E(yt.handleActual),
        `<div class="bg-accent/10 border border-accent/25 rounded-lg p-3 mb-2"><div class="text-[11px] uppercase text-accent font-bold mb-1">Decisión de handle</div><div class="text-sm text-zinc-200">${E(yt.decisionPendiente)}</div></div>
        <div class="text-sm"><b class="text-accent">Nombre nuevo:</b> ${E(yt.nuevoNombreCanal)}</div>
        <div class="text-sm text-zinc-300 mt-1"><b class="text-zinc-400">Descripción:</b> ${E(yt.descripcion)}</div>`) +
      oCard('🎯 KPIs · baseline → objetivo 30 días',
        kpiRow('Instagram', k.baseline.instagram, k.objetivosDia30.instagram) +
        kpiRow('TikTok', k.baseline.tiktok, k.objetivosDia30.tiktok) +
        kpiRow('YouTube', k.baseline.youtube, k.objetivosDia30.youtube) +
        `<div class="border-t border-zinc-800 py-2 text-sm text-zinc-300">DMs con palabra clave/sem: <b class="text-accent">${k.objetivosDia30.dmsConPalabraClaveSemanales}</b> · Leads cualificados/mes: <b class="text-accent">${k.objetivosDia30.leadsCualificadosMensuales}</b> · Alumnos nuevos/mes: <b class="text-accent">${k.objetivosDia30.estudiantesNuevosMensuales}</b></div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: SISTEMA FLIP ANTI-RIESGOS™ (la joya — herramientas interactivas)
// =========================================================
const SFR_CHECKLISTS = {
  'Setup financiero 30 días': ['Score de crédito chequeado (Credit Karma/Experian)', 'Deudas de alto interés listadas y plan de pago', 'Fondo de emergencia (3-6 meses de gastos) separado', 'Capital invertible calculado (sin tocar liquidez)', 'Cuenta bancaria de negocio abierta', 'LLC formada (o en trámite) + EIN solicitado', 'Operating agreement firmado', 'Contador/CPA contactado', '2-3 lenders precalificados (ITIN/DSCR/Hard money)', 'Prueba de fondos (POF) lista para ofertas', 'Buy Box definido por escrito', 'Zona/mercado objetivo elegido (1-2 zip codes)', 'Agente inmobiliario investor-friendly contactado', 'Lista de wholesalers locales armada', 'GC pre-evaluado (matriz)', 'Seguro de propiedad/builder’s risk cotizado', 'Software de análisis listo (la calculadora de 4 números)', 'Plantilla de oferta lista', 'Abogado de real estate contactado', 'Primera oferta puesta antes del día 30'],
  'Inspección 30 segundos': ['Fundación: ¿grietas grandes, desnivel, humedad en base?', 'Techo: ¿edad, hundimientos, manchas de agua en cielorraso?', 'Sistemas: ¿edad de eléctrico/plomería/HVAC (caja, calentador)?', 'Olor: ¿moho, mascotas, humo (señal de problemas ocultos)?', 'Estructura/layout: ¿paredes de carga a mover? (encarece todo)'],
  'Visita semanal a obra': ['Avance vs cronograma (¿en fecha?)', 'Trabajo de la semana anterior terminado y bien', 'Materiales en sitio para la semana siguiente', 'Permisos visibles y al día', 'Fotos de cada ambiente tomadas', 'Cambios/extras documentados por escrito', 'Próximo pago atado a hito cumplido (no a fecha)', 'Calidad: ¿lo harías en tu propia casa?', 'Seguridad del sitio (sin riesgos/robos)', 'Sub-contratistas correctos en sitio', 'Basura/escombros gestionados', 'Comunicación con GC esta semana registrada', 'Presupuesto consumido vs % de obra', 'Problemas nuevos detectados y plan', 'Próxima visita agendada'],
  'Closing sin sorpresas': ['Title search limpio (sin liens)', 'Title insurance contratada', 'Survey/plano si aplica', 'Tasación (appraisal) ≥ precio de venta', 'Inspección del comprador resuelta', 'Repairs negociados cerrados', 'Financiamiento del comprador confirmado', 'HOA docs entregados si aplica', 'Utilities transferidas/programadas', 'Walkthrough final agendado', 'Settlement statement (HUD/CD) revisado línea por línea', 'Net proceeds calculado y verificado', 'Cuenta para recibir wire confirmada (anti-fraude)', 'Documentos firmados completos', 'Llaves/garage/manuales listos para entregar', 'Comisiones de agentes verificadas', 'Impuestos prorrateados correctos', 'Fecha de posesión clara', 'Power of attorney si no podés asistir', 'Copia digital de todo el closing guardada'],
};
const SFR_DOCS = {
  'Documentos LLC (templates)': 'Operating Agreement (single/multi-member) + solicitud de EIN online (IRS, gratis, 10 min) + apertura de cuenta de negocio. Tip: formá la LLC en el estado donde flippeás; podés operar con LLC de días de antigüedad (los lenders de inversión prestan a la PROPIEDAD/negocio, no a la persona).',
  'Lenders para latinos: 5 opciones validadas': 'Harmony Lending · Kiavi · RCN Capital · Civic · Lima One. Todos prestan a inversión (no W-2 de 2 años). Pedí: % LTV/LTC, puntos, tasa, plazo, si aceptan ITIN, días de cierre. Hard money = rápido (14 días) y caro; DSCR = según renta; ITIN = sin SSN.',
  'Negociación: 7 movimientos validados': '1) Ancla baja justificada por los números. 2) Pedí concesiones de reparación, no solo precio. 3) Cerrá rápido a cambio de descuento. 4) Cash + POF visible. 5) Silencio después de ofertar. 6) Walk-away creíble. 7) Re-trade solo con inspección real, no por capricho.',
  'Contrato GC blindado': 'Cláusulas mínimas: pagos POR HITOS (no adelanto >10%), penalidad por retraso ($/día), responsable de materiales y permisos, garantía de mano de obra, retención del 10% hasta closing, lien waivers firmados en cada pago, scope of work detallado por ambiente, fecha de finalización con fecha tope.',
  'Listing optimizado: 12 elementos': 'Fotos profesionales (HDR) · twilight shot · descripción con keywords del barrio · precio en punto psicológico · staging mínimo · video walkthrough · floor plan · timing (jueves AM) · agent MLS vs FSBO · open house primer finde · respuesta a ofertas <24h · disclosure completa.',
  'Plan 12 meses: 4 flips': 'Trimestre 1: flip #1 (aprendizaje, margen conservador). T2: flip #2 + buscar #3 en paralelo. T3: flip #3 + sistematizar plantillas. T4: flip #4 + armar equipo (GC fijo + dispo + agente). Regla: no arranques el siguiente sin cerrar el anterior los 2 primeros.',
  'Cuándo armar tu equipo': 'Orden de contratación: 1) GC de confianza (flip 2-3). 2) Dispositions/buscador de deals (flip 3-4). 3) Project manager (flip 5+). 4) Bookkeeper. 5) Acquisitions. No contrates antes de tener flujo que lo pague.',
  'Matriz de selección de GC': '12 preguntas: ¿licencia y seguro? ¿cuántos flips/año? ¿referencias de inversores? ¿maneja permisos? ¿timeline realista? ¿acepta pago por hitos? ¿garantía? ¿su propio equipo o subs? ¿maneja cambios por escrito? ¿lien waivers? ¿foto de obras previas? ¿disponibilidad real? · 5 docs a pedir: licencia, seguro de responsabilidad, W-9, referencias, portfolio.',
};
function renderSistema() {
  const out = document.getElementById('tab-sistema'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const sfr = OPERA.sistemaFlipAntiRiesgos;
    const toolBody = (h) => {
      const calc = SFR_CALCS[h.nombre];
      if (calc) return calc();
      if (SFR_CHECKLISTS[h.nombre]) return checkList(SFR_CHECKLISTS[h.nombre], 'sfr-' + h.nombre.replace(/\s+/g, '-'));
      if (h.nombre === 'Buy Box Builder (10 pasos)') return buyBoxWizard();
      if (SFR_DOCS[h.nombre]) return `<details><summary class="cursor-pointer text-xs text-accent">Ver contenido</summary><p class="text-sm text-zinc-300 mt-2 whitespace-pre-line">${E(SFR_DOCS[h.nombre])}</p></details>`;
      return '';
    };
    const TIPO_ICON = { calculadora: '🧮', wizard: '🧭', checklist: '✅', plantilla: '📄', guia: '📘', matriz: '🗂️' };
    const fases = sfr.fases.map(f => {
      const tools = f.herramientas.map(h => `
        <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-1"><span>${TIPO_ICON[h.tipo] || '🔧'}</span><span class="font-semibold text-sm">${E(h.nombre)}</span><span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-accent/15 text-accent ml-auto">${E(h.tipo)}</span></div>
          <div class="text-[11px] text-zinc-500 mb-2">${E(h.descripcion)}</div>
          ${toolBody(h)}
        </div>`).join('');
      return `<div class="mb-5">
        <div class="flex items-center gap-3 mb-2"><div class="h-9 w-9 rounded-full bg-accent/15 text-accent font-display font-black flex items-center justify-center shrink-0">${f.numero}</div>
        <div><div class="font-display text-lg font-bold text-light">${E(f.nombre)}</div><div class="text-[11px] text-zinc-400">${E(f.objetivo)}</div></div></div>
        <div class="grid sm:grid-cols-2 gap-3">${tools}</div>
      </div>`;
    }).join('');
    out.innerHTML =
      oHero(sfr.nombre, sfr.descripcion) +
      oCard('🧱 Principios', oList(sfr.principios)) +
      fases;
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}
// --- Calculadoras interactivas ---
const inp = (id, ph, val) => `<input id="${id}" type="number" inputmode="decimal" placeholder="${ph}" ${val != null ? `value="${val}"` : ''} oninput="${id.split('-')[0] === 'mao' ? 'sfrMAO' : id.split('-')[0]}()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`;
const fieldRow = (label, input) => `<label class="block mb-2"><span class="text-[11px] text-zinc-400">${label}</span>${input}</label>`;
const SFR_CALCS = {
  'Calculadora de capital disponible': () => `
    ${fieldRow('Ahorros totales ($)', `<input id="cap-ahorros" type="number" placeholder="80000" oninput="sfrCapital()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Gasto mensual ($)', `<input id="cap-gasto" type="number" placeholder="4000" oninput="sfrCapital()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Meses de reserva', `<input id="cap-meses" type="number" placeholder="6" value="6" oninput="sfrCapital()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    <div id="cap-out" class="mt-2 text-sm bg-dark rounded p-2 text-emerald-300">Completá los campos.</div>`,
  'Calculadora 4 Números': () => `
    ${fieldRow('ARV — valor reparada ($)', `<input id="mao-arv" type="number" placeholder="300000" oninput="sfrMAO()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Rehab — remodelación ($)', `<input id="mao-rehab" type="number" placeholder="50000" oninput="sfrMAO()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Costos (closing+holding+venta) %', `<input id="mao-costos" type="number" placeholder="12" value="12" oninput="sfrMAO()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Margen deseado %', `<input id="mao-margen" type="number" placeholder="15" value="15" oninput="sfrMAO()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Precio pedido ($) — opcional', `<input id="mao-ask" type="number" placeholder="160000" oninput="sfrMAO()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    <div id="mao-out" class="mt-2 text-sm bg-dark rounded p-2 text-accent">MAO aparece acá.</div>`,
  'Presupuesto Rehab + 20%': () => `
    ${fieldRow('Presupuesto del GC ($)', `<input id="rehab-gc" type="number" placeholder="50000" oninput="sfrRehab()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    <div id="rehab-out" class="mt-2 text-sm bg-dark rounded p-2 text-accent">Tu presupuesto real con buffer aparece acá.</div>`,
  'Vender vs Hold (BRRRR)': () => `
    ${fieldRow('Ganancia neta si VENDÉS ($)', `<input id="vh-venta" type="number" placeholder="45000" oninput="sfrVH()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Cashflow mensual si RENTÁS ($)', `<input id="vh-renta" type="number" placeholder="600" oninput="sfrVH()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Capital que recuperás al refinanciar ($)', `<input id="vh-refi" type="number" placeholder="30000" oninput="sfrVH()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    <div id="vh-out" class="mt-2 text-sm bg-dark rounded p-2 text-accent">Comparación aparece acá.</div>`,
  'ROI portafolio a 5 años': () => `
    ${fieldRow('Flips por año', `<input id="roi-flips" type="number" placeholder="3" value="3" oninput="sfrROI()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    ${fieldRow('Margen neto promedio por flip ($)', `<input id="roi-margen" type="number" placeholder="40000" oninput="sfrROI()" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none">`)}
    <div id="roi-out" class="mt-2 text-sm bg-dark rounded p-2 text-accent">Patrimonio a 5 años aparece acá.</div>`,
};
function sfrCapital() {
  const g = id => parseFloat((document.getElementById(id) || {}).value) || 0;
  const ah = g('cap-ahorros'), ga = g('cap-gasto'), me = g('cap-meses');
  const reserva = ga * me, inv = Math.max(0, ah - reserva);
  document.getElementById('cap-out').innerHTML = `Reserva: $${NUM(reserva)} · <b>Capital invertible: $${NUM(inv)}</b>`;
}
function sfrMAO() {
  const g = id => parseFloat((document.getElementById(id) || {}).value) || 0;
  const arv = g('mao-arv'), rehab = g('mao-rehab'), costos = g('mao-costos') / 100, margen = g('mao-margen') / 100, ask = g('mao-ask');
  const mao = arv - rehab - arv * costos - arv * margen;
  let v = `MAO (oferta máxima) = <b>$${NUM(Math.round(mao))}</b>`;
  if (ask > 0) { const ok = ask <= mao; v += ` · pedido $${NUM(ask)} → <b class="${ok ? 'text-emerald-400' : 'text-red-400'}">${ok ? 'COMPRÁS ✓' : 'NO comprás ✗'}</b>`; }
  document.getElementById('mao-out').innerHTML = v;
}
function sfrRehab() {
  const gc = parseFloat((document.getElementById('rehab-gc') || {}).value) || 0;
  document.getElementById('rehab-out').innerHTML = `GC dice $${NUM(gc)} → vos presupuestá <b>$${NUM(Math.round(gc * 1.2))}</b> (buffer 20% = $${NUM(Math.round(gc * 0.2))})`;
}
function sfrVH() {
  const g = id => parseFloat((document.getElementById(id) || {}).value) || 0;
  const venta = g('vh-venta'), renta = g('vh-renta'), refi = g('vh-refi');
  const hold2a = renta * 24 + refi;
  const mejor = venta >= hold2a ? 'VENDER' : 'HOLD/BRRRR';
  document.getElementById('vh-out').innerHTML = `Vender: <b>$${NUM(venta)}</b> ahora · Hold 2 años: <b>$${NUM(hold2a)}</b> (renta+refi) → conviene <b class="text-emerald-400">${mejor}</b>`;
}
function sfrROI() {
  const g = id => parseFloat((document.getElementById(id) || {}).value) || 0;
  const flips = g('roi-flips'), margen = g('roi-margen');
  const total = flips * margen * 5;
  document.getElementById('roi-out').innerHTML = `${flips} flips/año × $${NUM(margen)} × 5 años = <b>$${NUM(total)}</b> de patrimonio generado`;
}
window.sfrCapital = sfrCapital; window.sfrMAO = sfrMAO; window.sfrRehab = sfrRehab; window.sfrVH = sfrVH; window.sfrROI = sfrROI;
// --- Buy Box wizard ---
const BUYBOX_Q = [
  { id: 'zona', q: 'Zona / zip codes objetivo', ph: 'Ej: 33012, 33015 (Hialeah)' },
  { id: 'tipo', q: 'Tipo de propiedad', ph: 'Single family / townhouse' },
  { id: 'precioMin', q: 'Precio mínimo de compra ($)', ph: '120000' },
  { id: 'precioMax', q: 'Precio máximo de compra ($)', ph: '250000' },
  { id: 'arvMin', q: 'ARV mínimo aceptable ($)', ph: '300000' },
  { id: 'descuento', q: '% descuento mínimo vs ARV', ph: '30' },
  { id: 'beds', q: 'Beds/baths mínimos', ph: '3/2' },
  { id: 'rehabMax', q: 'Rehab máximo aceptable ($)', ph: '60000' },
  { id: 'margenMin', q: 'Margen neto mínimo ($)', ph: '35000' },
  { id: 'exit', q: 'Estrategia de salida', ph: 'Flip / BRRRR / Airbnb' },
];
function buyBoxWizard() {
  return `<div class="space-y-2">${BUYBOX_Q.map(q => `<label class="block"><span class="text-[11px] text-zinc-400">${E(q.q)}</span>
    <input id="bb-${q.id}" placeholder="${E(q.ph)}" class="w-full bg-dark border border-zinc-800 rounded px-2 py-1.5 text-sm focus:border-accent outline-none"></label>`).join('')}
    <button onclick="buyBoxBuild(this)" class="w-full bg-accent text-primary font-semibold py-2 rounded text-sm">🧭 Construir Buy Box + copiar</button>
    <div id="bb-out" class="text-xs text-zinc-400 whitespace-pre-line"></div></div>`;
}
function buyBoxBuild(btn) {
  const o = {}; BUYBOX_Q.forEach(q => o[q.id] = (document.getElementById('bb-' + q.id) || {}).value || '');
  const txt = `MI BUY BOX (Sistema Flip Anti-Riesgos™)
Zona: ${o.zona} | Tipo: ${o.tipo} | Beds/baths: ${o.beds}
Compra: $${o.precioMin}–$${o.precioMax} | ARV mín: $${o.arvMin} | Descuento mín: ${o.descuento}%
Rehab máx: $${o.rehabMax} | Margen mín: $${o.margenMin} | Exit: ${o.exit}
Regla: si un deal no entra en esta caja → NEXT (sin emoción).`;
  navigator.clipboard.writeText(txt);
  document.getElementById('bb-out').textContent = txt;
  if (btn) { btn.textContent = '✓ Copiado al portapapeles'; setTimeout(() => btn.textContent = '🧭 Construir Buy Box + copiar', 1600); }
}
window.buyBoxBuild = buyBoxBuild;

// =========================================================
//  TAB: AVATARES
// =========================================================
function renderAvatares() {
  const out = document.getElementById('tab-avatares'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const av = OPERA.avatares;
    const card = (a, id, def) => `<div class="bg-primary/40 border ${def ? 'border-accent' : 'border-zinc-800'} rounded-xl p-5">
      <div class="flex items-center gap-2 mb-1"><span class="text-[10px] uppercase px-2 py-0.5 rounded bg-accent/15 text-accent">${id}</span>${def ? '<span class="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300">Default generadores</span>' : ''}</div>
      <div class="font-display text-lg font-bold">${E(a.nombre)}</div>
      <p class="text-sm text-zinc-300 mt-1">${E(a.perfil)}</p>
      <div class="text-[11px] uppercase font-bold text-red-300 mt-3 mb-1">Dolores</div>${oList(a.pain, 'text-red-400')}
      <div class="text-[11px] uppercase font-bold text-accent mt-3 mb-1">Ángulo de marketing</div><p class="text-sm text-zinc-200">${E(a.anguloMarketing)}</p>
      <div class="bg-billete/15 border border-billete/40 rounded-lg p-3 mt-3"><div class="text-[10px] uppercase text-emerald-300 font-bold mb-1">Lead magnet</div><div class="text-sm text-emerald-100">${E(a.leadMagnet)}</div></div>
      <div class="text-[11px] uppercase font-bold text-zinc-400 mt-3 mb-1">Frases gancho</div>${oList(a.frasesGancho)}
    </div>`;
    out.innerHTML = oHero('Los 2 avatares', 'El picker de los generadores adapta el tono según el avatar destino') +
      `<div class="grid md:grid-cols-2 gap-4">${card(av.avatar1, 'Avatar 1', false)}${card(av.avatar2, 'Avatar 2', true)}</div>`;
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: RECURSOS & TENDENCIAS
// =========================================================
function renderRecursos() {
  const out = document.getElementById('tab-recursos'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const r = OPERA.recursosYTendencias;
    const apps = r.tendencias.map(t => `
      <div class="bg-primary/40 border border-zinc-800 rounded-xl p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><a href="${E(t.url)}" target="_blank" rel="noopener" class="font-semibold text-sm text-accent hover:underline">${E(t.nombre)} ↗</a>
          <div class="text-[10px] uppercase text-zinc-500">${E(t.categoria)} · ${E(t.tipo)}</div></div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-billete/30 text-emerald-300 shrink-0">${E(t.costo)}</span>
        </div>
        ${t.queTeDa ? `<div class="text-[11px] uppercase font-bold text-zinc-400 mt-2 mb-1">Qué te da</div>${oList(t.queTeDa)}` : ''}
        ${t.comoSacarlo ? `<details class="mt-2"><summary class="cursor-pointer text-xs text-accent">Cómo sacarlo paso a paso</summary><div class="mt-1">${oList(t.comoSacarlo)}</div></details>` : ''}
        ${t.tipPro ? `<div class="text-[11px] text-amber-300/90 mt-2">💡 ${E(t.tipPro)}</div>` : ''}
      </div>`).join('');
    const pres = r.presupuestoSugerido;
    const ccUrl = 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en';
    const tiktokCard = `<div class="bg-primary/40 border border-accent/25 rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <div><div class="font-display font-bold text-accent">🎵 Trending Sounds — TikTok Creative Center</div><div class="text-[11px] text-zinc-500">Top videos/sounds/hashtags por país (USA/MX/CO/ES) · gratis, oficial</div></div>
        <a href="${ccUrl}" target="_blank" rel="noopener" class="text-xs px-3 py-2 rounded-lg bg-accent text-primary font-semibold shrink-0">Abrir Creative Center ↗</a>
      </div>
      <details><summary class="cursor-pointer text-[11px] text-zinc-500">intentar verlo embebido (TikTok suele bloquear el iframe)</summary>
        <iframe src="${ccUrl}" class="w-full h-72 rounded-lg border border-zinc-800 mt-2 bg-dark" loading="lazy" referrerpolicy="no-referrer"></iframe>
        <div class="text-[10px] text-zinc-600 mt-1">Si queda en blanco, usá el botón de arriba — es lo esperado.</div>
      </details>
    </div>`;
    out.innerHTML =
      oHero('Tendencias', 'Sonidos, hashtags y formatos que funcionan AHORA + 10 apps externas') +
      tiktokCard +
      `<div class="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Las 10 apps recomendadas</div>` +
      `<div class="grid sm:grid-cols-2 gap-3 mb-4">${apps}</div>` +
      oCard('🗓️ Guía de uso semanal', oList(r.guiaUso)) +
      oCard('💸 Presupuesto sugerido', `<div class="grid sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-billete/15 border border-billete/40 rounded-lg p-3"><div class="text-[10px] uppercase text-emerald-300 font-bold">Mínimo</div>${E(pres.minimo)}</div>
        <div class="bg-primary/40 border border-zinc-800 rounded-lg p-3"><div class="text-[10px] uppercase text-accent font-bold">Intermedio</div>${E(pres.intermedio)}</div>
        <div class="bg-primary/40 border border-accent/30 rounded-lg p-3"><div class="text-[10px] uppercase text-accent font-bold">Pro</div>${E(pres.pro)}</div>
      </div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: TRANSFORMADOR (API con vision)
// =========================================================
let TRANSFORM_IMG = null;
function renderTransformador() {
  const out = document.getElementById('tab-transformador'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const tr = OPERA.transformador;
    const tipos = tr.tiposDeTransformacion.map(t => `<option value="${E(t.id)}">${E(t.nombre)}</option>`).join('');
    out.innerHTML =
      oHero('Transformador', tr.descripcion) +
      `<div class="grid md:grid-cols-[400px_1fr] gap-6">
        <div class="space-y-3 bg-primary/40 border border-accent/15 rounded-xl p-4">
          <label class="block"><span class="text-xs font-semibold text-zinc-400">Tipo</span>
            <select id="tf-tipo" class="mt-1 w-full bg-dark border border-zinc-800 rounded px-3 py-2 text-sm focus:border-accent outline-none">${tipos}</select></label>
          <label class="block"><span class="text-xs font-semibold text-zinc-400">Pegá el copy / transcripción del contenido viral</span>
            <textarea id="tf-text" rows="5" placeholder="Pegá el texto del post/caption/transcripción a transformar…" class="mt-1 w-full bg-dark border border-zinc-800 rounded px-3 py-2 text-sm resize-none focus:border-accent outline-none"></textarea></label>
          <label class="block"><span class="text-xs font-semibold text-zinc-400">O subí imagen (carrusel/captura) — usa visión</span>
            <input id="tf-img" type="file" accept="image/*" onchange="tfImg(this)" class="mt-1 w-full text-xs text-zinc-400"></label>
          <label class="block"><span class="text-xs font-semibold text-zinc-400">URL (opcional · pegá también la transcripción, no puedo abrir el link)</span>
            <input id="tf-url" placeholder="https://tiktok.com/..." class="mt-1 w-full bg-dark border border-zinc-800 rounded px-3 py-2 text-sm focus:border-accent outline-none"></label>
          <div class="grid grid-cols-2 gap-2">
            <label class="block"><span class="text-xs font-semibold text-zinc-400">Avatar destino</span>
              <select id="tf-avatar" class="mt-1 w-full bg-dark border border-zinc-800 rounded px-3 py-2 text-sm focus:border-accent outline-none"><option value="avatar2">Avatar 2 (empezando)</option><option value="avatar1">Avatar 1 (escalando)</option></select></label>
            <label class="block"><span class="text-xs font-semibold text-zinc-400">Palabra clave DM</span>
              <input id="tf-cta" placeholder="auto (MÉTODO…)" class="mt-1 w-full bg-dark border border-zinc-800 rounded px-3 py-2 text-sm focus:border-accent outline-none"></label>
          </div>
          <label class="flex items-center gap-2 text-xs text-zinc-300"><input id="tf-framework" type="checkbox" checked class="accent-[#C8A864]"><span>Inyectar Sistema Flip Anti-Riesgos™ donde encaje</span></label>
          <button id="tf-go" onclick="tfRun(this)" class="w-full bg-accent text-primary font-semibold py-2.5 rounded-lg glow">⚡ Transformar a mi marca</button>
        </div>
        <div id="tf-out" class="min-h-[200px]"><div class="h-full flex items-center justify-center text-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl py-20"><div><div class="text-4xl mb-2">🔄</div><p class="text-sm">Pegá contenido viral y transformalo a tu nicho + tu marca.</p></div></div></div>
      </div>`;
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}
function tfImg(el) {
  const f = el.files && el.files[0]; if (!f) { TRANSFORM_IMG = null; return; }
  const reader = new FileReader();
  reader.onload = () => { TRANSFORM_IMG = { media_type: f.type, data: String(reader.result).split(',')[1] }; };
  reader.readAsDataURL(f);
}
window.tfImg = tfImg;
async function tfRun(btn) {
  const text = (document.getElementById('tf-text').value || '').trim();
  const url = (document.getElementById('tf-url').value || '').trim();
  if (!text && !TRANSFORM_IMG) { document.getElementById('tf-text').focus(); return; }
  const tipo = document.getElementById('tf-tipo').value;
  const avatar = document.getElementById('tf-avatar').value;
  const cta = (document.getElementById('tf-cta').value || '').trim();
  const framework = document.getElementById('tf-framework').checked;
  const out = document.getElementById('tf-out');
  out.innerHTML = `<div class="border border-zinc-800 rounded-xl py-16 flex flex-col items-center text-zinc-500"><div class="typing text-3xl mb-3"><span>●</span><span>●</span><span>●</span></div><p class="text-sm">Transformando a tu marca…</p></div>`;
  btn.disabled = true; btn.classList.add('opacity-50', 'pointer-events-none');
  const tr = OPERA.transformador.tiposDeTransformacion.find(t => t.id === tipo) || {};
  const system = `Sos el motor de transformación de contenido de la marca "Flippeá con método" (Nicolás Lara, Fix & Flip para latinos en USA).
Tomás contenido viral de CUALQUIER nicho y lo reescribís a este nicho con la voz de la marca.
Tipo de transformación: ${tr.nombre} — ${tr.tecnica}.
${window.operaAmplify ? window.operaAmplify() : ''}
${window.operaAvatarBlock ? window.operaAvatarBlock(avatar) : ''}
${framework ? 'Inyectá el Sistema Flip Anti-Riesgos™ donde encaje naturalmente.' : 'No fuerces el framework.'}
CTA final con palabra clave a DM: ${cta || 'elegí la más relevante (MÉTODO, BUYBOX, GC, HARMONY, SERGIO, PRIMERFLIP…)'}.
Conservá la ESTRUCTURA/fórmula del original (hook, pattern interrupts, ritmo) pero cambiá completamente el contenido al nicho F&F. Devolvé SOLO el contenido transformado, listo para usar, en español rioplatense.`;
  const userContent = [];
  if (TRANSFORM_IMG) userContent.push({ type: 'image', source: { type: 'base64', media_type: TRANSFORM_IMG.media_type, data: TRANSFORM_IMG.data } });
  userContent.push({ type: 'text', text: (text ? 'CONTENIDO A TRANSFORMAR:\n' + text : 'Transformá el contenido de la imagen.') + (url ? '\n(URL de referencia: ' + url + ')' : '') });
  try {
    const txt = await window.callClaudeMessages([{ role: 'user', content: userContent }], { system, max_tokens: 2000, model: 'claude-sonnet-4-5' });
    out.innerHTML = `<div class="bg-primary/40 border border-accent/15 rounded-xl p-5">
      <div class="flex items-center justify-between mb-2"><div class="font-display font-bold text-accent">Transformado</div>
      <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);this.textContent='✓ Copiado'" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">📋 Copiar</button></div>
      <div class="text-sm text-zinc-100 whitespace-pre-line leading-relaxed">${E(txt)}</div></div>`;
  } catch (e) {
    out.innerHTML = `<div class="border border-red-900/50 bg-red-950/20 rounded-xl p-5 text-sm text-red-300"><b>Error:</b> ${E(e.message)}</div>`;
  } finally { btn.disabled = false; btn.classList.remove('opacity-50', 'pointer-events-none'); }
}
window.tfRun = tfRun;

// =========================================================
//  TAB: BIBLIOTECA (v2: solo reels + guardados)
// =========================================================
const ESTADOS = ['pendiente', 'producida', 'publicada'];
const ESTADO_STYLE = { pendiente: 'bg-zinc-800 text-zinc-300', producida: 'bg-amber-900/50 text-amber-300', publicada: 'bg-emerald-900/50 text-emerald-300' };
let BIBLIO_FILTER = 'todos';
let BIBLIO_SEARCH = '';
function operaSearchBiblio(v) { BIBLIO_SEARCH = v; const out = document.getElementById('tab-biblioteca'); if (out) { out.dataset.rendered = ''; renderBiblioteca(); } }
window.operaSearchBiblio = operaSearchBiblio;
// Llevar una pieza de la biblioteca a Studio (precarga tipo + tema y salta a la tab)
function studioFromReel(id) {
  const r = (OPERA.biblioteca.reels || []).find(p => p.id === id); if (!r) return;
  studioLoadPiece({ tipo: 'reel', tema: r.tema + ' — ' + (r.hook || '') });
}
window.studioFromReel = studioFromReel;
let STUDIO_PENDING = null;
function studioLoadPiece(payload) {
  STUDIO_PENDING = payload;
  const btn = document.querySelector('[data-tab="studio"]'); if (btn) btn.click();
  waitForEl('st-tema', applyStudioPending);
}
function waitForEl(id, cb, tries) {
  tries = tries || 0; const el = document.getElementById(id);
  if (el) return cb(); if (tries > 40) return; setTimeout(() => waitForEl(id, cb, tries + 1), 100);
}
function applyStudioPending() {
  const p = STUDIO_PENDING; if (!p) return; STUDIO_PENDING = null;
  if (p.tipo && typeof studioPickType === 'function') studioPickType(p.tipo);
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('st-tema', p.tema); set('st-avatar', p.avatar); set('st-enemigo', p.enemigo); set('st-dolor', p.dolor);
  const g = document.getElementById('st-generate'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
window.studioLoadPiece = studioLoadPiece;
function biblioEstado(id) { return OSTATE.get('estados', {})[id] || 'pendiente'; }
function operaCycleEstado(id) {
  const m = OSTATE.get('estados', {}); const cur = m[id] || 'pendiente';
  m[id] = ESTADOS[(ESTADOS.indexOf(cur) + 1) % ESTADOS.length]; OSTATE.set('estados', m);
  const out = document.getElementById('tab-biblioteca'); if (out) { out.dataset.rendered = ''; renderBiblioteca(); }
}
function operaFilterBiblio(f) { BIBLIO_FILTER = f; const out = document.getElementById('tab-biblioteca'); if (out) { out.dataset.rendered = ''; renderBiblioteca(); } }
window.operaCycleEstado = operaCycleEstado; window.operaFilterBiblio = operaFilterBiblio;
function copyReelLib(id) {
  const r = (OPERA.biblioteca.reels || []).find(p => p.id === id); if (!r) return;
  navigator.clipboard.writeText(`${r.thumbnail} [${r.tema}]\nHOOK: ${r.hook}\nCHISME: ${r.chisme}\nVALOR: ${r.valor}\nCTA: ${r.cta}\nMECÁNICA: ${r.mecanica}`);
  const b = document.querySelector('[data-copy="' + id + '"]'); if (b) { b.textContent = '✓'; setTimeout(() => b.textContent = '📋', 1200); }
}
window.copyReelLib = copyReelLib;
function loadBiblioMemory() {
  const el = document.getElementById('biblio-memory'); if (!el) return;
  if (!window.Memory || !window.Memory.enabled()) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="text-xs text-zinc-600">🧠 Cargando lo que generaste…</div>`;
  window.Memory.listGenerations({ limit: 50 }).then(gens => {
    if (!gens.length) { el.innerHTML = `<div class="text-xs text-zinc-600">🧠 Memoria: todavía no generaste nada. Lo que crees en Studio aparece acá.</div>`; return; }
    const cards = gens.map(g => {
      const v0 = Array.isArray(g.output_variantes) ? g.output_variantes[0] : (g.output_variantes && g.output_variantes.variantes ? g.output_variantes.variantes[0] : null);
      const titulo = (v0 && (v0.thumbnail_text || v0.hook)) || g.input_idea || '(sin título)';
      const fecha = g.created_at ? new Date(g.created_at).toLocaleDateString('es') : '';
      return `<div class="bg-primary/40 border border-accent/20 rounded-xl p-3">
        <div class="flex items-center justify-between gap-2 mb-1"><span class="text-[10px] uppercase text-accent/70">${E(g.tipo)} · ${E(g.modo)}</span><span class="text-[10px] text-zinc-500">${E(fecha)}</span></div>
        <div class="text-sm font-semibold truncate">${E(titulo)}</div>
        ${v0 && v0.hook ? `<div class="text-xs text-zinc-400 mt-1 line-clamp-2">${E(v0.hook)}</div>` : ''}
        <div class="text-[10px] text-zinc-600 mt-1">estado: ${E(g.estado || 'producida')}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<h3 class="font-display text-lg font-bold text-accent mb-2">🧠 Generadas (memoria · ${gens.length})</h3><div class="grid sm:grid-cols-2 gap-3">${cards}</div>`;
  }).catch(() => { el.innerHTML = `<div class="text-xs text-zinc-600">🧠 Memoria no disponible ahora.</div>`; });
}
function renderBiblioteca() {
  const out = document.getElementById('tab-biblioteca'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const reels = OPERA.biblioteca.reels || [];
    const counts = { todos: reels.length, pendiente: 0, producida: 0, publicada: 0 };
    reels.forEach(p => counts[biblioEstado(p.id)]++);
    const q = (BIBLIO_SEARCH || '').toLowerCase();
    const matchSearch = p => !q || [p.thumbnail, p.tema, p.hook, p.chisme, p.valor].filter(Boolean).join(' ').toLowerCase().includes(q);
    const pass = p => (BIBLIO_FILTER === 'todos' || biblioEstado(p.id) === BIBLIO_FILTER) && matchSearch(p);
    const filtros = ['todos', 'pendiente', 'producida', 'publicada'].map(f =>
      `<button onclick="operaFilterBiblio('${f}')" class="text-xs px-3 py-1.5 rounded-lg ${BIBLIO_FILTER === f ? 'bg-accent text-primary font-semibold' : 'bg-zinc-800 text-zinc-300'}">${f[0].toUpperCase() + f.slice(1)} (${counts[f]})</button>`).join('');
    const cards = reels.filter(pass).map(r => {
      const est = biblioEstado(r.id);
      const row = (lbl, val, c) => val ? `<div class="text-xs mt-1"><span class="${c || 'text-zinc-500'} font-semibold">${lbl}</span> ${E(val)}</div>` : '';
      return `<div class="bg-primary/40 border border-zinc-800 rounded-xl p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0"><div class="font-semibold text-sm truncate">${E(r.thumbnail)}</div><div class="text-[10px] uppercase text-accent/70">${E(r.tema)}</div></div>
          <div class="flex items-center gap-1 shrink-0">
            <button data-copy="${r.id}" onclick="copyReelLib('${r.id}')" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📋</button>
            <button onclick="operaCycleEstado('${r.id}')" class="text-[10px] uppercase px-2 py-1 rounded ${ESTADO_STYLE[est]}">${est}</button>
          </div>
        </div>
        ${row('🎣 Hook:', r.hook, 'text-accent')}${row('🗣️ Chisme:', r.chisme)}${row('💎 Valor:', r.valor, 'text-emerald-400')}${row('📣 CTA:', r.cta, 'text-purple-300')}${row('🏛️', r.mecanica, 'text-zinc-600')}
        <button onclick="studioFromReel('${r.id}')" class="mt-3 w-full text-xs px-3 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 font-semibold">🎯 Llevar a Studio</button>
      </div>`;
    }).join('') || '<p class="text-xs text-zinc-600">— nada en este filtro/búsqueda —</p>';
    const saved = OSTATE.get('saved', []);
    const savedSec = saved.length ? `<div class="mt-6"><h3 class="font-display text-lg font-bold text-accent mb-3">⭐ Guardados por vos (${saved.length})</h3>
      <div class="grid sm:grid-cols-2 gap-3">${saved.map((it, idx) => `<div class="bg-primary/40 border border-accent/25 rounded-xl p-4"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="font-semibold text-sm truncate">${E(it.title)}</div><div class="text-[10px] uppercase text-accent/70">${E(it.kind)}</div></div><div class="flex gap-1 shrink-0"><button onclick="operaCopySaved(${idx})" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📋</button><button onclick="operaRemoveSaved(${idx})" class="text-xs px-2 py-1 rounded bg-bordeaux/40 text-red-200 hover:bg-bordeaux/60">🗑</button></div></div></div>`).join('')}</div></div>` : '';
    out.innerHTML =
      oHero('Biblioteca de contenido', '15 reels base + lo que generaste (memoria)') +
      `<div id="biblio-memory" class="mb-6"></div>` +
      `<h3 class="font-display text-lg font-bold text-accent mb-2">📋 Reels base (semilla)</h3>` +
      `<input id="biblio-search" value="${E(BIBLIO_SEARCH || '')}" oninput="operaSearchBiblio(this.value)" placeholder="🔎 Buscar por tema, hook, palabra…" class="w-full bg-dark border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none mb-3">
      <div class="flex flex-wrap gap-2 mb-5">${filtros}</div>` +
      `<div class="grid sm:grid-cols-2 gap-3">${cards}</div>` + savedSec;
    const si = document.getElementById('biblio-search'); if (si && q) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
    loadBiblioMemory();
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: CALENDARIO (v3 — funde Re-Launch + Estrategia + fase auto; conserva generador)
// =========================================================
function renderCalendario() {
  const out = document.getElementById('tab-calendario'); if (!out || out.dataset.opera) return;
  ensureOpera().then(() => {
    out.dataset.opera = '1';
    const d = new Date().getDate();
    const fase = (window.ContextBuilder ? window.ContextBuilder.getCurrentFase() : (d >= 21 && d <= 27 ? 'cosecha' : 'siembra'));
    const cosecha = fase === 'cosecha';
    const faseBanner = `<div class="rounded-xl p-3 mb-4 text-sm ${cosecha ? 'bg-emerald-900/30 border border-emerald-900/50 text-emerald-200' : 'bg-sky-900/25 border border-sky-900/40 text-sky-200'}">
      ${cosecha ? '🌾 <b>Cosecha</b> (días 21-27): vendé desde stories con urgencia/escasez real. Máx 4-5 historias de venta esta semana.' : '🌱 <b>Siembra</b> (días 1-20, 28+): valor + hand-raisers, sin vender de frente. CTA de respuesta, no link.'}
      <span class="text-[11px] opacity-70"> · hoy es ${d} del mes</span></div>`;
    const top = document.createElement('div');
    top.innerHTML = oHero('Calendario', 'Plan de re-launch con tracking + ritmo del mes + generador de semanas') +
      faseBanner +
      `<div id="cal-relaunch-mount" class="mb-4"></div>
       <details class="bg-primary/40 border border-accent/15 rounded-xl mb-4"><summary class="cursor-pointer px-4 py-3 font-display font-bold text-accent">📖 Playbook operativo (principios, rutina, fórmulas)</summary><div class="px-4 pb-4" id="cal-estrategia-mount"></div></details>
       <div class="text-xs text-zinc-400 mb-2 font-semibold">🗓️ Generar semanas custom ⬇️</div>`;
    out.insertBefore(top, out.firstChild);
    // Mover Re-Launch (plan 30 días + tracking) adentro
    renderRelaunch();
    const rl = document.getElementById('tab-relaunch'), rlMount = document.getElementById('cal-relaunch-mount');
    if (rl && rlMount) { rl.classList.remove('tab-panel', 'hidden'); rlMount.appendChild(rl); }
    // Mover Estrategia (playbook) adentro
    if (typeof renderEstrategia === 'function') renderEstrategia();
    amplificarEstrategia();
    const es = document.getElementById('tab-estrategia'), esMount = document.getElementById('cal-estrategia-mount');
    if (es && esMount) { es.classList.remove('tab-panel', 'hidden'); esMount.appendChild(es); }
  }).catch(e => { /* el generador estático sigue funcionando */ });
}

// =========================================================
//  TAB: RE-LAUNCH (v2: pre-launch + launch day)
// =========================================================
function renderRelaunch() {
  const out = document.getElementById('tab-relaunch'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const rl = OPERA.reLaunch;
    const pre = rl.preLaunch.map(p => {
      const cid = 'pre-' + p.dia, on = operaChecked(cid);
      return `<label data-check="${cid}" class="flex items-start gap-2 py-1.5 cursor-pointer ${on ? 'opacity-50' : ''}">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="operaToggleCheck('${cid}', this.checked)" class="mt-0.5 accent-[#C8A864]">
        <span class="text-sm"><span class="text-accent font-bold">Día ${p.dia}</span> — ${E(p.accion)}</span></label>`;
    }).join('');
    const ld = rl.launchDay, ldCid = 'launch-0', ldOn = operaChecked(ldCid);
    out.innerHTML =
      oHero('Re-Launch', 'Pre-launch (-7 a -1) y día de lanzamiento, con tracking') +
      oCard('⏳ Pre-Launch', `<div class="divide-y divide-zinc-800/50">${pre}</div>`) +
      oCard('🚀 Día de lanzamiento',
        `<label data-check="${ldCid}" class="flex items-start gap-2 cursor-pointer ${ldOn ? 'opacity-50' : ''} mb-2">
          <input type="checkbox" ${ldOn ? 'checked' : ''} onchange="operaToggleCheck('${ldCid}', this.checked)" class="mt-1 accent-[#C8A864]">
          <span class="text-sm font-semibold">${E(ld.principal)}</span></label>
        <div class="text-sm text-zinc-300 mb-1">📌 ${E(ld.stories)}</div>
        <div class="bg-accent/10 border border-accent/25 rounded-lg p-3 text-sm text-accent mt-2">📣 ${E(ld.cta)}</div>`);
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  Amplificación de la tab Estrategia (eco histórico)
// =========================================================
function amplificarEstrategia() {
  const out = document.getElementById('tab-estrategia'); if (!out || out.dataset.opera) return;
  ensureOpera().then(() => {
    if (out.dataset.opera) return; out.dataset.opera = '1';
    const ecos = [
      { f: 'REEL: Hook → Chisme → Valor → CTA', eco: 'Apple "Think Different" (manifiesto) + MrBeast (retención 3s). El chisme tapa el valor (Bernays escondía al patrocinador).' },
      { f: 'REEL que vende', eco: 'Dollar Shave Club: sistema en cámara desde el seg 1 + honestidad brutal. Hormozi: valor gratis + framework con nombre (Sistema Flip Anti-Riesgos™).' },
      { f: 'HISTORIAS · H.I.L.O.', eco: 'Obama 2008: la lista (DM/WhatsApp) como activo #1. La interacción = inteligencia de audiencia antes de vender.' },
      { f: 'YOUTUBE: remix + título por palanca + miniatura por capas', eco: 'MrBeast: 3-5 thumbnails A/B. Uncle Sam "I Want YOU": contacto visual + gesto. De Beers: eslogan permanente ("Flippeá con método").' },
    ];
    const card = document.createElement('div');
    card.className = 'bg-primary/40 border border-accent/15 rounded-xl p-5 mt-4';
    card.innerHTML = `<h3 class="font-display text-lg font-bold text-accent mb-3">🏛️ Eco histórico de las 4 fórmulas</h3><div class="space-y-3">${ecos.map(x => `<div class="border-l-2 border-accent/40 pl-3"><div class="text-sm font-semibold text-light">${E(x.f)}</div><div class="text-xs text-zinc-400 mt-0.5">${E(x.eco)}</div></div>`).join('')}</div>`;
    (out.querySelector('.space-y-4') || out).appendChild(card);
  });
}

// =========================================================
//  TAB: MARCA (acordeón — engine + consulta; reusa los renders existentes)
// =========================================================
function renderMarca() {
  const out = document.getElementById('tab-marca'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(ensureVisual).then(() => {
    out.dataset.rendered = '1';
    const secs = [
      { fn: renderManifiesto, id: 'tab-manifiesto', icon: '🧭', title: 'Quién soy', sub: 'Manifiesto, narrativa, eslogan, foco' },
      { fn: renderIdentidad, id: 'tab-identidad', icon: '🗣️', title: 'Cómo hablo / Quién me ataca', sub: 'Arquetipo, enemigo dual + 10 tácticos, frases, palabras' },
      { fn: renderVisual, id: 'tab-visual', icon: '🎨', title: 'Cómo me veo', sub: 'Símbolo, paleta, tipografía, vestuario, gestos' },
      { fn: renderPsicologia, id: 'tab-psicologia', icon: '🧠', title: 'Cómo persuado', sub: '7 leyes + 16 tácticas históricas' },
      { fn: renderAvatares, id: 'tab-avatares', icon: '🎭', title: 'Mis avatares', sub: 'Flipper escalando vs Empleado empezando' },
      { fn: renderRedes, id: 'tab-redes', icon: '📊', title: 'Mis redes', sub: 'Bios nuevas, handle YT, KPIs' },
    ];
    out.innerHTML = oHero('Marca', 'Tu estrategia completa — el engine que alimenta Studio. Tocá cada sección para desplegar.') +
      secs.map((s, i) => `<details class="bg-primary/40 border border-accent/15 rounded-xl mb-2" ${i === 0 ? 'open' : ''}>
        <summary class="cursor-pointer px-4 py-3 select-none"><span class="font-display font-bold text-accent">${s.icon} ${E(s.title)}</span><span class="text-xs text-zinc-500 ml-2">${E(s.sub)}</span></summary>
        <div class="px-4 pb-4" id="marca-mount-${s.id}"></div>
      </details>`).join('');
    // Mover cada sección fuente dentro de su mount y dispararla (interactividad nativa).
    secs.forEach(s => {
      s.fn(); // captura su nodo y lo llena (async, data cacheada)
      const src = document.getElementById(s.id), mount = document.getElementById('marca-mount-' + s.id);
      if (src && mount) { src.classList.remove('tab-panel', 'hidden'); mount.appendChild(src); }
    });
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}

// =========================================================
//  TAB: STUDIO (la estrella — producción con context injection)
// =========================================================
const STUDIO = { tipo: 'reel' };
const STUDIO_TIPOS = [
  { id: 'reel', label: '🎬 Reel' }, { id: 'carrusel', label: '🖼️ Carrusel' }, { id: 'historia', label: '📲 Story' },
  { id: 'youtube', label: '▶️ YouTube' }, { id: 'manifiesto', label: '💬 Manifiesto' }, { id: 'post', label: '📝 Post' },
];
function waitForKB(cb, tries) {
  tries = tries || 0;
  if (typeof KB !== 'undefined' && KB) return cb(KB);
  if (tries > 40) return;
  setTimeout(() => waitForKB(cb, tries + 1), 150);
}
function fillStudioDolores() {
  const sel = document.getElementById('st-dolor'); if (!sel) return;
  waitForKB((kb) => {
    if (sel.dataset.filled) return; sel.dataset.filled = '1';
    sel.innerHTML = '<option value="">— Elegí un dolor (opcional) —</option>';
    kb.categorias.forEach(c => {
      const grp = document.createElement('optgroup'); grp.label = c.nombre;
      kb.preguntas.filter(q => q.categoria === c.id).forEach(q => {
        const o = document.createElement('option'); o.value = q.id; o.textContent = q.pregunta; grp.appendChild(o);
      });
      if (grp.children.length) sel.appendChild(grp);
    });
  });
}
function studioRandomDolor() {
  const sel = document.getElementById('st-dolor');
  waitForKB((kb) => { const q = kb.preguntas[Math.floor(Math.random() * kb.preguntas.length)]; if (sel) sel.value = q.id; });
}
window.studioRandomDolor = studioRandomDolor;
function studioPickType(t) {
  STUDIO.tipo = t;
  document.querySelectorAll('[data-stype]').forEach(b => {
    const on = b.dataset.stype === t;
    b.className = 'stype-btn px-3 py-3 rounded-xl text-sm font-semibold border ' + (on ? 'bg-accent text-primary border-accent' : 'bg-primary/40 text-zinc-300 border-zinc-800 hover:border-accent/40');
  });
  const fr = document.getElementById('st-formato-row'); if (fr) fr.style.display = (t === 'reel') ? '' : 'none';
}
window.studioPickType = studioPickType;
function renderStudio() {
  const out = document.getElementById('tab-studio'); if (!out || out.dataset.rendered) return;
  ensureOpera().then(() => {
    out.dataset.rendered = '1';
    const data = OPERA;
    const tipos = STUDIO_TIPOS.map(t => `<button data-stype="${t.id}" onclick="studioPickType('${t.id}')" class="stype-btn px-3 py-3 rounded-xl text-sm font-semibold border ${t.id === STUDIO.tipo ? 'bg-accent text-primary border-accent' : 'bg-primary/40 text-zinc-300 border-zinc-800 hover:border-accent/40'}">${t.label}</button>`).join('');
    const enemigoOpts = `<option value="auto">⚙️ Auto (según dolor)</option>`
      + `<option value="principal">${E(data.arquetipo.enemigos.principal.nombre)}</option>`
      + `<option value="invisible">${E(data.arquetipo.enemigos.invisible.nombre)}</option>`
      + data.arquetipo.enemigos.tacticos.map(t => `<option value="${t.id}">${E(t.nombre)}</option>`).join('');
    const tacticaOpts = `<option value="auto">⚙️ Auto (según tipo)</option>`
      + data.psicologia.tacticasAplicadas.map(t => `<option value="${t.id}">${E(t.maestro)} — ${E(t.tecnica)}</option>`).join('');
    const fld = (label, inner) => `<div><label class="text-xs font-semibold text-zinc-400">${label}</label>${inner}</div>`;
    const selCls = 'mt-1 w-full bg-dark border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none';
    out.innerHTML =
      oHero('Studio', 'Producí contenido con toda tu estrategia inyectada automáticamente') +
      `<div class="flex flex-wrap gap-2 mb-4">
        <button onclick="document.querySelector('[data-tab=marca]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300 hover:border-accent/40">⚙️ Marca</button>
        <button onclick="document.querySelector('[data-tab=biblioteca]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300 hover:border-accent/40">📚 Biblioteca</button>
        <button onclick="document.querySelector('[data-tab=recursos]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300 hover:border-accent/40">🔥 Tendencias</button>
        <button onclick="document.querySelector('[data-tab=agente]').click()" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-primary/40 border border-zinc-800 text-zinc-300 hover:border-accent/40">💬 Agente</button>
      </div>
      `+ studioModeToggle() +`
      <div class="bg-primary/40 border border-accent/15 rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-zinc-400 mb-2">¿QUÉ CREÁS HOY?</div>
        <div class="grid grid-cols-3 gap-2">${tipos}</div>
      </div>
      <div class="grid md:grid-cols-[400px_1fr] gap-6">
        <div class="space-y-3 bg-primary/40 border border-accent/15 rounded-xl p-4">
          <div id="st-libre-fields">
            ${fld('💭 ¿Qué querés decir hoy?', `<textarea id="st-idea" rows="5" placeholder="Contame la idea, el ángulo, el problema, lo que sea — yo me encargo del resto (avatar, dolor, enemigo, táctica y fase los elijo automáticamente)." class="${selCls} resize-none"></textarea>`)}
          </div>
          <div id="st-guiado-fields" class="space-y-3">
          ${fld('📌 Para quién (avatar)', `<select id="st-avatar" class="${selCls}"><option value="avatar2">Avatar 2 — Empleado empezando (default)</option><option value="avatar1">Avatar 1 — Flipper escalando</option></select>`)}
          ${fld('🎯 Dolor del avatar', `<div class="flex gap-2"><select id="st-dolor" class="${selCls} flex-1"><option value="">— cargando… —</option></select><button onclick="studioRandomDolor()" class="mt-1 px-3 rounded-lg bg-accent/15 text-accent text-sm shrink-0">🎲</button></div>`)}
          ${fld('👹 Enemigo a atacar', `<select id="st-enemigo" class="${selCls}">${enemigoOpts}</select>`)}
          ${fld('🧠 Táctica psicológica', `<select id="st-tactica" class="${selCls}">${tacticaOpts}</select>`)}
          ${fld('📅 Fase del mes', `<select id="st-fase" class="${selCls}"><option value="auto">⚙️ Auto (según fecha)</option><option value="siembra">Siembra (valor)</option><option value="cosecha">Cosecha (venta)</option></select>`)}
          ${fld('✍️ Tema / ángulo libre (opcional)', `<textarea id="st-tema" rows="2" placeholder="Ej: cómo financiar el primer flip con ITIN" class="${selCls} resize-none"></textarea>`)}
          </div>
          <details class="text-sm">
            <summary class="cursor-pointer text-xs font-semibold text-accent">⚙️ Configuración avanzada</summary>
            <div class="space-y-2 mt-2">
              <div id="st-formato-row">${fld('Formato (reel)', `<select id="st-formato" class="${selCls}"><option value="">Automático</option><option>Manita</option><option>Doble</option><option>Ranking</option><option>Sketch</option><option>Mano arriba</option><option>Entrevista en calle</option></select>`)}</div>
              ${fld('Variantes', `<select id="st-variantes" class="${selCls}"><option>1</option><option selected>2</option><option>3</option><option>5</option></select>`)}
              ${fld('CTA / palabra clave DM', `<input id="st-cta" placeholder="auto (MÉTODO, BUYBOX…)" class="${selCls}">`)}
              ${fld('Modelo IA', `<input id="st-model" placeholder="auto (el de Ajustes)" class="${selCls}">`)}
            </div>
          </details>
          <button id="st-generate" onclick="studioGenerate(this)" class="w-full bg-accent text-primary hover:opacity-90 font-semibold py-3 rounded-lg glow text-base">⚡ Generar contenido potenciado</button>
        </div>
        <div>
          <div id="st-context" class="mb-4"></div>
          <div id="st-output" class="min-h-[200px]"><div class="h-full flex items-center justify-center text-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl py-16"><div><div class="text-4xl mb-2">🎯</div><p class="text-sm">Elegí tipo + config y dale a Generar.<br>Toda tu marca se inyecta automáticamente.</p></div></div></div>
        </div>
      </div>`;
    fillStudioDolores();
    studioApplyMode(studioMode());
  }).catch(e => { out.innerHTML = `<p class="text-sm text-red-400">Error: ${E(e.message)}</p>`; });
}
// --- Modo Guiado / Libre ---
function studioMode() { return localStorage.getItem('viralStudioMode') || 'guiado'; }
function studioModeToggle() {
  const m = studioMode();
  const btn = (id, label, on) => `<button onclick="studioSetMode('${id}')" class="flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${on ? 'bg-accent text-primary' : 'bg-primary/40 text-zinc-300 border border-zinc-800'}">${on ? '●' : '○'} ${label}</button>`;
  return `<div class="flex gap-2 mb-4">${btn('guiado', 'Modo Guiado', m === 'guiado')}${btn('libre', 'Modo Libre', m === 'libre')}</div>`;
}
function studioApplyMode(m) {
  const g = document.getElementById('st-guiado-fields'), l = document.getElementById('st-libre-fields');
  if (g) g.style.display = (m === 'libre') ? 'none' : '';
  if (l) l.style.display = (m === 'libre') ? '' : 'none';
}
function studioSetMode(m) {
  localStorage.setItem('viralStudioMode', m);
  // re-render el toggle (estilos) sin perder el resto
  const out = document.getElementById('tab-studio'); if (out) { out.dataset.rendered = ''; renderStudio(); }
}
window.studioSetMode = studioSetMode;
function studioCollectParams() {
  const v = id => (document.getElementById(id) || {}).value || '';
  return {
    tipoContenido: STUDIO.tipo, avatarDestino: v('st-avatar') || 'avatar2', dolor: v('st-dolor'),
    enemigo: v('st-enemigo') || 'auto', tactica: v('st-tactica') || 'auto', faseDelMes: v('st-fase') || 'auto',
    tema: v('st-tema'), formato: v('st-formato'), variantes: v('st-variantes') || '3',
    palabraClaveDM: v('st-cta'), model: v('st-model'),
  };
}
function studioContextPanel(ctx, estTokens) {
  const row = (k, val) => val ? `<div class="flex gap-2 text-xs py-0.5"><span class="text-emerald-400">✓</span><span class="text-zinc-400">${k}:</span><span class="text-zinc-200">${E(val)}</span></div>` : '';
  return `<div class="bg-primary/40 border border-accent/15 rounded-xl p-4">
    <div class="flex items-center justify-between mb-2"><div class="text-xs font-bold text-accent uppercase tracking-wide">Contexto inyectado (transparente)</div>
    <span class="text-[10px] text-zinc-500">~${estTokens} tokens</span></div>
    ${ctx.tipo ? `<div class="flex gap-2 text-xs py-0.5"><span class="text-accent">▸</span><span class="text-zinc-400">Tipo:</span><span class="text-accent font-semibold uppercase">${E(ctx.tipo)}</span></div>` : ''}
    ${row('Eslogan', ctx.eslogan)}${row('Framework', ctx.framework)}${row('Tagline', ctx.tagline)}${row('Arquetipo', ctx.arquetipo)}
    ${row('Enemigo (' + ctx.enemigoTipo + ')', ctx.enemigo)}${row('Táctica', ctx.tactica)}${row('Avatar', ctx.avatar)}${row('Dolor', ctx.dolor)}${row('Fase', ctx.fase)}
    <div class="flex gap-2 text-xs py-0.5"><span class="text-emerald-400">✓</span><span class="text-zinc-200">${ctx.prohibidasCount} palabras prohibidas bloqueadas · ${ctx.marcaCount} de marca priorizadas · validador activo</span></div>
    <details class="mt-1"><summary class="cursor-pointer text-[11px] text-zinc-500">ver prompt completo enviado al API</summary><pre id="st-rawprompt" class="text-[10px] text-zinc-500 whitespace-pre-wrap mt-1 max-h-60 overflow-auto"></pre></details>
  </div>`;
}
function flattenVariante(v) {
  const parts = [v.thumbnail_text, v.hook, v.chisme, v.valor_oculto, v.cta, v.caption_corta, v.caption_larga, v.mecanica_aplicada];
  if (Array.isArray(v.slides)) v.slides.forEach(s => parts.push(s.texto));
  if (Array.isArray(v.frames)) v.frames.forEach(f => parts.push(f.texto_en_pantalla, f.voz));
  if (Array.isArray(v.titulos)) v.titulos.forEach(t => parts.push(t.texto));
  if (Array.isArray(v.lineas)) parts.push(v.lineas.join(' '));
  return parts.filter(Boolean).join('\n');
}
let STUDIO_LAST = [];
function studioResolveAuto(dec) {
  if (!dec || !OPERA) return null;
  const av = OPERA.avatares[dec.avatar_id];
  const tac = OPERA.psicologia.tacticasAplicadas.find(t => String(t.id) === String(dec.tactica_id));
  let enNombre = dec.enemigo_id;
  const en = OPERA.arquetipo.enemigos;
  if (dec.enemigo_id === 'principal') enNombre = en.principal.nombre;
  else if (dec.enemigo_id === 'invisible') enNombre = en.invisible.nombre;
  else { const t = en.tacticos.find(e => e.id === dec.enemigo_id); if (t) enNombre = t.nombre; }
  const dolor = (dec.dolor_id && typeof findPregunta === 'function') ? findPregunta(dec.dolor_id) : null;
  return {
    avatar: av ? av.nombre : dec.avatar_id, dolor: dolor ? dolor.pregunta : (dec.dolor_id || '—'),
    enemigo: enNombre, tactica: tac ? (tac.maestro + ' — ' + tac.tecnica) : dec.tactica_id, fase: dec.fase, razon: dec.razon,
  };
}
function autoDecisionsBlock(dec) {
  const r = studioResolveAuto(dec); if (!r) return '';
  const row = (k, v) => v ? `<div class="flex gap-2 text-xs py-0.5"><span class="text-accent">▸</span><span class="text-zinc-400">${k}:</span><span class="text-zinc-100">${E(v)}</span></div>` : '';
  return `<div class="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-2">
    <div class="text-xs font-bold text-accent uppercase tracking-wide mb-2">🤖 Decisiones automáticas</div>
    ${row('Avatar', r.avatar)}${row('Dolor', r.dolor)}${row('Enemigo', r.enemigo)}${row('Táctica', r.tactica)}${row('Fase', r.fase)}
    ${r.razon ? `<div class="text-[11px] text-zinc-500 mt-1 italic">${E(r.razon)}</div>` : ''}
  </div>`;
}
async function studioGenerate(btn) {
  if (!window.ContextBuilder) { alert('Context builder no cargó.'); return; }
  const mode = (typeof studioMode === 'function') ? studioMode() : 'guiado';
  const params = studioCollectParams();
  let build;
  try {
    if (mode === 'libre') {
      const idea = (document.getElementById('st-idea') || {}).value || '';
      if (!idea.trim()) { document.getElementById('st-idea').focus(); btn.disabled = false; btn.classList.remove('opacity-50', 'pointer-events-none'); return; }
      build = window.ContextBuilder.buildLibre({ tipoContenido: STUDIO.tipo, idea, variantes: params.variantes, formato: params.formato, palabraClaveDM: params.palabraClaveDM });
    } else {
      build = window.ContextBuilder.build(params);
    }
  } catch (e) { document.getElementById('st-output').innerHTML = `<p class="text-sm text-red-400">${E(e.message)}</p>`; return; }
  const estTokens = Math.round((build.system.length + build.userPrompt.length) / 4);
  document.getElementById('st-context').innerHTML = (mode === 'libre' ? '<div class="text-[11px] text-zinc-500 mb-2">🤖 Modo Libre: la IA decide avatar/dolor/enemigo/táctica/fase. Lo verás acá tras generar.</div>' : '') + studioContextPanel(build.contexto, estTokens);
  const pre = document.getElementById('st-rawprompt'); if (pre) pre.textContent = build.system + '\n\n----- USER -----\n' + build.userPrompt;
  const out = document.getElementById('st-output');
  out.innerHTML = `<div class="border border-zinc-800 rounded-xl py-16 flex flex-col items-center text-zinc-500"><div class="typing text-3xl mb-3"><span>●</span><span>●</span><span>●</span></div><p id="st-status" class="text-sm">Generando con tu marca inyectada…</p><p class="text-[11px] text-zinc-600 mt-1">⏱ <span id="st-timer">0</span>s · cada variante tarda ~20-40s; si valida, reintenta hasta 3×</p></div>`;
  btn.disabled = true; btn.classList.add('opacity-50', 'pointer-events-none');
  const t0 = Date.now();
  const timer = setInterval(() => { const el = document.getElementById('st-timer'); if (el) el.textContent = Math.round((Date.now() - t0) / 1000); }, 1000);
  const n = Number(params.variantes) || 2;
  try {
    let userPrompt = build.userPrompt, variantes = [], attempt = 0, exhausted = false, dec = null;
    for (attempt = 1; attempt <= 3; attempt++) {
      const text = await window.callClaudeMessages([{ role: 'user', content: userPrompt }],
        { system: build.system, max_tokens: 1500 + n * 1500, model: params.model || undefined });
      let parsed; try { parsed = parseJSON(text); } catch (e) { parsed = {}; }
      if (parsed.decisiones_auto) dec = parsed.decisiones_auto;
      if (mode === 'libre' && parsed.decisiones_auto) {
        const ctxEl = document.getElementById('st-context');
        if (ctxEl) ctxEl.innerHTML = autoDecisionsBlock(parsed.decisiones_auto) + studioContextPanel(build.contexto, estTokens);
        const pre2 = document.getElementById('st-rawprompt'); if (pre2) pre2.textContent = build.system + '\n\n----- USER -----\n' + build.userPrompt;
      }
      variantes = parsed.variantes || parsed.reels || (Array.isArray(parsed) ? parsed : []);
      const errs = [];
      variantes.forEach(v => { const r = window.Validator.validate(flattenVariante(v), null, params.tipoContenido); if (!r.ok) errs.push.apply(errs, r.errores); });
      if (!variantes.length) throw new Error('La IA no devolvió variantes válidas. Reintentá.');
      if (!errs.length) break;
      if (attempt < 3) {
        const st = document.getElementById('st-status'); if (st) st.textContent = `Validando… corrigiendo (intento ${attempt + 1}/3)`;
        userPrompt = build.userPrompt + window.Validator.feedbackPrompt({ errores: Array.from(new Set(errs)) });
      } else { exhausted = true; }
    }
    STUDIO_LAST = variantes;
    renderStudioCards(variantes, params.tipoContenido, exhausted);
    // Persistir en memoria (falla suave, no bloquea la UI)
    if (window.Memory && window.Memory.enabled()) {
      const valAgg = variantes.map(v => window.Validator.validate(flattenVariante(v), null, params.tipoContenido));
      window.Memory.saveGeneration({
        tipo: params.tipoContenido, modo: mode,
        input_idea: mode === 'libre' ? ((document.getElementById('st-idea') || {}).value || '') : null,
        input_config: mode === 'guiado' ? { avatar: params.avatarDestino, dolor: params.dolor, enemigo: params.enemigo, tactica: params.tactica, fase: params.faseDelMes, tema: params.tema } : null,
        decisiones_auto: dec,
        output_variantes: variantes,
        prompt_completo: build.system + '\n\n----- USER -----\n' + build.userPrompt,
        tokens_usados: estTokens,
        validador_errores: valAgg.reduce((a, v) => a.concat(v.errores), []),
        validador_warnings: valAgg.reduce((a, v) => a.concat(v.warnings), []),
        estado: 'producida',
      }).then(() => studioToast('Guardado en memoria ✓')).catch(() => {});
    }
  } catch (e) {
    out.innerHTML = `<div class="border border-red-900/50 bg-red-950/20 rounded-xl p-5 text-sm text-red-300"><b>Error:</b> ${E(e.message)}</div>`;
  } finally { clearInterval(timer); btn.disabled = false; btn.classList.remove('opacity-50', 'pointer-events-none'); }
}
window.studioGenerate = studioGenerate;
function studioToast(msg) {
  let t = document.getElementById('opera-toast');
  if (!t) { t = document.createElement('div'); t.id = 'opera-toast'; t.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-billete text-light text-sm px-4 py-2 rounded-lg shadow-lg border border-emerald-700'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; }, 1800);
}
window.studioToast = studioToast;
function studioCard(v, i, tipo) {
  const val = window.Validator.validate(flattenVariante(v), null, tipo);
  const badge = (ok, txt) => `<span class="text-[10px] px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-900/50 text-emerald-300' : 'bg-bordeaux/40 text-red-300'}">${ok ? '✓' : '✗'} ${txt}</span>`;
  const f = (lbl, txt, c) => txt ? `<div class="bg-dark rounded-lg p-2.5 mb-2"><div class="text-[10px] uppercase ${c || 'text-zinc-500'} font-semibold mb-0.5">${lbl}</div><div class="text-sm">${E(txt)}</div></div>` : '';
  let extra = '';
  if (Array.isArray(v.slides)) extra = `<div class="flex gap-2 overflow-x-auto scrollbar-thin pb-2 mb-2">${v.slides.map(s => `<div class="shrink-0 w-40 bg-dark border border-zinc-800 rounded-lg p-2"><div class="text-[9px] uppercase text-accent">slide ${E(String(s.n ?? ''))} · ${E(s.tipo || '')}</div><div class="text-xs mt-1">${E(s.texto)}</div><div class="text-[9px] text-zinc-600 mt-1">📷 ${E(s.visual || '')}</div></div>`).join('')}</div>`;
  if (Array.isArray(v.frames)) extra = v.frames.map(fr => `<div class="border-l-2 border-accent/40 pl-2 mb-1.5"><span class="text-[10px] uppercase text-accent">${E(fr.fase || '')}</span><div class="text-sm">${E(fr.texto_en_pantalla)}</div>${fr.voz ? `<div class="text-xs text-zinc-400">${E(fr.voz)}</div>` : ''}${fr.sticker && fr.sticker !== 'ninguno' ? `<div class="text-[10px] text-purple-300">🎯 ${E(fr.sticker)}</div>` : ''}</div>`).join('');
  if (Array.isArray(v.titulos)) extra += `<div class="mb-2"><div class="text-[10px] uppercase text-zinc-500 font-semibold mb-1">Títulos</div>${v.titulos.map(t => `<div class="text-xs"><span class="text-accent">[${E(t.palanca || '')}]</span> ${E(t.texto)}</div>`).join('')}</div>`;
  if (Array.isArray(v.miniaturas)) extra += `<div class="grid grid-cols-3 gap-1 mb-2">${v.miniaturas.map(m => `<div class="bg-dark rounded p-2 text-[10px]"><b class="text-accent">${E(m.variante || '')}</b> "${E(m.texto_en_miniatura)}"<div class="text-zinc-500">${E(m.composicion || '')}</div></div>`).join('')}</div>`;
  if (Array.isArray(v.lineas)) extra = `<div class="bg-dark rounded-lg p-3 mb-2">${v.lineas.map(l => `<div class="font-display text-base text-light">${E(l)}</div>`).join('')}</div>`;
  return `<div class="bg-primary/40 border border-zinc-800 rounded-xl p-4 mb-4">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="min-w-0"><div class="text-[10px] uppercase text-accent/70">${E(tipo)} · variante ${i + 1}</div><div class="font-display font-bold text-light">${E(v.thumbnail_text || '')}</div></div>
      <div class="flex gap-1 shrink-0">
        <button onclick="studioCopy(${i},this)" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📋</button>
        <button onclick="studioSave(${i},this)" class="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25">💾</button>
        <button onclick="studioExport(${i})" class="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">📥</button>
      </div>
    </div>
    ${f('🎣 Hook', v.hook, 'text-accent')}${f('🗣️ Chisme', v.chisme)}${extra}${f('💎 Valor oculto', v.valor_oculto, 'text-emerald-400')}${f('📣 CTA', v.cta, 'text-purple-300')}
    ${v.caption_larga ? `<details class="mb-2"><summary class="cursor-pointer text-[11px] text-zinc-500">caption larga</summary><div class="text-sm text-zinc-300 mt-1">${E(v.caption_larga)}</div></details>` : ''}
    <div class="flex flex-wrap gap-1 items-center"><span class="text-[10px] text-zinc-600 mr-1">${E(v.mecanica_aplicada || '')}</span>${badge(val.errores.length === 0, 'reglas')}${badge(val.palabrasDeMarcaUsadas.length >= 3, val.palabrasDeMarcaUsadas.length + ' marca')}${badge(val.frasesUsadas.length >= 1, 'frase')}</div>
    ${val.errores.length ? `<div class="text-[11px] text-red-400 mt-1">⚠ ${E(val.errores.join(' · '))}</div>` : ''}
  </div>`;
}
function renderStudioCards(variantes, tipo, exhausted) {
  const out = document.getElementById('st-output');
  const warn = exhausted ? `<div class="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2 text-[11px] text-amber-200 mb-3">⚠ Tras 3 intentos quedaron observaciones de validación. Te muestro el mejor resultado — revisá o regenerá.</div>` : '';
  out.innerHTML = warn + `<div class="flex justify-end mb-2"><button onclick="studioGenerate(document.getElementById('st-generate'))" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700">🔄 Regenerar todo</button></div>` +
    variantes.map((v, i) => studioCard(v, i, tipo)).join('');
}
function studioPlainText(v) {
  let t = `${v.thumbnail_text || ''}\nHOOK: ${v.hook || ''}\nCHISME: ${v.chisme || ''}\nVALOR: ${v.valor_oculto || ''}\nCTA: ${v.cta || ''}`;
  if (Array.isArray(v.slides)) t += '\n' + v.slides.map(s => `SLIDE ${s.n ?? ''} (${s.tipo || ''}): ${s.texto}`).join('\n');
  if (Array.isArray(v.frames)) t += '\n' + v.frames.map(f => `[${f.fase}] ${f.texto_en_pantalla} | ${f.voz || ''}`).join('\n');
  if (Array.isArray(v.titulos)) t += '\nTÍTULOS: ' + v.titulos.map(x => `[${x.palanca}] ${x.texto}`).join(' / ');
  if (Array.isArray(v.lineas)) t = (v.thumbnail_text || '') + '\n' + v.lineas.join('\n');
  if (v.caption_larga) t += '\nCAPTION: ' + v.caption_larga;
  return t;
}
function studioCopy(i, btn) { const v = STUDIO_LAST[i]; if (!v) return; navigator.clipboard.writeText(studioPlainText(v)); if (btn) { btn.textContent = '✓'; setTimeout(() => btn.textContent = '📋', 1200); } }
function studioSave(i, btn) { const v = STUDIO_LAST[i]; if (!v || !window.operaSave) return; window.operaSave(STUDIO.tipo, Object.assign({ thumbnail: v.thumbnail_text }, v)); if (btn) { btn.textContent = '✓'; setTimeout(() => btn.textContent = '💾', 1200); } }
function studioExport(i) {
  const v = STUDIO_LAST[i]; if (!v) return;
  const blob = new Blob([studioPlainText(v)], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `studio-${STUDIO.tipo}-${i + 1}.txt`; a.click(); URL.revokeObjectURL(a.href);
}
window.studioCopy = studioCopy; window.studioSave = studioSave; window.studioExport = studioExport;

// =========================================================
//  Dispatcher + init
// =========================================================
window.OPERA_RENDERERS = {
  studio: renderStudio,
  marca: renderMarca,
  manifiesto: renderManifiesto,
  identidad: renderIdentidad,
  visual: renderVisual,
  psicologia: renderPsicologia,
  redes: renderRedes,
  sistema: renderSistema,
  avatares: renderAvatares,
  relaunch: renderRelaunch,
  estrategia: amplificarEstrategia,
  reels: null, carruseles: null, historias: null, youtube: null, calendario: renderCalendario,
  recursos: renderRecursos,
  transformador: renderTransformador,
  biblioteca: renderBiblioteca,
};
document.addEventListener('DOMContentLoaded', () => {
  ensureOpera();
  renderStudio(); // tab por defecto (v3)
});
