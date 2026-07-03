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
  ['rentada', 'Rentada', 'st-ren'], ['refinanciada', 'Refinanciada', 'st-ref'], ['vendida', 'Vendida', 'st-vnd'],
];
const FF_STAGE_LBL = Object.fromEntries(FF_STAGES.map(s => [s[0], s[1]]));
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
  if (dq.revisar) return `<span class="ff-dq ff-dq-rev" title="all-in > 100% del ARV — imposible, probable error de carga">⚠ dato a revisar</span>`;
  if (dq.sinDatos) return `<span class="ff-dq ff-dq-nd" title="all-in y/o ARV en 0 — casa esqueleto sin datos">◌ sin datos</span>`;
  if (dq.preliminar) return `<span class="ff-dq ff-dq-pre" title="obra no finalizada — resultado en curso, no final">⏳ preliminar</span>`;
  return '';
}
// Indicador GLOBAL de calidad de datos: cuántos deals hay que revisar + la lista.
function ffDQBar(comp) {
  const k = comp.kpi; const flagged = k.revisar + k.sinDatos;
  if (!flagged && !k.preliminar) return `<div class="ff-dqbar clean"><div><div class="t">✓ Datos consistentes</div><div class="d">${k.confiablesN}/${k.total} deals confiables · sin valores imposibles</div></div></div>`;
  const revNames = k.revisarList.map(d => `${FF_ESC(ffShort(d.address))} (${Math.round(d.allInPct * 100)}%)`).join(', ');
  return `<div class="ff-dqbar"><div><div class="t">⚠ ${flagged} deal(s) con datos a revisar</div><div class="d">${k.revisar} imposibles (all-in > 100% ARV) · ${k.sinDatos} sin datos · ${k.preliminar} preliminares (obra en curso). <b>Excluidos de promedios/márgenes.</b></div></div>${revNames ? `<div class="lst">${revNames}</div>` : ''}</div>`;
}
function ffAx() { return posGetTheme() === 'light' ? '#64748b' : '#5b6780'; }
function ffGridC() { return posGetTheme() === 'light' ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.05)'; }

