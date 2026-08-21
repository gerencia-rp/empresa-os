// ════════════════════════════════════════════════════════════════
// 🏗️ FIX & FLIP · COMMAND CENTER — app unificada (dark/light, mismo sistema que Rentas).
// Fuente de verdad = Airtable "Flipping Rentals matriz" (applMXFyPq1hXj7iN) vía ff_* (SOLO LECTURA).
// Fase 1: Command Center + Deals & Pipeline (Kanban) + Insights + toggle claro/oscuro.
// ════════════════════════════════════════════════════════════════
const FF = {
  sys: null, section: 'command', loading: false, loadError: null,
  deals: [], draws: [], investors: [], _charts: [],
};
window.FF = FF;

const FF_MONEY = n => posMoney(n); // #10: formato único compartido
const FF_K = n => { const a = Math.abs(n); return (n < 0 ? '-$' : '$') + (a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1) + 'k' : Math.round(a)); };
const FF_ESC = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FF_STAGES = [
  ['adquirida', 'Adquirida', 'st-adq'], ['en_rehab', 'En Rehab', 'st-reh'], ['en_venta', 'En Venta', 'st-ven'],
  ['rentada', 'Rentada', 'st-ren'], ['refinanciada', 'Refinanciada', 'st-ref'], ['rentada_y_refinanciada', 'Rentada y Refi', 'st-ref'], ['vendida', 'Vendida', 'st-vnd'],
];
const FF_STAGE_LBL = Object.fromEntries(FF_STAGES.map(s => [s[0], s[1]]));
// Blueprint FF: pipeline canónico Lead → Bajo contrato → Comprada → En remodelación → En renta/venta → Salida
const FF_PIPELINE = [
  ['lead', 'Lead', ['lead']],
  ['bajo_contrato', 'Bajo contrato', ['bajo_contrato']],
  ['comprada', 'Comprada', ['adquirida']],
  ['remodelacion', 'En remodelación', ['en_rehab']],
  ['renta_venta', 'En renta/venta', ['en_venta', 'rentada']],
  ['salida', 'Salida', ['refinanciada', 'rentada_y_refinanciada', 'vendida']],
];
function ffShort(addr) { return String(addr || '').split(',')[0].trim(); }
// ─── CALIDAD DE DATOS (no cambia la fuente; marca lo imposible/incompleto) ───
const FF_FINISHED = ['vendida', 'refinanciada', 'rentada']; // resultado realizado (obra terminada + monetizada)
function ffDataQuality(d) {
  const sinDatos = !(Number(d.allIn) > 0) || !(Number(d.arv) > 0);              // casa esqueleto (all-in/ARV = 0)
  const revisar = !sinDatos && Number(d.allInPct) > 1.0;                        // all-in > 100% ARV = imposible (error de carga, ej. $189k)
  const preliminar = !sinDatos && !revisar && !FF_FINISHED.includes(d.stage);   // obra NO finalizada → resultado en curso, no final
  const flags = [];
  if (sinDatos) flags.push('sin datos');
  if (revisar) flags.push('dato a revisar');
  if (preliminar) flags.push('preliminar');
  return { sinDatos, revisar, preliminar, confiable: !sinDatos && !revisar, flags };
}
function ffDQBadge(dq) {
  if (!dq || !dq.flags.length) return '';
  if (dq.revisar) return `<span class="ff-dq ff-dq-rev" title="all-in > 100% del ARV — imposible, probable error de carga">${osIcon('alert')} dato a revisar</span>`;
  if (dq.sinDatos) return `<span class="ff-dq ff-dq-nd" title="all-in y/o ARV en 0 — casa esqueleto sin datos">◌ sin datos</span>`;
  if (dq.preliminar) return `<span class="ff-dq ff-dq-pre" title="obra no finalizada — resultado en curso, no final">${osIcon('loader')} preliminar</span>`;
  return '';
}
// Indicador GLOBAL de calidad de datos: cuántos deals hay que revisar + la lista.
function ffDQBar(comp) {
  const k = comp.kpi; const flagged = k.revisar + k.sinDatos;
  if (!flagged && !k.preliminar) return `<div class="ff-dqbar clean"><div><div class="t">✓ Datos consistentes</div><div class="d">${k.confiablesN}/${k.total} deals confiables · sin valores imposibles</div></div></div>`;
  if (!flagged) return `<div class="ff-dqbar clean"><div><div class="t">✓ Datos consistentes · ${k.preliminar} en obra</div><div class="d">${k.confiablesN}/${k.total} deals confiables · los ${k.preliminar} preliminares (obra en curso) no entran en promedios hasta terminar ${osIcon('construction')}</div></div></div>`;
  const revNames = k.revisarList.map(d => `${FF_ESC(ffShort(d.address))} (${Math.round(d.allInPct * 100)}%)`).join(', ');
  return `<div class="ff-dqbar"><div><div class="t">${osIcon('alert')} ${flagged} deal(s) con datos a revisar</div><div class="d">${k.revisar} imposibles (all-in > 100% ARV) · ${k.sinDatos} sin datos · ${k.preliminar} preliminares (obra en curso). <b>Excluidos de promedios/márgenes.</b></div></div>${revNames ? `<div class="lst">${revNames}</div>` : ''}</div>`;
}
function ffAx() { return posGetTheme() === 'light' ? '#6f7785' : '#757d8b'; }
function ffGridC() { return posGetTheme() === 'light' ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.05)'; }

// ─── CSS (mismo look del ecosistema, scoped bajo #ff-overlay, con tema claro) ───
function ffInjectCSS() {
  if (document.getElementById('ff-styles')) return;
  const st = document.createElement('style'); st.id = 'ff-styles';
  st.textContent = `
  #ff-overlay{position:fixed;inset:0;z-index:9998;overflow:auto;
    --bg:#08090c;--ink:#f1f3f7;--mut:#8b93a1;--mut2:#757d8b;--glass:#131519;--glassb:rgba(255,255,255,.07);
    --a1:#5c79f0;--a2:#3a5be0;--a3:#93b0e2;--pos:#4ade9e;--neg:#ff6b6b;--amber:#fbbf24;
    --accent:#3a5be0;--accent-2:#5c79f0;--accent-soft:rgba(58,91,224,.18);--glow:rgba(58,91,224,.5);--grad:linear-gradient(120deg,#3a5be0,#5c79f0);--surface-2:#191c22;--surface-solid:#161a20;--radius:20px;
    --mesh1:rgba(58,91,224,.5);--mesh2:rgba(92,121,240,.16);--mesh3:rgba(58,91,224,.10);--bggrad:#08090c;
    color:var(--ink);background:var(--bg);font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.1px;-webkit-font-smoothing:antialiased}
  /* LIGHT canon royal — espejo de ui/tokens.css */
  #ff-overlay[data-theme="light"]{
    --bg:#eef1f6;--ink:#0e1420;--mut:#5a6270;--mut2:#6f7785;--glass:#ffffff;--glassb:rgba(14,20,32,.09);
    --a1:#3e5be0;--a2:#2b44c6;--a3:#5a78b4;--pos:#059669;--neg:#dc2626;--amber:#b45309;
    --accent:#2b44c6;--accent-2:#3e5be0;--accent-soft:rgba(43,68,198,.12);--glow:rgba(43,68,198,.24);--grad:linear-gradient(120deg,#2b44c6,#3e5be0);--surface-2:#f1f4f8;--surface-solid:#ffffff;
    --mesh1:rgba(43,68,198,.24);--mesh2:rgba(62,91,224,.08);--mesh3:rgba(43,68,198,.05);--bggrad:#eef1f6}
  #ff-overlay[data-theme="light"] .card{box-shadow:0 1px 2px rgba(16,20,28,.04),0 18px 40px -28px rgba(16,20,28,.4)}
  #ff-overlay *{box-sizing:border-box;margin:0;padding:0}
  #ff-overlay .bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;background:
    radial-gradient(760px 520px at 8% -6%,var(--mesh1),transparent 58%),
    radial-gradient(820px 560px at 100% 4%,var(--mesh2),transparent 56%),
    radial-gradient(700px 620px at 70% 118%,var(--mesh3),transparent 60%),var(--bggrad)}
  #ff-overlay .gridfx{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5;
    background-image:linear-gradient(var(--glassb) 1px,transparent 1px),linear-gradient(90deg,var(--glassb) 1px,transparent 1px);
    background-size:44px 44px;-webkit-mask:radial-gradient(circle at 50% 30%,#000,transparent 78%);mask:radial-gradient(circle at 50% 30%,#000,transparent 78%)}
  #ff-overlay .app{position:relative;z-index:1;display:grid;grid-template-columns:244px minmax(0,1fr);min-height:100vh}
  #ff-overlay .side{padding:22px 15px;position:sticky;top:0;height:100vh;background:linear-gradient(180deg,rgba(12,16,26,.72),rgba(7,10,17,.72));border-right:1px solid var(--glassb);backdrop-filter:blur(16px);display:flex;flex-direction:column}
  #ff-overlay[data-theme="light"] .side{background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(240,244,250,.85))}
  #ff-overlay .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 22px}
  #ff-overlay .logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--a1),var(--a2));display:grid;place-items:center;color:#fff;font-weight:900;font-size:15px;box-shadow:0 6px 20px -6px rgba(58,91,224,.6),inset 0 1px 0 rgba(255,255,255,.4)}
  #ff-overlay .brand b{font-size:15px;font-weight:750}#ff-overlay .brand span{display:block;font-size:9px;color:var(--mut2);letter-spacing:2.4px;margin-top:2px}
  #ff-overlay .navlbl{font-size:9px;letter-spacing:1.8px;color:var(--mut2);text-transform:uppercase;padding:12px 12px 7px;font-weight:700}
  #ff-overlay .nav{display:flex;flex-direction:column;gap:2px}
  #ff-overlay .nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--mut);text-decoration:none;font-size:13px;font-weight:500;transition:.16s;position:relative;cursor:pointer}
  #ff-overlay .nav a .i{width:16px;text-align:center;opacity:.85;font-size:13px}
  #ff-overlay .nav a:hover{background:var(--glass);color:var(--ink)}
  #ff-overlay .nav a.on{color:var(--ink);background:linear-gradient(90deg,rgba(92,121,240,.16),rgba(58,91,224,.06));box-shadow:inset 0 0 0 1px var(--glassb)}
  #ff-overlay .nav a.on::before{content:"";position:absolute;left:-15px;top:8px;bottom:8px;width:3px;border-radius:3px;background:linear-gradient(180deg,var(--a1),var(--a2));box-shadow:0 0 10px var(--a1)}
  #ff-overlay .nav a .b{margin-left:auto;font-size:10px;color:var(--mut2)}
  #ff-overlay .side .foot{margin-top:auto;font-size:10.5px;color:var(--mut2);line-height:1.7;border-top:1px solid var(--glassb);padding-top:12px}
  #ff-overlay .side .foot b{color:var(--a1)}
  #ff-overlay .main{padding:24px 32px 46px;max-width:1620px}
  #ff-overlay .top{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px;padding-right:96px}
  #ff-overlay .top h1{font-size:23px;font-weight:760;letter-spacing:-.3px}
  #ff-overlay .top h1 span{background:linear-gradient(90deg,var(--a1),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent}
  #ff-overlay .sub{color:var(--mut);font-size:12.5px;margin-top:5px}
  #ff-overlay .pills{margin-left:auto;display:flex;gap:9px;align-items:center}
  #ff-overlay .pill{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--mut);background:var(--glass);border:1px solid var(--glassb);padding:8px 13px;border-radius:22px;backdrop-filter:blur(10px)}
  #ff-overlay .cdot{width:7px;height:7px;border-radius:50%;background:var(--a1);box-shadow:0 0 10px var(--a1);animation:ffpulse 2s infinite}@keyframes ffpulse{0%,100%{opacity:1}50%{opacity:.35}}
  #ff-overlay .pill.ai{background:linear-gradient(90deg,rgba(58,91,224,.22),rgba(58,91,224,.14));border-color:rgba(58,91,224,.4);color:var(--ink);cursor:pointer}
  #ff-overlay .shimmer{background:linear-gradient(90deg,var(--a3) 30%,var(--a2) 50%,var(--a3) 70%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:ffsh 3s linear infinite}@keyframes ffsh{to{background-position:-200% 0}}
  #ff-overlay .ffclose,#ff-overlay .pos-theme-btn{position:fixed;top:16px;z-index:5;background:var(--glass);border:1px solid var(--glassb);color:var(--mut);width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:15px;backdrop-filter:blur(10px)}
  #ff-overlay .ffclose{right:20px}#ff-overlay .pos-theme-btn{right:62px}
  #ff-overlay .ffclose:hover,#ff-overlay .pos-theme-btn:hover{color:var(--ink);border-color:var(--a2)}
  #ff-overlay .grid{display:grid;gap:16px}#ff-overlay .kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
  #ff-overlay .card{position:relative;background:var(--glass);border:1px solid var(--glassb);border-radius:16px;padding:19px;backdrop-filter:blur(18px);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 26px 60px -34px rgba(0,0,0,.9);transition:.2s;overflow:hidden}
  #ff-overlay[data-theme="light"] .card{box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}
  #ff-overlay .card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)}
  #ff-overlay[data-theme="light"] .card::before{background:linear-gradient(90deg,transparent,rgba(15,23,42,.12),transparent)}
  #ff-overlay .card:hover{transform:translateY(-2px);border-color:var(--a2)}
  #ff-overlay .lab{font-size:10px;letter-spacing:1.5px;color:var(--mut2);text-transform:uppercase;font-weight:700}
  #ff-overlay .kpi .big{font-size:31px;font-weight:780;margin-top:9px;letter-spacing:-.8px}
  #ff-overlay .kpi .meta{font-size:11.5px;color:var(--mut);margin-top:7px;line-height:1.5}
  #ff-overlay .glow{text-shadow:0 0 22px rgba(92,121,240,.4)}
  #ff-overlay[data-theme="light"] .glow{text-shadow:none}
  #ff-overlay .up{color:var(--pos)}#ff-overlay .down{color:var(--neg)}#ff-overlay .warn{color:var(--amber)}
  #ff-overlay .row2{grid-template-columns:1.6fr minmax(0,1fr);margin-top:16px;align-items:start}#ff-overlay .row3{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px;align-items:start}
  #ff-overlay .chart-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  #ff-overlay .chart-h .t{font-size:13.5px;font-weight:640}#ff-overlay .chart-h .k{font-size:11px;color:var(--mut2)}
  #ff-overlay .legend{display:flex;gap:14px;font-size:11px;color:var(--mut)}#ff-overlay .legend b{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}
  #ff-overlay canvas{max-width:100%}
  #ff-overlay .brain{background:linear-gradient(180deg,rgba(30,28,58,.55),rgba(14,16,32,.55));border:1px solid rgba(58,91,224,.28)}
  #ff-overlay[data-theme="light"] .brain{background:linear-gradient(180deg,rgba(58,91,224,.10),rgba(58,91,224,.05))}
  #ff-overlay .bh{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  #ff-overlay .orb{width:32px;height:32px;border-radius:50%;position:relative;background:radial-gradient(circle at 34% 30%,#b8e6cd,#5c79f0 30%,#3a5be0 70%,#1c3327);box-shadow:0 0 22px rgba(58,91,224,.55)}
  #ff-overlay .orb::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--a1),var(--a2),var(--a3),var(--a1)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ffspin 6s linear infinite;opacity:.7}@keyframes ffspin{to{transform:rotate(360deg)}}
  #ff-overlay .bh b{font-size:14px}#ff-overlay .bh span{font-size:9px;color:var(--mut2);display:block;letter-spacing:1.5px;margin-top:2px}
  #ff-overlay .insight{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--glassb)}#ff-overlay .insight:last-of-type{border-bottom:none}
  #ff-overlay .insight .ic{font-size:8px;margin-top:6px}#ff-overlay .ic.r{color:var(--neg)}#ff-overlay .ic.y{color:var(--amber)}#ff-overlay .ic.g{color:var(--pos)}#ff-overlay .ic.b{color:var(--a2)}
  #ff-overlay .insight .tx{font-size:12px;line-height:1.5;color:var(--ink)}#ff-overlay .insight .tx b{font-weight:650}
  #ff-overlay .iaction{font-size:11px;color:var(--a1);margin-top:5px;font-weight:500}
  #ff-overlay .tag{display:inline-block;font-size:9px;letter-spacing:.7px;color:var(--mut2);margin-top:5px;font-weight:700}
  #ff-overlay .chip{font-size:11px;color:var(--mut);background:var(--glass);border:1px solid var(--glassb);padding:6px 11px;border-radius:18px;cursor:pointer}#ff-overlay .chip:hover{color:var(--ink);border-color:var(--a2)}
  #ff-overlay .ask{display:flex;gap:8px;margin-top:14px}
  #ff-overlay .ask input{flex:1;background:var(--glass);border:1px solid rgba(58,91,224,.32);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:12px;outline:none}
  #ff-overlay .ask button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#fff;font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px}
  #ff-overlay .cc-chat{display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto}#ff-overlay .cc-chat:empty{display:none}
  #ff-overlay .cbub{max-width:82%;padding:10px 13px;border-radius:13px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  #ff-overlay .cbub.u{align-self:flex-end;background:linear-gradient(135deg,rgba(92,121,240,.16),rgba(58,91,224,.14));border:1px solid rgba(58,91,224,.3);color:var(--ink)}
  #ff-overlay .cbub.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb);color:var(--ink)}
  #ff-overlay .cbub.err{border-color:rgba(255,107,107,.4);color:var(--neg)}#ff-overlay .cbub.think{color:var(--mut2);font-style:italic}
  #ff-overlay .cbub p{margin:0 0 6px}#ff-overlay .cbub p:last-child{margin:0}#ff-overlay .cbub ul,#ff-overlay .cbub ol{margin:4px 0 6px 18px}#ff-overlay .cbub li{margin:3px 0}
  @keyframes ffblink{0%,100%{opacity:.35}50%{opacity:1}}#ff-overlay .cbub.think::after{content:"▋";animation:ffblink 1s infinite}
  #ff-overlay .ff-zsel td{background:var(--glass)}
#ff-um-modelos .pullbtn.on{background:linear-gradient(135deg,#3a5be0,#5c79f0);color:#fff;border-color:transparent}
.uwbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  #ff-overlay .uwbar label{font-size:12px;color:var(--mut)}#ff-overlay .uwtag{font-size:11px;color:var(--a1)}
  #ff-overlay .uwrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
  #ff-overlay .uwrow label{font-size:11.5px;color:var(--mut);flex:1}
  #ff-overlay .uwbar select,#ff-overlay .uwrow input,#ff-overlay .uwrow select{background:var(--glass);border:1px solid var(--glassb);border-radius:9px;color:var(--ink);font-size:12px;padding:8px 10px;outline:none}
  #ff-overlay .uwrow input{width:132px;text-align:right}#ff-overlay .uwrow select{width:150px}
  #ff-overlay .uwrow input:focus,#ff-overlay .uwrow select:focus,#ff-overlay .uwbar select:focus{border-color:var(--a2)}
  #ff-overlay .uwres{margin-top:10px;padding-top:10px;border-top:1px solid var(--glassb)}
  #ff-overlay .uwbig{font-size:22px;font-weight:760;letter-spacing:-.4px}#ff-overlay .uwsub{font-size:10.5px;color:var(--mut2);margin-top:3px;line-height:1.5}
  #ff-overlay .repbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#fff;font-weight:700;padding:8px 13px;border-radius:9px;cursor:pointer;font-size:11.5px}#ff-overlay .repbtn:hover{filter:brightness(1.08)}
  /* KANBAN */
  #ff-overlay .kan{display:flex;gap:13px;overflow-x:auto;padding-bottom:8px}
  #ff-overlay .kcol{flex:1;min-width:210px}
  #ff-overlay .kcol .ui-empty{padding:18px 8px!important;font-size:11px;border:1px dashed var(--glassb);border-radius:13px}
  #ff-overlay .kcol .ui-empty>div:first-child{font-size:20px!important;margin-bottom:4px!important}
  #ff-overlay .kcol-h{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.6px;padding:0 4px 10px}
  #ff-overlay .kcol-h .cnt{background:var(--glass);border:1px solid var(--glassb);border-radius:20px;padding:1px 8px;color:var(--ink)}
  #ff-overlay .kcard{background:var(--glass);border:1px solid var(--glassb);border-radius:13px;padding:13px;margin-bottom:10px;transition:.16s;cursor:default}
  #ff-overlay .kcard:hover{transform:translateY(-2px);border-color:var(--a2)}
  #ff-overlay .kcard .addr{font-size:12.5px;font-weight:640;color:var(--ink);margin-bottom:3px}
  #ff-overlay .kcard .meta{font-size:10.5px;color:var(--mut2);margin-bottom:9px}
  #ff-overlay .kstrat{font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px}
  #ff-overlay .kstrat.flip{background:rgba(58,91,224,.15);color:var(--a2)}#ff-overlay .kstrat.hold{background:rgba(92,121,240,.14);color:var(--a1)}
  #ff-overlay .krow{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:var(--mut)}#ff-overlay .krow b{color:var(--ink);font-weight:600}
  #ff-overlay .kbar{height:4px;border-radius:4px;background:var(--glassb);overflow:hidden;margin-top:8px}#ff-overlay .kbar i{display:block;height:100%;background:linear-gradient(90deg,var(--a1),var(--a2))}
  #ff-overlay .badge{font-size:10px;padding:3px 9px;border-radius:7px;font-weight:600}
  #ff-overlay .ff-dq{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;letter-spacing:.2px}
  #ff-overlay .ff-dq-rev{background:rgba(255,107,107,.16);color:var(--neg);border:1px solid rgba(255,107,107,.35)}
  #ff-overlay .ff-dq-nd{background:var(--glass);color:var(--mut);border:1px solid var(--glassb)}
  #ff-overlay .ff-dq-pre{background:rgba(251,191,36,.15);color:var(--amber);border:1px solid rgba(251,191,36,.32)}
  #ff-overlay .kficha{margin-top:8px;font-size:10px;font-weight:600;color:var(--a2);cursor:pointer;border-top:1px solid var(--glassb);padding-top:7px}#ff-overlay .kficha:hover{color:var(--a1)}
  #ff-overlay .ff-dqbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px;padding:12px 16px;border-radius:13px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.22)}
  #ff-overlay .ff-dqbar.clean{background:rgba(74,222,158,.08);border-color:rgba(74,222,158,.22)}
  #ff-overlay .ff-dqbar .t{font-size:12.5px;font-weight:700}#ff-overlay .ff-dqbar .d{font-size:11px;color:var(--mut)}
  #ff-overlay .ff-dqbar .lst{font-size:11px;color:var(--mut);margin-left:auto;text-align:right;max-width:60%}
  #ff-overlay .b-ok{background:rgba(74,222,158,.13);color:var(--pos)}#ff-overlay .b-red{background:rgba(255,107,107,.13);color:var(--neg)}#ff-overlay .b-warn{background:rgba(251,191,36,.13);color:var(--amber)}
  #ff-overlay .ptable{width:100%;border-collapse:collapse;font-size:12.5px}
  #ff-overlay .ptable th{text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid var(--glassb);font-weight:700}
  #ff-overlay .ptable td{padding:11px 8px;border-bottom:1px solid var(--glassb)}
  #ff-overlay .ptable tr:hover td{background:var(--glass)}
  #ff-overlay .empty-sec{padding:56px;text-align:center;color:var(--mut2)}
  #ff-overlay .soon{display:inline-block;font-size:9px;font-weight:700;color:var(--a2);background:rgba(58,91,224,.12);padding:2px 8px;border-radius:12px;margin-left:8px}
  #ff-overlay .card,#ff-overlay .main{animation:fffade .35s ease}@keyframes fffade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  @media (max-width:960px){
    #ff-overlay{overflow-x:hidden}#ff-overlay .app{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .side{position:sticky;top:0;height:auto;padding:12px 14px}#ff-overlay .side .navlbl,#ff-overlay .side .foot{display:none}
    #ff-overlay .nav{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:5px}#ff-overlay .nav a{white-space:nowrap;flex-shrink:0}#ff-overlay .nav a.on::before{display:none}
    #ff-overlay .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#ff-overlay .row2,#ff-overlay .row3{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .top{flex-direction:column;padding-right:104px}#ff-overlay .pills{margin-left:0;flex-wrap:wrap}
  }
  @media (max-width:600px){
    #ff-overlay .kpis{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .kanban{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .kan{flex-direction:column;overflow-x:visible}
    #ff-overlay .kcol{min-width:0;width:100%;flex:none}
    #ff-overlay .wrap{padding:14px 12px 40px}
  }`;
  document.head.appendChild(st);
}

