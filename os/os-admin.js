// ════════════════════════════════════════════════════════════════
// 🛡 PANEL DE ADMIN — usuarios, roles, áreas y soft-delete (ruta /admin del OS).
// Módulo autocontenido (pilar #3): UI + lógica + acceso a datos acá adentro.
// Fuente: RPC admin_users_overview() (SECURITY DEFINER, solo admin) + tabla profiles.
// Escrituras: UPDATE a profiles vía sesión autenticada (policies is_admin()) y
// edge function invite-user para el alta (Supabase Auth manda el email).
// SOFT-DELETE SIEMPRE: desactivar = active=false + archived_at. NUNCA borrar.
// ════════════════════════════════════════════════════════════════

const OSA = { users: [], operationalRoles: [], loaded: false, loading: false, err: null, editId: null };
window.OSA = OSA;

// Las 6 secciones REALES del OS (slugs canónicos — mismos que usa el gating del shell).
// 'pm' quedó como slug legado (Project Management del panel clásico): se muestra si un
// usuario ya lo tiene, pero no se ofrece para asignar.
const OSA_AREAS = [
  { k: 'fix-flip', name: 'Fix & Flip', icon: osIcon('construction') },
  { k: 'remodelacion', name: 'Remodelación', icon: osIcon('hammer') },
  { k: 'rentas', name: 'Rentas', icon: osIcon('house') },
  { k: 'operacion', name: 'Operación', icon: osIcon('settings') },
  { k: 'contable', name: 'Contable', icon: osIcon('notebook') },
  { k: 'education', name: 'Educación', icon: osIcon('graduation-cap') },
  { k: 'ia', name: 'IA (gestor de bandeja)', icon: osIcon('bot') }, // Pedir/Galería son para todos; esta área da la Bandeja a no-admins
];
const OSA_ROLES = [
  { k: 'admin', name: 'admin', desc: 've todo + gestiona usuarios' },
  { k: 'pm', name: 'pm', desc: 'project manager · opera sus áreas' },
  { k: 'editor', name: 'editor', desc: 'edita dentro de sus áreas' },
  { k: 'viewer', name: 'viewer', desc: 'solo ve lo asignado' },
];

function osaRole() { try { return (state && state.role) || 'viewer'; } catch (e) { return 'viewer'; } }
function osaMyId() { try { return state && state.user && state.user.id; } catch (e) { return null; } }
function osaAreaMeta(k) { return OSA_AREAS.find(a => a.k === k) || { k, name: k, icon: '▫️' }; }

function osaCSS() {
  if (document.getElementById('osa-styles')) return;
  const st = document.createElement('style'); st.id = 'osa-styles';
  st.textContent = [
    '#os-root .osa-chip{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;padding:3px 9px;border-radius:20px;background:var(--glass);border:1px solid var(--glassb);color:var(--mut);margin:2px 3px 2px 0;white-space:nowrap}',
    '#os-root .osa-chip.lvl-edit{border-color:rgba(74,222,158,.4);color:var(--pos)}',
    '#os-root .osa-off{opacity:.45}',
    '#os-root .osa-in{background:var(--glass);border:1px solid var(--glassb);border-radius:10px;padding:9px 12px;color:var(--ink);font-size:12.5px;outline:none;width:100%}',
    '#os-root .osa-in:focus{border-color:var(--a2)}',
    '#os-root select.osa-in{width:auto;cursor:pointer}',
    '#os-root .osa-arealab{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;background:var(--glass);border:1px solid var(--glassb);padding:6px 10px;border-radius:10px;cursor:pointer;margin:3px 5px 3px 0;user-select:none}',
    '#os-root .osa-arealab input{cursor:pointer}',
    '#os-root .osa-lvl{font-size:9.5px;border:1px solid var(--glassb);background:transparent;color:var(--mut2);border-radius:7px;padding:2px 7px;cursor:pointer}',
    '#os-root .osa-lvl.on{color:var(--pos);border-color:rgba(74,222,158,.45)}',
    '#os-root .osa-danger{background:transparent;border:1px solid rgba(255,107,107,.4);color:var(--neg);font-size:11px;padding:6px 11px;border-radius:9px;cursor:pointer}',
    '#os-root .osa-ghost{background:var(--glass);border:1px solid var(--glassb);color:var(--mut);font-size:11px;padding:6px 11px;border-radius:9px;cursor:pointer}',
    '#os-root .osa-ghost:hover,#os-root .osa-danger:hover{border-color:var(--a2);color:var(--ink)}',
    '#os-root .osa-edit-row td{background:rgba(58,91,224,.05)}',
  ].join('\n');
  document.head.appendChild(st);
}