// ─── CSS (mismo look del ecosistema, scoped bajo #ff-overlay, con tema claro) ───
function ffInjectCSS() {
  if (document.getElementById('ff-styles')) return;
  const st = document.createElement('style'); st.id = 'ff-styles';
  st.textContent = `
  #ff-overlay{position:fixed;inset:0;z-index:9998;overflow:auto;
    --bg:#06080d;--ink:#eef2f8;--mut:#93a0b6;--mut2:#5b6780;--glass:rgba(255,255,255,.045);--glassb:rgba(255,255,255,.09);
    --a1:#45e3c6;--a2:#4f8dff;--a3:#8a7bff;--pos:#48d69c;--neg:#f0687a;--amber:#e7b65e;
    --mesh1:rgba(69,227,198,.14);--mesh2:rgba(79,141,255,.15);--mesh3:rgba(138,123,255,.12);--bggrad:linear-gradient(180deg,#070a11,#05070c);
    color:var(--ink);background:var(--bg);font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.1px;-webkit-font-smoothing:antialiased}
  #ff-overlay[data-theme="light"]{
    --bg:#eef2f8;--ink:#0f1c2e;--mut:#48566e;--mut2:#8595ac;--glass:rgba(255,255,255,.82);--glassb:rgba(15,23,42,.09);
    --a1:#12b5a0;--a2:#2f6ef0;--a3:#6b5bef;--pos:#0ea371;--neg:#e0455f;--amber:#c98a1e;
    --mesh1:rgba(18,181,160,.10);--mesh2:rgba(47,110,240,.10);--mesh3:rgba(107,91,239,.08);--bggrad:linear-gradient(180deg,#f6f8fc,#eaf0f8)}
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
  #ff-overlay .logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--a1),var(--a2));display:grid;place-items:center;color:#04121a;font-weight:900;font-size:15px;box-shadow:0 6px 20px -6px rgba(79,141,255,.6),inset 0 1px 0 rgba(255,255,255,.4)}
  #ff-overlay .brand b{font-size:15px;font-weight:750}#ff-overlay .brand span{display:block;font-size:9px;color:var(--mut2);letter-spacing:2.4px;margin-top:2px}
  #ff-overlay .navlbl{font-size:9px;letter-spacing:1.8px;color:var(--mut2);text-transform:uppercase;padding:12px 12px 7px;font-weight:700}
  #ff-overlay .nav{display:flex;flex-direction:column;gap:2px}
  #ff-overlay .nav a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--mut);text-decoration:none;font-size:13px;font-weight:500;transition:.16s;position:relative;cursor:pointer}
  #ff-overlay .nav a .i{width:16px;text-align:center;opacity:.85;font-size:13px}
  #ff-overlay .nav a:hover{background:var(--glass);color:var(--ink)}
  #ff-overlay .nav a.on{color:var(--ink);background:linear-gradient(90deg,rgba(69,227,198,.16),rgba(79,141,255,.06));box-shadow:inset 0 0 0 1px var(--glassb)}
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
  #ff-overlay .pill.ai{background:linear-gradient(90deg,rgba(138,123,255,.22),rgba(79,141,255,.14));border-color:rgba(138,123,255,.4);color:var(--ink);cursor:pointer}
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
  #ff-overlay .glow{text-shadow:0 0 22px rgba(69,227,198,.4)}
  #ff-overlay[data-theme="light"] .glow{text-shadow:none}
  #ff-overlay .up{color:var(--pos)}#ff-overlay .down{color:var(--neg)}#ff-overlay .warn{color:var(--amber)}
  #ff-overlay .row2{grid-template-columns:1.6fr minmax(0,1fr);margin-top:16px}#ff-overlay .row3{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px}
  #ff-overlay .chart-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  #ff-overlay .chart-h .t{font-size:13.5px;font-weight:640}#ff-overlay .chart-h .k{font-size:11px;color:var(--mut2)}
  #ff-overlay .legend{display:flex;gap:14px;font-size:11px;color:var(--mut)}#ff-overlay .legend b{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}
  #ff-overlay canvas{max-width:100%}
  #ff-overlay .brain{background:linear-gradient(180deg,rgba(30,28,58,.55),rgba(14,16,32,.55));border:1px solid rgba(138,123,255,.28)}
  #ff-overlay[data-theme="light"] .brain{background:linear-gradient(180deg,rgba(138,123,255,.10),rgba(79,141,255,.05))}
  #ff-overlay .bh{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  #ff-overlay .orb{width:32px;height:32px;border-radius:50%;position:relative;background:radial-gradient(circle at 34% 30%,#a9f5e6,#45e3c6 30%,#4f8dff 70%,#2a2f66);box-shadow:0 0 22px rgba(79,141,255,.55)}
  #ff-overlay .orb::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 0deg,var(--a1),var(--a2),var(--a3),var(--a1)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ffspin 6s linear infinite;opacity:.7}@keyframes ffspin{to{transform:rotate(360deg)}}
  #ff-overlay .bh b{font-size:14px}#ff-overlay .bh span{font-size:9px;color:var(--mut2);display:block;letter-spacing:1.5px;margin-top:2px}
  #ff-overlay .insight{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--glassb)}#ff-overlay .insight:last-of-type{border-bottom:none}
  #ff-overlay .insight .ic{font-size:8px;margin-top:6px}#ff-overlay .ic.r{color:var(--neg)}#ff-overlay .ic.y{color:var(--amber)}#ff-overlay .ic.g{color:var(--pos)}#ff-overlay .ic.b{color:var(--a2)}
  #ff-overlay .insight .tx{font-size:12px;line-height:1.5;color:var(--ink)}#ff-overlay .insight .tx b{font-weight:650}
  #ff-overlay .iaction{font-size:11px;color:var(--a1);margin-top:5px;font-weight:500}
  #ff-overlay .tag{display:inline-block;font-size:9px;letter-spacing:.7px;color:var(--mut2);margin-top:5px;font-weight:700}
  #ff-overlay .chip{font-size:11px;color:var(--mut);background:var(--glass);border:1px solid var(--glassb);padding:6px 11px;border-radius:18px;cursor:pointer}#ff-overlay .chip:hover{color:var(--ink);border-color:var(--a2)}
  #ff-overlay .ask{display:flex;gap:8px;margin-top:14px}
  #ff-overlay .ask input{flex:1;background:var(--glass);border:1px solid rgba(138,123,255,.32);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:12px;outline:none}
  #ff-overlay .ask button{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:750;padding:0 16px;border-radius:11px;cursor:pointer;font-size:12px}
  #ff-overlay .cc-chat{display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto}#ff-overlay .cc-chat:empty{display:none}
  #ff-overlay .cbub{max-width:82%;padding:10px 13px;border-radius:13px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  #ff-overlay .cbub.u{align-self:flex-end;background:linear-gradient(135deg,rgba(69,227,198,.16),rgba(79,141,255,.14));border:1px solid rgba(79,141,255,.3);color:var(--ink)}
  #ff-overlay .cbub.a{align-self:flex-start;background:var(--glass);border:1px solid var(--glassb);color:var(--ink)}
  #ff-overlay .cbub.err{border-color:rgba(240,104,122,.4);color:var(--neg)}#ff-overlay .cbub.think{color:var(--mut2);font-style:italic}
  #ff-overlay .cbub p{margin:0 0 6px}#ff-overlay .cbub p:last-child{margin:0}#ff-overlay .cbub ul,#ff-overlay .cbub ol{margin:4px 0 6px 18px}#ff-overlay .cbub li{margin:3px 0}
  @keyframes ffblink{0%,100%{opacity:.35}50%{opacity:1}}#ff-overlay .cbub.think::after{content:"▋";animation:ffblink 1s infinite}
  #ff-overlay .uwbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  #ff-overlay .uwbar label{font-size:12px;color:var(--mut)}#ff-overlay .uwtag{font-size:11px;color:var(--a1)}
  #ff-overlay .uwrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
  #ff-overlay .uwrow label{font-size:11.5px;color:var(--mut);flex:1}
  #ff-overlay .uwbar select,#ff-overlay .uwrow input,#ff-overlay .uwrow select{background:var(--glass);border:1px solid var(--glassb);border-radius:9px;color:var(--ink);font-size:12px;padding:8px 10px;outline:none}
  #ff-overlay .uwrow input{width:132px;text-align:right}#ff-overlay .uwrow select{width:150px}
  #ff-overlay .uwrow input:focus,#ff-overlay .uwrow select:focus,#ff-overlay .uwbar select:focus{border-color:var(--a2)}
  #ff-overlay .uwres{margin-top:10px;padding-top:10px;border-top:1px solid var(--glassb)}
  #ff-overlay .uwbig{font-size:22px;font-weight:760;letter-spacing:-.4px}#ff-overlay .uwsub{font-size:10.5px;color:var(--mut2);margin-top:3px;line-height:1.5}
  #ff-overlay .repbtn{background:linear-gradient(135deg,var(--a1),var(--a2));border:none;color:#04121a;font-weight:700;padding:8px 13px;border-radius:9px;cursor:pointer;font-size:11.5px}#ff-overlay .repbtn:hover{filter:brightness(1.08)}
  /* KANBAN */
  #ff-overlay .kan{display:flex;gap:13px;overflow-x:auto;padding-bottom:8px}
  #ff-overlay .kcol{flex:1;min-width:210px}
  #ff-overlay .kcol-h{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.6px;padding:0 4px 10px}
  #ff-overlay .kcol-h .cnt{background:var(--glass);border:1px solid var(--glassb);border-radius:20px;padding:1px 8px;color:var(--ink)}
  #ff-overlay .kcard{background:var(--glass);border:1px solid var(--glassb);border-radius:13px;padding:13px;margin-bottom:10px;transition:.16s;cursor:default}
  #ff-overlay .kcard:hover{transform:translateY(-2px);border-color:var(--a2)}
  #ff-overlay .kcard .addr{font-size:12.5px;font-weight:640;color:var(--ink);margin-bottom:3px}
  #ff-overlay .kcard .meta{font-size:10.5px;color:var(--mut2);margin-bottom:9px}
  #ff-overlay .kstrat{font-size:9px;font-weight:700;padding:2px 7px;border-radius:6px}
  #ff-overlay .kstrat.flip{background:rgba(79,141,255,.15);color:var(--a2)}#ff-overlay .kstrat.hold{background:rgba(69,227,198,.14);color:var(--a1)}
  #ff-overlay .krow{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:var(--mut)}#ff-overlay .krow b{color:var(--ink);font-weight:600}
  #ff-overlay .kbar{height:4px;border-radius:4px;background:var(--glassb);overflow:hidden;margin-top:8px}#ff-overlay .kbar i{display:block;height:100%;background:linear-gradient(90deg,var(--a1),var(--a2))}
  #ff-overlay .badge{font-size:10px;padding:3px 9px;border-radius:7px;font-weight:600}
  #ff-overlay .ff-dq{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;letter-spacing:.2px}
  #ff-overlay .ff-dq-rev{background:rgba(240,104,122,.16);color:var(--neg);border:1px solid rgba(240,104,122,.35)}
  #ff-overlay .ff-dq-nd{background:var(--glass);color:var(--mut);border:1px solid var(--glassb)}
  #ff-overlay .ff-dq-pre{background:rgba(231,182,94,.15);color:var(--amber);border:1px solid rgba(231,182,94,.32)}
  #ff-overlay .ff-dqbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 16px;padding:12px 16px;border-radius:13px;background:rgba(240,104,122,.08);border:1px solid rgba(240,104,122,.22)}
  #ff-overlay .ff-dqbar.clean{background:rgba(72,214,156,.08);border-color:rgba(72,214,156,.22)}
  #ff-overlay .ff-dqbar .t{font-size:12.5px;font-weight:700}#ff-overlay .ff-dqbar .d{font-size:11px;color:var(--mut)}
  #ff-overlay .ff-dqbar .lst{font-size:11px;color:var(--mut);margin-left:auto;text-align:right;max-width:60%}
  #ff-overlay .b-ok{background:rgba(72,214,156,.13);color:var(--pos)}#ff-overlay .b-red{background:rgba(240,104,122,.13);color:var(--neg)}#ff-overlay .b-warn{background:rgba(231,182,94,.13);color:var(--amber)}
  #ff-overlay .ptable{width:100%;border-collapse:collapse;font-size:12.5px}
  #ff-overlay .ptable th{text-align:left;color:var(--mut2);font-size:9.5px;letter-spacing:1px;text-transform:uppercase;padding:9px 8px;border-bottom:1px solid var(--glassb);font-weight:700}
  #ff-overlay .ptable td{padding:11px 8px;border-bottom:1px solid var(--glassb)}
  #ff-overlay .ptable tr:hover td{background:var(--glass)}
  #ff-overlay .empty-sec{padding:56px;text-align:center;color:var(--mut2)}
  #ff-overlay .soon{display:inline-block;font-size:9px;font-weight:700;color:var(--a2);background:rgba(79,141,255,.12);padding:2px 8px;border-radius:12px;margin-left:8px}
  #ff-overlay .card,#ff-overlay .main{animation:fffade .35s ease}@keyframes fffade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  @media (max-width:960px){
    #ff-overlay{overflow-x:hidden}#ff-overlay .app{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .side{position:sticky;top:0;height:auto;padding:12px 14px}#ff-overlay .side .navlbl,#ff-overlay .side .foot{display:none}
    #ff-overlay .nav{flex-direction:row;flex-wrap:nowrap;overflow-x:auto;gap:5px}#ff-overlay .nav a{white-space:nowrap;flex-shrink:0}#ff-overlay .nav a.on::before{display:none}
    #ff-overlay .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#ff-overlay .row2,#ff-overlay .row3{grid-template-columns:minmax(0,1fr)}
    #ff-overlay .top{flex-direction:column;padding-right:104px}#ff-overlay .pills{margin-left:0;flex-wrap:wrap}
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
  ov.innerHTML = '<div class="bgfx"></div><div class="gridfx"></div><div class="app"><aside class="side"></aside><main class="main"><div style="padding:60px;color:#5b6780">⏳ Conectando con Airtable Flipping…</div></main></div><button class="pos-theme-btn" onclick="ffToggleTheme()" title="Tema claro/oscuro">◐</button><button class="ffclose" onclick="closeFFCommandCenter()" title="Cerrar">✕</button>';
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
    const [deals, draws, inv] = await Promise.all([
      sb.from('ff_deals').select('*').eq('active', true),
      sb.from('ff_draws').select('*').eq('active', true),
      sb.from('ff_investors').select('*').eq('active', true),
    ]);
    if (deals.error) throw deals.error;
    FF.deals = deals.data || []; FF.draws = draws.data || []; FF.investors = inv.data || [];
  } catch (e) { FF.loadError = e.message || String(e); }
  finally { FF.loading = false; }
}

// ════════════════════════════════════════════════════════════════
// CÁLCULO (join deals+draws → all-in, margen/déficit)
// ════════════════════════════════════════════════════════════════
function ffCompute() {
  const drawByNorm = {}; FF.draws.forEach(d => drawByNorm[d.address_norm] = d);
  const deals = FF.deals.map(d => {
    const dr = drawByNorm[d.address_norm] || null;
    const purchase = Number(d.purchase_price || 0);
    const remComplete = dr ? Number(dr.remodel_complete || 0) : Number(d.remodel_est || 0) * 1.3;
    const holding = dr ? (Number(dr.interest_hml || 0) + Number(dr.services_hml || 0) + Number(dr.interest_until_rent || 0) + Number(dr.furniture || 0) + Number(dr.other_costs || 0)) : 0;
    const allIn = purchase + remComplete + holding;
    const arv = Number(d.arv || 0);
    const margin = arv - allIn; // margen bruto (antes de costos de venta)
    const marginPct = arv ? margin / arv : 0;
    const allInPct = arv ? allIn / arv : 0;
    const deficit = dr ? Number(dr.net_total || 0) : 0; // <0 = déficit (cash inyectado)
    const equity = arv - allIn; // equity potencial
    const dq = ffDataQuality({ allIn, arv, allInPct, stage: d.stage });
    return { ...d, dr, purchase, remComplete, holding, allIn, arv, margin, marginPct, allInPct, deficit, equity, dq, isFlip: d.strategy === 'flip' };
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
    deficitAcum: confiables.reduce((s, d) => s + (d.deficit < 0 ? -d.deficit : 0), 0),
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
  deals.filter(d => d.deficit < -20000 && !(d.dr && Number(d.dr.remodel_internal) >= 100000))
    .sort((a, b) => a.deficit - b.deficit).forEach(d => {
      ins.push({ sev: 'critical', impact: -d.deficit, tag: 'DÉFICIT > $20K', sec: 'deals',
        tx: `<b>${FF_ESC(ffShort(d.address))}</b> arrastra un déficit de <b>${FF_MONEY(-d.deficit)}</b> (regla: OK si flujo+ y acumulado < $20k). Revisar recuperación vía refi o venta.`,
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
  ins.push({ sev: 'info', impact: 146000, tag: 'OVERHEAD FUERA DE QB', sec: 'finanzas',
    tx: `Hay ~<b>$146k</b> de overhead (equipo + plataformas Fix&Flip) que vive fuera de QuickBooks. Sumarlo para P&L real.`, action: 'Conciliar Gastos Equipo + Plataformas contra QuickBooks' });
  ins.push({ sev: 'info', impact: 46000, tag: 'GAP DE INTERESES', sec: 'finanzas',
    tx: `Gap estimado de <b>~$46k</b> de intereses HML no reflejado en libros. Revisar en la conciliación Airtable↔QuickBooks.`, action: 'Revisar intereses HML vs QuickBooks' });
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
  ['underwriting', '∑', 'Underwriting', null],
  ['inversionistas', '◍', 'Inversionistas', () => FF.investors.filter(x => !/flipping\s*rentals/i.test(x.name || '')).length || null],
  ['finanzas', '$', 'Finanzas · QuickBooks', null],
  ['analitica', '▤', 'Analítica & KPIs', null],
  ['cerebro', '◆', 'Cerebro IA', null],
];
function ffRender() {
  const ov = document.getElementById('ff-overlay'); if (!ov) return;
  posApplyTheme(ov);
  const side = ov.querySelector('.side'), main = ov.querySelector('.main');
  if (FF.loadError) { main.innerHTML = `<div class="empty-sec"><div style="font-size:40px">⚠️</div><div style="color:var(--neg);margin-top:10px">${FF_ESC(FF.loadError)}</div><button class="chip" style="margin-top:14px" onclick="ffReload()">Reintentar</button></div>`; return; }
  const comp = ffCompute();
  side.innerHTML = ffSidebar();
  ffDestroyCharts();
  main.innerHTML = ({
    command: () => ffSecCommand(comp), deals: () => ffSecDeals(comp), propiedades: () => ffSecPropiedades(comp),
    underwriting: () => ffSecUnderwriting(comp),
    inversionistas: () => ffSecInversionistas(comp),
    finanzas: () => ffSecFinanzas(comp),
    analitica: () => ffSecFinanzas(comp),
    cerebro: () => ffSecCerebro(comp),
  }[FF.section] || (() => ffSecCommand(comp)))();
  requestAnimationFrame(() => ffMountCharts(comp));
}
window.ffRender = ffRender;
async function ffReload() { await ffLoadAll(); ffRender(); }
window.ffReload = ffReload;
function ffGo(s) { FF.section = s; ffRender(); document.getElementById('ff-overlay')?.scrollTo(0, 0); }
window.ffGo = ffGo;

function ffSidebar() {
  return `<div class="brand"><div class="logo">FF</div><div><b>Fix &amp; Flip OS</b><span>RENTAL PROFITS</span></div></div>
    <div class="navlbl">Fix &amp; Flip</div>
    <nav class="nav">${FF_NAV.map(([k, i, l, cnt]) => {
      const badge = cnt === 'soon' ? '<span class="soon">pronto</span>' : (typeof cnt === 'function' && cnt() ? `<span class="b">${cnt()}</span>` : '');
      return `<a class="${FF.section === k ? 'on' : ''}" onclick="ffGo('${k}')"><span class="i">${i}</span> ${l}${badge}</a>`;
    }).join('')}</nav>
    <div class="foot">Fuente de verdad · <b>Airtable</b> + QuickBooks<br>Solo lectura · sincronizado</div>`;
}
function ffHeader(title, accent, sub) {
  return `<div class="top"><div><h1>${title} · <span>${accent}</span></h1><div class="sub">${sub}</div></div>
    <div class="pills"><div class="pill"><span class="cdot"></span> Airtable en vivo</div>
    <div class="pill ai" onclick="ffGo('cerebro')">◆ <span class="shimmer">Cerebro IA</span></div></div></div>`;
}
function ffStratBadge(d) { return d.strategy === 'flip' ? '<span class="kstrat flip">FLIP</span>' : (d.strategy === 'hold' ? '<span class="kstrat hold">HOLD</span>' : ''); }

// ─── COMMAND CENTER ───
function ffSecCommand(comp) {
  const { kpi, deals } = comp; const insights = ffInsights(comp);
  const crit = insights.filter(i => i.sev === 'critical').length;
  const rehab = deals.filter(d => d.stage === 'en_rehab').length, venta = deals.filter(d => d.stage === 'en_venta').length;
  return `${ffHeader('Command Center', 'Fix &amp; Flip', 'Todo el negocio de Fix &amp; Flip en una vista — pipeline, capital, márgenes, inversionistas y Cerebro.')}
    ${ffDQBar(comp)}
    <div class="grid kpis">
      <div class="card kpi"><div class="lab">Deals activos</div><div class="big">${kpi.activos}</div><div class="meta">${kpi.flips} flip · ${kpi.holds} hold · ${rehab} en rehab · ${venta} en venta</div></div>
      <div class="card kpi"><div class="lab">Capital desplegado</div><div class="big glow">${FF_MONEY(kpi.capital)}</div><div class="meta">all-in de deals activos (compra + remod + holding)</div></div>
      <div class="card kpi"><div class="lab">ARV del portafolio</div><div class="big">${FF_MONEY(kpi.arvTotal)}</div><div class="meta">equity potencial <span class="up">${FF_MONEY(kpi.equity)}</span></div></div>
      <div class="card kpi"><div class="lab">Alertas del Cerebro</div><div class="big">${insights.length}</div><div class="meta"><span class="down">${crit} críticas</span> · déficit acum. <span class="down">${FF_MONEY(kpi.deficitAcum)}</span></div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Capital por etapa del pipeline</div><div class="k">all-in US$</div></div><canvas id="ff-stage" height="150"></canvas></div>
      <div class="card brain"><div class="bh"><div class="orb"></div><div><b>Cerebro IA</b><span>ANÁLISIS EN VIVO · REGLAS</span></div></div>
        ${insights.slice(0, 3).map(i => `<div class="insight"><div class="ic ${i.sev === 'critical' ? 'r' : i.sev === 'warning' ? 'y' : 'b'}">●</div><div class="tx">${i.tx}${i.action ? `<div class="iaction">➜ ${FF_ESC(i.action)}</div>` : ''}<div class="tag">${i.tag}</div></div></div>`).join('')}
        <div class="ask"><input id="ff-ask" placeholder="Preguntá al Cerebro de Fix &amp; Flip…" onkeydown="if(event.key==='Enter')ffAsk()"><button onclick="ffAsk()">Enviar</button></div>
        <div style="margin-top:11px"><span class="chip" onclick="ffGo('cerebro')">Ver todos los insights</span></div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Margen / déficit por deal</div><div class="k">verde = margen · rojo = déficit</div></div><canvas id="ff-margin" height="240"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Deals por etapa</div><div class="k">${kpi.total} total</div></div><canvas id="ff-donut" height="240"></canvas></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card">
      <div class="chart-h"><div class="t">Pipeline resumido</div><div class="k">${kpi.activos} activos · abrí Deals para el Kanban</div></div>
      ${ffDealTable(deals.filter(d => d.stage !== 'vendida').sort((a, b) => a.deficit - b.deficit).slice(0, 10))}
    </div></div>`;
}
function ffDealTable(deals) {
  const badge = d => d.deficit < -20000 ? '<span class="badge b-red">Déficit</span>' : d.allInPct > 0.78 ? '<span class="badge b-warn">All-in alto</span>' : d.margin > 0 ? '<span class="badge b-ok">Sano</span>' : '<span class="badge b-warn">Vigilar</span>';
  return `<table class="ptable"><thead><tr><th>Dirección</th><th>Etapa</th><th>Estrat.</th><th>All-in</th><th>ARV</th><th>Margen</th><th>Déficit</th><th></th></tr></thead><tbody>
    ${deals.map(d => `<tr><td>${FF_ESC(ffShort(d.address))}</td><td>${FF_STAGE_LBL[d.stage] || d.stage}</td><td>${ffStratBadge(d)}</td><td>${FF_MONEY(d.allIn)}</td><td>${FF_MONEY(d.arv)}</td><td class="${d.margin >= 0 ? 'up' : 'down'}">${FF_MONEY(d.margin)}</td><td class="${d.deficit < 0 ? 'down' : ''}">${d.deficit < 0 ? FF_MONEY(d.deficit) : '—'}</td><td>${badge(d)}</td></tr>`).join('')}
  </tbody></table>`;
}

// ─── DEALS & PIPELINE (Kanban) ───
function ffSecDeals(comp) {
  const { deals, kpi } = comp;
  const cols = FF_STAGES.map(([k, lbl]) => ({ k, lbl, items: deals.filter(d => d.stage === k) }));
  return `${ffHeader('Deals &amp; Pipeline', 'Kanban', `${kpi.total} deals · ${kpi.flips} flip / ${kpi.holds} hold · capital ${FF_MONEY(kpi.capital)}`)}
    ${ffDQBar(comp)}
    <div class="kan">${cols.map(c => `<div class="kcol">
      <div class="kcol-h"><span>${c.lbl}</span><span class="cnt">${c.items.length}</span></div>
      ${c.items.sort((a, b) => a.deficit - b.deficit).map(d => ffKanCard(d)).join('') || '<div style="color:var(--mut2);font-size:11px;padding:8px 4px">—</div>'}
    </div>`).join('')}</div>`;
}
function ffKanCard(d) {
  const capturePct = d.arv ? Math.min(100, Math.round(d.allInPct * 100)) : 0;
  return `<div class="kcard"${d.dq.revisar ? ' style="border-color:rgba(240,104,122,.4)"' : ''}>
    <div style="display:flex;justify-content:space-between;align-items:start;gap:6px"><div class="addr">${FF_ESC(ffShort(d.address))}</div>${ffStratBadge(d)}</div>
    ${d.dq.flags.length ? `<div style="margin:5px 0 2px">${ffDQBadge(d.dq)}</div>` : ''}
    <div class="meta">${FF_ESC(d.city || '')} · ${d.sqft ? d.sqft + ' sqft' : 's/d'}${d.dr ? '' : ' · <span style="color:var(--amber)">sin draws</span>'}</div>
    <div class="krow"><span>All-in</span><b>${FF_MONEY(d.allIn)}</b></div>
    <div class="krow"><span>ARV</span><b>${FF_MONEY(d.arv)}</b></div>
    <div class="krow"><span>${d.deficit < 0 ? 'Déficit' : 'Margen'}</span><b class="${(d.deficit < 0 ? -1 : d.margin) >= 0 ? 'up' : 'down'}">${d.deficit < 0 ? FF_MONEY(d.deficit) : FF_MONEY(d.margin)}</b></div>
    <div class="kbar"><i style="width:${capturePct}%;background:${d.allInPct > 0.75 ? 'linear-gradient(90deg,var(--amber),var(--neg))' : 'linear-gradient(90deg,var(--a1),var(--a2))'}"></i></div>
    <div style="font-size:9px;color:var(--mut2);margin-top:4px">all-in ${Math.round(d.allInPct * 100)}% del ARV${d.invLabel ? ' · ' + FF_ESC(d.invLabel) : ''}</div>
  </div>`;
}

// ─── PROPIEDADES ───
function ffSecPropiedades(comp) {
  return `${ffHeader('Propiedades', 'Fix &amp; Flip', `${comp.deals.length} propiedades`)}
    <div class="grid"><div class="card">${ffDealTable([...comp.deals].sort((a, b) => a.deficit - b.deficit))}</div></div>`;
}
// ─── INVERSIONISTAS ───
const FF_OWN = /flipping\s*rentals/i; // la propia empresa (se saca del CRM de inversionistas)
const FF_MODELOS = [
  { k: 'vender-sociedad', name: 'Vender · Sociedad', terms: 'Aporta capital · <b>split 50/50</b> de la ganancia de la venta', ret: '50% de la ganancia', contrato: 'JV / sociedad (venta)' },
  { k: 'vender-servicio', name: 'Vender · Servicio', terms: 'Aporta capital · la empresa cobra <b>fee de servicio</b> · el inversionista se lleva la ganancia', ret: 'Ganancia − fee', contrato: 'Servicio (fee de gestión)' },
  { k: 'rentar-sociedad', name: 'Rentar · Sociedad', terms: 'Aporta capital · <b>split 50/50</b> del cashflow + equity de la refi', ret: '50% cashflow + equity', contrato: 'JV / sociedad (hold)' },
  { k: 'rentar-servicio', name: 'Rentar · Servicio', terms: 'Aporta capital · <b>15–18% anual fijo</b> · la empresa opera', ret: '15–18% anual', contrato: 'Servicio (renta fija)' },
];
function ffSecInversionistas(comp) {
  const all = FF.investors;
  const crm = all.filter(x => !FF_OWN.test(x.name || '')); // saca la propia empresa
  const isLLC = x => /LLC/i.test(x.name || '');
  const byRango = {}; crm.forEach(x => { const r = x.ranges || 's/d'; byRango[r] = (byRango[r] || 0) + 1; });
  const conSocio = crm.filter(x => (x.has_partner || '').toUpperCase() === 'SI').length;
  const aporteBase = Math.round((comp.deals.reduce((s, d) => s + d.allIn, 0) / (comp.deals.length || 1)) / 1000) * 1000;
  return `${ffHeader('Inversionistas', 'CRM + Modelos', `${crm.length} inversionistas (sin la propia empresa) · ${crm.filter(isLLC).length} LLCs · ${conSocio} con socio`)}
    <div class="grid kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="card kpi"><div class="lab">Inversionistas</div><div class="big">${crm.length}</div><div class="meta">CRM depurado (sin Flipping Rentals LLC)</div></div>
      <div class="card kpi"><div class="lab">VIP (+5 casas)</div><div class="big glow">${byRango['+5 casas'] || 0}</div><div class="meta">Blanco ${byRango['2-4 casas'] || 0} · Azul ${byRango['1 casa'] || 0} · Amarillo ${byRango['0 casas'] || 0}</div></div>
      <div class="card kpi"><div class="lab">Con socio</div><div class="big">${conSocio}</div><div class="meta">sociedades a documentar</div></div>
      <div class="card kpi"><div class="lab">Contratos sin firmar</div><div class="big down">1</div><div class="meta"><span class="down">9909 Childress</span> · pendiente</div></div>
    </div>
    <div class="chart-h" style="margin:24px 4px 12px"><div class="t">4 modelos parametrizados</div><div class="k">vender/rentar × sociedad/servicio · elegí para generar propuesta</div></div>
    <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${FF_MODELOS.map(m => `<div class="card"><div style="display:flex;justify-content:space-between;align-items:start"><div class="an" style="font-size:14px;font-weight:700">${m.name}</div><span class="kstrat ${m.k.startsWith('vender') ? 'flip' : 'hold'}">${m.ret}</span></div>
        <div style="font-size:12px;color:var(--mut);margin-top:6px;line-height:1.5">${m.terms}</div>
        <div style="font-size:10.5px;color:var(--mut2);margin-top:8px">Contrato: <b style="color:var(--ink)">${m.contrato}</b></div>
        <button class="repbtn" style="margin-top:11px" onclick="ffPropuesta('${m.k}')">✎ Generar propuesta</button></div>`).join('')}
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Cap table · rentabilidad y buy-out</div><div class="k">buy-out = capital + 15%</div></div>
        <div class="uwrow"><label>Aporte base (configurable)</label><input id="ff-cap-base" value="${aporteBase}" oninput="ffCapCalc()" inputmode="decimal"></div>
        <div class="uwres" id="ff-cap-res"></div>
        <div class="meta" style="margin-top:8px">Parametrico: los aportes reales por inversionista se vinculan al deal en Airtable. Rentabilidad 15–18%; buy-out del capital + 15%.</div></div>
      <div class="card"><div class="chart-h"><div class="t">CRM · inversionistas</div><div class="k">persona vs LLC · casco</div></div>
        <table class="ptable"><thead><tr><th>Inversionista</th><th>Tipo</th><th>Casco</th><th>Etapa</th><th>Ciudad</th></tr></thead><tbody>
        ${crm.map(x => `<tr><td>${FF_ESC(x.name || '—')}${(x.has_partner || '').toUpperCase() === 'SI' ? ` <span style="color:var(--a2);font-size:10px">+socio${x.partner_name ? ' ' + FF_ESC(x.partner_name) : ''}</span>` : ''}</td><td>${isLLC(x) ? '<span class="badge b-warn">LLC</span>' : '<span class="badge b-ok">Persona</span>'}</td><td>${FF_ESC(x.ranges || '—')}</td><td style="font-size:11px">${FF_ESC((x.stage || '—')).slice(0, 26)}</td><td>${FF_ESC(x.city || '—')}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}
function ffCapCalc() {
  const base = ffNum('ff-cap-base', 75000); const el = document.getElementById('ff-cap-res'); if (!el) return;
  const r15 = base * 0.15, r165 = base * 0.165, r18 = base * 0.18, buyout = base * 1.15;
  el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:12.5px">
    <div><div class="uwsub">Rentabilidad 15%/año</div><b class="up">${FF_MONEY(r15)}</b></div>
    <div><div class="uwsub">Rentabilidad 18%/año</div><b class="up">${FF_MONEY(r18)}</b></div>
    <div><div class="uwsub">Punto medio 16.5%</div><b>${FF_MONEY(r165)}</b></div>
    <div><div class="uwsub">Buy-out (capital+15%)</div><b class="glow">${FF_MONEY(buyout)}</b></div></div>`;
}
window.ffCapCalc = ffCapCalc;
function ffPropuesta(modelK) {
  const m = FF_MODELOS.find(x => x.k === modelK); if (!m) return;
  ffAsk(`Generá una PROPUESTA de inversión clara y profesional para el modelo "${m.name}" (${m.terms.replace(/<[^>]+>/g, '')}). Incluí: resumen del modelo, números de ejemplo con un aporte típico del portafolio, la rentabilidad (${m.ret}), el contrato (${m.contrato}), y las reglas del negocio (all-in ≤75% ARV, buy-out capital+15%). Español neutro, tono cercano pero profesional.`);
}
window.ffPropuesta = ffPropuesta;

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
  const invertido = comp.deals.reduce((s, d) => s + d.allIn, 0);
  // equity y déficit acumulado: SOLO deals confiables (el error $189k los distorsiona) → comp.kpi
  const equity = comp.kpi.equity;
  const deficit = comp.kpi.deficitAcum;
  // Rentabilidad por casa: solo deals confiables (los flagged no compiten en mejores/peores por margen)
  const best = [...comp.deals].filter(d => d.arv > 0 && d.dq.confiable).sort((a, b) => b.margin - a.margin).slice(0, 6);
  const worst = [...comp.deals].filter(d => d.arv > 0 && d.dq.confiable).sort((a, b) => a.margin - b.margin).slice(0, 6);
  return `${ffHeader('Finanzas', 'QuickBooks + Cockpit', `Invertido ${FF_MONEY(invertido)} · equity ${FF_MONEY(equity)} · déficit ${FF_MONEY(deficit)} · interés ${gt.intPct}% del gasto`)}
    ${ffDQBar(comp)}
    <div class="grid kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="card kpi"><div class="lab">Capital invertido</div><div class="big glow">${FF_MONEY(invertido)}</div><div class="meta">all-in del portafolio</div></div>
      <div class="card kpi"><div class="lab">Equity potencial</div><div class="big up">${FF_MONEY(equity)}</div><div class="meta">ARV − all-in (positivo)</div></div>
      <div class="card kpi"><div class="lab">Déficit acumulado</div><div class="big down">${FF_MONEY(deficit)}</div><div class="meta">casas en rojo · deals confiables (error de datos excluido)</div></div>
      <div class="card kpi"><div class="lab">Intereses / gasto</div><div class="big warn">${gt.intPct}%</div><div class="meta">${FF_MONEY(gt.g['Intereses'])} de ${FF_MONEY(gt.total)}</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Gastos por tipo</div><div class="k">del desglose de draws</div></div><canvas id="ff-fin-donut" height="230"></canvas></div>
      <div class="card"><div class="chart-h"><div class="t">Conciliación Airtable ↔ QuickBooks</div><div class="k">SOLO LECTURA</div></div>
        <table class="ptable"><thead><tr><th>Concepto</th><th>Estado</th><th>Impacto</th></tr></thead><tbody>
        <tr><td>Overhead de equipo + plataformas fuera de libros</td><td><span class="badge b-warn">Fuera de QB</span></td><td class="down">~$146k</td></tr>
        <tr><td>Intereses HML no reflejados</td><td><span class="badge b-warn">Gap</span></td><td class="down">~$46k</td></tr>
        <tr><td>Obligación a inversionistas (pasivo)</td><td><span class="badge b-warn">Cap table</span></td><td>—</td></tr>
        <tr><td>Remodelación (draws)</td><td><span class="badge b-ok">Conciliado</span></td><td>${FF_MONEY(gt.g['Remodelación'])}</td></tr>
        </tbody></table>
        <div class="meta" style="margin-top:10px">P&L / balance / cashflow completos de QuickBooks llegan con el conector QB. Hoy: gastos reales del Airtable + los gaps conocidos.</div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Mejores por margen</div><div class="k">rentabilidad por casa</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th>All-in</th><th>ARV</th><th>Margen</th></tr></thead><tbody>
        ${best.map(d => `<tr><td>${FF_ESC(ffShort(d.address))} ${d.dq.preliminar ? ffDQBadge(d.dq) : ''}</td><td>${FF_MONEY(d.allIn)}</td><td>${FF_MONEY(d.arv)}</td><td class="up">${FF_MONEY(d.margin)}</td></tr>`).join('')}</tbody></table></div>
      <div class="card"><div class="chart-h"><div class="t">Peores por margen</div><div class="k">a corregir/recuperar</div></div>
        <table class="ptable"><thead><tr><th>Casa</th><th>All-in</th><th>ARV</th><th>Margen</th></tr></thead><tbody>
        ${worst.map(d => `<tr><td>${FF_ESC(ffShort(d.address))} ${d.dq.preliminar ? ffDQBadge(d.dq) : ''}</td><td>${FF_MONEY(d.allIn)}</td><td>${FF_MONEY(d.arv)}</td><td class="down">${FF_MONEY(d.margin)}</td></tr>`).join('')}</tbody></table></div>
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
    deals: comp.deals.map(d => ({ dir: ffShort(d.address), etapa: FF_STAGE_LBL[d.stage], estrategia: d.strategy, compra: d.purchase, remodelacion: Math.round(d.remComplete), all_in: Math.round(d.allIn), arv: d.arv, appraisal: d.appraisal, margen: Math.round(d.margin), all_in_pct_arv: Math.round(d.allInPct * 100), deficit: Math.round(d.deficit) })),
    insights: ffInsights(comp).slice(0, 10).map(i => ({ tag: i.tag, detalle: i.tx.replace(/<[^>]+>/g, ''), impacto: Math.round(i.impact) })),
  };
}
function ffChatHTML() {
  return FF.chat.map(m => m.role === 'user' ? `<div class="cbub u">${FF_ESC(m.content)}</div>` : `<div class="cbub a${m.error ? ' err' : ''}${m.thinking ? ' think' : ''}">${m.thinking ? 'Pensando' : (window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(m.content)) : FF_ESC(m.content))}</div>`).join('');
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
    FF.chat.push(r.ok ? { role: 'assistant', content: data.answer || 'Sin respuesta.' } : { role: 'assistant', content: data.error || `Error (HTTP ${r.status}).`, error: true });
  } catch (e) { FF.chat.pop(); FF.chat.push({ role: 'assistant', content: 'No pude conectar: ' + (e.message || e), error: true }); }
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
    const rec = d.deficit < 0 ? Math.round(-d.deficit / monthlyNet) : 0;
    return { ...d, roi, rec: d.deficit < 0 ? rec : null };
  }).sort((a, b) => (b.rec || 0) - (a.rec || 0));
  // Ingeniería inversa: casas que NO nacen en déficit (net ≥ -15k) → su fórmula de draw.
  const sanas = deals.filter(d => d.dr && Number(d.dr.net_total) > -15000).sort((a, b) => Number(b.dr.net_total) - Number(a.dr.net_total)).slice(0, 6);
  return `${ffHeader('Underwriting', 'Calculadoras', 'Todas leen de la base — elegí un deal para autocompletar. MAO, remodelación calibrada, HML, refi, ROI y recuperación del déficit.')}
    <div class="uwbar"><label>Autocompletar desde deal:</label>
      <select id="ff-uw-deal" onchange="ffUwPick(this.value)"><option value="">— elegí un deal —</option>${deals.map(d => `<option value="${d.id}"${sel && sel.id === d.id ? ' selected' : ''}>${FF_ESC(ffShort(d.address))} (${FF_STAGE_LBL[d.stage]})</option>`).join('')}</select>
      ${sel ? `<span class="uwtag">${FF_ESC(ffShort(sel.address))} · ARV ${FF_MONEY(sel.arv)} · all-in ${FF_MONEY(sel.allIn)}</span>` : ''}</div>
    <div class="grid row3">
      <div class="card"><div class="chart-h"><div class="t">MAO · Máxima Oferta</div><div class="k">ARV×75% − costos</div></div>
        ${ffUwIn('mao-arv', 'ARV', dv.arv)}${ffUwIn('mao-rem', 'Remodelación', dv.rem)}${ffUwIn('mao-hold', 'Holding', dv.hold)}
        ${ffUwIn('mao-close', 'Cierre (%ARV)', 2)}${ffUwIn('mao-lend', 'Lender fees (%)', 2)}${ffUwIn('mao-cont', 'Contingencia (%rem)', 10)}
        <div class="uwres" id="ff-mao-res"></div></div>
      <div class="card"><div class="chart-h"><div class="t">Estimador de remodelación</div><div class="k">calibrado · ${cal.n} deals</div></div>
        ${ffUwIn('est-sqft', 'Sqft', dv.sqft)}
        <div class="uwrow"><label>Alcance</label><select id="ff-est-scope" onchange="ffEstim()"><option value="ligero">Ligero ($${Math.round(cal.min)}–${Math.round(cal.p33)}/sqft)</option><option value="medio" selected>Medio ($${Math.round(cal.p33)}–${Math.round(cal.p66)}/sqft)</option><option value="pesado">Pesado ($${Math.round(cal.p66)}–${Math.round(cal.max)}/sqft)</option></select></div>
        <div class="uwres" id="ff-est-res"></div>
        <div style="border-top:1px solid var(--glassb);margin:10px 0;padding-top:10px"><div class="k" style="margin-bottom:6px">Validá un monto:</div>${ffUwIn('est-val', 'Monto remodelación', dv.rem)}<div class="uwres" id="ff-est-val"></div></div></div>
      <div class="card"><div class="chart-h"><div class="t">Préstamo / HML</div><div class="k">pago mensual</div></div>
        ${ffUwIn('hml-amt', 'Monto préstamo', dv.payoff)}${ffUwIn('hml-rate', 'Tasa anual (%)', 12)}
        <div class="uwrow"><label>Tipo</label><select id="ff-hml-type" onchange="ffHml()"><option value="io" selected>Solo interés (HML)</option><option value="am">Amortizado</option></select></div>
        ${ffUwIn('hml-term', 'Plazo (meses)', 360)}<div class="uwres" id="ff-hml-res"></div></div>
    </div>
    <div class="grid row2">
      <div class="card"><div class="chart-h"><div class="t">Cash-out refi</div><div class="k">appraisal×75% − payoff · regla: no superar el pago actual</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>${ffUwIn('refi-app', 'Appraisal', dv.app)}${ffUwIn('refi-ltv', 'LTV (%)', 75)}${ffUwIn('refi-payoff', 'Payoff (deuda actual)', dv.payoff)}</div>
          <div>${ffUwIn('refi-rate', 'Tasa refi (%)', 7)}${ffUwIn('refi-cur', 'Pago actual/mes', sel ? Math.round(sel.hml_payment || sel.holding / 6) : '')}<div class="uwres" id="ff-refi-res"></div></div></div></div>
      <div class="card"><div class="chart-h"><div class="t">🔁 Ingeniería inversa · la fórmula que funciona</div><div class="k">casas que NO nacen en déficit · ⏳ = resultado preliminar (obra en curso)</div></div>
        <div class="k" style="margin-bottom:8px">El draw que cubrió la operación (Remodelación → Rentas). Aplicá esta estructura a deals nuevos.</div>
        <table class="ptable"><thead><tr><th>Casa</th><th>Draw total</th><th>Remod.</th><th>Holding</th><th>Resultado</th></tr></thead><tbody>
        ${sanas.map(d => `<tr><td>${FF_ESC(ffShort(d.address))}${d.dq.preliminar ? ' ' + ffDQBadge(d.dq) : ''}</td><td>${FF_MONEY(d.dr.total_draws)}</td><td>${FF_MONEY(d.dr.remodel_complete)}</td><td>${FF_MONEY(Number(d.dr.interest_hml || 0) + Number(d.dr.services_hml || 0) + Number(d.dr.interest_until_rent || 0))}</td><td class="${d.dq.preliminar ? 'warn' : 'up'}">${FF_MONEY(d.dr.net_total)}${d.dq.preliminar ? ' <span style="font-size:9px">prelim.</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="grid" style="margin-top:16px"><div class="card"><div class="chart-h"><div class="t">ROI y recuperación del déficit</div><div class="k">semáforo: &lt;12m 🟢 · 12–36m 🟡 · &gt;36m 🔴 (neto mensual ~0.5% ARV)</div></div>
      <table class="ptable"><thead><tr><th>Casa</th><th>Estrat.</th><th>All-in</th><th>Margen/Equity</th><th>ROI</th><th>Déficit</th><th>Recuperación</th></tr></thead><tbody>
      ${recRows.map(d => `<tr><td>${FF_ESC(ffShort(d.address))}</td><td>${ffStratBadge(d)}</td><td>${FF_MONEY(d.allIn)}</td><td class="${d.margin >= 0 ? 'up' : 'down'}">${FF_MONEY(d.margin)}</td><td>${Math.round(d.roi * 100)}%</td><td class="${d.deficit < 0 ? 'down' : ''}">${d.deficit < 0 ? FF_MONEY(d.deficit) : '—'}</td><td>${d.rec != null ? `<span style="color:${semColor(d.rec)};font-weight:700">${d.rec} meses</span>` : '<span class="up">sin déficit ✓</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function ffUwIn(id, label, val) { return `<div class="uwrow"><label>${label}</label><input id="ff-${id}" value="${val === '' || val == null ? '' : val}" oninput="ffUwCalc()" inputmode="decimal"></div>`; }
function ffUwPick(id) { FF.uw = FF.uw || {}; FF.uw.dealId = id || null; ffRender(); }
window.ffUwPick = ffUwPick;
function ffUwCalc() { ffMao(); ffEstim(); ffValRemod(); ffHml(); ffRefi(); }
window.ffUwCalc = ffUwCalc;
function ffMao() {
  const arv = ffNum('ff-mao-arv'), rem = ffNum('ff-mao-rem'), hold = ffNum('ff-mao-hold');
  const close = arv * ffNum('ff-mao-close', 2) / 100, lend = arv * 0.75 * ffNum('ff-mao-lend', 2) / 100, cont = rem * ffNum('ff-mao-cont', 10) / 100;
  const mao = arv * 0.75 - rem - hold - close - lend - cont;
  const buy = FF.uw.dealId ? (FF.deals.find(d => d.id === FF.uw.dealId)?.purchase_price || 0) : 0;
  const el = document.getElementById('ff-mao-res'); if (!el) return;
  el.innerHTML = arv > 0 ? `<div class="uwbig">${FF_MONEY(mao)}</div><div class="uwsub">máxima oferta recomendada${buy ? ` · compra real ${FF_MONEY(buy)} <b class="${buy <= mao ? 'up' : 'down'}">${buy <= mao ? '✓ bajo MAO' : '⚠ sobre MAO'}</b>` : ''}</div>` : '<div class="uwsub">Ingresá el ARV.</div>';
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
  el.innerHTML = `<div class="uwbig" style="color:${dentro ? 'var(--pos)' : 'var(--neg)'}">$${Math.round(psf)}/sqft ${dentro ? '✓' : '⚠ FUERA DE RANGO'}</div><div class="uwsub">rango real $${Math.round(cal.min)}–${Math.round(cal.max)}/sqft${dentro ? '' : ' · revisá el monto (posible error de carga)'}</div>`;
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
  el.innerHTML = app > 0 ? `<div class="uwbig ${cashOut >= 0 ? 'up' : 'down'}">${FF_MONEY(cashOut)}</div><div class="uwsub">cash-out · nuevo pago ${FF_MONEY(newPay)}/mes${cur ? ` <b class="${supera ? 'down' : 'up'}">${supera ? '⚠ supera el pago actual' : '✓ ≤ pago actual'}</b>` : ''}</div>` : '<div class="uwsub">Ingresá el appraisal.</div>';
}
window.ffRefi = ffRefi;

// ════════════════════════════════════════════════════════════════
// CHARTS
// ════════════════════════════════════════════════════════════════
function ffDestroyCharts() { FF._charts.forEach(c => { try { c.destroy(); } catch (e) {} }); FF._charts = []; }
function ffMountCharts(comp) {
  if (document.getElementById('ff-mao-res')) ffUwCalc(); // calcula al montar Underwriting
  if (document.getElementById('ff-cap-res')) ffCapCalc(); // cap table al montar Inversionistas
  if (!window.Chart) return;
  const mk = (id, cfg) => { const el = document.getElementById(id); if (!el) return; try { const ex = Chart.getChart && Chart.getChart(el); if (ex) ex.destroy(); } catch (e) {} FF._charts.push(new Chart(el, cfg)); };
  const ax = { grid: { color: ffGridC() }, ticks: { color: ffAx(), font: { size: 10 } } };
  const gext = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: ffAx(), font: { size: 10 } } }, y: ax } };
  // capital por etapa
  const byStage = FF_STAGES.map(([k, lbl]) => ({ lbl, v: comp.deals.filter(d => d.stage === k).reduce((s, d) => s + d.allIn, 0) / 1000 }));
  mk('ff-stage', { type: 'bar', data: { labels: byStage.map(x => x.lbl), datasets: [{ data: byStage.map(x => x.v), borderRadius: 5, backgroundColor: '#4f8dff' }] }, options: gext });
  // margen/déficit por deal
  const md = comp.deals.filter(d => d.arv > 0).map(d => ({ n: ffShort(d.address).slice(0, 16), v: (d.deficit < 0 ? d.deficit : d.margin) })).sort((a, b) => a.v - b.v).slice(0, 14);
  mk('ff-margin', { type: 'bar', data: { labels: md.map(x => x.n), datasets: [{ data: md.map(x => Math.round(x.v / 1000)), borderRadius: 4, backgroundColor: md.map(x => x.v >= 0 ? '#48d69c' : '#f0687a') }] }, options: { ...gext, indexAxis: 'y', scales: { x: ax, y: { grid: { display: false }, ticks: { color: ffAx(), font: { size: 9 } } } } } });
  // deals por etapa (donut)
  const dc = FF_STAGES.map(([k, lbl]) => ({ lbl, n: comp.deals.filter(d => d.stage === k).length })).filter(x => x.n);
  mk('ff-donut', { type: 'doughnut', data: { labels: dc.map(x => x.lbl), datasets: [{ data: dc.map(x => x.n), backgroundColor: ['#4f8dff', '#45e3c6', '#e7b65e', '#8a7bff', '#48d69c', '#93a0b6'], borderColor: posGetTheme() === 'light' ? '#fff' : '#0a0e16', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { color: ffAx(), font: { size: 10 }, boxWidth: 8, padding: 8 } } } } });
  // Finanzas: gastos por tipo
  if (document.getElementById('ff-fin-donut')) { const gt = ffGastosPorTipo(); const gl = Object.keys(gt.g), gv = Object.values(gt.g).map(v => Math.round(v / 1000));
    mk('ff-fin-donut', { type: 'doughnut', data: { labels: gl, datasets: [{ data: gv, backgroundColor: ['#f0687a', '#4f8dff', '#45e3c6', '#e7b65e', '#8a7bff'], borderColor: posGetTheme() === 'light' ? '#fff' : '#0a0e16', borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { color: ffAx(), font: { size: 10 }, boxWidth: 8, padding: 8 } } } } }); }
}