// ════════════════════════════════════════════════════════════════
// ENTRADA + CARGA
// ════════════════════════════════════════════════════════════════
async function openFFCommandCenter(sys) {
  FF.sys = sys; FF.section = 'command';
  ffInjectCSS();
  let ov = document.getElementById('ff-overlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'ff-overlay'; document.body.appendChild(ov); }
  posApplyTheme(ov);
  ov.innerHTML = '<div class="bgfx"></div><div class="gridfx"></div><div class="app"><aside class="side"></aside><main class="main"><div style="padding:60px;color:#757d8b">' + osIcon('loader') + ' Conectando con Airtable Flipping…</div></main></div><button class="pos-theme-btn" onclick="ffToggleTheme()" title="Tema claro/oscuro">◐</button><button class="ffclose" onclick="closeFFCommandCenter()" title="Cerrar">✕</button>';
  document.body.style.overflow = 'hidden';
  await ffLoadAll();
  ffRender();
}
window.openFFCommandCenter = openFFCommandCenter;
function closeFFCommandCenter() { const ov = document.getElementById('ff-overlay'); if (ov) ov.remove(); document.body.style.overflow = ''; ffDestroyCharts(); }
window.closeFFCommandCenter = closeFFCommandCenter;
function ffToggleTheme() { posToggleTheme(); ffRender(); }
window.ffToggleTheme = ffToggleTheme;

async function ffLoadAll() {
  FF.loading = true; FF.loadError = null;
  try {
    const [deals, draws, inv, oh, hml, loans, cfg, qb] = await Promise.all([
      sb.from('ff_deals').select('*').eq('active', true),
      sb.from('ff_draws').select('*').eq('active', true),
      sb.from('ff_investors').select('*').eq('active', true),
      sb.from('ff_overhead').select('source, concepto, monto, mes').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_payments').select('address_norm, fecha, pago_hml, fee, ref30, fecha_ref30').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_hml_loans').select('*').eq('active', true).then(r => r.data || []).catch(() => []),
      sb.from('ff_uw_config').select('key, value, text_value').then(r => r.data || []).catch(() => []),
      // B1: la GANANCIA real viene del P&L de QBO (espejo qb_report_cache) — una sola definición
      sb.from('qb_report_cache').select('report,label,value,fetched_at').eq('empresa', 'fix_flip').in('label', ['Net Income', 'Total Income', 'Total Expenses', 'Net Other Income']).then(r => r.data || []).catch(() => []),
    ]);
    // #2: capital desplegado ÚNICO desde la capa de KPIs (equity ≠ deuda) — v_capital_deployed (O1)
    FF.capital = await sb.from('v_capital_deployed').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // N1: P&L por casa con interés HML visible — v_pnl_casa (O1)
    FF.pnlCasa = await sb.from('v_pnl_casa').select('*').then(r => r.data || []).catch(() => []);
    // N3: utilidad realizada de obras (Airtable) para el waterfall — v_obras_kpi (O1)
    FF.obrasKpi = await sb.from('v_obras_kpi').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // N2: equity incorporado por casa — v_property_360 (O1)
    FF.p360 = await sb.from('v_property_360').select('*').then(r => r.data || []).catch(() => []);
    // PORTAFOLIO del CEO (14-jul): regla única (≠operador, ≠vendida) + déficit correcto — v_ff_portafolio
    FF.port = await sb.from('v_ff_portafolio').select('*').then(r => r.data || []).catch(() => []);
    FF.portKpi = await sb.from('v_ff_portafolio_kpi').select('*').maybeSingle().then(r => r.data).catch(() => null);
    // INVERSIONISTAS (rediseño 14-jul): ranking co-inversión activa (participación viva) — v_inversionistas
    FF.invRank = await sb.from('v_inversionistas').select('*').order('capital_desplegado', { ascending: false }).order('casas_vivas', { ascending: false }).then(r => r.data || []).catch(() => []);
    if (deals.error) throw deals.error;
    FF.deals = deals.data || []; FF.draws = draws.data || []; FF.investors = inv.data || [];
    FF.overhead = oh || []; FF.hml = hml || [];
    FF.loans = loans || [];
    FF.qb = qb || [];
    FF.cfg = {}; FF.cfgT = {}; (cfg || []).forEach(c => { if (c.value != null) FF.cfg[c.key] = +c.value; if (c.text_value) FF.cfgT[c.key] = c.text_value; });
  } catch (e) { FF.loadError = e.message || String(e); }
  finally { FF.loading = false; }
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO (join deals+draws → all-in, margen/déficit)
// ════════════════════════════════════════════════════════════════
function ffCompute() {
  const drawByNorm = {}; FF.draws.forEach(d => drawByNorm[d.address_norm] = d);
  const portByNorm = {}; (FF.port || []).forEach(p => portByNorm[p.address_norm] = p);
  const deals = FF.deals.map(d => {
    const dr = drawByNorm[d.address_norm] || null;
    const port = portByNorm[d.address_norm] || null;
    const purchase = Number(d.purchase_price || 0);
    const remComplete = dr ? Number(dr.remodel_complete || 0) : Number(d.remodel_est || 0) * 1.3;
    const holding = dr ? (Number(dr.interest_hml || 0) + Number(dr.services_hml || 0) + Number(dr.interest_until_rent || 0) + Number(dr.furniture || 0) + Number(dr.other_costs || 0)) : 0;
    // ALL-IN = compra + Total Draws desembolsados (v_ff_portafolio; fallback rotulado compra+rehab)
    const faltanDraws = !!(port && port.faltan_draws);
    const allIn = port && port.all_in != null ? Number(port.all_in) : (purchase + remComplete + holding);
    const allInFuente = port ? (port.all_in_fuente || null) : 'compra + rehab + holding (legacy)';
    const arv = Number(d.arv || 0);
    const margin = arv - allIn; // margen bruto (antes de costos de venta)
    const marginPct = arv ? margin / arv : 0;
    const allInPct = arv ? allIn / arv : 0;
    // DÉFICIT = fuente ÚNICA ff_deals.deficit_total (Airtable). Positivo = caja atrapada (se recupera al
    // refinanciar/vender) · null = obra en curso / no estabilizada · <=0 = recuperado. La app NO recalcula
    // (decisión CEO ago-2026; antes usaba la fórmula draws−déficit−downpayment de la vista, otro número).
    const deficit = (d.deficit_total == null || d.deficit_total === '') ? null : Number(d.deficit_total);
    const esPortafolio = port ? !!port.es_portafolio : true;
    const motivoExcl = port ? port.motivo_exclusion : null;
    const estrategia = d.estrategia || port && port.estrategia || null;   // palabra COMPLETA
    const equity = arv - allIn; // equity potencial
    const dq = ffDataQuality({ allIn, arv, allInPct, stage: d.stage });
    const loan = (FF.loans || []).find(l => l.address_norm === d.address_norm) || null;
    const cerrada = ['vendida', 'refinanciada', 'rentada'].includes(d.stage);
    const hmlDueDays = (loan && loan.fecha_vencimiento && !cerrada) ? Math.round((new Date(loan.fecha_vencimiento) - Date.now()) / 86400000) : null;
    const budgetDevPct = (Number(d.remodel_est) > 0 && dr && Number(dr.remodel_complete) > 0) ? Math.round((Number(dr.remodel_complete) - Number(d.remodel_est)) / Number(d.remodel_est) * 100) : null;
    const semAllin = arv > 0 && (allIn / arv) > (FF.cfg.all_in_max_pct || 0.75);
    const semHml = hmlDueDays != null && hmlDueDays <= (FF.cfg.hml_warn_days || 45);
    const semBudget = budgetDevPct != null && budgetDevPct > (FF.cfg.budget_warn_pct || 10);
    return { ...d, dr, port, purchase, remComplete, holding, allIn, allInFuente, faltanDraws, esPortafolio, motivoExcl, estrategia, arv, margin, marginPct, allInPct, deficit, equity, dq, isFlip: d.strategy === 'flip', loan, hmlDueDays, budgetDevPct, semAllin, semHml, semBudget };
  });
  const active = deals.filter(d => d.stage !== 'vendida');
  // "confiables" = sin flags 'dato a revisar' / 'sin datos'. Los promedios/margen/déficit del
  // portafolio se calculan SOLO sobre estos (no contaminar con datos imposibles/incompletos).
  const confiables = deals.filter(d => d.dq.confiable);
  const activeConf = confiables.filter(d => d.stage !== 'vendida');
  const revisarList = deals.filter(d => d.dq.revisar);
  const kpi = {
    total: deals.length, activos: active.length,
    capital: active.reduce((s, d) => s + d.allIn, 0),   // capital = money desplegado (total); los flagged van con badge
    arvTotal: deals.reduce((s, d) => s + d.arv, 0),
    // Equity y déficit acumulado: SOLO deals confiables (los del error $189k los distorsionan)
    equity: activeConf.reduce((s, d) => s + Math.max(0, d.equity), 0),
    // déficit acumulado CORREGIDO (14-jul): fórmula del CEO desde la vista, EXCLUYE faltan_draws y no-portafolio
    // Σ ff_deals.deficit_total sobre deals con dato (obras en curso = null → no suman) — MISMO número que el Dashboard.
    deficitAcum: deals.reduce((s, d) => s + (d.deficit != null ? d.deficit : 0), 0),
    marginPctAvg: activeConf.length ? activeConf.reduce((s, d) => s + d.marginPct, 0) / activeConf.length : 0,
    flips: deals.filter(d => d.isFlip).length, holds: deals.filter(d => d.strategy === 'hold').length,
    investors: FF.investors.filter(x => !/flipping\s*rentals/i.test(x.name || '')).length, // sin la propia empresa (18)
    // Calidad de datos
    revisar: revisarList.length, sinDatos: deals.filter(d => d.dq.sinDatos).length,
    preliminar: deals.filter(d => d.dq.preliminar).length, confiablesN: confiables.length,
    revisarList,
  };
  return { deals, kpi };
}

// ─── INSIGHTS (reglas rankeadas por $) ───
function ffInsights(comp) {
  const { deals } = comp; const ins = [];
  // 1) Error de remodelación (interno ≫ estimado) — Bartlett/Capps $189k
  deals.filter(d => d.dr && Number(d.dr.remodel_internal) > Number(d.remodel_est || 0) * 2 && Number(d.dr.remodel_internal) >= 100000)
    .sort((a, b) => Number(b.dr.remodel_internal) - Number(a.dr.remodel_internal)).forEach(d => {
      const gap = Number(d.dr.remodel_internal) - Number(d.remodel_est || 0);
      ins.push({ sev: 'critical', impact: gap, tag: 'ERROR DE DATOS', sec: 'deals',
        tx: `<b>${FF_ESC(ffShort(d.address))}</b>: la remodelación cargada en Draws es <b>${FF_MONEY(d.dr.remodel_internal)}</b> vs estimado <b>${FF_MONEY(d.remodel_est)}</b> — infla el déficit ~${FF_MONEY(gap)}. Casi seguro un error de carga.`,
        action: `Corregir "Pago Remodelación (Interno)" de ${ffShort(d.address)} en Airtable (Desglose Draws)` });
    });
  // 2) Appraisal > ARV (Capitol)
  deals.filter(d => d.appraisal > 0 && d.arv > 0 && d.appraisal > d.arv * 1.05)
    .sort((a, b) => (b.appraisal - b.arv) - (a.appraisal - a.arv)).forEach(d => {
      ins.push({ sev: 'warning', impact: d.appraisal - d.arv, tag: 'APPRAISAL > ARV', sec: 'deals',
        tx: `<b>${FF_ESC(ffShort(d.address))}</b>: el appraisal (<b>${FF_MONEY(d.appraisal)}</b>) supera el ARV (<b>${FF_MONEY(d.arv)}</b>) por ${FF_MONEY(d.appraisal - d.arv)}. Revisar si el ARV está subestimado o el appraisal inflado (afecta refi y equity).`,
        action: `Revisar ARV vs appraisal de ${ffShort(d.address)}` });
    });
  // 3) Déficit acumulado > $20k (excluye los del error de datos)
  deals.filter(d => d.deficit != null && d.deficit > 20000)
    .sort((a, b) => b.deficit - a.deficit).forEach(d => {
      ins.push({ sev: 'critical', impact: d.deficit, tag: 'DÉFICIT > $20K', sec: 'deals',
        tx: `<b>${FF_ESC(ffShort(d.address))}</b> arrastra una caja atrapada de <b>${FF_MONEY(d.deficit)}</b> (se recupera al refinanciar/vender — no es pérdida). Revisar recuperación vía refi o venta.`,
        action: `Plan de recuperación para ${ffShort(d.address)} (refi / venta)` });
    });
  // 4) All-in > 75% ARV (regla de compra)
  deals.filter(d => d.stage !== 'vendida' && d.arv > 0 && d.allInPct > 0.78 && d.allIn > 0)
    .sort((a, b) => b.allInPct - a.allInPct).slice(0, 4).forEach(d => {
      ins.push({ sev: 'warning', impact: d.allIn - d.arv * 0.75, tag: 'ALL-IN > 75% ARV', sec: 'deals',
        tx: `<b>${FF_ESC(ffShort(d.address))}</b>: all-in ${FF_MONEY(d.allIn)} = <b>${Math.round(d.allInPct * 100)}% del ARV</b> (regla ≤ 75%). Margen ajustado.`,
        action: `Revisar costos de ${ffShort(d.address)} (¿remodelación/holding altos?)` });
    });
  // 5) Deals sin desglose de costos (underwriting incompleto)
  const sinDraw = deals.filter(d => !d.dr && d.stage !== 'vendida');
  if (sinDraw.length) ins.push({ sev: 'warning', impact: 5000 * sinDraw.length, tag: 'UNDERWRITING', sec: 'deals',
    tx: `<b>${sinDraw.length} deal(s)</b> sin desglose de costos (Draws): ${sinDraw.slice(0, 3).map(d => FF_ESC(ffShort(d.address))).join(', ')}${sinDraw.length > 3 ? '…' : ''}. Sin all-in ni margen calculable.`,
    action: 'Completar el Desglose Draws de esos deals en Airtable' });
  // 6) Conocidos del negocio (info · se cargan en la memoria del Cerebro en Fase 2)
  // 6) Overhead + intereses REALES (espejo ff_overhead / ff_hml_payments — antes hardcodeados)
  const ohReal = (FF.overhead || []).reduce((t, x) => t + (+x.monto || 0), 0);
  const intReal = (FF.hml || []).reduce((t, x) => t + (+x.pago_hml || 0), 0);
  if (ohReal > 0) ins.push({ sev: 'info', impact: Math.round(ohReal), tag: 'OVERHEAD FF (REAL)', sec: 'finanzas',
    tx: `Overhead Fix&Flip real: <b>${FF_MONEY(ohReal)}</b> (equipo + plataformas, desde Airtable). Restarlo para utilidad NETA.`, action: 'Ver P&L en Finanzas' });
  if (intReal > 0) ins.push({ sev: 'info', impact: Math.round(intReal), tag: 'INTERESES HML (REAL)', sec: 'finanzas',
    tx: `Intereses HML pagados (reales, fechados): <b>${FF_MONEY(intReal)}</b>. Costo de financiamiento vivo del portafolio.`, action: 'Ver Pagos HML en Finanzas' });
  ins.push({ sev: 'warning', impact: 0, tag: 'CONTRATO', sec: 'deals',
    tx: `<b>9909 Childress</b>: contrato/documentación pendiente de firma (dato del negocio). Verificar antes de avanzar.`, action: 'Confirmar firma de contrato de Childress' });
  const rank = { critical: 0, warning: 1, info: 3 };
  ins.sort((a, b) => (rank[a.sev] - rank[b.sev]) || (b.impact - a.impact));
  return ins;
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
const FF_NAV = [
  ['command', '◧', 'Command Center', null],
  ['deals', '▦', 'Deals & Pipeline', () => FF.deals.length],
  ['propiedades', '⌂', 'Propiedades', null],
  ['uwsuite', osIcon('calculator'), 'Underwriting', null],
  ['inversionistas', '◍', 'Inversionistas', () => FF.investors.filter(x => !/flipping\s*rentals/i.test(x.name || '')).length || null],
  ['finanzas', '$', 'Finanzas · QuickBooks', null],
  ['analitica', '▤', 'Analítica & KPIs', null],
  ['cerebro', '◆', 'Cerebro IA', null],
];
function ffRender() {
  const ov = document.getElementById('ff-overlay'); if (!ov) return;
  posApplyTheme(ov);
  const side = ov.querySelector('.side'), main = ov.querySelector('.main');
  if (FF.loadError) { main.innerHTML = `<div class="empty-sec"><div style="font-size:40px">${osIcon('alert')}</div><div style="color:var(--neg);margin-top:10px">${FF_ESC(FF.loadError)}</div><button class="chip" style="margin-top:14px" onclick="ffReload()">Reintentar</button></div>`; return; }
  const comp = ffCompute();
  side.innerHTML = ffSidebar();
  ffDestroyCharts();
  main.innerHTML = ({
    command: () => ffSecCommand(comp), deals: () => ffSecDeals(comp), propiedades: () => ffSecPropiedades(comp),
    underwriting: () => { FF.section='uwsuite'; setTimeout(()=>{ if(window.ffUwLoad) ffUwLoad().then(()=>ffUwRender()); },30); return `<div class="sec-head"><h2>${osIcon('calculator')} Underwriting</h2><p>6 calculadoras calibradas · memoria · casa real o hipotética</p></div><div id="ff-uw-body"><div class="empty-sec">Cargando…</div></div>`; },
    uwsuite: () => { setTimeout(() => { if (window.ffUwLoad) ffUwLoad().then(() => ffUwRender()); }, 30); return `<div class="sec-head"><h2>${osIcon('calculator')} Suite de Underwriting</h2><p>6 calculadoras calibradas con el histórico · memoria · casa real o hipotética</p></div><div id="ff-uw-body"><div class="empty-sec">Cargando calibración…</div></div>`; },
    inversionistas: () => ffSecInversionistas(comp),
    finanzas: () => ffSecFinanzas(comp),
    analitica: () => ffSecAnalitica(comp),
    cerebro: () => ffSecCerebro(comp),
  }[FF.section] || (() => ffSecCommand(comp)))();
  requestAnimationFrame(() => ffMountCharts(comp));
}
window.ffRender = ffRender;
async function ffReload() { await ffLoadAll(); ffRender(); }
window.ffReload = ffReload;
function ffGo(s) { if (s === 'underwriting') s = 'uwsuite'; FF.section = s; ffRender(); document.getElementById('ff-overlay')?.scrollTo(0, 0); }
window.ffGo = ffGo;

function ffSidebar() {
  return `<div class="brand"><div class="logo">FF</div><div><b>Fix &amp; Flip OS</b><span>RENTAL PROFITS</span></div></div>
    <div class="navlbl">Fix &amp; Flip</div>
    <nav class="nav">${FF_NAV.map(([k, i, l, cnt]) => {
      const badge = cnt === 'soon' ? '<span class="soon">pronto</span>' : (typeof cnt === 'function' && cnt() ? `<span class="b">${cnt()}</span>` : '');
      return `<a class="${FF.section === k ? 'on' : ''}" onclick="ffGo('${k}')"><span class="i">${i}</span> ${l}${badge}</a>`;
    }).join('')}</nav>
    <div class="foot">Fuente de verdad · <b>Airtable</b> (sync + paridad)<br>Solo lectura · QuickBooks: Fase 2</div>`;
}
function ffHeader(title, accent, sub) {
  return `<div class="top"><div><h1>${title} · <span>${accent}</span></h1><div class="sub">${sub}</div></div>
    <div class="pills"><div class="pill"><span class="cdot"></span> Airtable en vivo</div>
    <div class="pill ai" onclick="ffGo('cerebro')">◆ <span class="shimmer">Cerebro IA</span></div></div></div>`;
}
// estrategia con la palabra COMPLETA (obs CEO: no "HOLD" recortado) — color por familia
function ffStratBadge(d) {
  const full = d.estrategia || (d.strategy === 'flip' ? 'Fix and flip' : d.strategy === 'hold' ? 'Fix and hold' : '');
  if (!full) return '';
  return `<span class="kstrat ${d.strategy === 'flip' ? 'flip' : 'hold'}" style="text-transform:none;letter-spacing:0">${FF_ESC(full)}</span>`;
}
// badge de contexto: casas que NO son portafolio del CEO (operador / vendida)
function ffPortBadge(d) {
  if (d.esPortafolio !== false) return '';
  return d.motivoExcl === 'operador' ? ' <span class="badge b-warn" title="Prestación de Servicios como Operador — no es patrimonio del CEO">Operador</span>'
    : ' <span class="badge" style="opacity:.7" title="Vendida — entregada al inversionista">Vendida</span>';
}
// all-in con GUARDRAIL: draws vacíos → jamás un all-in fingido en la celda
function ffAllInCell(d) {
  if (d.faltanDraws) return (d.purchase ? FF_MONEY(d.purchase) + ' <span style="color:var(--amber);font-size:10px">+ ' + osIcon('alert') + ' faltan draws</span>' : '<span style="color:var(--amber)">' + osIcon('alert') + ' faltan draws</span>');
  return FF_MONEY(d.allIn) + (d.allInFuente && d.allInFuente.indexOf('rehab') >= 0 ? ' <span style="color:var(--mut2);font-size:9px" title="sin draws en Airtable — se usó compra + rehab real">*rehab</span>' : '');
}

// ─── COMMAND CENTER ───
// ─── COMMAND (rediseño ADN premium 12-jul: veredicto + hero degradé + confianza + Simple/Experto) ───
function ffSecCommand(comp) {
  const { kpi, deals } = comp; const insights = ffInsights(comp);
  const crit = insights.filter(i => i.sev === 'critical').length;
  const rehab = deals.filter(d => d.stage === 'en_rehab').length, venta = deals.filter(d => d.stage === 'en_venta').length;
  const exp = !!FF.exp; // toggle Simple / Experto (default Simple: decisión + números + pipeline)
  // banda de decisión: derivada de los insights que YA calcula el Cerebro (sin lógica nueva)
  const critTop = insights.find(i => i.sev === 'critical');
  const flaggedDQ = kpi.revisar + kpi.sinDatos;
  const verdict = crit > 0
    ? kitVerdict('revisar', crit + (crit === 1 ? ' alerta crítica' : ' alertas críticas') + ' en el portafolio — <a style="cursor:pointer;text-decoration:underline" onclick="ffGo(\'cerebro\')">ver en el Cerebro</a>', (critTop ? critTop.tx + (critTop.action ? ' — ' + FF_ESC(critTop.action) : '') : ''))
    : flaggedDQ > 0
      ? kitVerdict('revisar', flaggedDQ + ' deal(s) con datos a revisar', 'Los números gruesos están bien, pero hay datos que corregir en Airtable antes de confiar en los promedios. ')
      : kitVerdict('go', 'Portafolio sano — sin alertas críticas ', kpi.activos + ' deals activos trabajando · el Cerebro no ve nada urgente hoy.');
  const conf = kitConfidence(flaggedDQ === 0 ? 'alta' : flaggedDQ <= 2 ? 'media' : 'baja', kpi.confiablesN + '/' + kpi.total + ' deals confiables');
  // ═ PATRIMONIO REAL (14-jul, pedido del CEO): valor / equity / deuda / rendimiento del PORTAFOLIO ═
  // Portafolio = ≠operador y ≠vendida (v_ff_portafolio_kpi). Mata "Capital del Holding" en esta vista.
  const pk = FF.portKpi || {};
  const cap = FF.capital || {};
  const deudaQbo = (Number(cap.deuda_hml_qbo) || 0) + (Number(cap.deuda_refi_qbo) || 0);
  const deudaOs = Number(pk.deuda_portafolio) || 0;
  const netoAnual = Number(pk.neto_despues_deuda_anual);
  const opAnual = Number(pk.flujo_operativo_anual);
  const yieldPct = (pk.equity_portafolio > 0 && !isNaN(netoAnual)) ? Math.round(netoAnual / pk.equity_portafolio * 1000) / 10 : null;
  const deudaRows = (FF.port || []).filter(p => p.es_portafolio && p.deuda > 0).sort((a, b) => b.deuda - a.deuda)
    .map(p => `<div class="krow" style="padding:4px 0"><span>${FF_ESC(p.casa)} <span style="opacity:.5">· ${p.deuda_tipo === 'refi' ? 'refi' : 'HML'}</span></span><b>${kitMoney(p.deuda)}</b></div>`).join('');
  const hero = pk.casas_portafolio
    ? kitHero('Valor del portafolio (en papel) ', kitMoney(pk.valor_portafolio),
      'ARV de tus <b>' + pk.casas_portafolio + ' casas</b> · no incluye vendidas ni operador &nbsp; ' + conf)
    : kitHero('Valor del portafolio ', '<span style="font-size:18px;color:var(--mut)">sin datos — v_ff_portafolio</span>', '');
  const kpis = `<div class="grid kpis">
      <div class="card kpi"><div class="lab">Equity del portafolio</div><div class="big ${pk.equity_portafolio > 0 ? 'up' : ''}">${kitMoney(pk.equity_portafolio)}</div><div class="meta">valor − deuda · lo que has construido en patrimonio</div></div>
      <div class="card kpi"><details><summary style="cursor:pointer;list-style:none"><div class="lab">Deuda del portafolio ▾</div><div class="big">${kitMoney(deudaOs)}</div><div class="meta">refi o HML por casa · QBO: ${kitMoney(deudaQbo)} ${deudaQbo && Math.abs(deudaQbo - deudaOs) / deudaQbo > 0.05 ? '<span style="color:var(--amber)">Δ ' + kitMoney(deudaQbo - deudaOs) + '</span>' : '✓'}</div></summary><div style="max-height:220px;overflow:auto;margin-top:8px;font-size:11.5px">${deudaRows || 'sin desglose'}</div></details></div>
      <div class="card kpi"><div class="lab">Rendimiento anual del portafolio</div><div class="big" style="font-size:19px;line-height:1.35">op. <span class="${opAnual >= 0 ? 'up' : 'down'}">${kitMoney(opAnual)}</span><br>c/deuda <span class="${netoAnual >= 0 ? 'up' : 'down'}">${kitMoney(netoAnual)}</span></div><div class="meta">operativo positivo, pero el servicio de deuda HML se lo come — casas aún en HML sin refinanciar${yieldPct != null ? ' · yield ' + yieldPct + '% del equity' : ''}</div></div>
      <div class="card kpi"><div class="lab">Déficit acumulado</div><div class="big ${kpi.deficitAcum > 0 ? 'down' : ''}">${kitMoney(kpi.deficitAcum)}</div><div class="meta">Σ ff_deals.deficit_total [Airtable] · caja atrapada a recuperar en refi/venta · obras en curso no suman</div></div>
    </div>
    <div class="card" style="margin-top:12px;padding:12px 16px;display:flex;gap:22px;flex-wrap:wrap;font-size:13px;align-items:center">
      <span>${osIcon('construction')} <b>${pk.casas_hechas != null ? pk.casas_hechas : '—'}</b> casas hechas <span style="color:var(--mut2);font-size:11px">(sin las pendientes/adquiridas sin cerrar)</span></span>
      <span>${osIcon('handshake')} <b>${pk.entregadas_inversionista != null ? pk.entregadas_inversionista : '—'}</b> entregadas al inversionista <span style="color:var(--mut2);font-size:11px">(vendidas + operador)</span></span>
      <span>${osIcon('briefcase')} <b>${pk.casas_portafolio != null ? pk.casas_portafolio : '—'}</b> en mi portafolio <span style="color:var(--mut2);font-size:11px">(${pk.port_en_renta || 0} en renta · ${pk.port_en_rehab || 0} en rehab · ${pk.port_adquiridas || 0} adquiridas)</span></span>
      <span style="margin-left:auto">${osIcon('brain')} Insights: <b class="${crit ? 'down' : ''}">${insights.length || '—'}</b> <span class="chip" style="cursor:pointer" onclick="ffGo('cerebro')">abrir Cerebro</span></span>
    </div>`;
  const experto = !exp ? '' : `
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Capital por etapa del pipeline</div><div class="k">all-in US$</div></div><div style="position:relative;height:320px;width:100%;overflow:hidden"><canvas id="ff-stage"></canvas></div></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro IA</b><span>INSIGHTS · REGLAS</span></div></div>
        ${insights.slice(0, 3).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}${i.action ? `<div class="iaction">➜ ${FF_ESC(i.action)}</div>` : ''}<div class="tag">${i.tag}</div></div></div>`).join('')}
        <div class="ask"><input id="ff-ask" placeholder="Preguntá al Cerebro de Fix &amp; Flip…" onkeydown="if(event.key==='Enter')ffAsk()"><button onclick="ffAsk()">Enviar</button></div>
        <div style="margin-top:11px"><span class="chip" onclick="ffGo('cerebro')">Ver todos los insights</span></div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Margen / déficit por deal</div><div class="k">verde = margen · rojo = déficit</div></div><div style="position:relative;height:${Math.min(14, comp.deals.filter(d => d.arv > 0).length) * 28 + 90}px;width:100%;overflow:hidden"><canvas id="ff-margin"></canvas></div></div>
      <div class="card"><div class="chart-h"><div class="t">Deals por etapa</div><div class="k">${kpi.total} total</div></div><div style="position:relative;height:320px;width:100%;overflow:hidden"><canvas id="ff-donut"></canvas></div></div>
    </div>`;
  return `${ffHeader('Command Center', 'Fix &amp; Flip', 'Todo el negocio de Fix &amp; Flip en una vista — pipeline, capital, márgenes, inversionistas y Cerebro.')}
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">${kitToggle('Simple', 'Experto', exp, "FF.exp=!FF.exp;ffRender()")}</div>
    ${verdict}
    ${ffDQBar(comp)}
    ${hero}
    ${kpis}
    ${experto}
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="chart-h"><div class="t">Pipeline resumido</div><div class="k">${kpi.activos} activos · abrí Deals para el Kanban</div></div>
      <div class="overx">${ffDealTable(deals.filter(d => d.stage !== 'vendida').sort((a, b) => (b.deficit || 0) - (a.deficit || 0)).slice(0, 10))}</div>
    </div></div>`;
}
function ffDealTable(deals) {
  const badge = d => d.faltanDraws ? '<span class="badge b-warn" title="Total Draws desembolsados en 0 — cargarlo en Airtable">' + osIcon('alert') + ' faltan draws</span>'
    : d.deficit != null && d.deficit > 20000 ? '<span class="badge b-red">Déficit</span>' : d.allInPct > 0.78 ? '<span class="badge b-warn">All-in alto</span>' : d.margin > 0 ? '<span class="badge b-ok">Sano</span>' : '<span class="badge b-warn">Vigilar</span>';
  const defCell = d => d.faltanDraws ? '<span style="color:var(--amber);font-size:11px">' + osIcon('alert') + ' faltan datos de draws</span>'
    : (d.deficit != null ? `<span class="${d.deficit > 0 ? 'down' : 'up'}">${FF_MONEY(d.deficit)}</span>` : '—');
  const margCell = d => d.faltanDraws || d.allIn == null ? '—' : `<span class="${d.margin >= 0 ? 'up' : 'down'}">${FF_MONEY(d.margin)}</span>`;
  return `<table class="ptable"><thead><tr><th>Dirección</th><th>Etapa</th><th>Estrategia</th><th>All-in <span style="font-weight:400;color:var(--mut2)">(compra+draws)</span></th><th>ARV</th><th>Margen</th><th>Déficit</th><th></th></tr></thead><tbody>
    ${deals.map(d => `<tr${d.esPortafolio === false ? ' style="opacity:.62"' : ''}><td>${FF_ESC(ffShort(d.address))}${ffPortBadge(d)}</td><td>${FF_STAGE_LBL[d.stage] || d.stage}</td><td>${ffStratBadge(d)}</td><td>${ffAllInCell(d)}</td><td>${FF_MONEY(d.arv)}</td><td>${margCell(d)}</td><td>${defCell(d)}</td><td>${badge(d)}</td></tr>`).join('')}
  </tbody></table>`;
}

// ─── DEALS & PIPELINE (Kanban) ───
function ffSecDeals(comp) {
  const { deals, kpi } = comp;
  // Item 02: mostrar SOLO las etapas con casas. Una etapa vacía (ej. Lead / Bajo contrato)
  // no ocupa espacio; reaparece sola en cuanto una casa entra en ese stage.
  const cols = FF_PIPELINE.map(([k, lbl, stages]) => ({ k, lbl, items: deals.filter(d => stages.includes(d.stage)) }))
    .filter(c => c.items.length > 0);
  const sinStage = deals.filter(d => !FF_PIPELINE.some(([, , st]) => st.includes(d.stage)));
  if (sinStage.length) cols.push({ k: 'otros', lbl: 'Sin etapa', items: sinStage });
  const nAllin = deals.filter(d => d.semAllin).length, nHml = deals.filter(d => d.semHml).length, nBud = deals.filter(d => d.semBudget).length;
  // banda de decisión: derivada del déficit que YA calcula ffCompute (sin lógica nueva)
  const enRojo = deals.filter(d => d.deficit != null && d.deficit > 20000).sort((a, b) => b.deficit - a.deficit);
  const verdict = enRojo.length
    ? kitVerdict('revisar', enRojo.length + (enRojo.length === 1 ? ' deal con caja atrapada fuerte' : ' deals con caja atrapada fuerte') + ' (más de $20k)', enRojo.map(d => FF_ESC(ffShort(d.address)) + ' (' + kitMoney(d.deficit) + ')').join(' · ') + ' — plan de recuperación vía refi o venta')
    : kitVerdict('go', 'Pipeline sano — sin déficits fuertes', kpi.activos + ' deals activos trabajando · ninguno arrastra más de $20k de déficit acumulado.');
  return `${ffHeader('Pipeline de casas', 'Blueprint FF', `${kpi.total} deals · semáforos: all-in ${nAllin} · HML ${nHml} · presupuesto ${nBud} (umbrales de ff_uw_config)`)}
    ${verdict}
    ${ffDQBar(comp)}
    <div class="kan">${cols.length ? cols.map(c => `<div class="kcol">
      <div class="kcol-h"><span>${c.lbl}</span><span class="cnt">${c.items.length}</span></div>
      ${c.items.sort((a, b) => (b.deficit || 0) - (a.deficit || 0)).map(d => ffKanCard(d)).join('') || kitEmpty(osIcon('ghost'), 'sin deals acá')}
    </div>`).join('') : kitEmpty(osIcon('ghost'), 'sin deals en el pipeline')}</div>`;
}
function ffKanCard(d) {
  const capturePct = d.arv ? Math.min(100, Math.round(d.allInPct * 100)) : 0;
  return `<div class="kcard"${d.dq.revisar ? ' style="border-color:rgba(255,107,107,.4)"' : ''}>
    <div style="display:flex;justify-content:space-between;align-items:start;gap:6px"><div class="addr">${FF_ESC(ffShort(d.address))}</div>${ffStratBadge(d)}</div>
    ${d.dq.flags.length ? `<div style="margin:5px 0 2px">${ffDQBadge(d.dq)}</div>` : ''}
    ${(d.semAllin || d.semHml || d.semBudget) ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin:5px 0 2px">${d.semAllin ? `<span class="ff-dq ff-dq-rev" title="all-in supera el máximo configurado del ARV">${kitStatusDot('bad')} all-in ${Math.round(d.allInPct * 100)}%</span>` : ''}${d.semHml ? `<span class="ff-dq ff-dq-rev" title="vencimiento del préstamo HML">${osIcon('clock')} HML ${d.hmlDueDays < 0 ? 'VENCIDO ' + Math.abs(d.hmlDueDays) + 'd' : 'vence ' + d.hmlDueDays + 'd'}</span>` : ''}${d.semBudget ? `<span class="ff-dq ff-dq-pre" title="desvío del presupuesto de remodelación (real vs estimado)">${osIcon('trending-up')} presup +${d.budgetDevPct}%</span>` : ''}</div>` : ''}
    <div class="meta">${FF_ESC(d.city || '')} · ${d.sqft ? d.sqft + ' sqft' : 's/d'}${d.faltanDraws ? ' · <span style="color:var(--amber)">' + osIcon('alert') + ' faltan draws</span>' : ''}${d.esPortafolio === false ? ' · <span style="color:var(--mut2)">' + (d.motivoExcl === 'operador' ? 'operador' : 'vendida') + '</span>' : ''}</div>
    <div class="krow"><span>All-in</span><b>${ffAllInCell(d)}</b></div>
    <div class="krow"><span>ARV</span><b>${FF_MONEY(d.arv)}</b></div>
    <div class="krow"><span>${d.faltanDraws ? 'Déficit' : (d.deficit != null && d.deficit > 0) ? 'Déficit' : 'Margen'}</span><b class="${d.faltanDraws ? '' : (d.deficit != null && d.deficit > 0) ? 'down' : (d.margin >= 0 ? 'up' : 'down')}"${d.faltanDraws ? ' style="color:var(--amber);font-size:10.5px"' : ''}>${d.faltanDraws ? 'faltan datos de draws' : (d.deficit != null && d.deficit > 0) ? FF_MONEY(d.deficit) : FF_MONEY(d.margin)}</b></div>
    <div class="kbar"><i style="width:${capturePct}%;background:${d.allInPct > 0.75 ? 'linear-gradient(90deg,var(--amber),var(--neg))' : 'linear-gradient(90deg,var(--a1),var(--a2))'}"></i></div>
    <div style="font-size:9px;color:var(--mut2);margin-top:4px">all-in ${Math.round(d.allInPct * 100)}% del ARV${d.invLabel ? ' · ' + FF_ESC(d.invLabel) : ''}</div>
    <div class="kficha" onclick="event.stopPropagation();osOpenFicha('${window.osSlug ? osSlug(d.address) : ''}')">${osIcon('house')} Ver ficha de casa →</div>
  </div>`;
}

// ─── PROPIEDADES ───
function ffSecPropiedades(comp) {
  const nExcl = comp.deals.filter(d => d.esPortafolio === false).length;
  const nFalta = comp.deals.filter(d => d.faltanDraws).length;
  return `${ffHeader('Propiedades', 'Fix &amp; Flip', `${comp.deals.length} propiedades · ${comp.deals.length - nExcl} en tu portafolio + ${nExcl} etiquetadas (operador/vendida, NO cuentan en los totales)${nFalta ? ' · ' + nFalta + ' sin draws cargados en Airtable' : ''}`)}
    <div class="grid"><div class="card">${ffDealTable([...comp.deals].sort((a, b) => (b.deficit || 0) - (a.deficit || 0)))}</div></div>`;
}
// ─── INVERSIONISTAS · ranking por capital desplegado (rediseño 14-jul, obs CEO) ───
// Solo CO-INVERSIONISTAS con participación viva (0 < ownership nuestro < 100%) — v_inversionistas (capa O1).
// ownership 100% = les compramos su parte (fuera) · ownership 0 = operador, va en su propio módulo (fuera).
// Vendidas con sociedad = "salida realizada": se listan en el detalle pero NO suman al capital desplegado.
// Se quitaron (obs CEO 14-jul): generar-propuesta-al-Cerebro (vuelve como modelo real, ver BACKLOG),
// capital del holding, VIP/rangos, consocios, contratos sin firmar, cap table y los 4 modelos.
function ffInvCasaRow(c) {
  const et = c.salida
    ? '<span class="badge b-warn" style="font-size:10px">Vendida · salida realizada</span>'
    : '<span class="badge" style="font-size:10px">' + FF_ESC(FF_STAGE_LBL[c.stage] || c.stage || '—') + '</span>';
  let rent;
  if (c.salida) rent = c.utilidad_entregada != null
    ? 'utilidad entregada <b>' + kitMoney(c.utilidad_entregada) + '</b>' + (c.rentab_pct != null ? ' <span style="color:var(--mut)">(' + c.rentab_pct + '% de su capital)</span>' : '')
    : '<span style="color:var(--mut2)">utilidad pendiente de dato</span>';
  else if (c.rentab_pct != null) rent = '<b style="color:var(--pos)">' + kitMoney(c.flujo_anual_inv) + '/año</b> <span style="color:var(--mut)">· ' + c.rentab_pct + '%</span>';
  else rent = '<span style="color:var(--mut2)">pendiente de dato</span>';
  return '<tr' + (c.salida ? ' style="opacity:.72"' : '') + '><td>' + FF_ESC(c.address || '—') + '</td><td>' + et + '</td>'
    + '<td style="text-align:right">' + kitMoney(c.capital) + '</td>'
    + '<td style="text-align:right">' + (c.participacion_pct != null ? c.participacion_pct + '%' : '—') + '</td>'
    + '<td style="text-align:right;font-size:11.5px">' + rent + '</td></tr>';
}
function ffSecInversionistas() {
  const R = FF.invRank || [];
  const head = ffHeader('Inversionistas', 'Co-inversión activa', 'participación viva (ownership nuestro < 100%) · de mayor a menor por capital desplegado y nº de casas · todo de Airtable, solo lectura');
  if (!R.length) return head + kitEmpty(osIcon('briefcase'), 'Sin datos de v_inversionistas', 'Corré el sync de Fix & Flip o revisá el acceso al área fix-flip');
  const totCap = R.reduce((s, r) => s + (+r.capital_desplegado || 0), 0);
  const totCasas = R.reduce((s, r) => s + (+r.casas_vivas || 0), 0);
  const totSalidas = R.reduce((s, r) => s + (+r.salidas || 0), 0);
  const hero = kitHero('Capital de co-inversión desplegado ', kitMoney(totCap),
    R.length + ' inversionistas activos · ' + totCasas + ' casas en sociedad' + (totSalidas ? ' · ' + totSalidas + ' salida' + (totSalidas > 1 ? 's' : '') + ' realizada' + (totSalidas > 1 ? 's' : '') : '')
    + ' · capital = "Capital aportado" [Airtable] · clic en un inversionista para su detalle');
  const rows = R.map((r, ix) => {
    const casas = Array.isArray(r.casas) ? r.casas : [];
    const nSin = +r.casas_sin_dato || 0;
    const rentBadge = r.rentab_pct != null
      ? '<span class="badge b-ok" style="font-size:10px">&asymp; ' + r.rentab_pct + '% anual</span>' + (nSin ? ' <span style="font-size:10px;color:var(--mut2)">' + nSin + ' casa' + (nSin > 1 ? 's' : '') + ' sin dato</span>' : '')
      : '<span style="font-size:10px;color:var(--mut2)">rentabilidad pendiente de dato</span>';
    return '<details class="card" style="margin-bottom:10px;padding:0">'
      + '<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px">'
      + '<span style="flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--glass);border:1px solid var(--glassb);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--ink)">' + (ix + 1) + '</span>'
      + '<span style="flex:1 1 220px;min-width:0"><b style="color:var(--ink);font-size:13.5px">' + FF_ESC(r.inversionista || '—') + '</b><br><span style="font-size:11px;color:var(--mut)">' + r.casas_vivas + ' casa' + (+r.casas_vivas > 1 ? 's' : '') + ' con participación viva' + (+r.salidas ? ' + ' + r.salidas + ' salida realizada' : '') + '</span></span>'
      + '<span style="flex:0 0 auto;text-align:right"><b style="font-size:15px;color:var(--ink)">' + kitMoney(r.capital_desplegado) + '</b><br>' + rentBadge + '</span>'
      + '</summary>'
      + '<div class="overx" style="padding:0 18px 14px"><table class="ptable"><thead><tr><th>Casa</th><th>Etapa</th><th style="text-align:right">Capital aportado</th><th style="text-align:right">Su participación</th><th style="text-align:right">Rentabilidad de su inversión</th></tr></thead><tbody>'
      + casas.map(ffInvCasaRow).join('')
      + '</tbody></table></div></details>';
  }).join('');
  return head + hero
    + '<div style="font-size:11px;color:var(--mut2);margin:2px 4px 12px;line-height:1.5">Fuera de esta lista: inversionistas a los que ya les compramos su parte (ownership 100%) y casas de "Prestación de Servicios como Operador" (van en su propio módulo). Rentabilidad = su participación &times; flujo anual de la casa &divide; su capital; en vendidas, utilidad final entregada &divide; capital. Donde falta renta o gastos en Airtable dice "pendiente" — jamás un cero falso.</div>'
    + rows;
}

// ─── FINANZAS · QuickBooks + Analítica (cockpit) ───
function ffGastosPorTipo() {
  const d = FF.draws; const g = {
    'Intereses': d.reduce((s, x) => s + Number(x.interest_hml || 0) + Number(x.interest_until_rent || 0), 0),
    'Remodelación': d.reduce((s, x) => s + Number(x.remodel_complete || 0), 0),
    'Servicios': d.reduce((s, x) => s + Number(x.services_hml || 0), 0),
    'Muebles': d.reduce((s, x) => s + Number(x.furniture || 0), 0),
    'Otros': d.reduce((s, x) => s + Number(x.other_costs || 0), 0),
  };
  const total = Object.values(g).reduce((s, v) => s + v, 0);
  return { g, total, intPct: total ? Math.round(g['Intereses'] / total * 100) : 0 };
}
function ffSecFinanzas(comp) {
  const gt = ffGastosPorTipo();
  const ohReal = (FF.overhead || []).reduce((t, x) => t + (+x.monto || 0), 0);
  const intReal = (FF.hml || []).reduce((t, x) => t + (+x.pago_hml || 0), 0);
  // B1 (auditoría 13-jul): Σ(draws − gastos op) NO es EBITDA ni "rentabilidad" — es DÉFICIT DE
  // CAPITAL EN HOLD (cash inyectado a recuperar vía refi/venta). La ganancia real = P&L de QBO.
  const deficitHold = (FF.draws || []).reduce((t, d) => t + (+d.net_total || 0), 0);
  const qbVal = (rep, lbl) => { const r = (FF.qb || []).find(x => x.report === rep && x.label === lbl); return r ? +r.value : null; };
  const netYtd = qbVal('pnl_ytd', 'Net Income');
  const netAll = qbVal('pnl_all', 'Net Income');
  const qbAsOf = (FF.qb || []).reduce((m, x) => (!m || x.fetched_at > m) ? x.fetched_at : m, null);
  const qbAsOfLbl = qbAsOf ? new Date(qbAsOf).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : null;
  const invertido = comp.deals.reduce((s, d) => s + d.allIn, 0);
  // equity y déficit acumulado: SOLO deals confiables (el error $189k los distorsiona) → comp.kpi
  const equity = comp.kpi.equity;
  const deficit = comp.kpi.deficitAcum;
  // Rentabilidad por casa: solo deals confiables (los flagged no compiten en mejores/peores por margen)
  const best = [...comp.deals].filter(d => d.arv > 0 && d.dq.confiable).sort((a, b) => b.margin - a.margin).slice(0, 6);
  const worst = [...comp.deals].filter(d => d.arv > 0 && d.dq.confiable).sort((a, b) => a.margin - b.margin).slice(0, 6);
  const excluidos = comp.kpi.total - comp.kpi.confiablesN; // flaggeados por calidad de datos
  const conf = kitConfidence(excluidos === 0 ? 'alta' : 'media', excluidos === 0 ? comp.kpi.confiablesN + '/' + comp.kpi.total + ' deals confiables' : excluidos + ' deal(s) excluidos por calidad de datos');
  const hero = kitHero('Equity potencial del portafolio ', kitMoney(equity),
    'ARV − all-in de los deals confiables · invertido <b>' + kitMoney(invertido) + '</b> · déficit acumulado <b style="color:var(--neg)">' + kitMoney(deficit) + '</b> &nbsp; ' + conf);
  const rankTable = (rows, cls) => rows.length
    ? `<div class="overx"><table class="ptable"><thead><tr><th>Casa</th><th>All-in</th><th>ARV</th><th>Margen</th></tr></thead><tbody>
        ${rows.map(d => `<tr><td>${FF_ESC(ffShort(d.address))} ${d.dq.preliminar ? ffDQBadge(d.dq) : ''}</td><td>${kitMoney(d.allIn)}</td><td>${kitMoney(d.arv)}</td><td class="${cls}">${kitMoney(d.margin)}</td></tr>`).join('')}</tbody></table></div>`
    : kitEmpty(osIcon('inbox'), 'Sin deals con datos confiables para rankear');
  // N4 (auditoría 13-jul): el costo #1 del negocio AL TOPE con semáforo — interés/ingreso e ICR
  const anioIni = new Date().getFullYear() + '-01-01';
  const intYtd = (FF.hml || []).filter(x => x.fecha && x.fecha >= anioIni).reduce((t, x) => t + (+x.pago_hml || 0), 0);
  const ingYtd = qbVal('pnl_ytd', 'Total Income');
  const gasYtd = qbVal('pnl_ytd', 'Total Expenses');
  const intPctIng = ingYtd > 0 ? Math.round(100 * intYtd / ingYtd) : null;
  const icr = intYtd > 0 && ingYtd != null && gasYtd != null ? Math.round(100 * (ingYtd - gasYtd) / intYtd) / 100 : null;
  const topeN4 = `<div class="grid kpis" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:12px">
      ${typeof kitKpi === 'function' ? kitKpi({ label: 'Interés HML / Ingreso', term: 'hml', valor: intPctIng != null ? intPctIng + '%' : '—', sub: kitMoney(intYtd) + ' de interés YTD sobre ' + kitMoney(ingYtd) + ' de ingreso [QBO]', estado: intPctIng != null && intPctIng > 40 ? 'neg' : 'warn', fuente: 'OS↔QBO', next: { porque: 'El interés se come ' + intPctIng + '% del ingreso — es el costo #1 del negocio.', accion: 'acelerar refis de las casas rentadas (cada refi corta el HML caro)', quien: 'Juan' } }) : ''}
      ${typeof kitKpi === 'function' ? kitKpi({ label: 'ICR — cobertura del interés', term: 'icr', valor: icr != null ? icr + '×' : '—', sub: '(ingreso − gastos) ÷ interés YTD · <1× = la operación no cubre su propio interés', estado: icr != null && icr < 1 ? 'neg' : 'ok', fuente: 'QBO', next: { porque: 'La operación cubre solo ' + (icr != null ? icr : '—') + '× de su interés: el hold quema caja.', accion: 'priorizar rentar/refinanciar las casas con HML vencido', quien: 'Juan' } }) : ''}
    </div>`;
  // N3: waterfall ÚNICO que reconcilia las 3 "ganancias" (Airtable obras → interés → overhead → QBO)
  const utilObras = FF.obrasKpi ? +FF.obrasKpi.utilidad_realizada : null;
  const netQbYtd = qbVal('pnl_ytd', 'Net Income');
  const esperado = utilObras != null ? utilObras - intYtd - ohReal : null;
  const residuo = esperado != null && netQbYtd != null ? netQbYtd - esperado : null;
  const waterfall = `<div class="card" style="margin-top:12px"><div class="chart-h"><div class="t">Puente de la ganancia — UNA sola cadena</div><div class="k">reconcilia Airtable → QBO (antes diferían 30×)</div></div>
      ${typeof kitRow === 'function' ? kitRow('Utilidad de obras finalizadas', null, { txt: kitMoney(utilObras) + ' <span class="badge b-warn" style="font-size:8px">Airtable</span>' })
        + kitRow('− Interés HML pagado YTD', null, { txt: '−' + kitMoney(intYtd) + ' <span class="badge b-warn" style="font-size:8px">Airtable</span>', neg: true })
        + kitRow('− Overhead F&F (equipo + plataformas)', null, { txt: '−' + kitMoney(ohReal) + ' <span class="badge b-warn" style="font-size:8px">Airtable</span>', neg: true })
        + kitRow('= Esperado por la cadena', null, { txt: kitMoney(esperado), big: true })
        + kitRow('Net Income QBO (YTD)', null, { txt: kitMoney(netQbYtd) + ' <span class="badge b-warn" style="font-size:8px">QBO</span>', big: true })
        + kitRow('Residuo (alcances/periodos distintos — revisar con contadora)', null, { txt: kitMoney(residuo), last: true, color: residuo != null && Math.abs(residuo) > 50000 ? 'var(--neg)' : 'var(--mut)' }) : ''}
    </div>`;
  // N1: P&L por casa con el interés VISIBLE (v_pnl_casa) — peores primero
  const pnlRows = (FF.pnlCasa || []).filter(p => +p.interes_hml_real > 0 || +p.ingresos_renta > 0)
    .sort((a, b) => (+a.utilidad_neta_post_interes) - (+b.utilidad_neta_post_interes)).slice(0, 10);
  const pnlCasaCard = pnlRows.length ? `<div class="card" style="margin-top:12px"><div class="chart-h"><div class="t">P&L por casa — con el interés HML visible</div><div class="k">v_pnl_casa · neta post-interés (el ROI real)</div></div>
      <div class="overx"><table class="ptable"><thead><tr><th>Casa</th><th>Rentas</th><th>Gastos</th><th>Interés HML</th><th>Neta post-interés</th></tr></thead><tbody>
      ${pnlRows.map(p => `<tr><td>${FF_ESC(p.casa)}</td><td>${kitMoney(+p.ingresos_renta, { ceroEs: 'sin renta aún' })}</td><td>${kitMoney(+p.gastos_operativos, { ceroEs: '—' })}</td><td class="warn">${kitMoney(+p.interes_hml_real, { ceroEs: '—' })}</td><td class="${+p.utilidad_neta_post_interes >= 0 ? 'up' : 'down'}">${kitMoney(+p.utilidad_neta_post_interes)}</td></tr>`).join('')}</tbody></table></div>
      <div class="meta" style="margin-top:8px">El interés que antes era invisible ahora está en la línea de cada casa. Prorrateo teórico (días×tasa) disponible en la vista para casas sin pagos fechados.</div></div>` : '';
  // N2: EQUITY INCORPORADO del holding — la señal BUENA, casa por casa (v_property_360; solo deals
  // con obra real: rehab_real presente; el pipeline sin rehab inflaría con ARV−compra)
  const eqCasas = (FF.p360 || []).filter(p => p.etapa !== 'vendida' && p.equity != null && p.rehab_real != null)
    .sort((a, b) => (+b.equity) - (+a.equity));
  const eqTotal = eqCasas.reduce((s, p) => s + (+p.equity), 0);
  const eqMax = eqCasas.length ? Math.max(...eqCasas.map(p => Math.abs(+p.equity))) : 1;
  const eqBar = p => {
    const v = +p.equity, w = Math.max(3, Math.round(100 * Math.abs(v) / eqMax));
    const drillHtml = typeof kitRow === 'function' ? kitRow('ARV', +p.arv) + kitRow('− Compra', null, { txt: '−' + kitMoney(+p.compra), neg: true }) + kitRow('− Rehab real', null, { txt: '−' + kitMoney(+p.rehab_real), neg: true }) + kitRow('= Equity incorporado', +p.equity, { big: true, last: true, color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }) : '';
    const val = typeof kitDrill === 'function' ? kitDrill('<b style="color:' + (v >= 0 ? 'var(--pos)' : 'var(--neg)') + '">' + kitMoney(v) + '</b>', p.casa + ' — equity', drillHtml, 'Airtable') : kitMoney(v);
    return `<div style="display:flex;align-items:center;gap:10px;padding:4px 0"><span style="width:150px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${FF_ESC(p.casa)}</span>
      <div style="flex:1;height:9px;border-radius:6px;background:var(--glass)"><div style="height:100%;width:${w}%;border-radius:6px;background:${v >= 0 ? 'var(--pos)' : 'var(--neg)'}"></div></div>
      <span style="width:90px;text-align:right;font-size:12.5px">${val}</span></div>`;
  };
  const equityPanel = eqCasas.length ? `<div class="card" style="margin-top:12px"><div class="chart-h"><div class="t">${osIcon('gem')} Equity incorporado del holding</div><div class="k">Σ(ARV − all-in) por casa con obra · el verdadero pitch al inversor</div></div>
      <div style="font-size:30px;font-weight:800;color:var(--pos);margin:2px 0 10px">${kitMoney(eqTotal)}</div>
      ${eqCasas.slice(0, 12).map(eqBar).join('')}
      ${eqCasas.length > 12 ? `<div class="meta" style="margin-top:6px">+ ${eqCasas.length - 12} casas más</div>` : ''}</div>` : '';
  return `${ffHeader('Finanzas', 'QuickBooks + Cockpit', `Invertido ${kitMoney(invertido)} · equity ${kitMoney(equity)} · déficit ${kitMoney(deficit)} · interés ${gt.intPct}% del gasto`)}
    ${ffDQBar(comp)}
    ${topeN4}
    ${hero}
    ${equityPanel}
    ${waterfall}
    ${pnlCasaCard}
    <div class="grid kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="card kpi"><div class="lab">All-in del portafolio</div><div class="big glow">${kitMoney(invertido)}</div><div class="meta">compra + remod (COSTO — no es el capital aportado)</div></div>
      <div class="card kpi"><div class="lab">Equity potencial</div><div class="big up">${kitMoney(equity)}</div><div class="meta">ARV − all-in (positivo)</div></div>
      <div class="card kpi"><div class="lab">Déficit acumulado</div><div class="big down">${kitMoney(deficit)}</div><div class="meta">casas en rojo · deals confiables (error de datos excluido)</div></div>
      <div class="card kpi"><div class="lab">Intereses / gasto</div><div class="big warn">${kitPct(gt.intPct)}</div><div class="meta">${kitMoney(gt.g['Intereses'], { ceroEs: 'sin datos' })} de ${kitMoney(gt.total, { ceroEs: 'sin datos' })}</div></div>
    </div>
    <div class="grid kpis" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:12px">
      <div class="card kpi"><div class="lab">${typeof kitTerm === 'function' ? kitTerm('deficit', 'Déficit de capital en hold') : 'Déficit de capital en hold'}</div><div class="big ${deficitHold>=0?'up':'warn'}">${kitMoney(deficitHold, { ceroEs: 'sin datos' })}</div><div class="meta">a recuperar vía refi/venta · Σ neto draws [Airtable] — NO es pérdida ni EBITDA</div></div>
      <div class="card kpi"><div class="lab">Overhead FF real</div><div class="big down">${kitMoney(ohReal, { ceroEs: 'sin datos' })}</div><div class="meta">equipo ${kitMoney((FF.overhead||[]).filter(x=>x.source==='equipo').reduce((t,x)=>t+(+x.monto||0),0), { ceroEs: 'sin datos' })} · plataformas ${kitMoney((FF.overhead||[]).filter(x=>x.source==='plataformas').reduce((t,x)=>t+(+x.monto||0),0), { ceroEs: 'sin datos' })}</div></div>
      <div class="card kpi"><div class="lab">Intereses HML reales</div><div class="big warn">${kitMoney(intReal, { ceroEs: 'sin datos' })}</div><div class="meta">${(FF.hml||[]).length} pagos fechados</div></div>
      <div class="card kpi"><div class="lab">Ganancia real (Net Income)</div><div class="big ${netYtd != null ? (netYtd>=0?'up glow':'down') : ''}">${netYtd != null ? kitMoney(netYtd) : '<span style="font-size:16px;color:var(--mut)">sin libros QBO</span>'}</div><div class="meta">P&L QuickBooks YTD${qbAsOfLbl ? ' · al ' + qbAsOfLbl : ''}${netAll != null ? ' · histórico ' + kitMoney(netAll) : ''} — la ÚNICA definición de ganancia</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo</div><div class="k">del desglose de draws</div></div><div style="position:relative;height:300px;width:100%;overflow:hidden"><canvas id="ff-fin-donut"></canvas></div></div>
      <div class="card"><div class="chart-h"><div class="t">Conciliación Airtable ↔ QuickBooks</div><div class="k">SOLO LECTURA &nbsp; ${conf}</div></div>
        <table class="ptable"><thead><tr><th>Concepto</th><th>Estado</th><th>Impacto</th></tr></thead><tbody>
        <tr><td>Overhead FF (equipo + plataformas) — espejo Airtable</td><td><span class="badge b-ok">Real</span></td><td class="down">${kitMoney(ohReal, { ceroEs: 'sin datos' })}</td></tr>
        <tr><td>Intereses HML pagados (Pagos HML, fechados)</td><td><span class="badge b-ok">Real</span></td><td class="down">${kitMoney(intReal, { ceroEs: 'sin datos' })}</td></tr>
        <tr><td>Obligación a inversionistas (pasivo)</td><td><span class="badge b-warn">Cap table</span></td><td>—</td></tr>
        <tr><td>Remodelación (draws)</td><td><span class="badge b-ok">Conciliado</span></td><td>${kitMoney(gt.g['Remodelación'], { ceroEs: 'sin datos' })}</td></tr>
        </tbody></table>
        <div class="meta" style="margin-top:10px">P&L / balance / cashflow completos de QuickBooks llegan con el conector QB (Fase 2). Hoy: overhead, intereses HML y gastos son REALES desde Airtable (espejo sincronizado con paridad).</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Mejores por margen</div><div class="k">rentabilidad por casa</div></div>
        ${rankTable(best, 'up')}</div>
      <div class="card"><div class="chart-h"><div class="t">Peores por margen</div><div class="k">a corregir/recuperar</div></div>
        ${rankTable(worst, 'down')}</div>
    </div>`;
}
function ffSoon(title, desc) {
  return `${ffHeader(title.split('·')[0].trim(), 'Fase 2', desc)}
    <div class="grid"><div class="card empty-sec">
      <div class="orb" style="margin:0 auto 14px"></div>
      <div style="color:var(--ink);font-size:15px;font-weight:600">${title} <span class="soon">Fase 2</span></div>
      <div style="margin-top:8px;max-width:520px;margin-inline:auto">${desc}</div>
    </div></div>`;
}
// ─── CEREBRO IA ───
function ffSecCerebro(comp) {
  const insights = ffInsights(comp);
  const drain = insights.filter(i => i.sev === 'critical').reduce((s, i) => s + i.impact, 0);
  return `${ffHeader('Cerebro IA', 'Insights', 'Motor de reglas sobre tus deals reales — rankeado por impacto en dólares.')}
    <div class="grid kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="card kpi"><div class="lab">Insights activos</div><div class="big">${insights.length}</div><div class="meta">${insights.filter(i => i.sev === 'critical').length} críticos</div></div>
      <div class="card kpi"><div class="lab">Impacto crítico detectado</div><div class="big down">${FF_MONEY(drain)}</div><div class="meta">errores + déficits + gaps</div></div>
      <div class="card kpi"><div class="lab">Déficit acumulado</div><div class="big down">${FF_MONEY(comp.kpi.deficitAcum)}</div><div class="meta">suma de deals en rojo</div></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card brain">
      <div class="bh"><div class="orb"></div><div><b>Chateá con el Cerebro</b><span>PREGUNTÁ SOBRE TUS DEALS · SOLO LECTURA</span></div></div>
      <div id="ff-chat" class="cc-chat" style="margin-top:6px"></div>
      <div class="ask"><input id="ff-ask" placeholder="Preguntá al Cerebro de Fix &amp; Flip…" onkeydown="if(event.key==='Enter')ffAsk()"><button onclick="ffAsk()">Enviar</button></div>
      <div style="margin-top:11px;display:flex;gap:7px;flex-wrap:wrap"><span class="chip" onclick="ffAsk('¿Qué deals tienen error de datos o déficit alto?')">¿Errores / déficit?</span><span class="chip" onclick="ffAsk('¿Cuáles deals violan la regla de all-in ≤ 75% del ARV?')">¿All-in > 75%?</span></div>
    </div></div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="bh"><div class="orb" style="width:26px;height:26px"></div><div><b>Análisis en vivo</b><span>${insights.length} INSIGHTS · RANKEADOS POR $</span></div></div>
      ${insights.map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}${i.action ? `<div class="iaction">➜ ${FF_ESC(i.action)}</div>` : ''}<div class="tag">${i.tag}${i.impact ? ` · ${FF_MONEY(i.impact)}` : ''}</div></div></div>`).join('')}
    </div></div>`;
}
// Chat (reusa /api/brain-chat con snapshot de Fix & Flip). Memoria FF se siembra en Fase 2.
FF.chat = [];
function ffSnapshot(comp) {
  return {
    negocio: 'Fix & Flip (Rental Profits)', mes: new Date().toISOString().slice(0, 7),
    portafolio: { deals: comp.kpi.total, activos: comp.kpi.activos, flips: comp.kpi.flips, holds: comp.kpi.holds, capital_desplegado: Math.round(comp.kpi.capital), arv_total: Math.round(comp.kpi.arvTotal), equity_potencial: Math.round(comp.kpi.equity), deficit_acumulado: Math.round(comp.kpi.deficitAcum) },
    reglas: ['all-in ≤ 75% del ARV', 'déficit OK si flujo+ y acumulado < $20k', 'inversionista 15–18%, split 50/50', 'refi no supera el pago actual'],
    deals: comp.deals.map(d => ({ dir: ffShort(d.address), etapa: FF_STAGE_LBL[d.stage], estrategia: d.strategy, compra: d.purchase, remodelacion: Math.round(d.remComplete), all_in: Math.round(d.allIn), arv: d.arv, appraisal: d.appraisal, margen: Math.round(d.margin), all_in_pct_arv: Math.round(d.allInPct * 100), deficit: d.deficit != null ? Math.round(d.deficit) : null })),
    insights: ffInsights(comp).slice(0, 10).map(i => ({ tag: i.tag, detalle: i.tx.replace(/<[^>]+>/g, ''), impacto: Math.round(i.impact) })),
  };
}
function ffChatHTML() {
  return FF.chat.map(m => {
    if (m.role === 'user') return `<div class="cbub u">${FF_ESC(m.content)}</div>`;
    if (m.error) return `<div style="align-self:flex-start;max-width:82%">${kitError(m.content)}</div>`; // error humano, no JSON crudo
    return `<div class="cbub a${m.thinking ? ' think' : ''}">${m.thinking ? 'pensando…' : (window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.content)) : FF_ESC(m.content))}</div>`;
  }).join('');
}
function ffRenderChat() { const el = document.getElementById('ff-chat'); if (el) { el.innerHTML = ffChatHTML(); el.scrollTop = el.scrollHeight; } }
async function ffAsk(q) {
  const inp = document.getElementById('ff-ask'); const question = (q || (inp ? inp.value.trim() : '')).trim();
  if (!question || FF.chatBusy) return; if (inp) inp.value = '';
  if (!document.getElementById('ff-chat')) { ffGo('cerebro'); setTimeout(() => ffAsk(question), 80); return; }
  FF.chatBusy = true; FF.chat.push({ role: 'user', content: question }); FF.chat.push({ role: 'assistant', content: '', thinking: true }); ffRenderChat();
  const history = FF.chat.filter(m => !m.thinking && !m.error).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
  try {
    const r = await fetch('/api/brain-chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, snapshot: ffSnapshot(ffCompute()), history }) });
    const data = await r.json().catch(() => ({})); FF.chat.pop();
    FF.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: `El Cerebro no pudo responder (HTTP ${r.status}). Esperá un momento y volvé a preguntar.`, error: true });
  } catch (e) { FF.chat.pop(); FF.chat.push({ role: 'assistant', content: 'No hay conexión con el Cerebro — revisá tu internet y volvé a intentar. ', error: true }); }
  finally { FF.chatBusy = false; ffRenderChat(); }
}
window.ffAsk = ffAsk;