// ─── Data ───
async function osaLoad(force) {
  if (OSA.loading) return;
  if (OSA.loaded && !force) return;
  OSA.loading = true; OSA.err = null;
  try {
    const [users, roles] = await Promise.all([
      sb.rpc('admin_users_overview'),
      sb.from('operational_role_assignments').select('role_code,role_name,area,criticality,primary_profile_id,backup_profile_id,required_areas,verified_at,notes').eq('active', true).order('criticality').order('role_name'),
    ]);
    if (users.error) throw users.error;
    OSA.users = users.data || [];
    OSA.operationalRoles = roles.error ? [] : (roles.data || []);
    OSA.loaded = true;
  } catch (e) { OSA.err = e.message || String(e); }
  OSA.loading = false;
  if (window.osRender) osRender();
}
window.osaLoad = osaLoad;

// ─── Render (lo llama osRender vía el view map del router) ───
function osAdminView() {
  osaCSS();
  if (osaRole() !== 'admin') {
    return '<div class="empty"><div style="font-size:40px">' + osIcon('shield') + '</div><div style="margin-top:10px">Solo los administradores pueden ver este panel.</div></div>';
  }
  if (!OSA.loaded && !OSA.err) { osaLoad(); return '<div class="empty">' + osIcon('loader') + ' Cargando usuarios…</div>'; }
  if (OSA.err) {
    return '<div class="empty"><div style="font-size:40px">' + osIcon('alert') + '</div><div class="down" style="margin-top:10px">' + OS_E(OSA.err) + '</div><button class="cbtn" style="margin-top:14px" onclick="osaLoad(true)">Reintentar</button></div>';
  }
  const us = OSA.users;
  const act = us.filter(u => u.active !== false);
  const admins = act.filter(u => u.role === 'admin');
  const kpi = (lab, val, meta) => '<div class="card"><div class="lab">' + lab + '</div><div class="big">' + val + '</div><div class="meta">' + meta + '</div></div>';
  return '<h1>' + osIcon('shield') + ' Panel de <span>Admin</span></h1><div class="sub">Usuarios, roles y áreas permitidas del OS. Desactivar es reversible (soft-delete) — acá no se borra nada.</div>'
    + '<div class="grid k4">'
    + kpi('Usuarios', us.length, 'en el sistema')
    + kpi('Activos', act.length, 'pueden entrar')
    + kpi('Admins', admins.length, 'ven todo + gestionan')
    + kpi('Inactivos', us.length - act.length, 'acceso bloqueado (reversible)')
    + '</div>'
    + osaInviteCard()
    + osaOperationalRolesCard()
    + osaUsersCard(us);
}
window.osAdminView = osAdminView;

function osaInviteCard() {
  const roleOpts = OSA_ROLES.map(r => '<option value="' + r.k + '">' + r.name + ' — ' + r.desc + '</option>').join('');
  const boxes = OSA_AREAS.map(a =>
    '<label class="osa-arealab"><input type="checkbox" id="osa-inv-' + a.k + '" value="' + a.k + '"> ' + a.icon + ' ' + a.name + '</label>'
  ).join('');
  return '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">' + osIcon('plus') + ' Invitar usuario</div><div class="k">Supabase Auth manda el email de invitación</div></div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'
    + '<input id="osa-inv-email" type="email" placeholder="email@ejemplo.com" class="osa-in" style="max-width:280px">'
    + '<select id="osa-inv-role" class="osa-in">' + roleOpts + '</select>'
    + '</div>'
    + '<div class="lab" style="margin-bottom:6px">Áreas visibles (no aplica a admin)</div>'
    + '<div>' + boxes + '</div>'
    + '<div style="margin-top:12px;display:flex;gap:10px;align-items:center"><button class="cbtn" onclick="osaInvite(event)">' + osIcon('mail') + ' Enviar invitación</button><span class="meta" id="osa-inv-msg"></span></div>'
    + '</div>';
}

function osaFmtLast(ts) {
  if (!ts) return '<span style="color:var(--mut2)">nunca entró</span>';
  const d = new Date(ts); const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  const when = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const rel = days === 0 ? 'hoy' : days === 1 ? 'ayer' : 'hace ' + days + 'd';
  return when + ' <span style="color:var(--mut2)">· ' + rel + '</span>';
}

function osaRoleBadge(role) {
  const cls = role === 'admin' ? 'b-ok' : role === 'pm' ? 'b-warn' : '';
  const style = cls ? '' : 'style="background:var(--glass);color:var(--mut)"';
  return '<span class="badge ' + cls + '" ' + style + '>' + OS_E(role) + '</span>';
}

function osaAreaChips(u) {
  if (u.role === 'admin') return '<span class="osa-chip lvl-edit">✳️ todas (admin)</span>';
  const areas = u.allowed_areas || [];
  if (!areas.length) return '<span style="color:var(--mut2);font-size:11px">sin áreas</span>';
  const lv = u.area_levels || {};
  return areas.map(k => {
    const a = osaAreaMeta(k);
    const edit = lv[k] === 'edit';
    return '<span class="osa-chip' + (edit ? ' lvl-edit' : '') + '">' + a.icon + ' ' + OS_E(a.name) + (edit ? ' · edita' : '') + '</span>';
  }).join('');
}

function osaUserRow(u) {
  const me = u.id === osaMyId();
  const inactive = u.active === false;
  const est = inactive
    ? '<span class="badge b-red">inactivo</span>'
    : '<span class="badge b-ok">activo</span>';
  const acts = [];
  acts.push('<button class="osa-ghost" onclick="osaEdit(\'' + u.id + '\')">' + (OSA.editId === u.id ? 'Cerrar' : 'Editar') + '</button>');
  if (!me) {
    if (inactive) acts.push('<button class="osa-ghost" onclick="osaReactivate(\'' + u.id + '\')">↩︎ Reactivar</button>');
    else acts.push('<button class="osa-danger" onclick="osaDeactivate(\'' + u.id + '\',\'' + OS_E(u.email) + '\')">' + osIcon('pause') + ' Desactivar</button>');
  }
  const who = '<div style="font-weight:640">' + OS_E(u.full_name || '—') + (me ? ' <span style="color:var(--mut2);font-size:10px">(vos)</span>' : '') + '</div>'
    + '<div style="color:var(--mut);font-size:11px">' + OS_E(u.email) + '</div>';
  const rowCls = inactive ? ' class="osa-off"' : '';
  let html = '<tr' + rowCls + '><td>' + who + '</td><td>' + osaRoleBadge(u.role) + '</td><td>' + osaAreaChips(u) + '</td><td>' + est + '</td><td style="font-size:11.5px">' + osaFmtLast(u.last_sign_in_at) + '</td><td style="white-space:nowrap;text-align:right">' + acts.join(' ') + '</td></tr>';
  if (OSA.editId === u.id) html += '<tr class="osa-edit-row"><td colspan="6">' + osaEditor(u) + '</td></tr>';
  return html;
}

function osaUsersCard(us) {
  const rows = us.map(osaUserRow).join('');
  return '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">' + osIcon('users') + ' Usuarios (' + us.length + ')</div><div class="k">roles: admin · pm · editor · viewer</div></div>'
    + '<div style="overflow-x:auto"><table class="ptable"><thead><tr><th>Usuario</th><th>Rol</th><th>Áreas permitidas</th><th>Estado</th><th>Último acceso</th><th style="text-align:right">Acciones</th></tr></thead><tbody>'
    + rows + '</tbody></table></div></div>';
}