// ════════════════════════════════════════════════════════════════
// UNDERWRITING & CALCULADORAS (leen de la base, no re-ingresan)
// ════════════════════════════════════════════════════════════════
function ffNum(id, def) { const el = document.getElementById(id); const v = el ? parseFloat(String(el.value).replace(/[^0-9.\-]/g, '')) : NaN; return isNaN(v) ? (def || 0) : v; }
// Calibración $/sqft desde los deals reales (para el estimador).
function ffCalib() {
  const psf = FF.deals.filter(d => Number(d.remodel_est) > 0 && Number(d.sqft) > 0).map(d => Number(d.remodel_est) / Number(d.sqft)).sort((a, b) => a - b);
  const pct = q => psf.length ? psf[Math.min(psf.length - 1, Math.floor(q * psf.length))] : 0;
  return { n: psf.length, min: psf[0] || 0, max: psf[psf.length - 1] || 0, p33: pct(0.33), p66: pct(0.66), avg: psf.reduce((s, v) => s + v, 0) / (psf.length || 1) };
}
function ffSecUnderwriting(comp) {
  FF.uw = FF.uw || {}; const cal = ffCalib();
  const deals = comp.deals; const sel = FF.uw.dealId ? deals.find(d => d.id === FF.uw.dealId) : null;
  // Defaults del deal seleccionado (o vacíos)
  const dv = sel ? { arv: sel.arv, rem: Math.round(sel.remComplete), hold: Math.round(sel.holding), buy: sel.purchase, sqft: sel.sqft || '', payoff: Math.round(sel.allIn), app: sel.appraisal || sel.arv } : { arv: '', rem: '', hold: '', buy: '', sqft: '', payoff: '', app: '' };
  // Semáforo de recuperación del déficit
  const semColor = m => m == null ? 'var(--mut2)' : (m <= 12 ? 'var(--pos)' : m <= 36 ? 'var(--amber)' : 'var(--neg)');
  const recRows = deals.filter(d => d.arv > 0).map(d => {
    const roi = d.allIn ? d.margin / d.allIn : 0;
    const monthlyNet = Math.max(1, Math.round(d.arv * 0.005)); // proxy neto mensual ~0.5% ARV
    const rec = (d.deficit != null && d.deficit > 0) ? Math.round(d.deficit / monthlyNet) : 0;
    return { ...d, roi, rec: (d.deficit != null && d.deficit > 0) ? rec : null };
  }).sort((a, b) => (a.dq.revisar - b.dq.revisar) || ((b.rec || 0) - (a.rec || 0))); // datos a revisar al fondo
  // Ingeniería inversa: casas que NO nacen en déficit (net ≥ -15k) → su fórmula de draw.
  const sanas = deals.filter(d => d.dr && Number(d.dr.net_total) > -15000).sort((a, b) => Number(b.dr.net_total) - Number(a.dr.net_total)).slice(0, 6);
  return `${ffHeader('Underwriting', 'Calculadoras', 'Todas leen de la base — elegí un deal para autocompletar. MAO, remodelación calibrada, HML, refi, ROI y recuperación del déficit.')}
    <div class="uwbar"><label>Autocompletar desde deal:</label>
      <select id="ff-uw-deal" onchange="ffUwPick(this.value)"><option value="">— elegí un deal —</option>${deals.map(d => `<option value="${d.id}"${sel && sel.id === d.id ? ' selected' : ''}>${FF_ESC(ffShort(d.address))} (${FF_STAGE_LBL[d.stage]})</option>`).join('')}</select>
      ${sel ? `<span class="uwtag">${FF_ESC(ffShort(sel.address))} · ARV ${FF_MONEY(sel.arv)} · all-in ${FF_MONEY(sel.allIn)}</span>` : ''}</div>
    ${ffUmCard(sel)}
    <div class="grid row3">
      <div class="card"><div class="chart-h"><div class="t">MAO · Máxima Oferta</div><div class="k">ARV×75% − costos</div></div>
        ${ffUwIn('mao-arv', 'ARV', dv.arv)}${ffUwIn('mao-rem', 'Remodelación', dv.rem)}${ffUwIn('mao-hold', 'Holding', dv.hold)}
        ${ffUwIn('mao-close', 'Cierre (%ARV)', FF.cfg.closing_pct)}${ffUwIn('mao-lend', 'Lender fees (%)', FF.cfg.lender_fee_pct)}${ffUwIn('mao-cont', 'Contingencia (%rem)', FF.cfg.contingency_pct)}
        <div class="uwres" id="ff-mao-res"></div></div>
      <div class="card"><div class="chart-h"><div class="t">Estimador de remodelación</div><div class="k">calibrado · ${cal.n} deals</div></div>
        ${ffUwIn('est-sqft', 'Sqft', dv.sqft)}
        <div class="uwrow"><label>Alcance</label><select id="ff-est-scope" onchange="ffEstim()"><option value="ligero">Ligero ($${Math.round(cal.min)}–${Math.round(cal.p33)}/sqft)</option><option value="medio" selected>Medio ($${Math.round(cal.p33)}–${Math.round(cal.p66)}/sqft)</option><option value="pesado">Pesado ($${Math.round(cal.p66)}–${Math.round(cal.max)}/sqft)</option></select></div>
        <div class="uwres" id="ff-est-res"></div>
        <div style="border-top:1px solid var(--glassb);margin:10px 0;padding-top:10px"><div class="k" style="margin-bottom:6px">Validá un monto:</div>${ffUwIn('est-val', 'Monto remodelación', dv.rem)}<div class="uwres" id="ff-est-val"></div></div></div>
      <div class="card"><div class="chart-h"><div class="t">Préstamo / HML</div><div class="k">pago mensual</div></div>
        ${ffUwIn('hml-amt', 'Monto préstamo', dv.payoff)}${ffUwIn('hml-rate', 'Tasa anual (%)', FF.cfg.hml_rate_annual)}
        <div class="uwrow"><label>Tipo</label><select id="ff-hml-type" onchange="ffHml()"><option value="io" selected>Solo interés (HML)</option><option value="am">Amortizado</option></select></div>
        ${ffUwIn('hml-term', 'Plazo (meses)', 360)}<div class="uwres" id="ff-hml-res"></div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Cash-out refi</div><div class="k">appraisal×75% − payoff · regla: no superar el pago actual</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>${ffUwIn('refi-app', 'Appraisal', dv.app)}${ffUwIn('refi-ltv', 'LTV (%)', FF.cfg.refi_ltv_pct)}${ffUwIn('refi-payoff', 'Payoff (deuda actual)', dv.payoff)}</div>
          <div>${ffUwIn('refi-rate', 'Tasa refi (%)', FF.cfg.refi_rate_pct)}${ffUwIn('refi-cur', 'Pago actual/mes', sel ? Math.round(sel.hml_payment || sel.holding / 6) : '')}<div class="uwres" id="ff-refi-res"></div></div></div></div>
      <div class="card"><div class="chart-h"><div class="t">${osIcon('refresh')} Ingeniería inversa · la fórmula que funciona</div><div class="k">casas que NO nacen en déficit · ${osIcon('loader')} = resultado preliminar (obra en curso)</div></div>
        <div class="k" style="margin-bottom:8px">El draw que cubrió la operación (Remodelación → Rentas). Aplicá esta estructura a deals nuevos.</div>
        <table class="ptable"><thead><tr><th>Casa</th><th>Draw total</th><th>Remod.</th><th>Holding</th><th>Resultado</th></tr></thead><tbody>
        ${sanas.map(d => `<tr><td>${FF_ESC(ffShort(d.address))}${d.dq.preliminar ? ' ' + ffDQBadge(d.dq) : ''}</td><td>${FF_MONEY(d.dr.total_draws)}</td><td>${FF_MONEY(d.dr.remodel_complete)}</td><td>${FF_MONEY(Number(d.dr.interest_hml || 0) + Number(d.dr.services_hml || 0) + Number(d.dr.interest_until_rent || 0))}</td><td class="${d.dq.preliminar ? 'warn' : 'up'}">${FF_MONEY(d.dr.net_total)}${d.dq.preliminar ? ' <span style="font-size:9px">prelim.</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card"><div class="chart-h"><div class="t">ROI y recuperación del déficit</div><div class="k">semáforo: &lt;12m ${kitStatusDot('ok')} · 12–36m ${kitStatusDot('warn')} · &gt;36m ${kitStatusDot('bad')} (neto mensual ~0.5% ARV)</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Estrat.</th><th>All-in</th><th>Margen/Equity</th><th>ROI</th><th>Déficit</th><th>Recuperación</th></tr></thead><tbody>
      ${recRows.map(d => d.dq.revisar
        ? `<tr style="opacity:.75"><td>${FF_ESC(ffShort(d.address))} ${ffDQBadge(d.dq)}</td><td>${ffStratBadge(d)}</td><td>${FF_MONEY(d.allIn)}</td><td style="color:var(--mut2)">${FF_MONEY(d.margin)}</td><td style="color:var(--mut2)">—</td><td style="color:var(--mut2)">—</td><td><span style="color:var(--neg);font-weight:700">excluido</span></td></tr>`
        : `<tr><td>${FF_ESC(ffShort(d.address))}</td><td>${ffStratBadge(d)}</td><td>${FF_MONEY(d.allIn)}</td><td class="${d.margin >= 0 ? 'up' : 'down'}">${FF_MONEY(d.margin)}</td><td>${Math.round(d.roi * 100)}%</td><td class="${(d.deficit != null && d.deficit > 0) ? 'down' : ''}">${(d.deficit != null && d.deficit > 0) ? FF_MONEY(d.deficit) : '—'}</td><td>${d.rec != null ? `<span style="color:${semColor(d.rec)};font-weight:700">${d.rec} meses</span>` : '<span class="up">sin déficit ✓</span>'}</td></tr>`).join('')}</tbody></table>
        <div class="meta" style="margin-top:8px">Las filas <b>${osIcon('alert')} dato a revisar</b> (all-in &gt; 100% del ARV) se excluyen del ROI y del semáforo — el margen/déficit está distorsionado por el error de carga.</div></div></div>`;
}
function ffUwIn(id, label, val) { return `<div class="uwrow"><label>${label}</label><input id="ff-${id}" value="${val === '' || val == null ? '' : val}" oninput="ffUwCalc()" inputmode="decimal"></div>`; }
function ffUwPick(id) { FF.uw = FF.uw || {}; FF.uw.dealId = id || null; const d = id ? FF.deals.find(x => x.id === id) : null; if (d && !FF.uw.modeloManual) FF.uw.modelo = d.strategy === 'flip' ? 'fixflip' : 'renta'; ffRender(); }
window.ffUwPick = ffUwPick;
function ffUwCalc() { ffMao(); ffEstim(); ffValRemod(); ffHml(); ffRefi(); ffUmCalc(); }
window.ffUwCalc = ffUwCalc;
function ffMao() {
  const arv = ffNum('ff-mao-arv'), rem = ffNum('ff-mao-rem'), hold = ffNum('ff-mao-hold');
  const factor = (FF.cfg && FF.cfg.arv_factor) || 0.75;
  const close = arv * ffNum('ff-mao-close', FF.cfg.closing_pct || 2) / 100, lend = arv * factor * ffNum('ff-mao-lend', FF.cfg.lender_fee_pct || 2) / 100, cont = rem * ffNum('ff-mao-cont', FF.cfg.contingency_pct || 10) / 100;
  const mao = arv * factor - rem - hold - close - lend - cont;
  const buy = FF.uw.dealId ? (FF.deals.find(d => d.id === FF.uw.dealId)?.purchase_price || 0) : 0;
  const el = document.getElementById('ff-mao-res'); if (!el) return;
  el.innerHTML = arv > 0 ? `<div class="uwbig">${FF_MONEY(mao)}</div><div class="uwsub">máxima oferta recomendada${buy ? ` · compra real ${FF_MONEY(buy)} <b class="${buy <= mao ? 'up' : 'down'}">${buy <= mao ? '✓ bajo MAO' : 'sobre MAO'}</b>` : ''}</div>` : '<div class="uwsub">Ingresá el ARV.</div>';
}
window.ffMao = ffMao;
function ffEstim() {
  const cal = ffCalib(); const sqft = ffNum('ff-est-sqft'); const scope = (document.getElementById('ff-est-scope') || {}).value || 'medio';
  const rng = scope === 'ligero' ? [cal.min, cal.p33] : scope === 'pesado' ? [cal.p66, cal.max] : [cal.p33, cal.p66];
  const el = document.getElementById('ff-est-res'); if (!el) return;
  el.innerHTML = sqft > 0 ? `<div class="uwbig">${FF_MONEY(sqft * rng[0])} – ${FF_MONEY(sqft * rng[1])}</div><div class="uwsub">estimado (${scope}) · $${Math.round(rng[0])}–${Math.round(rng[1])}/sqft calibrado</div>` : '<div class="uwsub">Ingresá los sqft.</div>';
  ffValRemod();
}
window.ffEstim = ffEstim;
function ffValRemod() {
  const cal = ffCalib(); const sqft = ffNum('ff-est-sqft'); const val = ffNum('ff-est-val');
  const el = document.getElementById('ff-est-val'); if (!el) return;
  if (!(sqft > 0 && val > 0)) { el.innerHTML = '<div class="uwsub">Sqft + monto para validar.</div>'; return; }
  const psf = val / sqft; const dentro = psf >= cal.min && psf <= cal.max;
  el.innerHTML = `<div class="uwbig" style="color:${dentro ? 'var(--pos)' : 'var(--neg)'}">$${Math.round(psf)}/sqft ${dentro ? '✓' : 'FUERA DE RANGO'}</div><div class="uwsub">rango real $${Math.round(cal.min)}–${Math.round(cal.max)}/sqft${dentro ? '' : ' · revisá el monto (posible error de carga)'}</div>`;
}
window.ffValRemod = ffValRemod;
function ffHml() {
  const amt = ffNum('ff-hml-amt'), rate = ffNum('ff-hml-rate', 12) / 100, type = (document.getElementById('ff-hml-type') || {}).value, n = ffNum('ff-hml-term', 360);
  let pago; if (type === 'am' && n > 0) { const r = rate / 12; pago = r ? amt * r / (1 - Math.pow(1 + r, -n)) : amt / n; } else pago = amt * rate / 12;
  const el = document.getElementById('ff-hml-res'); if (!el) return;
  el.innerHTML = amt > 0 ? `<div class="uwbig">${FF_MONEY(pago)}/mes</div><div class="uwsub">${type === 'am' ? `amortizado ${n}m` : 'solo interés (HML)'} · ${Math.round(rate * 100)}% anual</div>` : '<div class="uwsub">Ingresá el monto.</div>';
}
window.ffHml = ffHml;
function ffRefi() {
  const app = ffNum('ff-refi-app'), ltv = ffNum('ff-refi-ltv', 75) / 100, payoff = ffNum('ff-refi-payoff'), rate = ffNum('ff-refi-rate', 7) / 100, cur = ffNum('ff-refi-cur');
  const newLoan = app * ltv; const cashOut = newLoan - payoff; const newPay = newLoan * rate / 12;
  const el = document.getElementById('ff-refi-res'); if (!el) return;
  const supera = cur > 0 && newPay > cur;
  el.innerHTML = app > 0 ? `<div class="uwbig ${cashOut >= 0 ? 'up' : 'down'}">${FF_MONEY(cashOut)}</div><div class="uwsub">cash-out · nuevo pago ${FF_MONEY(newPay)}/mes${cur ? ` <b class="${supera ? 'down' : 'up'}">${supera ? 'supera el pago actual' : '✓ ≤ pago actual'}</b>` : ''}</div>` : '<div class="uwsub">Ingresá el appraisal.</div>';
}
window.ffRefi = ffRefi;


// ════════════════════════════════════════════════════════════════
// M2 · MOTOR DE UNDERWRITING UNIFICADO (Blueprint FF §2)
// UN modelo por casa; supuestos SOLO de ff_uw_config; cascada total.
// ════════════════════════════════════════════════════════════════
function ffUwModel(inp, cfgIn) {
  const cfg = cfgIn || FF.cfg || {};
  const f = (k, d) => (cfg[k] != null ? +cfg[k] : d);
  const arv = +inp.arv || 0, rehab = +inp.rehab || 0, renta = +inp.renta || 0;
  const factor = f('arv_factor', 0.75);
  const closing = arv * f('closing_pct', 2) / 100;
  const loanBase = arv * factor;
  const lender = loanBase * f('lender_fee_pct', 2) / 100;
  const cont = rehab * f('contingency_pct', 10) / 100;
  const holding = loanBase * (f('hml_rate_annual', 12) / 100 / 12) * f('holding_months', 6);
  const mao = arv * factor - rehab - holding - closing - lender - cont;
  const allIn = arv * factor;
  const loan = Math.max(0, (mao + rehab) * f('hml_ltc_pct', 90) / 100);
  const aporte = Math.max(0, mao + rehab + closing + lender + cont - loan);
  const pagoHml = loan * f('hml_rate_annual', 12) / 100 / 12;
  const rentaNeta = renta > 0 ? renta * (1 - f('vacancy_pct', 8) / 100) - renta * f('opex_pct', 35) / 100 - pagoHml : null;
  const margen = arv - allIn;
  const refiLoan = arv * f('refi_ltv_pct', 75) / 100;
  const refiPago = refiLoan * f('refi_rate_pct', 7) / 100 / 12;
  const cashOut = refiLoan - loan;
  const roiCash = aporte > 0 ? margen / aporte : null;
  return { arv, rehab, renta, factor, mao, allIn, loan, aporte, pagoHml, holding, closing, lender, cont, rentaNeta, margen, refiLoan, refiPago, cashOut, roiCash };
}
function ffCalibZona() {
  const cerradas = ['rentada', 'rentada_y_refinanciada', 'vendida', 'refinanciada', 'en_venta'];
  const zonasOk = ((FF.cfgT && FF.cfgT.calib_zonas) || '').split(',').map(z => z.trim().toLowerCase()).filter(Boolean);
  const psfMin = (FF.cfg && FF.cfg.calib_psf_min) || 0;
  const map = {}; const excl = [];
  (FF.deals || []).forEach(d => {
    if (!cerradas.includes(d.stage) || !(+d.sqft > 0)) return;
    const w = (FF.draws || []).find(x => x.address_norm === d.address_norm);
    if (!w || !(+w.remodel_complete > 0)) return;
    const zona = d.city || '(s/zona)';
    if (zonasOk.length && !zonasOk.includes(zona.toLowerCase())) return; // solo zonas operativas (config)
    const psf = +w.remodel_complete / +d.sqft;
    if (psfMin && psf < psfMin) { excl.push({ casa: ffShort(d.address), psf: Math.round(psf) }); return; } // dato incompleto
    if (!map[zona]) map[zona] = [];
    map[zona].push(psf);
  });
  ffCalibZona._excl = excl;
  const out = {};
  Object.entries(map).forEach(([z, arr]) => {
    arr.sort((a, b) => a - b);
    out[z] = { n: arr.length, min: Math.round(arr[0]), max: Math.round(arr[arr.length - 1]), prom: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) };
  });
  return out;
}
function ffUmUseCalib() {
  const sel = FF.uw && FF.uw.dealId ? FF.deals.find(d => d.id === FF.uw.dealId) : null;
  const sqft = sel ? +sel.sqft || 0 : 0;
  if (!sqft) { alert('Elegí un deal con sqft para usar la calibración.'); return; }
  const zonas = ffCalibZona();
  const z = zonas[sel.city] || null;
  let psf = z ? z.prom : 0;
  if (!psf) { const all = Object.values(zonas); psf = all.length ? Math.round(all.reduce((s, x) => s + x.prom, 0) / all.length) : 0; }
  const el = document.getElementById('ff-um-rehab');
  if (el && psf) { el.value = Math.round(sqft * psf); ffUmCalc(); }
}
function ffUmCalc() {
  const out = document.getElementById('ff-um-out'); if (!out) return;
  const inp = { arv: ffNum('ff-um-arv'), rehab: ffNum('ff-um-rehab'), renta: ffNum('ff-um-renta') };
  if (!(inp.arv > 0)) { out.innerHTML = '<div class="uwsub">Ingresá el ARV — todo recalcula en cascada.</div>'; return; }
  const cfg = FF.cfg || {};
  const m = ffUwModel(inp, cfg);
  const dA = (+cfg.scen_arv_delta_pct || 10) / 100, dR = (+cfg.scen_rehab_delta_pct || 15) / 100;
  const best = ffUwModel({ arv: inp.arv * (1 + dA), rehab: inp.rehab * (1 - dR), renta: inp.renta }, cfg);
  const worst = ffUwModel({ arv: inp.arv * (1 - dA), rehab: inp.rehab * (1 + dR), renta: inp.renta }, cfg);
  const row = (l, v, cls) => `<div class="krow"><span>${l}</span><b class="${cls || ''}">${v}</b></div>`;
  const parts = [];
  parts.push(row('MAO (máxima oferta)', FF_MONEY(m.mao), m.mao > 0 ? 'up' : 'down'));
  parts.push(row(`All-in objetivo (${Math.round(m.factor * 100)}% ARV)`, FF_MONEY(m.allIn)));
  parts.push(row(`Préstamo HML (${Math.round(+cfg.hml_ltc_pct || 90)}% LTC)`, FF_MONEY(m.loan)));
  parts.push(row('Aporte inversionista (cash)', FF_MONEY(m.aporte)));
  parts.push(row('Pago HML /mes (solo interés)', FF_MONEY(m.pagoHml)));
  parts.push(row(`Holding ${+cfg.holding_months || 6}m + cierre + lender + conting.`, FF_MONEY(m.holding + m.closing + m.lender + m.cont)));
  if (m.rentaNeta != null) parts.push(row('Renta neta /mes', FF_MONEY(m.rentaNeta), m.rentaNeta >= 0 ? 'up' : 'down'));
  parts.push(row(`Margen (equity al ${Math.round(m.factor * 100)}%)`, FF_MONEY(m.margen), 'up'));
  if (m.roiCash != null) parts.push(row('ROI sobre cash', `${Math.round(m.roiCash * 100)}%`));
  parts.push(row(`Refi: cash-out (${Math.round(+cfg.refi_ltv_pct || 75)}% LTV)`, FF_MONEY(m.cashOut), m.cashOut >= 0 ? 'up' : 'down'));
  const scen = (nom, s, cls) => `<td style="text-align:right"><div style="font-size:10px;color:var(--mut2)">${nom}</div><b class="${cls}">${FF_MONEY(s.mao)}</b><div style="font-size:10px">margen ${FF_MONEY(s.margen)}</div></td>`;
  parts.push(`<div style="border-top:1px solid var(--glassb);margin:10px 0 6px;padding-top:8px;font-size:10px;color:var(--mut2);text-transform:uppercase;letter-spacing:.5px">Escenarios (ARV ±${Math.round(dA * 100)}% · rehab ∓${Math.round(dR * 100)}%) — MAO</div>`);
  parts.push(`<table style="width:100%"><tr>${scen('WORST', worst, 'down')}${scen('BASE', m, '')}${scen('BEST', best, 'up')}</tr></table>`);
  const dAs = [-0.1, -0.05, 0, 0.05, 0.1], dRs = [-0.15, 0, 0.15];
  parts.push('<div style="border-top:1px solid var(--glassb);margin:10px 0 6px;padding-top:8px;font-size:10px;color:var(--mut2);text-transform:uppercase;letter-spacing:.5px">Sensibilidad del MAO (ARV × rehab)</div>');
  const head = dAs.map(a => `<th style="text-align:right">${a > 0 ? '+' : ''}${Math.round(a * 100)}%</th>`).join('');
  const body = dRs.map(r => {
    const cells = dAs.map(a => {
      const s = ffUwModel({ arv: inp.arv * (1 + a), rehab: inp.rehab * (1 + r), renta: 0 }, cfg);
      return `<td style="text-align:right" class="${s.mao >= 0 ? 'up' : 'down'}">${FF_MONEY(s.mao)}</td>`;
    }).join('');
    return `<tr><td>${r > 0 ? '+' : ''}${Math.round(r * 100)}%</td>${cells}</tr>`;
  }).join('');
  parts.push(`<table class="ptable" style="font-size:10.5px"><thead><tr><th>rehab \\ ARV</th>${head}</tr></thead><tbody>${body}</tbody></table>`);
  const modelo = (FF.uw && FF.uw.modelo) || 'fixflip';
  const st = ffModelStrategy(m, modelo, cfg);
  const lblMo = (FF_UW_MODELOS.find(x => x[0] === modelo) || [])[1] || modelo;
  parts.push(`<div style="border-top:1px solid var(--glassb);margin:10px 0 6px;padding-top:8px;font-size:10px;color:var(--mut2);text-transform:uppercase;letter-spacing:.5px">Modelo: ${lblMo} — flujo y split</div>`);
  st.rows.forEach(([l, v]) => { const isNum = typeof v === 'number'; parts.push(row(l, isNum ? FF_MONEY(v) : (v == null ? '—' : v), isNum ? (v >= 0 ? 'up' : 'down') : '')); });
  out.innerHTML = parts.join('');
}
window.ffUwModel = ffUwModel; window.ffUmCalc = ffUmCalc; window.ffUmUseCalib = ffUmUseCalib; window.ffCalibZona = ffCalibZona;
function ffUwIn2(id, label, val) { return `<div class="uwrow"><label>${label}</label><input id="ff-${id}" value="${val === '' || val == null ? '' : val}" oninput="ffUmCalc()" inputmode="decimal"></div>`; }
function ffUmZRow(z, v, hl) { return `<tr class="${hl ? 'ff-zsel' : ''}"><td>${FF_ESC(z)}${hl ? ' ←' : ''}</td><td style="text-align:right">${v.n}</td><td style="text-align:right">${FF_MONEY(v.min)}–${FF_MONEY(v.max)}/sqft</td><td style="text-align:right"><b>${FF_MONEY(v.prom)}</b></td></tr>`; }
function ffUmChip(k, cfg) { return `<span class="ff-dq" title="${k}">${k.replace(/_pct|_annual|_months/g, '')} ${+cfg[k]}</span>`; }
function ffUmCard(sel) {
  const cfg = FF.cfg || {};
  const zonas = ffCalibZona();
  const dv = sel ? { arv: sel.arv || '', rehab: Math.round(sel.remComplete || 0) || '' } : { arv: '', rehab: '' };
  const zonaSel = sel && zonas[sel.city] ? sel.city : null;
  const zrows = Object.entries(zonas).map(([z, v]) => ffUmZRow(z, v, z === zonaSel)).join('');
  const cfgChips = ['arv_factor', 'closing_pct', 'lender_fee_pct', 'contingency_pct', 'hml_rate_annual', 'hml_ltc_pct', 'holding_months', 'refi_ltv_pct', 'vacancy_pct', 'opex_pct'].map(k => ffUmChip(k, cfg)).join(' ');
  return `<div class="grid row2" style="margin-bottom:16px">
    <div class="card"><div class="chart-h"><div class="t">${osIcon('settings')} Modelo unificado por casa</div><div class="k">cambiá el ARV → TODO recalcula en cascada</div></div>
      ${ffUwIn2('um-arv', 'ARV', dv.arv)}${ffUwIn2('um-rehab', 'Remodelación', dv.rehab)}
      <div class="uwrow"><label></label><button onclick="ffUmUseCalib()" class="pullbtn" style="font-size:10px;padding:4px 8px">usar el $/sqft calibrado de la zona</button></div>
      ${ffUwIn2('um-renta', 'Renta esperada /mes (opcional)', '')}
      <div id="ff-um-modelos" style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${FF_UW_MODELOS.map(([k, lbl]) => `<button data-mo="${k}" onclick="ffUmSetModelo('${k}')" class="pullbtn${(FF.uw && FF.uw.modelo) === k ? ' on' : ''}" style="font-size:10px;padding:4px 9px">${lbl}</button>`).join('')}</div>
      <div class="uwres" id="ff-um-out"></div>
      <button onclick="ffDeckGenerate()" class="pullbtn" style="margin-top:10px;font-size:11px;padding:7px 12px">${osIcon('video')} Generar deck para inversionista (.pptx)</button>
      <div class="meta" style="margin-top:8px">Supuestos (de <b>ff_uw_config</b>, no hardcodeados): ${cfgChips}</div></div>
    <div class="card"><div class="chart-h"><div class="t">${osIcon('ruler')} Calibración $/sqft por zona</div><div class="k">histórico de casas con ciclo cerrado</div></div>
      <table class="ptable"><thead><tr><th>Zona</th><th style="text-align:right">n</th><th style="text-align:right">rango</th><th style="text-align:right">prom</th></tr></thead><tbody>${zrows}</tbody></table>
      <div class="meta" style="margin-top:8px">La banda de la zona alimenta "usar $/sqft calibrado" y el validador. Fuente: ff_deals + ff_draws (remodel real = base Remodelación). Zonas operativas: <b>${FF_ESC((FF.cfgT && FF.cfgT.calib_zonas) || 'todas')}</b> · piso ${(FF.cfg.calib_psf_min || 0)}/sqft.${(ffCalibZona._excl || []).length ? ` Excluidas por dato incompleto: ${ffCalibZona._excl.map(x => FF_ESC(x.casa) + ' (' + x.psf + ')').join(', ')}.` : ''}</div></div>
  </div>`;
}


// ─── M3 · Selector de modelo por casa (Blueprint FF §3) ───
const FF_UW_MODELOS = [['fixflip', 'Fix & Flip'], ['brrrr', 'BRRRR'], ['renta', 'Renta'], ['wholesale', 'Wholesale']];
function ffModelStrategy(m, modelo, cfgIn) {
  const cfg = cfgIn || FF.cfg || {};
  const f = (k, d) => (cfg[k] != null ? +cfg[k] : d);
  const split = f('split_investor_pct', 50) / 100;
  if (modelo === 'fixflip') {
    const venta = m.arv * f('selling_cost_pct', 6) / 100;
    const ganancia = m.arv - m.allIn - venta;
    const inv = ganancia > 0 ? ganancia * split : 0, nos = ganancia - inv;
    return { modelo, rows: [['Venta al ARV', m.arv], ['− All-in', -m.allIn], ['− Costos de venta', -venta], ['= Ganancia neta', ganancia], ['Inversionista (' + Math.round(split * 100) + '%)', inv], ['Nosotros', nos], ['ROI inversionista', m.aporte > 0 ? Math.round(inv / m.aporte * 100) + '%' : '—']], ganancia, inv, nos };
  }
  if (modelo === 'brrrr') {
    const buyout = m.aporte * (1 + f('investor_buyout_pct', 15) / 100);
    const cashLeft = m.aporte - Math.max(0, m.cashOut);
    const rentaNetaRefi = m.renta > 0 ? m.renta * (1 - f('vacancy_pct', 8) / 100) - m.renta * f('opex_pct', 35) / 100 - m.refiPago : null;
    const reglaOk = m.refiPago <= m.pagoHml;
    return { modelo, rows: [['Refi (' + Math.round(f('refi_ltv_pct', 75)) + '% LTV)', m.refiLoan], ['Cash-out (devuelve capital)', m.cashOut], ['Cash que queda adentro', cashLeft], ['Buy-out inversionista (capital +' + Math.round(f('investor_buyout_pct', 15)) + '%)', buyout], ['Renta neta post-refi /mes', rentaNetaRefi], ['Regla: pago refi ≤ pago HML', reglaOk ? '✓ cumple' : 'NO cumple'], ['Equity retenido', m.arv - m.refiLoan]], buyout, cashLeft, rentaNetaRefi };
  }
  if (modelo === 'renta') {
    const noiMes = m.renta > 0 ? m.renta * (1 - f('vacancy_pct', 8) / 100 - f('opex_pct', 35) / 100) : 0;
    const capRate = m.allIn > 0 && noiMes ? (noiMes * 12) / m.allIn : null;
    const dscr = m.pagoHml > 0 && noiMes ? noiMes / m.pagoHml : null;
    return { modelo, rows: [['NOI /mes', noiMes], ['NOI /año', noiMes * 12], ['Cap rate sobre all-in', capRate != null ? (capRate * 100).toFixed(1) + '%' : '—'], ['DSCR (NOI/pago)', dscr != null ? dscr.toFixed(2) : '—'], ['Flujo neto /mes (con deuda)', m.rentaNeta]], noiMes, capRate, dscr };
  }
  const fee = m.arv * f('wholesale_fee_pct', 3) / 100;
  return { modelo: 'wholesale', rows: [['Assignment fee (' + f('wholesale_fee_pct', 3) + '% ARV)', fee], ['Sin rehab ni holding', 'cero capital'], ['Nosotros (100%)', fee]], fee };
}
function ffUmSetModelo(mo) { FF.uw = FF.uw || {}; FF.uw.modelo = mo; ffUmCalc(); const bar = document.getElementById('ff-um-modelos'); if (bar) [...bar.querySelectorAll('button')].forEach(b => b.classList.toggle('on', b.dataset.mo === mo)); }
window.ffUmSetModelo = ffUmSetModelo; window.ffModelStrategy = ffModelStrategy;


// ─── M5 · Deck para inversionista (Blueprint FF §5) — números 100% del espejo, 0 hardcode ───
async function ffDeckGenerate(mode) {
  if (typeof PptxGenJS === 'undefined') { alert('PptxGenJS no cargado.'); return null; }
  const comp = ffCompute();
  const cfg = FF.cfg || {};
  const sel = FF.uw && FF.uw.dealId ? comp.deals.find(d => d.id === FF.uw.dealId) : null;
  const inp = sel ? { arv: +sel.arv || 0, rehab: Math.round(sel.remComplete || 0), renta: ffNum('ff-um-renta') || 0 } : { arv: ffNum('ff-um-arv'), rehab: ffNum('ff-um-rehab'), renta: ffNum('ff-um-renta') };
  if (!(inp.arv > 0)) { alert('Elegí un deal (o cargá un ARV) en Underwriting antes de generar el deck.'); return null; }
  const m = ffUwModel(inp, cfg);
  const modelo = (FF.uw && FF.uw.modelo) || 'fixflip';
  const st = ffModelStrategy(m, modelo, cfg);
  const lblMo = (FF_UW_MODELOS.find(x => x[0] === modelo) || [])[1] || modelo;
  const dA = (+cfg.scen_arv_delta_pct || 10) / 100, dR = (+cfg.scen_rehab_delta_pct || 15) / 100;
  const best = ffUwModel({ arv: inp.arv * (1 + dA), rehab: inp.rehab * (1 - dR), renta: inp.renta }, cfg);
  const worst = ffUwModel({ arv: inp.arv * (1 - dA), rehab: inp.rehab * (1 + dR), renta: inp.renta }, cfg);
  // Track record (espejo): cerradas, utilidad entregada, capital movido, banda de zona
  const salida = ['vendida', 'refinanciada', 'rentada_y_refinanciada'];
  const cerradas = comp.deals.filter(d => salida.includes(d.stage));
  const utilEntregada = comp.deals.reduce((s, d) => s + (+d.utilidad_entregada || 0), 0);
  const capitalMovido = comp.deals.reduce((s, d) => s + (+d.capital_inversionista || 0), 0);
  const zonas = ffCalibZona();
  const zonaKeys = Object.keys(zonas);
  const topEntregadas = comp.deals.filter(d => +d.utilidad_entregada > 0).sort((a, b) => +b.utilidad_entregada - +a.utilidad_entregada).slice(0, 5);

  const C = { bg: '0B1220', card: '141D2E', ac: '12B5A0', ac2: '4F8DFF', tx: 'E8EEFC', mut: '9FB0C9', pos: '34D399', neg: 'F0687A' };
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
  pptx.layout = 'W';
  const S = () => { const s = pptx.addSlide(); s.background = { color: C.bg }; return s; };
  const T = (s, t, x, y, o) => s.addText(t, Object.assign({ x, y, w: 12.3, fontFace: 'Helvetica', color: C.tx, fontSize: 14 }, o || {}));

  // 1 · Portada
  let s1 = S();
  T(s1, 'RENTAL PROFITS · FIX & FLIP', 0.7, 0.7, { fontSize: 13, color: C.ac, bold: true, charSpacing: 3 });
  T(s1, 'Oportunidad de inversión', 0.7, 2.3, { fontSize: 44, bold: true });
  T(s1, sel ? ffShort(sel.address) + ' · ' + (sel.city || '') : 'Análisis de underwriting', 0.7, 3.4, { fontSize: 22, color: C.mut });
  T(s1, 'Modelo: ' + lblMo.replace(/^[^ ]+ /, '') + '  ·  ' + new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), 0.7, 4.1, { fontSize: 14, color: C.mut });
  T(s1, 'Números en vivo del sistema (Airtable · espejo verificado con paridad). Documento informativo — no constituye oferta de valores.', 0.7, 6.7, { fontSize: 9, color: C.mut });

  // 2 · El deal (modelo unificado)
  let s2 = S();
  T(s2, 'EL DEAL — MODELO UNIFICADO', 0.7, 0.5, { fontSize: 13, color: C.ac, bold: true, charSpacing: 2 });
  const rowsDeal = [
    ['ARV', FF_MONEY(m.arv)], ['Remodelación (calibrada)', FF_MONEY(m.rehab)],
    ['MAO — máxima oferta', FF_MONEY(m.mao)], ['All-in objetivo (' + Math.round(m.factor * 100) + '% ARV)', FF_MONEY(m.allIn)],
    ['Préstamo HML (' + Math.round(+cfg.hml_ltc_pct || 90) + '% LTC, solo interés)', FF_MONEY(m.loan)],
    ['Aporte del inversionista', FF_MONEY(m.aporte)], ['Pago HML mensual', FF_MONEY(m.pagoHml)],
    ['Margen (equity)', FF_MONEY(m.margen)],
  ];
  s2.addTable(rowsDeal.map(r => [{ text: r[0], options: { color: C.mut, fontSize: 13 } }, { text: r[1], options: { color: C.tx, fontSize: 14, bold: true, align: 'right' } }]),
    { x: 0.7, y: 1.1, w: 6.2, rowH: 0.52, fill: { color: C.card }, border: { type: 'solid', color: C.bg, pt: 1 } });
  T(s2, 'Escenarios', 7.4, 1.1, { fontSize: 13, color: C.mut, bold: true, w: 5 });
  s2.addTable([
    [{ text: 'WORST', options: { color: C.neg, bold: true, fontSize: 12 } }, { text: 'BASE', options: { color: C.tx, bold: true, fontSize: 12 } }, { text: 'BEST', options: { color: C.pos, bold: true, fontSize: 12 } }],
    [{ text: FF_MONEY(worst.mao), options: { color: C.tx, fontSize: 14, bold: true } }, { text: FF_MONEY(m.mao), options: { color: C.tx, fontSize: 14, bold: true } }, { text: FF_MONEY(best.mao), options: { color: C.tx, fontSize: 14, bold: true } }],
    [{ text: 'margen ' + FF_MONEY(worst.margen), options: { color: C.mut, fontSize: 10 } }, { text: 'margen ' + FF_MONEY(m.margen), options: { color: C.mut, fontSize: 10 } }, { text: 'margen ' + FF_MONEY(best.margen), options: { color: C.mut, fontSize: 10 } }],
  ], { x: 7.4, y: 1.5, w: 5.2, rowH: 0.5, fill: { color: C.card }, align: 'center', border: { type: 'solid', color: C.bg, pt: 1 } });
  T(s2, 'Estructura (' + lblMo.replace(/^[^ ]+ /, '') + ')', 7.4, 3.6, { fontSize: 13, color: C.mut, bold: true, w: 5 });
  s2.addTable(st.rows.slice(0, 6).map(r => [{ text: String(r[0]), options: { color: C.mut, fontSize: 11 } }, { text: typeof r[1] === 'number' ? FF_MONEY(r[1]) : String(r[1] == null ? '—' : r[1]), options: { color: C.tx, fontSize: 12, bold: true, align: 'right' } }]),
    { x: 7.4, y: 4.0, w: 5.2, rowH: 0.45, fill: { color: C.card }, border: { type: 'solid', color: C.bg, pt: 1 } });
  T(s2, 'Supuestos de ff_uw_config (editables, nada fijo): factor ' + (+cfg.arv_factor) + ' · cierre ' + (+cfg.closing_pct) + '% · lender ' + (+cfg.lender_fee_pct) + '% · contingencia ' + (+cfg.contingency_pct) + '% · HML ' + (+cfg.hml_rate_annual) + '% · holding ' + (+cfg.holding_months) + 'm', 0.7, 6.9, { fontSize: 9, color: C.mut });

  // 3 · Track record
  let s3 = S();
  T(s3, 'TRACK RECORD — HISTÓRICO REAL', 0.7, 0.5, { fontSize: 13, color: C.ac, bold: true, charSpacing: 2 });
  const kpiBox = (x, lab, val, sub) => { s3.addShape('rect', { x, y: 1.2, w: 2.9, h: 1.7, fill: { color: C.card }, rectRadius: 0.08 }); T(s3, lab, x + 0.2, 1.35, { fontSize: 10, color: C.mut, w: 2.6 }); T(s3, val, x + 0.2, 1.75, { fontSize: 26, bold: true, w: 2.6, color: C.ac }); T(s3, sub, x + 0.2, 2.45, { fontSize: 9, color: C.mut, w: 2.6 }); };
  kpiBox(0.7, 'Casas gestionadas', String(comp.deals.length), comp.kpi.flips + ' flip · ' + comp.kpi.holds + ' hold');
  kpiBox(3.8, 'Ciclos cerrados (venta/refi)', String(cerradas.length), 'de ' + comp.deals.length + ' casas');
  kpiBox(6.9, 'Utilidad entregada a inversionistas', FF_MONEY(utilEntregada), 'pagada, histórica');
  kpiBox(10.0, 'Capital de inversionistas', FF_MONEY(capitalMovido), String(comp.kpi.investors) + ' inversionistas');
  if (zonaKeys.length) {
    T(s3, 'Costo real de remodelación — banda calibrada (' + zonaKeys.join(', ') + ')', 0.7, 3.4, { fontSize: 13, color: C.mut, bold: true });
    const z = zonas[zonaKeys[0]];
    T(s3, `${z.min} – ${z.max} /sqft  ·  promedio ${z.prom}  ·  ${z.n} casas cerradas`, 0.7, 3.9, { fontSize: 18, bold: true });
  }
  if (topEntregadas.length) {
    T(s3, 'Casas con utilidad entregada', 0.7, 4.8, { fontSize: 13, color: C.mut, bold: true });
    s3.addTable(topEntregadas.map(d => [{ text: ffShort(d.address), options: { color: C.tx, fontSize: 12 } }, { text: FF_MONEY(+d.utilidad_entregada), options: { color: C.pos, fontSize: 12, bold: true, align: 'right' } }]),
      { x: 0.7, y: 5.2, w: 7, rowH: 0.42, fill: { color: C.card }, border: { type: 'solid', color: C.bg, pt: 1 } });
  }

  // 4 · Contacto
  let s4 = S();
  T(s4, 'SIGUIENTE PASO', 0.7, 2.6, { fontSize: 13, color: C.ac, bold: true, charSpacing: 2 });
  T(s4, 'Hablemos de esta oportunidad', 0.7, 3.1, { fontSize: 32, bold: true });
  T(s4, 'gerencia@rentalprofitss.com  ·  rentalprofitss.com', 0.7, 4.1, { fontSize: 16, color: C.mut });

  const fname = 'Deck_' + (sel ? ffShort(sel.address).replace(/[^A-Za-z0-9]+/g, '_') : 'Underwriting') + '.pptx';
  if (mode === 'b64') return pptx.write('base64');
  await pptx.writeFile({ fileName: fname });
  return fname;
}
window.ffDeckGenerate = ffDeckGenerate;


// ─── M6+M7 · Analítica, proyecciones e informes (Blueprint FF §6-7) ───
function ffProyeccion(m, cfg) {
  const f = (k, d) => (cfg[k] != null ? +cfg[k] : d);
  const a = f('appreciation_pct_annual', 3) / 100, g = f('rent_growth_pct_annual', 3) / 100;
  const sellNow = m.margen - m.arv * f('selling_cost_pct', 6) / 100;
  const noiMes = m.renta > 0 ? m.renta * (1 - f('vacancy_pct', 8) / 100 - f('opex_pct', 35) / 100) : 0;
  const anios = [1, 2, 3, 4, 5].map(y => {
    const valor = m.arv * Math.pow(1 + a, y);
    const rentaY = noiMes * 12 * Math.pow(1 + g, y - 1);
    return { y, valor,
      hold: { flujo: rentaY - m.pagoHml * 12, equity: valor - m.loan },
      refi: { flujo: rentaY - m.refiPago * 12, equity: valor - m.refiLoan } };
  });
  const acum = (path) => { let fl = 0; return anios.map(r => { fl += r[path].flujo; return fl + r[path].equity; }); };
  const holdAcum = acum('hold'), refiAcum = acum('refi');
  const refi5 = refiAcum[4] + Math.max(0, m.cashOut);
  const hold5 = holdAcum[4];
  const caminos = [['VENDER hoy', sellNow], ['MANTENER 5 años', hold5], ['REFI + mantener', refi5]].sort((x, y) => y[1] - x[1]);
  return { anios, holdAcum, refiAcum, sellNow, hold5, refi5, mejor: caminos[0] };
}
function ffAggBy(deals, keyFn) {
  const map = {};
  deals.forEach(d => {
    const k = keyFn(d) || '—';
    if (!map[k]) map[k] = { k, n: 0, capital: 0, margen: 0, entregada: 0, deficit: 0 };
    const m = map[k];
    m.n++; m.capital += d.allIn || 0; m.margen += (d.dq.confiable ? d.margin : 0);
    m.entregada += +d.utilidad_entregada || 0; m.deficit += (d.deficit != null && d.deficit > 0) ? -d.deficit : 0;
  });
  return Object.values(map).sort((x, y) => y.capital - x.capital);
}
function ffInvestorAgg(comp) {
  return (FF.investors || []).filter(i => +i.capital_aportado > 0 || i.deal_rec_ids).map(i => {
    const nDeals = comp.deals.filter(d => d.investor_rec_ids && d.investor_rec_ids.indexOf(i.airtable_id) >= 0).length;
    const entregada = comp.deals.filter(d => d.investor_rec_ids && d.investor_rec_ids.indexOf(i.airtable_id) >= 0).reduce((s, d) => s + (+d.utilidad_entregada || 0), 0);
    return { name: i.name, capital: +i.capital_aportado || 0, pagado: +i.capital_pagado || 0, nDeals, entregada, pendiente: (+i.capital_aportado || 0) - (+i.capital_pagado || 0) };
  }).sort((x, y) => y.capital - x.capital);
}
function ffSecAnalitica(comp) {
  if (window.ffAnaliticaView) return ffAnaliticaView(comp); // rediseño 13-jul (pm/ff-analitica.js) — métricas que sí sirven; fallback = vista vieja
  const { deals, kpi } = comp;
  const cfg = FF.cfg || {};
  const zonas = ffAggBy(deals, d => d.city);
  const modelos = ffAggBy(deals, d => d.strategy === 'flip' ? 'Fix & Flip' : 'Hold / BRRRR');
  const invs = ffInvestorAgg(comp).slice(0, 10);
  const sel = FF.uw && FF.uw.dealId ? deals.find(d => d.id === FF.uw.dealId) : null;
  const nAllin = deals.filter(d => d.semAllin).length, nHml = deals.filter(d => d.semHml).length, nBud = deals.filter(d => d.semBudget).length;
  const cerradas = deals.filter(d => ['vendida', 'refinanciada', 'rentada_y_refinanciada'].includes(d.stage)).length;
  const utilEnt = deals.reduce((s, d) => s + (+d.utilidad_entregada || 0), 0);
  const zrow = z => `<tr><td>${FF_ESC(z.k)}</td><td style="text-align:right">${z.n}</td><td style="text-align:right">${FF_MONEY(z.capital)}</td><td style="text-align:right" class="${z.margen >= 0 ? 'up' : 'down'}">${FF_MONEY(z.margen)}</td><td style="text-align:right" class="down">${z.deficit ? FF_MONEY(z.deficit) : '—'}</td></tr>`;
  const irow = i => `<tr><td>${FF_ESC(i.name)}</td><td style="text-align:right">${i.nDeals}</td><td style="text-align:right">${FF_MONEY(i.capital)}</td><td style="text-align:right" class="up">${FF_MONEY(i.pagado)}</td><td style="text-align:right" class="${i.entregada > 0 ? 'up' : ''}">${FF_MONEY(i.entregada)}</td><td style="text-align:right" class="${i.pendiente > 0 ? 'warn' : 'up'}">${FF_MONEY(i.pendiente)}</td></tr>`;
  let proy = '<div class="meta">Elegí un deal en Underwriting (con ARV) y cargá renta esperada para proyectar 5 años.</div>';
  if (sel && sel.arv > 0) {
    const renta = (sel.renta_mensual != null && +sel.renta_mensual > 0) ? +sel.renta_mensual : Math.round(sel.arv * 0.008);
    const m = ffUwModel({ arv: sel.arv, rehab: Math.round(sel.remComplete || 0), renta }, cfg);
    const P = ffProyeccion(m, cfg);
    const yrow = (r, i) => `<tr><td>Año ${r.y}</td><td style="text-align:right">${FF_MONEY(r.valor)}</td><td style="text-align:right" class="${r.hold.flujo >= 0 ? 'up' : 'down'}">${FF_MONEY(r.hold.flujo)}</td><td style="text-align:right">${FF_MONEY(P.holdAcum[i])}</td><td style="text-align:right" class="${r.refi.flujo >= 0 ? 'up' : 'down'}">${FF_MONEY(r.refi.flujo)}</td><td style="text-align:right">${FF_MONEY(P.refiAcum[i])}</td></tr>`;
    proy = `<div class="meta" style="margin-bottom:8px">${FF_ESC(ffShort(sel.address))} · ARV ${FF_MONEY(sel.arv)} · renta ${FF_MONEY(renta)}/mes${sel.renta_mensual ? ' (real)' : ' (estimada 0.8% ARV)'} · apreciación ${+cfg.appreciation_pct_annual}%/año · crecimiento renta ${+cfg.rent_growth_pct_annual}%/año (config)</div>
    <div class="grid kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:10px">
      <div class="card kpi"><div class="lab">VENDER hoy</div><div class="big ${P.sellNow >= 0 ? 'up' : 'down'}">${FF_MONEY(P.sellNow)}</div><div class="meta">margen neto tras costos de venta</div></div>
      <div class="card kpi"><div class="lab">MANTENER 5 años</div><div class="big ${P.hold5 >= 0 ? 'up' : 'down'}">${FF_MONEY(P.hold5)}</div><div class="meta">flujos acumulados + equity año 5</div></div>
      <div class="card kpi"><div class="lab">REFI + mantener</div><div class="big ${P.refi5 >= 0 ? 'up' : 'down'}">${FF_MONEY(P.refi5)}</div><div class="meta">+ cash-out inicial ${FF_MONEY(Math.max(0, m.cashOut))}</div></div>
    </div>
    <div class="meta" style="margin-bottom:8px">Mejor camino a 5 años: <b class="up">${P.mejor[0]} (${FF_MONEY(P.mejor[1])})</b></div>
    <table class="ptable"><thead><tr><th>Año</th><th style="text-align:right">Valor</th><th style="text-align:right">Flujo HOLD</th><th style="text-align:right">Acum HOLD</th><th style="text-align:right">Flujo REFI</th><th style="text-align:right">Acum REFI</th></tr></thead><tbody>${P.anios.map(yrow).join('')}</tbody></table>`;
  }
  return `${ffHeader('Analítica & KPIs', 'Informes', 'Rentabilidad por zona/modelo/inversionista · proyección 5 años · export.')}
    <div style="display:flex;gap:8px;margin-bottom:14px" class="no-print">
      <button onclick="window.print()" class="pullbtn">${osIcon('printer')} PDF</button>
      <button onclick="ffExportExcelFF()" class="pullbtn">⬇ Excel</button>
      <button onclick="ffCopyResumenFF()" class="pullbtn">${osIcon('clipboard')} Copiar resumen</button>
    </div>
    <div class="grid kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="card kpi"><div class="lab">Equity aportado · deuda HML</div><div class="big glow">${FF.capital ? FF_MONEY(FF.capital.equity_comprometido_airtable) : 'sin datos'}<span style="font-size:13px;color:var(--mut)"> + ${FF.capital ? FF_MONEY(FF.capital.deuda_hml_qbo != null ? FF.capital.deuda_hml_qbo : FF.capital.deuda_hml_os_activa) : '—'}</span></div><div class="meta">v_capital_deployed · all-in (costo) ${FF_MONEY(kpi.capital)} · ${kpi.total} deals · ${cerradas} cerrados</div></div>
      <div class="card kpi"><div class="lab">Equity potencial</div><div class="big up">${FF_MONEY(kpi.equity)}</div><div class="meta">confiables</div></div>
      <div class="card kpi"><div class="lab">Utilidad entregada</div><div class="big up">${FF_MONEY(utilEnt)}</div><div class="meta">a inversionistas, histórica</div></div>
      <div class="card kpi"><div class="lab">Semáforos</div><div class="big ${nAllin + nHml + nBud ? 'down' : 'up'}">${nAllin + nHml + nBud}</div><div class="meta">${kitStatusDot('bad')} ${nAllin} · ${nHml} · ${nBud}</div></div>
    </div>
    <div class="grid row2" style="margin-top:14px">
      <div class="card"><div class="chart-h"><div class="t">Rentabilidad por zona</div><div class="k">margen solo confiables</div></div>
        <table class="ptable"><thead><tr><th>Zona</th><th style="text-align:right">Deals</th><th style="text-align:right">Capital</th><th style="text-align:right">Margen</th><th style="text-align:right">Déficit</th></tr></thead><tbody>${zonas.map(zrow).join('')}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Por modelo</div><div class="k">flip vs hold/BRRRR</div></div>
        <table class="ptable"><thead><tr><th>Modelo</th><th style="text-align:right">Deals</th><th style="text-align:right">Capital</th><th style="text-align:right">Margen</th><th style="text-align:right">Déficit</th></tr></thead><tbody>${modelos.map(zrow).join('')}</tbody></table></div>
    </div>
    <div class="grid" style="margin-top:14px"><div class="card"><div class="chart-h"><div class="t">Por inversionista</div><div class="k">capital account (top 10)</div></div>
      <table class="ptable"><thead><tr><th>Inversionista</th><th style="text-align:right">Deals</th><th style="text-align:right">Capital</th><th style="text-align:right">Distribuido</th><th style="text-align:right">Utilidad entregada</th><th style="text-align:right">En trabajo</th></tr></thead><tbody>${invs.map(irow).join('')}</tbody></table></div></div>
    <div class="grid" style="margin-top:14px"><div class="card"><div class="chart-h"><div class="t">${osIcon('trending-up')} Proyección 5 años — hold vs sell vs refi</div><div class="k">supuestos de config</div></div>${proy}</div></div>`;
}
function ffExportExcelFF() {
  if (typeof XLSX === 'undefined') { alert('Librería Excel no disponible.'); return; }
  const comp = ffCompute();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comp.deals.map(d => ({ Casa: ffShort(d.address), Zona: d.city, Etapa: FF_STAGE_LBL[d.stage] || d.stage, Modelo: d.strategy, Compra: d.purchase, Remodel: Math.round(d.remComplete), AllIn: Math.round(d.allIn), ARV: d.arv, MargenUSD: Math.round(d.margin), AllInPctARV: Math.round(d.allInPct * 100), Capital: d.capital_inversionista, UtilidadEntregada: d.utilidad_entregada, SemAllin: d.semAllin ? 'sí' : '', SemHML: d.semHml ? (d.hmlDueDays + 'd') : '', SemPresup: d.semBudget ? (d.budgetDevPct + '%') : '' }))), 'Deals');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ffInvestorAgg(comp).map(i => ({ Inversionista: i.name, Deals: i.nDeals, Capital: i.capital, Distribuido: i.pagado, UtilidadEntregada: i.entregada, EnTrabajo: i.pendiente }))), 'Inversionistas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ffAggBy(comp.deals, d => d.city).map(z => ({ Zona: z.k, Deals: z.n, Capital: Math.round(z.capital), Margen: Math.round(z.margen), Deficit: Math.round(z.deficit) }))), 'Zonas');
  XLSX.writeFile(wb, 'FF_Informe.xlsx');
}
function ffCopyResumenFF() {
  const comp = ffCompute();
  const { kpi, deals } = comp;
  const nAllin = deals.filter(d => d.semAllin).length, nHml = deals.filter(d => d.semHml).length, nBud = deals.filter(d => d.semBudget).length;
  const vencidos = deals.filter(d => d.semHml && d.hmlDueDays < 0).map(d => ffShort(d.address) + ' (' + Math.abs(d.hmlDueDays) + 'd vencido)');
  const utilEnt = deals.reduce((s, d) => s + (+d.utilidad_entregada || 0), 0);
  const L = [];
  L.push('FIX & FLIP — RESUMEN EJECUTIVO · ' + new Date().toLocaleDateString('es-MX'));
  L.push('');
  L.push('Deals: ' + kpi.total + ' · Capital: ' + FF_MONEY(kpi.capital) + ' · Equity: ' + FF_MONEY(kpi.equity) + ' · Utilidad entregada: ' + FF_MONEY(utilEnt));
  L.push('Semáforos: all-in>' + Math.round((FF.cfg.all_in_max_pct || 0.75) * 100) + '% = ' + nAllin + ' · HML = ' + nHml + ' · presupuesto = ' + nBud);
  L.push('');
  L.push('3 DECISIONES:');
  L.push('1. ' + (vencidos.length ? 'HML VENCIDOS: ' + vencidos.join(', ') + ' — resolver extensión o refi YA.' : 'Sin HML vencidos — monitorear los próximos vencimientos.'));
  L.push('2. ' + (nAllin ? nAllin + ' casas sobre el ' + Math.round((FF.cfg.all_in_max_pct || 0.75) * 100) + '% del ARV — revisar salida (venta/refi) antes de seguir inyectando.' : 'All-in bajo control.'));
  L.push('3. ' + (nBud ? nBud + ' obras con desvío de presupuesto — cruzar con Remodelación (calibración) antes del próximo deal.' : 'Presupuestos de remodelación dentro de banda.'));
  const txt = L.join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => alert('Resumen copiado.'), () => alert(txt)); else alert(txt);
}
window.ffSecAnalitica = ffSecAnalitica; window.ffExportExcelFF = ffExportExcelFF; window.ffCopyResumenFF = ffCopyResumenFF; window.ffProyeccion = ffProyeccion;

// ════════════════════════════════════════════════════════════════
// CHARTS
// ════════════════════════════════════════════════════════════════
function ffDestroyCharts() { FF._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); FF._charts = []; }
function ffMountCharts(comp) {
  if (document.getElementById('ff-mao-res')) ffUwCalc(); // calcula al montar Underwriting
  if (!window.Chart) return;
  const mk = (id, cfg) => { const el = document.getElementById(id); if (!el) return; try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) {} cfg.options = Object.assign({ resizeDelay: 200 }, cfg.options || {}); FF._charts.push(new Chart(el, cfg)); };
  const ax = { grid: { color: ffGridC() }, ticks: { color: ffAx(), font: { size: 10 } } };
  const gext = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: ffAx(), font: { size: 10 } } }, y: ax } };
  // capital por etapa
  const byStage = FF_STAGES.map(([k, lbl]) => ({ lbl, v: comp.deals.filter(d => d.stage === k).reduce((s, d) => s + d.allIn, 0) / 1000 }));
  mk('ff-stage', { type: 'bar', data: { labels: byStage.map(x => x.lbl), datasets: [{ data: byStage.map(x => x.v), borderRadius: 5, backgroundColor: '#3a5be0' }] }, options: gext });
  // margen/déficit por deal
  const md = comp.deals.filter(d => d.arv > 0).map(d => ({ n: ffShort(d.address).slice(0, 16), v: ((d.deficit != null && d.deficit > 0) ? -d.deficit : d.margin) })).sort((a, b) => a.v - b.v).slice(0, 14);
  mk('ff-margin', { type: 'bar', data: { labels: md.map(x => x.n), datasets: [{ data: md.map(x => Math.round(x.v / 1000)), borderRadius: 4, backgroundColor: md.map(x => x.v >= 0 ? '#4ade9e' : '#ff6b6b') }] }, options: { ...gext, indexAxis: 'y', scales: { x: ax, y: { grid: { display: false }, ticks: { color: ffAx(), font: { size: 9 } } } } } });
  // deals por etapa (donut)
  const dc = FF_STAGES.map(([k, lbl]) => ({ lbl, n: comp.deals.filter(d => d.stage === k).length })).filter(x => x.n);
  mk('ff-donut', { type: 'doughnut', data: { labels: dc.map(x => x.lbl), datasets: [{ data: dc.map(x => x.n), backgroundColor: ['#3a5be0', '#5c79f0', '#fbbf24', '#93b0e2', '#4ade9e', '#8b93a1'], borderColor: posGetTheme() === 'light' ? '#fff' : '#131519', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { color: ffAx(), font: { size: 10 }, boxWidth: 8, padding: 8 } } } } });
  // Finanzas: gastos por tipo
  if (document.getElementById('ff-fin-donut')) { const gt = ffGastosPorTipo(); const gl = Object.keys(gt.g), gv = Object.values(gt.g).map(v => Math.round(v / 1000));
    mk('ff-fin-donut', { type: 'doughnut', data: { labels: gl, datasets: [{ data: gv, backgroundColor: ['#ff6b6b', '#3a5be0', '#5c79f0', '#fbbf24', '#93b0e2'], borderColor: posGetTheme() === 'light' ? '#fff' : '#131519', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { color: ffAx(), font: { size: 10 }, boxWidth: 8, padding: 8 } } } } }); }
}