function osaOperationalRolesCard() {
  const roles = OSA.operationalRoles || [];
  if (!roles.length) return '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">' + osIcon('users') + ' Continuidad operativa</div></div><div class="meta">La matriz de responsables todavía no está disponible.</div></div>';
  const activeUsers = OSA.users.filter(u => u.active !== false);
  const options = (selected, requiredAreas) => '<option value="">Sin asignar</option>' + activeUsers.filter(u =>
    u.role === 'admin' || (requiredAreas || []).every(a => (u.allowed_areas || []).includes(a))
  ).map(u =>
    '<option value="' + u.id + '" ' + (u.id === selected ? 'selected' : '') + '>' + OS_E(u.full_name || u.email) + '</option>'
  ).join('');
  const rows = roles.map(r => {
    const complete = !!r.primary_profile_id && !!r.backup_profile_id && r.primary_profile_id !== r.backup_profile_id;
    return '<tr><td><b>' + OS_E(r.role_name) + '</b><div class="meta">' + OS_E(r.area) + ' · ' + OS_E(r.criticality) + '</div></td>'
      + '<td><select class="osa-in" id="osa-role-primary-' + r.role_code + '">' + options(r.primary_profile_id, r.required_areas) + '</select></td>'
      + '<td><select class="osa-in" id="osa-role-backup-' + r.role_code + '">' + options(r.backup_profile_id, r.required_areas) + '</select></td>'
      + '<td>' + (complete ? '<span class="badge b-ok">cubierto</span>' : '<span class="badge b-warn">pendiente</span>') + '</td>'
      + '<td style="text-align:right"><button class="osa-ghost" onclick="osaSaveOperationalRole(\'' + r.role_code + '\')">Guardar</button></td></tr>';
  }).join('');
  const covered = roles.filter(r => r.primary_profile_id && r.backup_profile_id && r.primary_profile_id !== r.backup_profile_id).length;
  return '<div class="card" style="margin-top:16px"><div class="chart-h"><div class="t">' + osIcon('users') + ' Continuidad operativa (' + covered + '/' + roles.length + ')</div><div class="k">cada función crítica necesita titular y reemplazo</div></div>'
    + '<div class="meta" style="margin-bottom:12px">Jarvis también verifica que ambos estén activos y tengan acceso al área. No uses la misma persona en los dos campos.</div>'
    + '<div style="overflow-x:auto"><table class="ptable"><thead><tr><th>Responsabilidad</th><th>Titular</th><th>Respaldo</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function osaEditor(u) {
  const me = u.id === osaMyId();
  const roleOpts = OSA_ROLES.map(r => '<option value="' + r.k + '" ' + (u.role === r.k ? 'selected' : '') + '>' + r.name + ' — ' + r.desc + '</option>').join('');
  const lv = u.area_levels || {};
  const known = OSA_AREAS.map(a => a.k);
  const legacy = (u.allowed_areas || []).filter(k => !known.includes(k));
  const boxes = OSA_AREAS.concat(legacy.map(k => osaAreaMeta(k))).map(a => {
    const on = (u.allowed_areas || []).includes(a.k);
    const edit = lv[a.k] === 'edit';
    return '<span style="display:inline-flex;align-items:center;gap:4px;margin:3px 8px 3px 0">'
      + '<label class="osa-arealab" style="margin:0"><input type="checkbox" id="osa-ed-' + a.k + '" value="' + a.k + '" ' + (on ? 'checked' : '') + '> ' + a.icon + ' ' + OS_E(a.name) + '</label>'
      + '<button class="osa-lvl' + (edit ? ' on' : '') + '" id="osa-lv-' + a.k + '" data-lvl="' + (edit ? 'edit' : 'view') + '" onclick="osaLvlToggle(\'' + a.k + '\')" title="Nivel de acceso en esta área">' + (edit ? 'edita' : 've') + '</button>'
      + '</span>';
  }).join('');
  const roleSel = me
    ? '<span class="badge b-ok">admin</span> <span class="meta">no podés bajarte el rol a vos mismo</span>'
    : '<select id="osa-ed-role" class="osa-in">' + roleOpts + '</select>';
  return '<div style="padding:6px 2px">'
    + '<div class="lab" style="margin-bottom:6px">Rol</div><div style="margin-bottom:12px">' + roleSel + '</div>'
    + '<div class="lab" style="margin-bottom:6px">Áreas permitidas + nivel (' + osIcon('eye') + ' ve / ' + osIcon('pencil') + ' edita) — no aplica si es admin</div>'
    + '<div style="margin-bottom:12px">' + boxes + '</div>'
    + '<div style="display:flex;gap:10px;align-items:center"><button class="cbtn" onclick="osaSave(\'' + u.id + '\')">' + osIcon('save') + ' Guardar cambios</button><span class="meta" id="osa-ed-msg"></span></div>'
    + '</div>';
}

// ─── Acciones ───
function osaEdit(id) { OSA.editId = OSA.editId === id ? null : id; osRender(); }
window.osaEdit = osaEdit;

function osaLvlToggle(k) {
  const b = document.getElementById('osa-lv-' + k); if (!b) return;
  const nxt = b.dataset.lvl === 'edit' ? 'view' : 'edit';
  b.dataset.lvl = nxt; b.classList.toggle('on', nxt === 'edit');
  b.innerHTML = nxt === 'edit' ? 'edita' : 've';
}
window.osaLvlToggle = osaLvlToggle;

function osaMsg(id, txt, bad) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = txt; el.style.color = bad ? 'var(--neg)' : 'var(--pos)';
}

async function osaSave(id) {
  const u = OSA.users.find(x => x.id === id); if (!u) return;
  const me = id === osaMyId();
  const roleEl = document.getElementById('osa-ed-role');
  const role = me ? u.role : (roleEl ? roleEl.value : u.role);
  const known = OSA_AREAS.map(a => a.k);
  const legacy = (u.allowed_areas || []).filter(k => !known.includes(k));
  const all = known.concat(legacy);
  const areas = []; const levels = {};
  all.forEach(k => {
    const cb = document.getElementById('osa-ed-' + k);
    if (cb && cb.checked) {
      areas.push(k);
      const b = document.getElementById('osa-lv-' + k);
      if (b && b.dataset.lvl === 'edit') levels[k] = 'edit';
    }
  });
  osaMsg('osa-ed-msg', 'guardando…');
  const { error } = await sb.from('profiles').update({ role, allowed_areas: areas, area_levels: levels }).eq('id', id);
  if (error) return osaMsg('osa-ed-msg', 'Error: ' + error.message, true);
  OSA.editId = null;
  await osaLoad(true);
}
window.osaSave = osaSave;

async function osaSaveOperationalRole(code) {
  const primary = document.getElementById('osa-role-primary-' + code);
  const backup = document.getElementById('osa-role-backup-' + code);
  const primaryId = primary && primary.value ? primary.value : null;
  const backupId = backup && backup.value ? backup.value : null;
  if (primaryId && backupId && primaryId === backupId) return alert('El titular y el respaldo deben ser personas diferentes.');
  const { error } = await sb.from('operational_role_assignments').update({
    primary_profile_id: primaryId,
    backup_profile_id: backupId,
    verified_at: primaryId && backupId ? new Date().toISOString() : null,
    verified_by: osaMyId(),
    updated_at: new Date().toISOString(),
  }).eq('role_code', code);
  if (error) return alert('No se pudo guardar: ' + error.message);
  await osaLoad(true);
}
window.osaSaveOperationalRole = osaSaveOperationalRole;

async function osaDeactivate(id, email) {
  if (!confirm('¿Desactivar a ' + email + '?\n\nNo se borra nada: queda inactivo y no puede entrar. Se puede reactivar cuando quieras.')) return;
  const { error } = await sb.from('profiles').update({ active: false, archived_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await osaLoad(true);
}
window.osaDeactivate = osaDeactivate;

async function osaReactivate(id) {
  const { error } = await sb.from('profiles').update({ active: true, archived_at: null }).eq('id', id);
  if (error) return alert('Error: ' + error.message);
  await osaLoad(true);
}
window.osaReactivate = osaReactivate;

async function osaInvite(event) {
  const email = (document.getElementById('osa-inv-email').value || '').trim().toLowerCase();
  if (!email) return osaMsg('osa-inv-msg', 'Poné un email', true);
  const role = document.getElementById('osa-inv-role').value;
  const areas = OSA_AREAS.filter(a => { const cb = document.getElementById('osa-inv-' + a.k); return cb && cb.checked; }).map(a => a.k);
  const btn = event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
  try {
    const session = await sb.auth.getSession();
    const token = (session.data.session && session.data.session.access_token) || window.SUPABASE_ANON_KEY;
    const res = await fetch(window.SUPABASE_URL + '/functions/v1/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      // redirect_origin: el invitado vuelve al MISMO dominio desde el que lo invitaste
      body: JSON.stringify({ email, role, allowed_areas: areas, redirect_origin: location.origin }),
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló la invitación');
    osaMsg('osa-inv-msg', '✓ ' + (r.action === 'invited' ? 'Invitación enviada a ' : 'Usuario actualizado: ') + r.email);
    await osaLoad(true);
  } catch (e) {
    osaMsg('osa-inv-msg', 'Error: ' + e.message, true);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Enviar invitación'; }
}
window.osaInvite = osaInvite;
