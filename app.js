// ============================================================
// Empresa OS — Supabase edition
// ============================================================

const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// Estado en memoria (espejo de la DB)
let state = {
  user: null,
  role: 'viewer',
  currentAreaId: null,
  areas: [],
  systems: {} // areaId -> [systems]
};

// ===== Tipos =====
const SYSTEM_TYPES = {
  link: { label: 'Link externo', icon: '🔗', desc: 'URL a una app web o servicio' },
  app: { label: 'App de escritorio', icon: '🖥️', desc: 'Aplicación instalada (usa URL scheme)' },
  table: { label: 'Tabla / Base de datos', icon: '📋', desc: 'Formulario + tabla editable' },
  checklist: { label: 'Checklist / SOP', icon: '✅', desc: 'Lista de pasos marcables' },
  calculator: { label: 'Calculadora', icon: '🧮', desc: 'Inputs numéricos + fórmula' },
  notes: { label: 'Notas / Documento', icon: '📝', desc: 'Texto libre por proyecto' }
};

function uid() { return Math.random().toString(36).slice(2, 10); }
const isAdmin = () => state.role === 'admin';

// ============================================================
// AUTH
// ============================================================
async function initAuth() {
  // NO mostrar el login hasta CONFIRMAR que no hay sesión. En el full-load de un deep-link
  // (/rentas/property-manager, F5, etc.) getSession puede resolver antes de que Supabase restaure
  // la sesión persistida; la autoridad es el evento INITIAL_SESSION de onAuthStateChange.
  document.getElementById('auth-screen')?.classList.add('hidden'); // ocultar login hasta decidir
  let authDecided = false, authSettled = false;
  const showLogin = () => { if (authDecided || window._appShown) return; authDecided = true; showAuth(); };
  const enter = (user) => { if (window._appShown) return; authDecided = true; onLogin(user); };
  sb.auth.onAuthStateChange((event, session) => {
    // Ignorar un SIGNED_OUT ESPURIO durante la carga inicial (race de refresh en full-load de deep-links):
    // solo recargar por un logout REAL, ya asentada la app.
    if (event === 'SIGNED_OUT') { if (window._appShown && authSettled) location.reload(); return; }
    if (session && session.user) { enter(session.user); return; }
    // INITIAL_SESSION SIN sesión → recién ahí sabemos que no hay login y lo mostramos.
    if (event === 'INITIAL_SESSION') showLogin();
  });
  setTimeout(() => { authSettled = true; }, 3000);
  // getSession en paralelo: si ya hay sesión persistida, entrar directo (sin esperar el evento).
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) { enter(session.user); return; }
  } catch (e) {}
  // Red de seguridad: si INITIAL_SESSION no llegó y no hay sesión, mostrar login tras una gracia.
  setTimeout(showLogin, 2000);
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('app').classList.remove('flex');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('app').classList.add('flex');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Errores de Supabase Auth en español entendible (el mensaje crudo viene en inglés)
function authErrorES(error) {
  const m = (error && error.message) || '';
  if (/invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos. Si no la recordás, usá "¿Olvidaste tu contraseña?" o el link mágico.';
  if (/email not confirmed/i.test(m)) return 'Tu email todavía no está confirmado. Revisá tu casilla (y spam) o pedile a un admin que te reenvíe la invitación.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.';
  if (/signups? not allowed|user not found/i.test(m)) return 'Ese email no tiene cuenta. Pedile a un admin que te invite desde el Panel de Admin.';
  if (/network|fetch/i.test(m)) return 'No hay conexión. Revisá tu internet y reintentá.';
  return m || 'No se pudo iniciar sesión. Probá de nuevo.';
}

async function doLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email) return showAuthError('Poné tu email.');
  if (!password) return showAuthError('Poné tu contraseña (o usá el link mágico de abajo).');
  const btn = document.getElementById('auth-login-btn');
  btn.disabled = true; btn.textContent = '⏳ Entrando…';
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return showAuthError(authErrorES(error));

    // MFA challenge si el user tiene factor verificado.
    // sb.auth.mfa.getAuthenticatorAssuranceLevel(): {currentLevel: 'aal1'|'aal2', nextLevel}
    // Si currentLevel != nextLevel, el user necesita verificar TOTP antes de entrar.
    try {
      const { data: aalData } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
        return await promptMfaChallenge(data.user);
      }
    } catch {}

    await onLogin(data.user);
  } finally {
    btn.disabled = false; btn.textContent = 'Iniciar sesión';
  }
}
document.getElementById('auth-login-btn').addEventListener('click', doLogin);
// Enter en email/contraseña = entrar
['auth-email', 'auth-password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});
// 👁 mostrar/ocultar contraseña
document.getElementById('auth-eye')?.addEventListener('click', () => {
  const p = document.getElementById('auth-password');
  p.type = p.type === 'password' ? 'text' : 'password';
});
// ✉️ Link mágico: entra sin contraseña (no crea cuentas — hay que estar invitado)
document.getElementById('auth-magic-btn')?.addEventListener('click', async (ev) => {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Poné tu email arriba y tocá de nuevo.');
  const btn = ev.target; btn.disabled = true; btn.textContent = '⏳ Enviando link…';
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + '/' } });
  btn.disabled = false; btn.textContent = '✉️ Entrar con link al email (sin contraseña)';
  if (error) return showAuthError(authErrorES(error));
  showAuthError('✓ Te mandamos un link a ' + email + '. Abrilo desde este dispositivo y entrás directo (puede tardar 1-2 min; mirá spam).');
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.className = 'text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2';
});

// Reemplaza el formulario de auth por el de challenge MFA.
async function promptMfaChallenge(user) {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;
  const { data: list } = await sb.auth.mfa.listFactors();
  const factor = (list?.totp || []).find(f => f.status === 'verified');
  if (!factor) {
    // No hay factor verificado pero AAL pide aal2 — extraño, dejar entrar
    return await onLogin(user);
  }
  screen.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">🛡️</div>
        <h1 class="text-2xl font-bold">Verificación en dos pasos</h1>
        <p class="text-sm text-slate-500 mt-1">Abrí tu app de autenticación e ingresá el código de 6 dígitos.</p>
      </div>
      <div class="space-y-3">
        <input id="mfa-login-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000" class="w-full border border-slate-300 rounded-lg px-3 py-3 text-2xl text-center tracking-widest font-mono" />
        <div id="mfa-login-err" class="hidden text-sm text-red-600 bg-red-50 rounded-lg p-2"></div>
        <button id="mfa-login-verify" class="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg">Verificar y entrar</button>
        <button id="mfa-login-cancel" class="w-full text-xs text-slate-500 hover:text-slate-900">Cancelar</button>
      </div>
    </div>
  `;
  const codeInput = document.getElementById('mfa-login-code');
  const errEl = document.getElementById('mfa-login-err');
  codeInput.focus();
  const verify = async () => {
    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      errEl.textContent = 'Ingresá los 6 dígitos.';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      const { data: ch, error: cErr } = await sb.auth.mfa.challenge({ factorId: factor.id });
      if (cErr) throw cErr;
      const { error } = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code });
      if (error) throw error;
      await onLogin(user);
    } catch (e) {
      errEl.textContent = 'Código incorrecto. Probá de nuevo.';
      errEl.classList.remove('hidden');
      codeInput.value = '';
      codeInput.focus();
    }
  };
  document.getElementById('mfa-login-verify').addEventListener('click', verify);
  codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
  document.getElementById('mfa-login-cancel').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  });
}

// Validación de complejidad de password. Debe pasar al menos 3 de 4 reglas
// + longitud mínima 8 (consistente con admin-set-password edge function).
function passwordStrength(pwd) {
  const len = (pwd || '').length;
  if (len < 8) return { ok: false, reason: 'Mínimo 8 caracteres' };
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  const passed = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (passed < 3) return { ok: false, reason: 'Usá al menos 3 de: minúscula, mayúscula, número, símbolo' };
  // Bloquear passwords obvias
  const blacklist = ['password','12345678','qwerty12','admin123','letmein','welcome1'];
  if (blacklist.some(b => pwd.toLowerCase().includes(b))) return { ok: false, reason: 'Password muy común, elegí otra' };
  return { ok: true };
}

// (El botón "Registrarse" se quitó del login: las cuentas se crean por invitación
// desde el Panel de Admin. El handler queda por si se re-agrega el botón.)
document.getElementById('auth-signup-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Email inválido');
  const strength = passwordStrength(password);
  if (!strength.ok) return showAuthError('Password débil: ' + strength.reason);
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return showAuthError(error.message);
  if (!data.session) return showAuthError('Revisa tu email para confirmar la cuenta (o desactiva confirmación en Supabase → Auth → Providers).');
  await onLogin(data.user);
});

// "¿Olvidaste tu contraseña?" — manda un email de recovery
document.getElementById('auth-forgot-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showAuthError('Poné tu email arriba y tocá de nuevo.');
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/'
  });
  if (error) return showAuthError(authErrorES(error));
  showAuthError('✓ Te mandamos un email para restablecer tu contraseña. Abrí el link y elegí una nueva (puede tardar 1-2 min; mirá spam).');
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.className = 'text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2';
});

// Detectar el flujo de recovery/invitación — SOLO si el hash trae type=recovery|invite
// (un magic link también trae access_token pero NO debe pedir contraseña nueva).
(async function checkPasswordRecovery() {
  const hash = window.location.hash || '';
  const esRecovery = hash.includes('type=recovery') || hash.includes('type=invite');
  const esMagic = hash.includes('type=magiclink');
  if (esRecovery || esMagic || hash.includes('access_token')) {
    // SIEMPRE limpiar el hash primero — si el user cancela, navega, etc. el hash
    // ya no debe re-ejecutar este flow (quedaba pegado y re-pedía password).
    history.replaceState(null, '', window.location.pathname);
  }
  if (!esRecovery) return; // magic link / otros: Supabase ya inicia sesión solo
  // Supabase ya restauró la sesión → formulario de nueva contraseña (overlay propio).
  setTimeout(() => showNewPasswordForm(), 500);
})();

// Formulario "creá tu nueva contraseña" (recovery e invitaciones) — reemplaza al prompt().
function showNewPasswordForm() {
  if (document.getElementById('pwd-reset-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'pwd-reset-overlay';
  ov.className = 'fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[100]';
  ov.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <div class="text-center mb-5">
        <div class="text-4xl mb-2">🔑</div>
        <h1 class="text-xl font-bold">Creá tu nueva contraseña</h1>
        <p class="text-sm text-slate-500 mt-1">Mínimo 8 caracteres, con al menos 3 de: minúscula, mayúscula, número, símbolo.</p>
      </div>
      <div class="space-y-3">
        <div class="relative">
          <input id="pwd-new" type="password" placeholder="Nueva contraseña" class="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm" />
          <button id="pwd-eye" type="button" tabindex="-1" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">👁</button>
        </div>
        <input id="pwd-new2" type="password" placeholder="Repetila para confirmar" class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
        <div id="pwd-err" class="hidden text-sm text-red-600 bg-red-50 rounded-lg p-2"></div>
        <button id="pwd-save" class="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-slate-700">Guardar y entrar</button>
        <button id="pwd-skip" class="w-full text-xs text-slate-500 hover:text-slate-900">Ahora no (entrar igual)</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const err = m => { const e = ov.querySelector('#pwd-err'); e.textContent = m; e.classList.remove('hidden'); };
  ov.querySelector('#pwd-eye').addEventListener('click', () => { const p = ov.querySelector('#pwd-new'); p.type = p.type === 'password' ? 'text' : 'password'; });
  const save = async () => {
    const p1 = ov.querySelector('#pwd-new').value, p2 = ov.querySelector('#pwd-new2').value;
    const st = passwordStrength(p1);
    if (!st.ok) return err(st.reason);
    if (p1 !== p2) return err('Las contraseñas no coinciden.');
    const btn = ov.querySelector('#pwd-save'); btn.disabled = true; btn.textContent = '⏳ Guardando…';
    const { error } = await sb.auth.updateUser({ password: p1 });
    btn.disabled = false; btn.textContent = 'Guardar y entrar';
    if (error) return err(error.message);
    ov.remove();
    if (window.toast) toast('✓ Contraseña actualizada. Ya estás adentro.', 'success');
  };
  ov.querySelector('#pwd-save').addEventListener('click', save);
  ov.querySelector('#pwd-new2').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  ov.querySelector('#pwd-skip').addEventListener('click', () => ov.remove());
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

async function onLogin(user) {
  if (window._appShown && state.user && state.user.id === user.id) return; // ya logueado (evita doble init por la carrera de auth)
  window._appShown = true;
  state.user = user;
  showApp();  // ocultar login / mostrar la app YA — antes de cargar perfil/datos (así nunca queda pegado en login)
  const { data: profile } = await sb.from('profiles').select('role,allowed_areas,active').eq('id', user.id).single();
  // Usuario desactivado (soft-delete del Panel de Admin) → no entra. Reversible: un admin lo reactiva.
  if (profile && profile.active === false) {
    window._appShown = false; state.user = null;
    alert('Tu acceso está desactivado. Hablá con un administrador si creés que es un error.');
    await sb.auth.signOut();
    return;
  }
  state.role = profile?.role || 'viewer';
  state.allowedAreas = profile?.allowed_areas || [];
  document.getElementById('user-email').textContent = user.email;
  const roleEl = document.getElementById('user-role');
  roleEl.textContent = state.role;
  roleEl.className = `text-[10px] font-bold uppercase tracking-wide ${state.role === 'admin' ? 'text-green-400' : 'text-slate-500'}`;
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin() ? '' : 'none');
  showApp();
  await loadData();
  render();
  // 🌐 Flipping Rentals OS — shell del ecosistema (routing + niveles) sobre el panel clásico.
  if (window.osInit) osInit();
}

// ============================================================
// DATA (Supabase queries)
// ============================================================
async function loadData() {
  const { data: areas, error: e1 } = await sb.from('areas').select('*').order('position');
  if (e1) return alert('Error cargando áreas: ' + e1.message);
  state.areas = areas || [];
  state.systems = {};
  const { data: systems, error: e2 } = await sb.from('systems').select('*').order('position');
  if (e2) return alert('Error cargando sistemas: ' + e2.message);
  for (const a of state.areas) state.systems[a.id] = [];
  for (const s of systems || []) {
    if (!state.systems[s.area_id]) state.systems[s.area_id] = [];
    state.systems[s.area_id].push(s);
  }
  if (!state.currentAreaId && state.areas[0]) state.currentAreaId = state.areas[0].id;
}

async function saveSystemData(system) {
  const { error } = await sb.from('systems').update({ data: system.data }).eq('id', system.id);
  if (error) console.error('saveSystemData', error);
}

// ============================================================
// PWA · Service worker + Install banner
// ============================================================
if ('serviceWorker' in navigator) {
  // ⚠️ SERVICE WORKER DESACTIVADO (kill switch). Cacheaba assets y servía versiones
  // VIEJAS aunque ya se hubiera deployado lo nuevo (bundle viejo, inconsistente en
  // incógnito). La app no es una PWA offline crítica → el deploy debe verse SIEMPRE al
  // instante. No registramos SW nuevo y limpiamos cualquier SW/caché viejo que exista.
  // (El propio /sw.js quedó auto-destructivo para los que ya lo tienen instalado.)
  try {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => { try { r.unregister(); } catch (e) {} });
    }).catch(() => {});
  } catch (e) {}
  if (window.caches && caches.keys) {
    caches.keys().then(keys => keys.forEach(k => { try { caches.delete(k); } catch (e) {} })).catch(() => {});
  }
  // Si un SW deja de controlar la pestaña (transición limpia), recargar UNA vez.
  let _swGone = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_swGone) return;
    _swGone = true;
    window.location.reload();
  });
  // navigate desde notification click (si algún día vuelve el push)
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.type === 'navigate' && ev.data.url) {
      window.location.href = ev.data.url;
    }
  });
}

// ============================================================
// 🔄 Auto-actualización — detecta un deploy nuevo con la pestaña abierta
// ============================================================
// El bundle ya lleva hash (cache-busting permanente) y el index.html no se cachea
// fuerte, así que RECARGAR siempre trae lo último. El hueco que quedaba: un CEO con
// la pestaña abierta días no recarga → nunca ve el deploy. Este módulo hace polling
// liviano de /version.json (el hash del build) y, si cambió respecto al que cargó,
// ofrece un aviso discreto "hay versión nueva — actualizar". Sin limpiar caché a mano.
(function osAutoUpdate() {
  // Badge de versión (siempre, incluso en dev sin build).
  function paintBadge() {
    const el = document.getElementById('app-version-badge');
    if (!el) return;
    const v = window.__APP_VERSION__;
    if (v && v.version) {
      el.textContent = 'v ' + (v.commit || v.version.slice(0, 7));
      el.title = 'Versión desplegada · build ' + v.version + (v.builtAt ? ' · ' + v.builtAt : '');
    } else {
      el.textContent = 'dev';
      el.title = 'Corriendo sin build (scripts sueltos)';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintBadge);
  } else {
    paintBadge();
  }

  const BOOT = (window.__APP_VERSION__ && window.__APP_VERSION__.version) || null;
  if (!BOOT) return; // dev local sin build → no hay manifiesto que comparar

  let notified = false, checking = false;
  async function checkForUpdate() {
    if (notified || checking) return;
    checking = true;
    try {
      const r = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const v = await r.json();
        if (v && v.version && v.version !== BOOT) { notified = true; showUpdateBanner(v); }
      }
    } catch (e) { /* red caída / offline: reintenta en el próximo tick */ }
    finally { checking = false; }
  }

  function showUpdateBanner(v) {
    if (document.getElementById('app-update-banner')) return;
    const b = document.createElement('div');
    b.id = 'app-update-banner';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483000;' +
      'background:#0f172a;color:#f8fafc;padding:10px 14px;border-radius:12px;' +
      'box-shadow:0 10px 34px rgba(0,0,0,.4);border:1px solid #334155;' +
      'font:500 13px/1.35 Inter,system-ui,sans-serif;display:flex;align-items:center;gap:12px;' +
      'max-width:calc(100vw - 32px)';
    const txt = document.createElement('span');
    txt.textContent = '🔄 Hay una versión nueva de Empresa OS.';
    const btn = document.createElement('button');
    btn.textContent = 'Actualizar';
    btn.style.cssText = 'background:#22d3ee;color:#06283d;border:0;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer';
    btn.onclick = () => {
      try { if (window.caches && caches.keys) caches.keys().then(k => k.forEach(x => caches.delete(x))); } catch (e) {}
      window.location.reload();
    };
    const later = document.createElement('button');
    later.textContent = 'Después';
    later.style.cssText = 'background:transparent;color:#94a3b8;border:0;cursor:pointer;font-size:12px;padding:4px';
    later.onclick = () => { b.remove(); notified = false; setTimeout(checkForUpdate, 15 * 60 * 1000); };
    b.appendChild(txt); b.appendChild(btn); b.appendChild(later);
    document.body.appendChild(b);
  }

  // Disparadores: al volver/enfocar la pestaña + cada 5 min + un chequeo temprano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('focus', checkForUpdate);
  setInterval(checkForUpdate, 5 * 60 * 1000);
  setTimeout(checkForUpdate, 30 * 1000);
  window.__checkForUpdate = checkForUpdate; // expuesto para QA
})();

// Captura el evento beforeinstallprompt para ofrecer instalación on-demand
window._deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  window._deferredInstallPrompt = ev;
  // Mostrar mini-banner si no está instalada y no se mostró aún
  const dismissed = localStorage.getItem('pwa_install_dismissed') === '1';
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!dismissed && !installed) showInstallBanner();
});
window.addEventListener('appinstalled', () => {
  localStorage.setItem('pwa_install_dismissed', '1');
  const b = document.getElementById('pwa-install-banner');
  if (b) b.remove();
});

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm z-[70] bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-4 shadow-2xl';
  banner.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="text-3xl">📱</div>
      <div class="flex-1">
        <div class="font-bold text-sm">Instalá Empresa OS</div>
        <div class="text-xs opacity-90 mt-0.5">Acceso rápido desde tu pantalla de inicio. Funciona sin conexión.</div>
        <div class="flex gap-2 mt-2">
          <button onclick="pwaInstall()" class="bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded">Instalar</button>
          <button onclick="pwaDismissInstall()" class="bg-white/20 hover:bg-white/30 text-xs font-bold px-3 py-1.5 rounded">No, gracias</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

async function pwaInstall() {
  const ev = window._deferredInstallPrompt;
  if (!ev) {
    // iOS Safari no soporta beforeinstallprompt — mostrar instrucciones
    alert('Para instalar en iPhone:\n\n1. Tap el botón Compartir (cuadradito con flecha hacia arriba)\n2. Tap "Añadir a pantalla de inicio"\n3. Confirmá.');
    return;
  }
  ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === 'accepted') {
    localStorage.setItem('pwa_install_dismissed', '1');
  }
  window._deferredInstallPrompt = null;
  const b = document.getElementById('pwa-install-banner');
  if (b) b.remove();
}

function pwaDismissInstall() {
  localStorage.setItem('pwa_install_dismissed', '1');
  const b = document.getElementById('pwa-install-banner');
  if (b) b.remove();
}

// En iOS Safari (sin beforeinstallprompt), mostrar banner manualmente si es mobile
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const dismissed = localStorage.getItem('pwa_install_dismissed') === '1';
    if (isIOS && !isStandalone && !dismissed) {
      setTimeout(() => showInstallBanner(), 8000);
    }
  });
}

// ============================================================
// PROPIEDADES — helpers compartidos entre sistemas
// ============================================================
window.propertiesCache = [];

async function loadProperties() {
  const { data } = await sb.from('properties').select('*').order('updated_at', { ascending: false });
  window.propertiesCache = data || [];
  return window.propertiesCache;
}

function propertySelectorHtml(currentId, onChangeFn, saveFn) {
  const opts = '<option value="">— Sin vincular (one-off) —</option>' +
    window.propertiesCache.map(p => `<option value="${p.id}" ${currentId===p.id?'selected':''}>${p.address}${p.arv?` · ARV ${'$'+Math.round(+p.arv).toLocaleString()}`:''}</option>`).join('');
  return `
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-base">🏠</span>
        <h3 class="text-xs font-bold text-blue-900 uppercase">Propiedad</h3>
        ${currentId ? '<span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">VINCULADA</span>' : '<span class="text-[10px] text-slate-500">análisis sin guardar</span>'}
      </div>
      <div class="flex gap-2">
        <select onchange="${onChangeFn}(this.value)" class="flex-1 border border-slate-300 rounded px-3 py-2 text-sm bg-white">${opts}</select>
        <button onclick="${saveFn}()" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-bold whitespace-nowrap">${currentId?'💾 Actualizar':'➕ Guardar como propiedad'}</button>
      </div>
      <p class="text-[10px] text-blue-700 mt-1">Esta info se comparte entre Cashout, ARV, Estimador y Predictor de Cashflow.</p>
    </div>
  `;
}

// ============================================================
// AI ANALYSIS — helper compartido entre sistemas
// ============================================================
window.aiState = {}; // por sistema: { loading, analysis, error }

async function aiAnalyze(systemKey, context, force = false) {
  window.aiState[systemKey] = { loading: true, analysis: null, error: null };
  if (window._aiRefreshCb) window._aiRefreshCb();
  try {
    const { data, error } = await sb.functions.invoke('ai-deep-analyze', {
      body: { system: systemKey, context, force }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    window.aiState[systemKey] = { loading: false, analysis: data, error: null };
  } catch (e) {
    window.aiState[systemKey] = { loading: false, analysis: null, error: e.message || String(e) };
  }
  if (window._aiRefreshCb) window._aiRefreshCb();
}

function aiBoxHtml(systemKey, title, hint, runFn) {
  const s = window.aiState[systemKey] || {};
  return `
    <div class="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4 mt-3">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 class="text-sm font-bold text-purple-900 uppercase">🤖 ${title}</h3>
          <p class="text-[10px] text-purple-700">${hint}</p>
        </div>
        <button onclick="${runFn}()" ${s.loading?'disabled':''} class="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white text-xs font-bold px-3 py-2 rounded whitespace-nowrap">${s.loading?'🔄 Analizando...':'🚀 Analizar con IA'}</button>
      </div>
      ${s.error ? `<div class="text-xs text-red-700 bg-red-100 rounded p-2 mt-2">⚠️ ${s.error}</div>` : ''}
      ${s.loading ? `<div class="text-center py-6 text-purple-700"><div class="text-3xl animate-pulse">🔍</div><p class="text-xs mt-2">Buscando en internet... (30-60s)</p></div>` : ''}
      ${s.analysis ? `<div id="ai-result-${systemKey}"></div>` : ''}
    </div>
  `;
}

function aiResultGenericHtml(a) {
  // Render genérico para cualquier objeto JSON con summary, comps, etc.
  const blocks = [];
  if (a.summary) blocks.push(`<div class="text-xs text-slate-700 italic bg-white rounded p-2 border border-purple-200">"${a.summary}"</div>`);

  // Recorrer keys y renderizar cosas conocidas
  for (const [k, v] of Object.entries(a)) {
    if (k.startsWith('_') || k === 'summary') continue;
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}:</strong> ${v}</div>`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (typeof v[0] === 'string') {
        blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}</strong><ul class="ml-3 list-disc text-slate-700 mt-1">${v.map(x=>`<li>${x}</li>`).join('')}</ul></div>`);
      } else {
        blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')} (${v.length})</strong><div class="space-y-1 mt-1">${v.slice(0,5).map(item => `<div class="text-[10px] text-slate-600">${Object.entries(item).map(([ik,iv])=>`<strong>${ik}:</strong> ${typeof iv==='string'&&iv.startsWith('http')?`<a href="${iv}" target="_blank" class="text-purple-700 hover:underline">${iv.slice(0,40)}...</a>`:iv}`).join(' · ')}</div>`).join('')}</div></div>`);
      }
    } else if (typeof v === 'object') {
      blocks.push(`<div class="bg-white rounded p-2 border border-purple-200 text-xs"><strong class="text-purple-900 uppercase text-[10px]">${k.replace(/_/g,' ')}</strong><div class="mt-1 grid grid-cols-2 gap-1 text-[10px]">${Object.entries(v).map(([ik,iv])=>`<div><span class="text-slate-500">${ik}:</span> <strong>${typeof iv === 'object' ? JSON.stringify(iv) : iv}</strong></div>`).join('')}</div></div>`);
    }
  }
  blocks.push(`<div class="flex items-center justify-between text-[10px] text-slate-500 mt-2"><span>${a._fromCache ? `📦 Cache (${new Date(a._cachedAt).toLocaleDateString()})` : '🌐 Recién analizado'}</span></div>`);
  return `<div class="space-y-2">${blocks.join('')}</div>`;
}

async function upsertProperty(payload, currentId) {
  payload.updated_at = new Date().toISOString();
  if (!payload.user_id) payload.user_id = state.user.id;
  if (currentId) {
    const { error } = await sb.from('properties').update(payload).eq('id', currentId);
    if (error) { alert('Error: ' + error.message); return null; }
    return currentId;
  }
  if (!payload.address) {
    alert('Pon una dirección antes de guardar como propiedad');
    return null;
  }
  const { data, error } = await sb.from('properties').insert(payload).select().single();
  if (error) { alert('Error: ' + error.message); return null; }
  return data.id;
}

// ============================================================
// RENDER
// ============================================================
function render() {
  renderSidebar();
  // Viewer sin áreas asignadas
  if (!isAdmin() && (!state.allowedAreas || state.allowedAreas.length === 0)) {
    document.getElementById('content').innerHTML = `
      <div class="text-center py-20 max-w-md mx-auto">
        <div class="text-5xl mb-4">🔒</div>
        <h3 class="text-lg font-semibold text-slate-700">Sin acceso asignado</h3>
        <p class="text-sm text-slate-500 mt-2">Tu administrador todavía no te asignó áreas de trabajo. Contactalo para pedir acceso.</p>
      </div>`;
    document.getElementById('area-title').textContent = '';
    document.getElementById('area-desc').textContent = '';
    return;
  }
  const area = state.areas.find(a => a.id === state.currentAreaId);
  if (!area) {
    document.getElementById('content').innerHTML = '<p class="text-slate-500">Crea un área para empezar.</p>';
    document.getElementById('area-title').textContent = '';
    document.getElementById('area-desc').textContent = '';
    return;
  }
  document.getElementById('area-title').textContent = `${area.icon} ${area.name}`;
  document.getElementById('area-desc').textContent = area.description || '';
  renderSystems(area);
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  // Admin ve todas las áreas; viewer solo las que el admin le asignó
  const visibleAreas = isAdmin() ? state.areas : state.areas.filter(a => (state.allowedAreas || []).includes(a.id));
  // Si el viewer no tiene áreas asignadas o la actual no está permitida, resetea
  if (!isAdmin() && visibleAreas.length && !visibleAreas.find(a => a.id === state.currentAreaId)) {
    state.currentAreaId = visibleAreas[0].id;
  }
  const e = window.esc || (s => String(s||'').replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c])));
  nav.innerHTML = visibleAreas.map(area => {
    const count = (state.systems[area.id] || []).length;
    return `
      <button onclick="selectArea('${e(area.id)}')"
        class="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition ${state.currentAreaId === area.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'}">
        <span class="text-lg">${e(area.icon)}</span>
        <span class="flex-1 truncate">${e(area.name)}</span>
        <span class="text-xs text-slate-500">${count}</span>
      </button>`;
  }).join('');
}

function selectArea(id) {
  state.currentAreaId = id;
  render();
}

// ════════════════════════════════════════════════════════════
// 👥 GESTIÓN DE EQUIPO (admin: invita usuarios, asigna áreas)
// ════════════════════════════════════════════════════════════
async function openTeamMgmt() {
  if (!isAdmin()) return alert('Solo admins');
  // La gestión de equipo vive ahora en el Panel de Admin del OS (/admin): roles granulares,
  // niveles por área y SOFT-DELETE (acá abajo quedaba un hard-delete — ya no se usa).
  if (window.osNav) { closeModal?.(); osNav('/admin'); return; }
  const { data: profiles, error } = await sb.from('profiles')
    .select('id,email,role,allowed_areas,created_at')
    .order('created_at');
  if (error) return alert('Error: ' + error.message);

  const areaCheckboxes = (selected = [], idPrefix = 'inv') => state.areas.map(a => `
    <label class="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded cursor-pointer">
      <input type="checkbox" value="${a.id}" id="${idPrefix}-area-${a.id}" ${selected.includes(a.id)?'checked':''} class="cursor-pointer" />
      <span>${a.icon} ${a.name}</span>
    </label>`).join('');

  const html = `
    <div class="space-y-4">
      <!-- Invitar nuevo -->
      <div class="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-3">
        <div class="text-xs font-bold uppercase text-emerald-900 mb-2">➕ Invitar usuario nuevo</div>
        <div class="space-y-2">
          <input id="inv-email" type="email" placeholder="email@ejemplo.com" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-600">Rol:</label>
            <select id="inv-role" class="border border-slate-300 rounded px-2 py-1 text-sm">
              <option value="viewer">viewer (solo ver lo asignado)</option>
              <option value="admin">admin (ve todo + gestiona)</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-600 block mb-1">Áreas visibles (no aplica si es admin):</label>
            <div class="flex flex-wrap gap-1">${areaCheckboxes([], 'inv')}</div>
          </div>
          <button onclick="inviteUser()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">📧 Enviar invitación</button>
          <p class="text-[10px] text-slate-500">El usuario recibirá un email para crear su contraseña. El rol y las áreas quedan pre-asignados.</p>
        </div>
      </div>

      <!-- Usuarios actuales -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">Usuarios actuales (${profiles?.length||0})</div>
        <div class="space-y-2">
          ${(profiles || []).map(p => {
            const isCurrent = p.id === state.user.id;
            return `
              <div class="border border-slate-200 rounded-lg p-3 ${isCurrent?'bg-slate-50':''}">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold truncate">${p.email}${isCurrent?' <span class="text-[10px] text-slate-500">(vos)</span>':''}</div>
                    <div class="text-[10px] text-slate-500">Creado: ${new Date(p.created_at).toLocaleDateString('es-MX')}</div>
                  </div>
                  <select onchange="updateUserRole('${p.id}', this.value)" ${isCurrent?'disabled':''} class="text-xs border border-slate-300 rounded px-2 py-1">
                    <option value="viewer" ${p.role==='viewer'?'selected':''}>viewer</option>
                    <option value="admin" ${p.role==='admin'?'selected':''}>admin</option>
                  </select>
                  ${!isCurrent ? `
                    <button onclick="adminSetUserPassword('${(window.esc||((s)=>s))(p.id)}','${(window.esc||((s)=>s))(p.email)}')" class="text-xs text-blue-600 hover:text-blue-800" title="Cambiar contraseña">🔑</button>
                    <button onclick="deleteUser('${(window.esc||((s)=>s))(p.id)}','${(window.esc||((s)=>s))(p.email)}')" class="text-xs text-red-600 hover:text-red-800" title="Eliminar usuario completamente">🗑</button>
                  ` : ''}
                </div>
                ${p.role !== 'admin' ? `
                  <div class="text-[10px] text-slate-500 mb-1">Áreas asignadas:</div>
                  <div class="flex flex-wrap gap-1 mb-2">${areaCheckboxes(p.allowed_areas || [], 'u'+p.id)}</div>
                  <button onclick="updateUserAreas('${p.id}')" class="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1 rounded">💾 Guardar áreas</button>
                ` : '<div class="text-[10px] text-emerald-700 italic">Admin: ve todas las áreas</div>'}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  openModal('👥 Gestión de equipo', html);
}

async function inviteUser(event) {
  const email = document.getElementById('inv-email').value.trim();
  if (!email) return alert('Pon un email');
  const role = document.getElementById('inv-role').value;
  const areas = state.areas.filter(a => document.getElementById(`inv-area-${a.id}`)?.checked).map(a => a.id);
  // BUG FIX: capturar btn ANTES del await (event puede ser null al regresar
  // del await en algunos browsers, lo que rompía el re-enable al fallar).
  const btn = (event && event.target) || event || null;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
  try {
    // Usar el JWT real del user logueado para que la edge function pueda
    // verificar admin server-side (sin esto, requireAuth rechaza con 401).
    const session = await sb.auth.getSession();
    const accessToken = session.data.session?.access_token || window.SUPABASE_ANON_KEY;
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      // redirect_origin: el invitado vuelve al MISMO dominio desde el que lo invitaste
      body: JSON.stringify({ email, role, allowed_areas: areas, redirect_origin: location.origin })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    alert(`✓ ${r.action === 'invited' ? 'Invitación enviada a ' : 'Usuario actualizado: '}${r.email}\n\n${r.action === 'invited' ? 'Va a recibir un email para crear su contraseña.' : ''}`);
    closeModal();
    setTimeout(openTeamMgmt, 200);
  } catch (e) {
    alert('Error: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '📧 Enviar invitación'; }
  }
}

async function updateUserAreas(userId) {
  const areas = state.areas.filter(a => document.getElementById(`u${userId}-area-${a.id}`)?.checked).map(a => a.id);
  const { error } = await sb.from('profiles').update({ allowed_areas: areas }).eq('id', userId);
  if (error) return alert('Error: ' + error.message);
  alert('✓ Áreas actualizadas');
}

async function updateUserRole(userId, role) {
  if (!confirm(`¿Cambiar rol a "${role}"?`)) { setTimeout(openTeamMgmt, 0); return; }
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) return alert('Error: ' + error.message);
  closeModal(); setTimeout(openTeamMgmt, 200);
}

async function deleteUser(userId, email) {
  if (!confirm(`¿Eliminar usuario "${email}" completamente?\n\nEsto borra su PERFIL + CUENTA AUTH. Vas a poder volver a invitar el mismo email después.`)) return;
  try {
    const session = await sb.auth.getSession();
    const accessToken = session.data.session?.access_token || window.SUPABASE_ANON_KEY;
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ user_id: userId })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    if (r.warning) alert('⚠️ ' + r.warning);
    else alert('✓ Usuario eliminado completamente. Podés re-invitar el email cuando quieras.');
    closeModal(); setTimeout(openTeamMgmt, 200);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Admin setea contraseña de otro usuario
async function adminSetUserPassword(userId, email) {
  const newPwd = prompt(`Nueva contraseña para ${email}:\n(mínimo 8 caracteres)`);
  if (!newPwd) return;
  if (newPwd.length < 8) return alert('La contraseña debe tener al menos 8 caracteres');
  if (!confirm(`¿Cambiar contraseña de ${email}?\n\nEl usuario va a poder loguear con esta nueva contraseña inmediatamente.`)) return;
  try {
    const session = await sb.auth.getSession();
    const accessToken = session.data.session?.access_token || window.SUPABASE_ANON_KEY;
    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ user_id: userId, new_password: newPwd })
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || 'falló');
    alert(`✓ Contraseña actualizada.\nAvisale a ${email} que su nueva contraseña es: ${newPwd}`);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════
// ⚙️ MI PERFIL — cualquier usuario edita sus datos + contraseña
// ════════════════════════════════════════════════════════════
async function openMyProfile() {
  if (!state.user) return;
  const { data: p } = await sb.from('profiles').select('email,role,full_name,phone,allowed_areas,created_at').eq('id', state.user.id).single();
  if (!p) return alert('No se pudo cargar tu perfil');

  const areaNames = state.areas.filter(a => (p.allowed_areas || []).includes(a.id)).map(a => `${a.icon} ${a.name}`);
  const html = `
    <div class="space-y-4">
      <!-- Datos -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-slate-600 mb-3">👤 Mis datos</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Email</label>
            <input value="${p.email}" disabled class="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm text-slate-500" />
            <p class="text-[9px] text-slate-400 mt-0.5">Para cambiar el email contactá a tu admin</p>
          </div>
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">Rol</label>
            <input value="${p.role}" disabled class="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm text-slate-500" />
          </div>
          <div class="col-span-2">
            <label class="block text-[10px] text-slate-500 mb-0.5">Nombre completo</label>
            <input id="mp-name" value="${(p.full_name||'').replace(/"/g,'&quot;')}" placeholder="Nicolas Lara" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div class="col-span-2">
            <label class="block text-[10px] text-slate-500 mb-0.5">Teléfono</label>
            <input id="mp-phone" value="${(p.phone||'').replace(/"/g,'&quot;')}" placeholder="+1 555 ..." class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        ${p.role !== 'admin' ? `
          <div class="mt-3 pt-3 border-t border-slate-100">
            <div class="text-[10px] text-slate-500 mb-1">Áreas con acceso (${areaNames.length}):</div>
            <div class="flex flex-wrap gap-1">${areaNames.length ? areaNames.map(n => `<span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded">${n}</span>`).join('') : '<span class="text-[10px] text-amber-600">Ninguna — contactá a tu admin</span>'}</div>
          </div>
        ` : '<div class="mt-3 pt-3 border-t border-slate-100 text-[10px] text-emerald-700">✨ Como admin, ves todas las áreas y podés gestionar el equipo</div>'}
        <button onclick="saveMyProfile()" class="mt-3 w-full bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold py-2 rounded">💾 Guardar datos</button>
      </div>

      <!-- Cambiar contraseña -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-slate-600 mb-3">🔐 Cambiar contraseña</div>
        <div class="space-y-2">
          <input id="mp-pwd1" type="password" placeholder="Contraseña nueva (mín 8 caracteres)" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <input id="mp-pwd2" type="password" placeholder="Repetí la contraseña" class="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <button onclick="changeMyPassword()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">🔐 Actualizar contraseña</button>
          <p class="text-[10px] text-slate-400">No necesitás tu contraseña actual (ya estás autenticado). Si te olvidás la nueva, usá "olvidé mi contraseña" en login o pedile al admin que te reenvíe una invitación.</p>
        </div>
      </div>

      <!-- MFA (autenticación de dos factores) -->
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs font-bold uppercase text-slate-600 mb-3">🛡️ Verificación en dos pasos (MFA)</div>
        <div id="mp-mfa-body"><div class="text-xs text-slate-400 py-2">Cargando estado MFA...</div></div>
      </div>

      <div class="text-[10px] text-slate-400 text-center">Cuenta creada: ${new Date(p.created_at).toLocaleString('es-MX')}</div>
    </div>
  `;
  openModal('⚙️ Mi perfil', html);
  // Cargar estado MFA async
  setTimeout(loadMfaStatus, 100);
}

// ─── MFA TOTP ────────────────────────────────────────────────
// Usa la API auth.mfa de Supabase (TOTP estándar, compat Authy/Google
// Auth/Authenticator/1Password). El admin tiene que habilitar MFA en
// Supabase dashboard → Authentication → MFA primero.
async function loadMfaStatus() {
  const body = document.getElementById('mp-mfa-body');
  if (!body) return;
  try {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) throw error;
    const verifiedFactors = (data?.totp || []).filter(f => f.status === 'verified');
    if (verifiedFactors.length > 0) {
      const factor = verifiedFactors[0];
      body.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs">
          <div class="font-bold text-emerald-800 mb-1">✓ MFA activado</div>
          <div class="text-emerald-700">Factor: ${(window.esc||((s)=>s))(factor.friendly_name || 'TOTP')}</div>
          <div class="text-[10px] text-emerald-600 mt-1">Creado: ${new Date(factor.created_at).toLocaleDateString('es')}</div>
          <button onclick="disableMfa('${factor.id}')" class="mt-2 w-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold py-1.5 rounded">🗑️ Desactivar MFA</button>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="text-xs text-slate-700 mb-2">
          Agregá una capa extra de seguridad escaneando un código QR con tu app
          de autenticación (Authy, Google Authenticator, 1Password, etc.).
        </div>
        <button onclick="startMfaEnroll()" class="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">🛡️ Activar MFA</button>
        <p class="text-[10px] text-slate-400 mt-2">Necesitarás el código de 6 dígitos cada vez que entres.</p>
      `;
    }
  } catch (e) {
    body.innerHTML = `<div class="text-xs text-amber-700">MFA no disponible en este proyecto Supabase. Pedí al admin que lo habilite en Dashboard → Auth → MFA.</div>`;
  }
}

async function startMfaEnroll() {
  const body = document.getElementById('mp-mfa-body');
  if (!body) return;
  body.innerHTML = '<div class="text-xs text-slate-500 py-2">⏳ Generando código QR...</div>';
  try {
    // Limpia factores en estado 'unverified' previos (signup interrumpido)
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of (list?.totp || [])) {
      if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Empresa OS · ' + new Date().toLocaleDateString('es') });
    if (error) throw error;
    body.innerHTML = `
      <div class="space-y-3">
        <div class="text-xs text-slate-700">
          1. Abrí tu app de autenticación (Authy, Google Authenticator, etc.)
        </div>
        <div class="text-xs text-slate-700">
          2. Escaneá este QR (o pegá el código manualmente):
        </div>
        <div class="bg-white border border-slate-300 rounded p-3 text-center">
          <img src="${data.totp.qr_code}" alt="QR MFA" class="mx-auto" style="max-width:240px"/>
        </div>
        <div class="text-[10px] text-slate-500">
          Código manual: <code class="bg-slate-100 px-1 rounded">${(window.esc||((s)=>s))(data.totp.secret)}</code>
        </div>
        <div class="text-xs text-slate-700">
          3. Ingresá el código de 6 dígitos que muestra la app:
        </div>
        <input id="mp-mfa-code" type="text" placeholder="123456" inputmode="numeric" maxlength="6" class="w-full border border-slate-300 rounded px-3 py-2 text-center text-lg tracking-widest font-mono"/>
        <div class="flex gap-2">
          <button onclick="verifyMfaCode('${data.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">✓ Verificar y activar</button>
          <button onclick="cancelMfaEnroll('${data.id}')" class="px-3 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('mp-mfa-code')?.focus(), 100);
  } catch (e) {
    body.innerHTML = `<div class="text-xs text-red-700">Error: ${(window.esc||((s)=>s))(e.message || e)}</div>`;
  }
}

async function verifyMfaCode(factorId) {
  const code = (document.getElementById('mp-mfa-code')?.value || '').trim();
  if (!/^\d{6}$/.test(code)) return alert('Ingresá los 6 dígitos del código.');
  try {
    const { data: ch, error: cErr } = await sb.auth.mfa.challenge({ factorId });
    if (cErr) throw cErr;
    const { error } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    if (error) throw error;
    alert('✓ MFA activado. La próxima vez que entres te pediremos el código.');
    loadMfaStatus();
  } catch (e) {
    alert('Código incorrecto. Probá de nuevo.\n\n' + (e.message || ''));
  }
}

async function cancelMfaEnroll(factorId) {
  await sb.auth.mfa.unenroll({ factorId }).catch(() => {});
  loadMfaStatus();
}

async function disableMfa(factorId) {
  if (!confirm('¿Desactivar MFA?\n\nVas a entrar solo con email + password (menos seguro).')) return;
  const { error } = await sb.auth.mfa.unenroll({ factorId });
  if (error) return alert('Error: ' + error.message);
  loadMfaStatus();
}

async function saveMyProfile() {
  const full_name = document.getElementById('mp-name').value.trim();
  const phone = document.getElementById('mp-phone').value.trim();
  const { error } = await sb.from('profiles').update({ full_name, phone }).eq('id', state.user.id);
  if (error) return alert('Error: ' + error.message);
  alert('✓ Datos guardados');
}

async function changeMyPassword() {
  const p1 = document.getElementById('mp-pwd1').value;
  const p2 = document.getElementById('mp-pwd2').value;
  const strength = (typeof passwordStrength === 'function') ? passwordStrength(p1) : { ok: p1 && p1.length >= 8 };
  if (!strength.ok) return alert('Password débil: ' + (strength.reason || 'mínimo 8 caracteres'));
  if (p1 !== p2) return alert('Las contraseñas no coinciden');
  const { error } = await sb.auth.updateUser({ password: p1 });
  if (error) return alert('Error: ' + error.message);
  document.getElementById('mp-pwd1').value = '';
  document.getElementById('mp-pwd2').value = '';
  alert('✓ Contraseña actualizada. Te recomendamos cerrar sesión y volver a entrar.');
}

// ════════════════════════════════════════════════════════════
// 📜 AUDITORÍA (admin) — quién hizo qué cambio y cuándo
// ════════════════════════════════════════════════════════════
async function openAuditLog() {
  if (!isAdmin()) return alert('Solo admins');
  const [{ data: events }, { data: team }] = await Promise.all([
    sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    sb.rpc('get_team_audit')
  ]);

  const html = `
    <div class="space-y-3">
      <!-- Últimos accesos -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📅 Últimos accesos</div>
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50"><tr>
              <th class="text-left p-2">Usuario</th>
              <th class="text-left p-2">Rol</th>
              <th class="text-left p-2">Último ingreso</th>
              <th class="text-left p-2">Cuenta creada</th>
            </tr></thead>
            <tbody>
              ${(team || []).map(u => `
                <tr class="border-t border-slate-100">
                  <td class="p-2 font-semibold">${u.email}${u.full_name?` <span class="text-slate-400 font-normal">(${u.full_name})</span>`:''}</td>
                  <td class="p-2"><span class="text-[10px] ${u.role==='admin'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'} px-1.5 py-0.5 rounded">${u.role}</span></td>
                  <td class="p-2 text-slate-600">${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('es-MX') : '<span class="text-amber-600">nunca</span>'}</td>
                  <td class="p-2 text-slate-500">${new Date(u.created_at).toLocaleDateString('es-MX')}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Sin datos</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Últimos cambios -->
      <div>
        <div class="text-xs font-bold uppercase text-slate-600 mb-2">📜 Últimos cambios (100 más recientes)</div>
        <div class="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 sticky top-0"><tr>
              <th class="text-left p-2">Cuándo</th>
              <th class="text-left p-2">Quién</th>
              <th class="text-left p-2">Acción</th>
              <th class="text-left p-2">Tabla</th>
              <th class="text-left p-2">Cambios</th>
            </tr></thead>
            <tbody>
              ${(events || []).map(e => {
                const actionIcon = e.action === 'insert' ? '➕' : e.action === 'delete' ? '🗑️' : '✏️';
                const changesPreview = e.changes ? (
                  e.action === 'update'
                    ? Object.entries(e.changes).slice(0,3).map(([k,v]) => `<code class="text-[10px]">${k}</code>`).join(', ') + (Object.keys(e.changes).length > 3 ? '...' : '')
                    : (e.changes.summary || '')
                ) : '';
                return `
                  <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="alert('Cambios:\\n' + ${JSON.stringify(JSON.stringify(e.changes, null, 2))})">
                    <td class="p-2 text-slate-500 whitespace-nowrap">${new Date(e.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                    <td class="p-2 truncate max-w-[150px]" title="${e.actor_email||''}">${e.actor_email || '<span class="text-slate-400">sistema</span>'}</td>
                    <td class="p-2">${actionIcon} ${e.action}</td>
                    <td class="p-2 text-slate-600"><code class="text-[10px]">${e.table_name}</code></td>
                    <td class="p-2 text-slate-500 truncate max-w-[250px]">${changesPreview}</td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Sin eventos todavía</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Click en una fila para ver el detalle completo del cambio.</p>
      </div>
    </div>
  `;
  openModal('📜 Auditoría', html);
}

function renderSystems(area) {
  const systems = state.systems[area.id] || [];
  const content = document.getElementById('content');
  if (systems.length === 0) {
    content.innerHTML = `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">📦</div>
        <h3 class="text-lg font-semibold text-slate-700">Sin sistemas aún</h3>
        <p class="text-sm text-slate-500 mt-2">${isAdmin() ? 'Agrega links, apps o crea sistemas internos para esta área.' : 'El admin debe agregar sistemas.'}</p>
        ${isAdmin() ? '<button onclick="openAddSystem()" class="mt-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg">+ Nuevo sistema</button>' : ''}
      </div>`;
    return;
  }
  const adminHint = isAdmin() ? '<div class="text-[10px] text-slate-400 mb-2">Admin: arrastrá las tarjetas para reordenar. El orden se guarda automáticamente.</div>' : '';
  content.innerHTML = `
    ${adminHint}
    <div id="sys-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-area-id="${area.id}">
      ${systems.map(sys => systemCard(area, sys)).join('')}
    </div>`;
}

function systemCard(area, sys) {
  const type = SYSTEM_TYPES[sys.type] || { icon: sys.icon || '💎', label: sys.type };
  const admin = isAdmin();
  const adminBtns = admin ? `
    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
      <button onclick="event.stopPropagation(); editSystem('${area.id}','${sys.id}')" class="text-xs text-slate-400 hover:text-slate-900 p-1">✏️</button>
      <button onclick="event.stopPropagation(); deleteSystem('${area.id}','${sys.id}')" class="text-xs text-slate-400 hover:text-red-600 p-1">🗑️</button>
    </div>` : '';
  const dragHandle = admin ? `<span class="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-700 select-none text-lg leading-none" title="Arrastrá para reordenar">⋮⋮</span>` : '';
  const dragAttrs = admin ? `draggable="true" ondragstart="sysDragStart(event,'${sys.id}')" ondragover="sysDragOver(event)" ondragleave="sysDragLeave(event)" ondrop="sysDrop(event,'${area.id}','${sys.id}')" ondragend="sysDragEnd(event)"` : '';
  return `
    <div class="sys-card bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition group" data-sys-id="${sys.id}" ${dragAttrs}>
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          ${dragHandle}
          <div class="text-3xl">${sys.icon || type.icon}</div>
        </div>
        ${adminBtns}
      </div>
      <h4 class="font-semibold text-slate-900">${(window.esc||((s)=>s))(sys.name)}</h4>
      <p class="text-xs text-slate-500 mt-1 line-clamp-2">${(window.esc||((s)=>s))(sys.description || type.label)}</p>
      <button onclick="openSystem('${(window.esc||((s)=>s))(area.id)}','${(window.esc||((s)=>s))(sys.id)}')" class="mt-4 w-full text-sm bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-medium py-2 rounded-lg transition">
        Abrir
      </button>
    </div>`;
}

// ─── Drag & drop reordenar sistemas (solo admin) ───
let _sysDragId = null;
function sysDragStart(ev, sysId) {
  _sysDragId = sysId;
  ev.dataTransfer.effectAllowed = 'move';
  ev.currentTarget.classList.add('opacity-40');
}
function sysDragOver(ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.classList.add('ring-2','ring-slate-900');
}
function sysDragLeave(ev) {
  ev.currentTarget.classList.remove('ring-2','ring-slate-900');
}
function sysDragEnd(ev) {
  ev.currentTarget.classList.remove('opacity-40');
  document.querySelectorAll('.sys-card').forEach(el => el.classList.remove('ring-2','ring-slate-900'));
}
async function sysDrop(ev, areaId, targetSysId) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('ring-2','ring-slate-900');
  const draggedId = _sysDragId;
  _sysDragId = null;
  if (!draggedId || draggedId === targetSysId) return;
  const list = state.systems[areaId] || [];
  const from = list.findIndex(s => s.id === draggedId);
  const to = list.findIndex(s => s.id === targetSysId);
  if (from === -1 || to === -1) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  // Reasignar positions 0..N
  list.forEach((s, i) => s.position = i);
  // Re-render local inmediato
  const area = state.areas.find(a => a.id === areaId);
  if (area) renderSystems(area);
  // Persistir en DB
  const updates = list.map(s => sb.from('systems').update({ position: s.position }).eq('id', s.id));
  const results = await Promise.all(updates);
  const errs = results.filter(r => r.error);
  if (errs.length) console.warn('sysDrop persist errors:', errs.map(e => e.error.message));
}

// ============================================================
// SYSTEM ACTIONS
// ============================================================
function openSystem(areaId, sysId) {
  const sys = (state.systems[areaId] || []).find(s => s.id === sysId);
  if (!sys) return;
  if (sys.type === 'link' || sys.type === 'app') {
    window.open(sys.config.url, '_blank');
    return;
  }
  openInternalSystem(sys);
}

async function deleteSystem(areaId, sysId) {
  if (!confirm('¿Eliminar este sistema?')) return;
  const { error } = await sb.from('systems').delete().eq('id', sysId);
  if (error) return alert('Error: ' + error.message);
  state.systems[areaId] = state.systems[areaId].filter(s => s.id !== sysId);
  render();
}

function editSystem(areaId, sysId) {
  const sys = state.systems[areaId].find(s => s.id === sysId);
  openSystemForm(areaId, sys);
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, html, opts) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  const modal = document.getElementById('modal');
  const inner = modal.querySelector(':scope > div');
  // Reset clases de tamaño previas
  ['max-w-sm','max-w-md','max-w-lg','max-w-xl','max-w-2xl','max-w-3xl','max-w-4xl','max-w-5xl','max-w-6xl','max-w-7xl'].forEach(c => inner.classList.remove(c));
  const size = (opts && opts.size) || '3xl'; // mantener default antiguo por compatibilidad
  inner.classList.add('max-w-' + size);
  modal.classList.remove('hidden');
  // ESC para cerrar
  if (!window._modalEscBound) {
    window._modalEscBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('modal').classList.contains('hidden')) {
        // No cerrar si hay un dialog/prompt encima
        if (document.getElementById('ui-confirm-overlay') || document.getElementById('ui-prompt-overlay')) return;
        closeModal();
      }
    });
  }
  // Click en backdrop cierra
  if (!modal._backdropBound) {
    modal._backdropBound = true;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// ============================================================
// CRUD: sistema
// ============================================================
function openAddSystem() {
  openSystemForm(state.currentAreaId, null);
}

function openSystemForm(areaId, sys) {
  const isEdit = !!sys;
  const data = sys || { id: uid(), type: 'link', name: '', icon: '', description: '', config: {}, data: {} };
  const typeOptions = Object.entries(SYSTEM_TYPES).map(([key, t]) =>
    `<option value="${key}" ${data.type === key ? 'selected' : ''}>${t.icon} ${t.label}</option>`
  ).join('');

  openModal(isEdit ? 'Editar sistema' : 'Nuevo sistema', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select id="f-type" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" ${isEdit ? 'disabled' : ''}>${typeOptions}</select>
        <p class="text-xs text-slate-500 mt-1" id="f-type-desc"></p>
      </div>
      <div class="grid grid-cols-[80px_1fr] gap-3">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Ícono</label>
          <input id="f-icon" value="${data.icon}" placeholder="🏠" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center text-xl" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input id="f-name" value="${data.name}" placeholder="Ej: HubSpot CRM" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <input id="f-desc" value="${data.description || ''}" placeholder="Para qué sirve" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div id="f-extra"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeModal()" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
        <button onclick="saveSystem('${areaId}','${data.id}', ${isEdit})" class="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700">${isEdit ? 'Guardar' : 'Crear'}</button>
      </div>
    </div>
  `);
  document.getElementById('f-type').addEventListener('change', () => renderExtraFields(data));
  renderExtraFields(data);
}

function renderExtraFields(data) {
  const type = document.getElementById('f-type').value;
  document.getElementById('f-type-desc').textContent = SYSTEM_TYPES[type].desc;
  const extra = document.getElementById('f-extra');
  const cfg = data.config || {};
  if (type === 'link') {
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">URL</label>
      <input id="cfg-url" value="${cfg.url || ''}" placeholder="https://app.hubspot.com" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else if (type === 'app') {
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">URL scheme o ruta</label>
      <input id="cfg-url" value="${cfg.url || ''}" placeholder="vscode://file/..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      <p class="text-xs text-slate-500 mt-1">Ej: <code>vscode://</code>, <code>slack://</code></p>`;
  } else if (type === 'table') {
    const cols = (cfg.columns || ['Nombre','Estado','Notas']).join(', ');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Columnas (separadas por coma)</label>
      <input id="cfg-cols" value="${cols}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else if (type === 'checklist') {
    const items = (cfg.items || ['Paso 1','Paso 2','Paso 3']).join('\n');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Pasos (uno por línea)</label>
      <textarea id="cfg-items" rows="5" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">${items}</textarea>`;
  } else if (type === 'calculator') {
    const inputs = (cfg.inputs || [{name:'precio_compra',label:'Precio de compra'},{name:'remodelacion',label:'Remodelación'},{name:'precio_venta',label:'Precio de venta'}])
      .map(i => `${i.name}|${i.label}`).join('\n');
    extra.innerHTML = `
      <label class="block text-sm font-medium text-slate-700 mb-1">Variables (<code>nombre|etiqueta</code>, una por línea)</label>
      <textarea id="cfg-inputs" rows="4" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">${inputs}</textarea>
      <label class="block text-sm font-medium text-slate-700 mb-1 mt-3">Fórmula</label>
      <input id="cfg-formula" value="${cfg.formula || 'precio_venta - precio_compra - remodelacion'}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" />
      <label class="block text-sm font-medium text-slate-700 mb-1 mt-3">Etiqueta del resultado</label>
      <input id="cfg-result-label" value="${cfg.resultLabel || 'Ganancia estimada'}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />`;
  } else {
    extra.innerHTML = `<p class="text-xs text-slate-500">Sin configuración extra.</p>`;
  }
}

async function saveSystem(areaId, sysId, isEdit) {
  const type = document.getElementById('f-type').value;
  const name = document.getElementById('f-name').value.trim();
  if (!name) return alert('Pon un nombre');
  const icon = document.getElementById('f-icon').value.trim();
  const description = document.getElementById('f-desc').value.trim();
  const config = {};
  if (type === 'link' || type === 'app') {
    config.url = document.getElementById('cfg-url').value.trim();
    if (!config.url) return alert('Falta la URL');
  } else if (type === 'table') {
    config.columns = document.getElementById('cfg-cols').value.split(',').map(s => s.trim()).filter(Boolean);
  } else if (type === 'checklist') {
    config.items = document.getElementById('cfg-items').value.split('\n').map(s => s.trim()).filter(Boolean);
  } else if (type === 'calculator') {
    config.inputs = document.getElementById('cfg-inputs').value.split('\n').map(line => {
      const [n, l] = line.split('|').map(s => s.trim());
      return n ? { name: n, label: l || n } : null;
    }).filter(Boolean);
    config.formula = document.getElementById('cfg-formula').value.trim();
    config.resultLabel = document.getElementById('cfg-result-label').value.trim();
  }

  const position = (state.systems[areaId] || []).length;
  const payload = { id: sysId, area_id: areaId, type, name, icon, description, config, data: {}, position };

  let error;
  if (isEdit) {
    ({ error } = await sb.from('systems').update({ name, icon, description, config }).eq('id', sysId));
  } else {
    ({ error } = await sb.from('systems').insert(payload));
  }
  if (error) return alert('Error: ' + error.message);
  await loadData();
  closeModal();
  render();
}

// ============================================================
// SISTEMAS INTERNOS
// ============================================================
function openInternalSystem(sys) {
  if (sys.type === 'table') return openTable(sys);
  if (sys.type === 'checklist') return openChecklist(sys);
  if (sys.type === 'calculator') return openCalculator(sys);
  if (sys.type === 'notes') return openNotes(sys);
  if (sys.type === 'cashout') return openCashout(sys);
  if (sys.type === 'appraisals') return openAppraisals(sys);
  if (sys.type === 'arv-calc') return openArvCalc(sys);
  if (sys.type === 'estimator') return openEstimator(sys);
  if (sys.type === 'rental-predictor') return openRentalPredictor(sys);
  if (sys.type === 'loan-calc') return openLoanCalculator(sys);
  if (sys.type === 'deep-analyzer') return openPropertyAnalyzer(sys);
  if (sys.type === 'remodel-pro') return openRemodelPro(sys);
  if (sys.type === 'command-center') return openCommandCenter(sys);
  if (sys.type === 'ff-command-center') return openFFCommandCenter(sys);
  if (sys.type === 'cronograma') return openCronograma(sys);
  // Planner Semanal = PLAN DE OBRA (Excel del Estimador → calendario día a día por casa). Es su PROPIA
  // pantalla (openWeeklyPlanner), NO el cronograma de operación. El commit 86b6fda la había redirigido
  // por error a openCronograma → "desaparecía". Restaurado a su pantalla original.
  if (sys.type === 'weekly-planner') return (typeof openWeeklyPlanner === 'function') ? openWeeklyPlanner(sys) : openCronograma(sys);
  // Cronogramas viejos de OPERACIÓN (Juan Austin / Limpieza) sí son filtros del Cronograma unificado.
  if (sys.type === 'ops-planner') return openCronograma({ ...sys, name: 'Cronograma', _equipo: 'juan' });
  if (sys.type === 'cleaning-planner') return openCronograma({ ...sys, name: 'Cronograma', _equipo: 'limpieza' });
  if (sys.type === 'remodel-dashboard') return window.openRemodelCommandCenter ? openRemodelCommandCenter({ ...sys, name: 'Command Center · Remodelación' }) : null; // legacy → reemplazado por el RC CC (12-jul)
  if (sys.type === 'remodel-command-center') return openRemodelCommandCenter(sys);
  if (sys.type === 'clickup-dashboard') return openClickupDashboard(sys);
  if (sys.type === 'pm-dashboard') return openPMDashboard(sys);
  if (sys.type === 'pm-rental-mgmt') return openPmSystem();
  // Educación — DESACTIVADO (2026-07): el cockpit se movió a Fliptrack (/admin/educacion).
  // El portal del alumno (/diag + /mi-plan) sigue vivo acá — es autónomo
  // (edge fn edu-generate-plan-from-invite genera el plan al completar el diagnóstico).
  const EDU_TYPES = ['edu-manager', 'mentorship-mgr', 'edu-presentations', 'edu-reports', 'edu-methodology', 'edu-whatsapp'];
  if (EDU_TYPES.includes(sys.type)) return openEduMovedNotice(sys);
}

// Aviso de migración Educación → Fliptrack, con acceso legacy de emergencia.
function openEduMovedNotice(sys) {
  window._eduLegacySys = sys; // sys real de la card, para el acceso legacy
  const FLIPTRACK_URL = 'https://fliptrack-two.vercel.app/admin/educacion';
  openModal('🎓 Educación se movió a Fliptrack', `
    <div class="space-y-4 text-sm">
      <p class="text-base">El cockpit de la mentoría (Manager, Reportes, Metodología, WhatsApp) ahora vive en <b>Fliptrack</b>. Este sistema quedó desactivado.</p>
      <a href="${FLIPTRACK_URL}" target="_blank" rel="noopener"
         class="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-3">
        Abrir Fliptrack → /admin/educacion
      </a>
      <p class="text-slate-400">Los links de diagnóstico ya enviados (<code>/diag</code>) y los planes de los alumnos (<code>/mi-plan</code>) <b>siguen funcionando</b> — no dependen de este panel.</p>
      <button onclick="closeModal(); _openEduLegacy('${sys.type}')"
              class="text-xs text-slate-500 hover:text-slate-300 underline">
        Abrir versión legacy por única vez (solo emergencias)
      </button>
    </div>
  `, { size: 'md' });
}

function _openEduLegacy(type) {
  const sys = (window._eduLegacySys && window._eduLegacySys.type === type) ? window._eduLegacySys : { type };
  if (type === 'edu-manager' || type === 'mentorship-mgr') return openEduManager(sys);
  if (type === 'edu-presentations') return openEduPresentationsSystem(sys);
  if (type === 'edu-reports') return openEduReportsSystem(sys);
  if (type === 'edu-methodology') return openEduMethodologySystem(sys);
  if (type === 'edu-whatsapp') return openEduWhatsappSystem(sys);
}

// ============================================================
// ARV CALCULATOR — predice ARV basado en appraisals históricos
// ============================================================
async function openArvCalc(sys) {
  const [{ data: all }] = await Promise.all([
    sb.from('appraisals').select('*').eq('status', 'done'),
    loadProperties()
  ]);
  const data = all || [];

  if (!data.length) {
    return openModal(`🎯 ${sys.name}`, `<p class="text-sm text-slate-500">Necesitas al menos 1 appraisal procesado. Sube PDFs en 📂 Appraisals primero.</p>`);
  }

  const i = sys.data.input || { zip: '', sqft: 1500, beds: 3, baths: 2, year_built: 1980, condition: 'C3', lot_size: 7000, propertyId: null };
  window._arvCurrentSys = sys;

  openModal(`🎯 ${sys.name}`, `
    ${propertySelectorHtml(i.propertyId, 'arvOnPropertyChange', 'arvSaveProperty')}
    <div class="grid grid-cols-2 gap-6">
      <div class="space-y-3">
        <h4 class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Casa a evaluar</h4>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Zip code</label>
          <input id="ac-zip" value="${i.zip}" placeholder="78744" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Sqft (GLA)</label>
            <input type="number" id="ac-sqft" value="${i.sqft}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Año construcción</label>
            <input type="number" id="ac-year" value="${i.year_built}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Beds</label>
            <input type="number" id="ac-beds" value="${i.beds}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Baths</label>
            <input type="number" step="0.5" id="ac-baths" value="${i.baths}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Lot size (sqft)</label>
            <input type="number" id="ac-lot" value="${i.lot_size}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Condition objetivo</label>
            <select id="ac-cond" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              ${['C1','C2','C3','C4','C5','C6'].map(c => `<option value="${c}" ${i.condition===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <p class="text-[10px] text-slate-400">Tip: post-remodel apunta a C2-C3. C1 es nuevo, C4+ necesita trabajo.</p>
      </div>

      <div class="space-y-3">
        <div class="bg-slate-900 text-white rounded-xl p-5">
          <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">ARV estimado</h4>
          <div id="ac-arv" class="text-4xl font-bold text-green-400">—</div>
          <div id="ac-range" class="text-xs text-slate-400 mt-1">—</div>
          <div class="border-t border-slate-700 mt-3 pt-3 space-y-1 text-xs text-slate-400">
            <div class="flex justify-between"><span>$/sqft usado</span><span id="ac-ppsf">—</span></div>
            <div class="flex justify-between"><span>Comps en zip</span><span id="ac-zip-count">—</span></div>
            <div class="flex justify-between"><span>Confianza</span><span id="ac-confidence">—</span></div>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Comps más similares</h4>
          <div id="ac-comps" class="space-y-2"></div>
        </div>
        ${aiBoxHtml('arv-calc', 'Validar ARV con Redfin/Zillow live', 'Claude busca comps reales sold últimos 6 meses + tendencias del zip + ajustes por condición', 'arvRunAI')}
      </div>
    </div>
  `);
  setTimeout(() => {
    const aiState = window.aiState['arv-calc'];
    const el = document.getElementById('ai-result-arv-calc');
    if (el && aiState?.analysis) el.innerHTML = aiResultGenericHtml(aiState.analysis);
  }, 50);

  const ids = ['ac-zip','ac-sqft','ac-beds','ac-baths','ac-year','ac-lot','ac-cond'];
  const fmt = n => Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';

  const recompute = () => {
    const input = {
      zip: document.getElementById('ac-zip').value.trim(),
      sqft: +document.getElementById('ac-sqft').value || 0,
      beds: +document.getElementById('ac-beds').value || 0,
      baths: +document.getElementById('ac-baths').value || 0,
      year_built: +document.getElementById('ac-year').value || 0,
      lot_size: +document.getElementById('ac-lot').value || 0,
      condition: document.getElementById('ac-cond').value
    };

    // Filtrar comps: zip exacto > zip similar > todos
    const sameZip = data.filter(a => a.zip === input.zip && a.price_per_sqft);
    const useZip = sameZip.length >= 3;
    const pool = useZip ? sameZip : data.filter(a => a.price_per_sqft);

    // Score de similitud
    const condRank = { C1: 1, C2: 2, C3: 3, C4: 4, C5: 5, C6: 6 };
    const targetCond = condRank[input.condition] || 3;
    const scored = pool.map(a => {
      let score = 0;
      // Sqft proximity (50% weight)
      if (a.gla_sqft && input.sqft) score += 50 * (1 - Math.min(1, Math.abs(a.gla_sqft - input.sqft) / input.sqft));
      // Beds/baths match (10% each)
      if (a.bedrooms === input.beds) score += 10;
      if (a.bathrooms === input.baths) score += 10;
      // Condition proximity (15%)
      const ac = condRank[a.condition_rating] || 3;
      score += 15 * (1 - Math.abs(ac - targetCond) / 5);
      // Year proximity (10%)
      if (a.year_built && input.year_built) score += 10 * (1 - Math.min(1, Math.abs(a.year_built - input.year_built) / 50));
      // Zip exact bonus (5%)
      if (a.zip === input.zip) score += 5;
      return { ...a, similarity: score };
    }).sort((x, y) => y.similarity - x.similarity);

    // Top comps para promedio (top 5 o todos si <5)
    const topN = scored.slice(0, Math.min(5, scored.length));
    const weights = topN.map(c => c.similarity);
    const totalW = weights.reduce((s,w) => s+w, 0) || 1;
    const avgPpsf = topN.reduce((s,c,idx) => s + (+c.price_per_sqft) * weights[idx], 0) / totalW;

    // Ajuste por condition objetivo vs comps
    const compAvgCond = topN.reduce((s,c) => s + (condRank[c.condition_rating] || 3), 0) / topN.length;
    const condAdjustment = (compAvgCond - targetCond) * 0.04; // 4% por nivel mejor
    const adjustedPpsf = avgPpsf * (1 + condAdjustment);

    const arv = adjustedPpsf * input.sqft;
    const rangeLow = arv * 0.93;
    const rangeHigh = arv * 1.07;

    let confidence = 'Baja';
    if (sameZip.length >= 5 && input.sqft) confidence = 'Alta';
    else if (sameZip.length >= 3 || pool.length >= 8) confidence = 'Media';

    document.getElementById('ac-arv').textContent = fmt(arv);
    document.getElementById('ac-range').textContent = `Rango: ${fmt(rangeLow)} – ${fmt(rangeHigh)}`;
    document.getElementById('ac-ppsf').textContent = '$' + adjustedPpsf.toFixed(0) + '/sqft';
    document.getElementById('ac-zip-count').textContent = `${sameZip.length} (de ${data.length} total)`;
    document.getElementById('ac-confidence').textContent = confidence + (useZip ? '' : ' (sin comps en zip)');

    document.getElementById('ac-comps').innerHTML = topN.map(c => `
      <div class="bg-slate-50 rounded p-2 text-xs">
        <div class="flex justify-between font-semibold">
          <span>${c.property_address || '—'}</span>
          <span class="text-slate-500">${c.zip || ''}</span>
        </div>
        <div class="text-slate-600 mt-0.5">
          ${fmt(+c.appraised_value)} • ${c.gla_sqft || '?'} sqft • $${(+c.price_per_sqft).toFixed(0)}/sqft •
          ${c.bedrooms || '?'}bd/${c.bathrooms || '?'}ba • ${c.condition_rating || '?'} • similitud ${c.similarity.toFixed(0)}
        </div>
      </div>
    `).join('') || '<p class="text-xs text-slate-400">Sin comps</p>';

    // Conservar propertyId entre re-renders
    input.propertyId = sys.data.input?.propertyId || null;
    input.arv_estimated = arv;
    sys.data.input = input;
    saveSystemData(sys);
  };

  ids.forEach(id => document.getElementById(id).addEventListener('input', recompute));
  recompute();
}

function arvOnPropertyChange(propId) {
  const sys = window._arvCurrentSys;
  if (!sys.data.input) sys.data.input = {};
  if (!propId) { sys.data.input.propertyId = null; saveSystemData(sys); openArvCalc(sys); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  sys.data.input.propertyId = p.id;
  if (p.zip) sys.data.input.zip = p.zip;
  if (p.sqft) sys.data.input.sqft = +p.sqft;
  if (p.bedrooms) sys.data.input.beds = +p.bedrooms;
  if (p.bathrooms) sys.data.input.baths = +p.bathrooms;
  if (p.year_built) sys.data.input.year_built = +p.year_built;
  if (p.lot_size_sqft) sys.data.input.lot_size = +p.lot_size_sqft;
  saveSystemData(sys);
  openArvCalc(sys);
}

async function arvRunAI(force = false) {
  const sys = window._arvCurrentSys;
  const i = sys.data.input || {};
  window._aiRefreshCb = () => openArvCalc(sys);
  await aiAnalyze('arv-calc', {
    zip: i.zip, sqft: i.sqft, beds: i.beds, baths: i.baths,
    year_built: i.year_built, lot_size: i.lot_size,
    condition: i.condition,
    system_arv: i.arv_estimated
  }, force);
}

async function arvSaveProperty() {
  const sys = window._arvCurrentSys;
  const i = sys.data.input || {};
  const payload = {
    address: window.propertiesCache.find(p => p.id === i.propertyId)?.address || `Casa en zip ${i.zip || '?'}`,
    zip: i.zip,
    sqft: i.sqft,
    bedrooms: i.beds,
    bathrooms: i.baths,
    year_built: i.year_built,
    lot_size_sqft: i.lot_size,
    arv: i.arv_estimated
  };
  const newId = await upsertProperty(payload, i.propertyId);
  if (newId) {
    sys.data.input.propertyId = newId;
    saveSystemData(sys);
    await loadProperties();
    openArvCalc(sys);
    alert('✓ Propiedad guardada/actualizada con ARV estimado');
  }
}

// ============================================================
// ARV INSIGHTS — qué mueve el valor
// ============================================================
async function openArvInsights(sys) {
  const { data: all } = await sb.from('appraisals').select('*').eq('status', 'done');
  const data = (all || []).filter(a => a.price_per_sqft);

  if (data.length < 2) {
    return openModal(`📊 ${sys.name}`, `<p class="text-sm text-slate-500">Necesitas al menos 2 appraisals procesados. Tienes ${data.length}.</p>`);
  }

  const ppsf = data.map(a => +a.price_per_sqft);
  const avg = arr => arr.reduce((s,n)=>s+n,0) / arr.length;
  const median = arr => { const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };

  // Grupo por zip
  const byZip = {};
  data.forEach(a => { (byZip[a.zip] = byZip[a.zip] || []).push(a); });
  const zipRows = Object.entries(byZip).filter(([z]) => z).map(([zip, arr]) => ({
    zip, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value||0))
  })).sort((a,b) => b.avgPpsf - a.avgPpsf);

  // Por condition
  const byCond = {};
  data.forEach(a => { if (a.condition_rating) (byCond[a.condition_rating] = byCond[a.condition_rating] || []).push(a); });
  const condRows = Object.entries(byCond).sort().map(([c, arr]) => ({
    cond: c, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por bucket de año
  const yearBuckets = { 'Antes 1960': [], '1960-1979': [], '1980-1999': [], '2000-2014': [], '2015+': [] };
  data.forEach(a => {
    if (!a.year_built) return;
    const y = a.year_built;
    if (y < 1960) yearBuckets['Antes 1960'].push(a);
    else if (y < 1980) yearBuckets['1960-1979'].push(a);
    else if (y < 2000) yearBuckets['1980-1999'].push(a);
    else if (y < 2015) yearBuckets['2000-2014'].push(a);
    else yearBuckets['2015+'].push(a);
  });
  const yearRows = Object.entries(yearBuckets).filter(([_, arr]) => arr.length).map(([bucket, arr]) => ({
    bucket, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Notas IA — palabras frecuentes (simple parse)
  const allNotes = data.map(a => a.notes || '').join(' ').toLowerCase();
  const keywords = ['kitchen','bathroom','floor','hardwood','tile','granite','quartz','updated','remodel','roof','hvac','garage','pool','lot','location','condition','renovation','open','upgrade','new','modern'];
  const wordFreq = keywords.map(k => ({
    word: k,
    count: (allNotes.match(new RegExp('\\b'+k+'\\w*','g'))||[]).length
  })).filter(x => x.count > 0).sort((a,b) => b.count - a.count);

  const fmt$ = n => Number.isFinite(n) ? '$' + Math.round(n).toLocaleString() : '—';
  const bar = (val, max) => `<div class="w-full bg-slate-100 rounded-full h-1.5"><div class="bg-slate-900 h-1.5 rounded-full" style="width:${(val/max*100).toFixed(0)}%"></div></div>`;
  const maxPpsfZip = Math.max(...zipRows.map(r => r.avgPpsf), 1);
  const maxCondPpsf = Math.max(...condRows.map(r => r.avgPpsf), 1);
  const maxYearPpsf = Math.max(...yearRows.map(r => r.avgPpsf), 1);
  const maxWordCount = Math.max(...wordFreq.map(w => w.count), 1);

  openModal(`📊 ${sys.name}`, `
    <div class="space-y-5">
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Appraisals</div>
          <div class="text-xl font-bold">${data.length}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft avg</div>
          <div class="text-xl font-bold">$${avg(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft mediana</div>
          <div class="text-xl font-bold">$${median(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Rango $/sqft</div>
          <div class="text-sm font-bold">$${Math.min(...ppsf).toFixed(0)} – $${Math.max(...ppsf).toFixed(0)}</div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Zip Code</h4>
        <div class="space-y-1">
          ${zipRows.map(r => `
            <div class="grid grid-cols-[80px_1fr_60px_40px] gap-3 items-center text-sm">
              <span class="font-mono font-semibold">${r.zip}</span>
              ${bar(r.avgPpsf, maxPpsfZip)}
              <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
              <span class="text-right text-xs text-slate-500">n=${r.count}</span>
            </div>
          `).join('') || '<p class="text-xs text-slate-400">Sin data</p>'}
        </div>
        <p class="text-[10px] text-slate-500 mt-2">📍 <strong>Apunta a comprar en zips con $/sqft más alto.</strong></p>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Condition</h4>
          <div class="space-y-1">
            ${condRows.map(r => `
              <div class="grid grid-cols-[40px_1fr_60px_30px] gap-2 items-center text-sm">
                <span class="font-mono font-semibold">${r.cond}</span>
                ${bar(r.avgPpsf, maxCondPpsf)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-xs text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
          <p class="text-[10px] text-slate-500 mt-2">⬆️ <strong>Subir de C3→C2 vale la pena si la diferencia $/sqft &gt; costo de remodel.</strong></p>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Año de construcción</h4>
          <div class="space-y-1">
            ${yearRows.map(r => `
              <div class="grid grid-cols-[100px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxYearPpsf)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Features mencionadas en notas IA</h4>
        <p class="text-[10px] text-slate-500 mb-2">Palabras que los appraisers mencionan más al justificar el valor — pistas de qué upgrades importan.</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          ${wordFreq.slice(0, 14).map(w => `
            <div class="grid grid-cols-[100px_1fr_30px] gap-2 items-center text-xs">
              <span class="font-semibold capitalize">${w.word}</span>
              ${bar(w.count, maxWordCount)}
              <span class="text-right text-slate-500">${w.count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 class="text-xs font-bold text-amber-900 uppercase mb-2">💡 Cómo subir tu ARV (basado en tu data)</h4>
        <ul class="text-xs text-amber-900 space-y-1 leading-relaxed">
          <li>• <strong>Compra en el zip con $/sqft más alto</strong> de los que aparecen arriba (top: ${zipRows[0]?.zip || '—'}, $${zipRows[0]?.avgPpsf.toFixed(0) || '—'}/sqft).</li>
          <li>• <strong>Apunta a Condition C2 o C3</strong> en la remodelación. Diferencial entre tus C2 y C3: $${(condRows.find(c=>c.cond==='C2')?.avgPpsf - condRows.find(c=>c.cond==='C3')?.avgPpsf || 0).toFixed(0)}/sqft.</li>
          <li>• <strong>Features que más aparecen en notas:</strong> ${wordFreq.slice(0,5).map(w=>w.word).join(', ')} — prioriza estos upgrades.</li>
          <li>• <strong>Sweet spot de sqft:</strong> mira tu rango de comps, evita casas que se salen de la norma del barrio.</li>
        </ul>
      </div>
    </div>
  `);
}

// ============================================================
// APPRAISALS (Upload + IA + Análisis profundo en una sola vista)
// ============================================================
async function openAppraisals(sys) {
  const { data: appraisals } = await sb.from('appraisals').select('*').order('uploaded_at', { ascending: false });
  const all = appraisals || [];
  const done = all.filter(a => a.status === 'done' && a.appraised_value && a.price_per_sqft);
  const tab = sys.data.activeTab || 'analytics';

  openModal(`📂 ${sys.name}`, `
    <div class="border-b border-slate-200 -mt-2 -mx-6 px-6 mb-4">
      <div class="flex gap-1">
        <button onclick="switchApprTab('${sys.id}','analytics')" class="px-4 py-2 text-sm font-medium border-b-2 ${tab==='analytics'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">📊 Análisis (${done.length})</button>
        <button onclick="switchApprTab('${sys.id}','list')" class="px-4 py-2 text-sm font-medium border-b-2 ${tab==='list'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}">📂 Lista y Upload (${all.length})</button>
      </div>
    </div>
    <div id="appr-tab-content"></div>
  `);

  if (tab === 'analytics') renderAnalyticsTab(sys, done);
  else renderListTab(sys, all);
}

function switchApprTab(sysId, tab) {
  const sys = findSystem(sysId);
  sys.data.activeTab = tab;
  saveSystemData(sys);
  openAppraisals(sys);
}

// ===== Tab: ANALYTICS =====
function renderAnalyticsTab(sys, done) {
  const container = document.getElementById('appr-tab-content');
  if (done.length === 0) {
    container.innerHTML = `<div class="text-center py-12">
      <div class="text-5xl mb-3">📊</div>
      <p class="text-sm text-slate-500">Sin data todavía. Ve a "Lista y Upload" y sube PDFs.</p>
    </div>`;
    return;
  }

  const fmt$ = n => Number.isFinite(n) ? '$' + Math.round(n).toLocaleString() : '—';
  const ppsf = done.map(a => +a.price_per_sqft);
  const values = done.map(a => +a.appraised_value);
  const avg = arr => arr.length ? arr.reduce((s,n)=>s+n,0)/arr.length : 0;
  const median = arr => { if (!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };

  // Por zip
  const byZip = {};
  done.forEach(a => { if (a.zip) (byZip[a.zip] = byZip[a.zip] || []).push(a); });
  const zipRows = Object.entries(byZip).map(([zip, arr]) => ({
    zip, count: arr.length,
    avgPpsf: avg(arr.map(a=>+a.price_per_sqft)),
    minPpsf: Math.min(...arr.map(a=>+a.price_per_sqft)),
    maxPpsf: Math.max(...arr.map(a=>+a.price_per_sqft)),
    avgValue: avg(arr.map(a=>+a.appraised_value)),
    avgSqft: avg(arr.map(a=>+a.gla_sqft||0))
  })).sort((a,b) => b.avgPpsf - a.avgPpsf);

  // Por condition
  const byCond = {};
  done.forEach(a => { if (a.condition_rating) (byCond[a.condition_rating] = byCond[a.condition_rating] || []).push(a); });
  const condRows = Object.entries(byCond).sort().map(([c, arr]) => ({
    cond: c, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por sqft bucket (sweet spot)
  const sqftBuckets = { '<1200': [], '1200-1500': [], '1500-1800': [], '1800-2200': [], '2200+': [] };
  done.forEach(a => {
    const s = +a.gla_sqft;
    if (!s) return;
    if (s < 1200) sqftBuckets['<1200'].push(a);
    else if (s < 1500) sqftBuckets['1200-1500'].push(a);
    else if (s < 1800) sqftBuckets['1500-1800'].push(a);
    else if (s < 2200) sqftBuckets['1800-2200'].push(a);
    else sqftBuckets['2200+'].push(a);
  });
  const sqftRows = Object.entries(sqftBuckets).filter(([_,arr])=>arr.length).map(([b,arr])=>({
    bucket: b, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value))
  }));

  // Por año
  const yearBuckets = { 'Antes 1970': [], '1970-1979': [], '1980-1989': [], '1990-1999': [], '2000+': [] };
  done.forEach(a => {
    if (!a.year_built) return; const y = a.year_built;
    if (y < 1970) yearBuckets['Antes 1970'].push(a);
    else if (y < 1980) yearBuckets['1970-1979'].push(a);
    else if (y < 1990) yearBuckets['1980-1989'].push(a);
    else if (y < 2000) yearBuckets['1990-1999'].push(a);
    else yearBuckets['2000+'].push(a);
  });
  const yearRows = Object.entries(yearBuckets).filter(([_,arr])=>arr.length).map(([b,arr])=>({
    bucket: b, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft))
  }));

  // Por beds/baths
  const bbMap = {};
  done.forEach(a => {
    if (!a.bedrooms || !a.bathrooms) return;
    const k = `${a.bedrooms}bd/${a.bathrooms}ba`;
    (bbMap[k] = bbMap[k] || []).push(a);
  });
  const bbRows = Object.entries(bbMap).map(([k,arr])=>({
    config: k, count: arr.length, avgPpsf: avg(arr.map(a=>+a.price_per_sqft)), avgValue: avg(arr.map(a=>+a.appraised_value))
  })).sort((a,b)=>b.avgPpsf-a.avgPpsf);

  // Per-casa scoring: cada appraisal vs avg de su zip
  const houseScores = done.map(a => {
    const zipAvg = zipRows.find(z => z.zip === a.zip)?.avgPpsf || avg(ppsf);
    const delta = +a.price_per_sqft - zipAvg;
    const pct = (delta / zipAvg) * 100;
    return { ...a, zipAvg, delta, pct };
  }).sort((x,y) => y.pct - x.pct);

  // Features mencionadas
  const allNotes = done.map(a => a.notes || '').join(' ').toLowerCase();
  const keywords = ['kitchen','bathroom','remodel','updated','renovated','hardwood','tile','granite','quartz','floor','roof','hvac','garage','pool','open','modern','upgrade','new','crown','molding','stainless'];
  const wordFreq = keywords.map(k => ({
    word: k, count: (allNotes.match(new RegExp('\\b'+k+'\\w*','g'))||[]).length
  })).filter(x => x.count > 0).sort((a,b) => b.count - a.count);

  // Recomendaciones dinámicas
  const bestZip = zipRows[0];
  const worstZip = zipRows[zipRows.length-1];
  const bestSqft = [...sqftRows].sort((a,b)=>b.avgPpsf-a.avgPpsf)[0];
  const c2 = condRows.find(c=>c.cond==='C2'); const c3 = condRows.find(c=>c.cond==='C3');
  const condDiff = c2 && c3 ? c2.avgPpsf - c3.avgPpsf : null;
  const zipSpread = bestZip && worstZip ? ((bestZip.avgPpsf - worstZip.avgPpsf) / worstZip.avgPpsf * 100) : 0;

  const bar = (val, max, color='bg-slate-900') => `<div class="w-full bg-slate-100 rounded-full h-2"><div class="${color} h-2 rounded-full" style="width:${Math.min(100,val/max*100).toFixed(0)}%"></div></div>`;
  const maxZip = Math.max(...zipRows.map(r=>r.avgPpsf),1);
  const maxCond = Math.max(...condRows.map(r=>r.avgPpsf),1);
  const maxSqftR = Math.max(...sqftRows.map(r=>r.avgPpsf),1);
  const maxYear = Math.max(...yearRows.map(r=>r.avgPpsf),1);
  const maxBb = Math.max(...bbRows.map(r=>r.avgPpsf),1);
  const maxWord = Math.max(...wordFreq.map(w=>w.count),1);

  container.innerHTML = `
    <div class="space-y-5">
      <!-- KPIs top -->
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-slate-900 text-white rounded-lg p-3">
          <div class="text-[10px] text-slate-400 uppercase font-bold">Appraisals</div>
          <div class="text-2xl font-bold">${done.length}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Valor promedio</div>
          <div class="text-2xl font-bold">${fmt$(avg(values))}</div>
          <div class="text-[10px] text-slate-400">mediana ${fmt$(median(values))}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">$/sqft promedio</div>
          <div class="text-2xl font-bold">$${avg(ppsf).toFixed(0)}</div>
          <div class="text-[10px] text-slate-400">mediana $${median(ppsf).toFixed(0)}</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <div class="text-[10px] text-slate-500 uppercase font-bold">Rango $/sqft</div>
          <div class="text-sm font-bold">$${Math.min(...ppsf).toFixed(0)}–$${Math.max(...ppsf).toFixed(0)}</div>
          <div class="text-[10px] text-slate-400">spread ${((Math.max(...ppsf)-Math.min(...ppsf))/Math.min(...ppsf)*100).toFixed(0)}%</div>
        </div>
      </div>

      <!-- Recomendaciones IA -->
      <div class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-5">
        <h4 class="text-sm font-bold text-amber-900 uppercase tracking-wide mb-3">💡 Recomendaciones para tu próxima casa</h4>
        <ul class="space-y-2 text-sm text-amber-950">
          ${bestZip ? `<li>🎯 <strong>Zip ${bestZip.zip}</strong> paga el $/sqft más alto: <strong>$${bestZip.avgPpsf.toFixed(0)}</strong> (n=${bestZip.count}). ${zipSpread > 10 ? `Eso es ${zipSpread.toFixed(0)}% más que ${worstZip.zip} ($${worstZip.avgPpsf.toFixed(0)}). Prioriza ese zip si encuentras deal.` : ''}</li>` : ''}
          ${bestSqft ? `<li>📏 <strong>Sweet spot: ${bestSqft.bucket} sqft</strong> — rinde $${bestSqft.avgPpsf.toFixed(0)}/sqft en promedio. Casas en ese rango maximizan tu $/sqft.</li>` : ''}
          ${condDiff ? `<li>🔧 <strong>C2 vs C3 diferencial:</strong> $${condDiff.toFixed(0)}/sqft. En una casa de 1500 sqft eso son ${fmt$(condDiff*1500)} extra. Vale la pena escalar el remodel si el costo extra es menor.</li>` : `<li>⚠️ <strong>Todas tus casas son ${condRows[0]?.cond||'C?'}</strong> — sin datos para medir el lift de subir condition. En el próximo refi, pídele al appraiser que considere C2 si tu remodel lo justifica.</li>`}
          ${wordFreq[0] ? `<li>🛠️ <strong>Features que más aparecen en justificación de valor:</strong> ${wordFreq.slice(0,5).map(w=>`<strong>${w.word}</strong> (${w.count})`).join(', ')}. Estos upgrades pesan en el ARV.</li>` : ''}
          ${bbRows[0] ? `<li>🛏️ <strong>Mejor config beds/baths:</strong> ${bbRows[0].config} → $${bbRows[0].avgPpsf.toFixed(0)}/sqft. ${bbRows[1] ? `Peor: ${bbRows[bbRows.length-1].config} → $${bbRows[bbRows.length-1].avgPpsf.toFixed(0)}/sqft.` : ''}</li>` : ''}
        </ul>
      </div>

      <!-- $/sqft por zip -->
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Zip Code</h4>
        <div class="space-y-1.5">
          ${zipRows.map(r => `
            <div class="grid grid-cols-[70px_1fr_70px_50px] gap-3 items-center text-sm">
              <span class="font-mono font-semibold">${r.zip}</span>
              ${bar(r.avgPpsf, maxZip, r === bestZip ? 'bg-green-600' : 'bg-slate-700')}
              <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
              <span class="text-right text-xs text-slate-500">n=${r.count}</span>
            </div>
            <div class="text-[10px] text-slate-400 pl-[82px] -mt-1 mb-1">avg ${fmt$(r.avgValue)} • avg ${r.avgSqft.toFixed(0)} sqft • rango $${r.minPpsf.toFixed(0)}-$${r.maxPpsf.toFixed(0)}/sqft</div>
          `).join('')}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- Por Condition -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Condition</h4>
          <div class="space-y-1.5">
            ${condRows.map(r => `
              <div class="grid grid-cols-[40px_1fr_60px_30px] gap-2 items-center text-sm">
                <span class="font-mono font-semibold">${r.cond}</span>
                ${bar(r.avgPpsf, maxCond)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-xs text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Por Año -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por Año construcción</h4>
          <div class="space-y-1.5">
            ${yearRows.map(r => `
              <div class="grid grid-cols-[90px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxYear)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Por Sqft bucket -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Sweet Spot por Sqft</h4>
          <div class="space-y-1.5">
            ${sqftRows.map(r => `
              <div class="grid grid-cols-[90px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.bucket}</span>
                ${bar(r.avgPpsf, maxSqftR, r === bestSqft ? 'bg-green-600' : 'bg-slate-700')}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Casas más pequeñas suelen tener $/sqft más alto.</p>
        </div>

        <!-- Por Beds/Baths -->
        <div>
          <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">$/sqft por configuración Beds/Baths</h4>
          <div class="space-y-1.5">
            ${bbRows.map(r => `
              <div class="grid grid-cols-[80px_1fr_60px_30px] gap-2 items-center text-xs">
                <span class="font-semibold">${r.config}</span>
                ${bar(r.avgPpsf, maxBb)}
                <span class="text-right font-semibold">$${r.avgPpsf.toFixed(0)}</span>
                <span class="text-right text-slate-500">${r.count}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Performance por casa -->
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Performance de cada casa vs. promedio de su zip</h4>
        <p class="text-[10px] text-slate-500 mb-2">Verde = sobre-performer (excelente refi). Rojo = bajo del promedio (oportunidad de mejorar).</p>
        <div class="overflow-x-auto border border-slate-200 rounded-lg">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-2 py-2 font-semibold">Casa</th>
                <th class="text-right px-2 py-2 font-semibold">Valor</th>
                <th class="text-right px-2 py-2 font-semibold">$/sqft</th>
                <th class="text-right px-2 py-2 font-semibold">Zip avg</th>
                <th class="text-right px-2 py-2 font-semibold">Delta</th>
                <th class="text-center px-2 py-2 font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody>
              ${houseScores.map(h => {
                const cls = h.pct > 5 ? 'text-green-700 bg-green-50' : h.pct < -5 ? 'text-red-700 bg-red-50' : 'text-slate-600';
                const arrow = h.pct > 5 ? '↑' : h.pct < -5 ? '↓' : '→';
                return `<tr class="border-t border-slate-200 hover:bg-slate-50">
                  <td class="px-2 py-1.5">${h.property_address} <span class="text-slate-400">(${h.zip})</span></td>
                  <td class="px-2 py-1.5 text-right">${fmt$(+h.appraised_value)}</td>
                  <td class="px-2 py-1.5 text-right font-semibold">$${(+h.price_per_sqft).toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-right text-slate-500">$${h.zipAvg.toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-right">${h.delta>=0?'+':''}$${h.delta.toFixed(0)}</td>
                  <td class="px-2 py-1.5 text-center font-bold ${cls} rounded">${arrow} ${h.pct>0?'+':''}${h.pct.toFixed(1)}%</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Features mencionadas -->
      ${wordFreq.length ? `
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Features que justifican el valor (de las notas del appraiser)</h4>
        <p class="text-[10px] text-slate-500 mb-2">Cuanto más se menciona, más impacta. Prioriza estos upgrades en tu próxima remodelación.</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
          ${wordFreq.slice(0,12).map(w => `
            <div class="grid grid-cols-[90px_1fr_25px] gap-2 items-center text-xs">
              <span class="font-semibold capitalize">${w.word}</span>
              ${bar(w.count, maxWord)}
              <span class="text-right text-slate-500">${w.count}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
}

// ===== Tab: LISTA =====
function renderListTab(sys, appraisals) {
  const container = document.getElementById('appr-tab-content');
  const fmt = n => n == null ? '—' : (typeof n === 'number' ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : n);
  const statusBadge = a => {
    const map = { pending:'bg-slate-200 text-slate-700', processing:'bg-amber-100 text-amber-700 animate-pulse', done:'bg-green-100 text-green-700', error:'bg-red-100 text-red-700' };
    return `<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[a.status]}">${a.status}</span>`;
  };

  container.innerHTML = `
    <div class="space-y-4">
      <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-900 transition">
        <input type="file" id="appr-upload" accept="application/pdf" multiple class="hidden" />
        <label for="appr-upload" class="cursor-pointer">
          <div class="text-3xl mb-2">📄</div>
          <div class="text-sm font-semibold text-slate-700">Subir PDF(s) de appraisal</div>
          <div class="text-xs text-slate-500 mt-1">La IA extrae los datos automáticamente. Los insights se actualizan solos.</div>
        </label>
      </div>

      <div id="appr-progress" class="hidden text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded p-3"></div>

      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Dirección</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Valor</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">$/sqft</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Sqft</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Bd/Ba</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Año</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Zip</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Cond.</th>
              <th class="text-left px-3 py-2 font-semibold text-slate-700">Status</th>
              <th class="w-20"></th>
            </tr>
          </thead>
          <tbody>
            ${appraisals.map(a => `
              <tr class="border-t border-slate-200 hover:bg-slate-50">
                <td class="px-3 py-2">${a.property_address || '—'}</td>
                <td class="px-3 py-2 font-semibold">${fmt(a.appraised_value)}</td>
                <td class="px-3 py-2">${a.price_per_sqft ? '$'+(+a.price_per_sqft).toFixed(0) : '—'}</td>
                <td class="px-3 py-2">${a.gla_sqft || '—'}</td>
                <td class="px-3 py-2">${a.bedrooms || '—'}/${a.bathrooms || '—'}</td>
                <td class="px-3 py-2">${a.year_built || '—'}</td>
                <td class="px-3 py-2">${a.zip || '—'}</td>
                <td class="px-3 py-2">${a.condition_rating || '—'}</td>
                <td class="px-3 py-2">${statusBadge(a)}</td>
                <td class="px-2 py-2 text-right whitespace-nowrap">
                  <button onclick="viewAppraisal('${a.id}')" class="text-xs text-slate-600 hover:text-slate-900 mr-1">👁️</button>
                  ${a.status === 'error' ? `<button onclick="retryAppraisal('${a.id}','${sys.id}')" class="text-xs text-amber-600 hover:text-amber-800 mr-1" title="Reintentar">🔄</button>` : ''}
                  ${isAdmin() ? `<button onclick="deleteAppraisal('${a.id}','${sys.id}')" class="text-xs text-red-600 hover:text-red-800">🗑️</button>` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="10" class="text-center text-slate-400 py-8">Sin appraisals todavía.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('appr-upload').addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const progress = document.getElementById('appr-progress');
    progress.classList.remove('hidden');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress.textContent = `📤 Subiendo ${i+1}/${files.length}: ${file.name}...`;
      try {
        await uploadAppraisal(file, (msg) => {
          progress.textContent = `🤖 (${i+1}/${files.length}) ${file.name}: ${msg}`;
        });
      } catch (err) {
        progress.textContent = `⚠️ ${file.name}: ${err.message}. Continuando...`;
        await sleep(2000);
      }
      // Espera entre uploads para no exceder rate limit Claude (30K tokens/min)
      if (i < files.length - 1) {
        for (let s = 30; s > 0; s--) {
          progress.textContent = `⏳ Esperando ${s}s antes del siguiente PDF (rate limit Claude)...`;
          await sleep(1000);
        }
      }
    }
    progress.textContent = `✓ Todo procesado.`;
    setTimeout(() => openAppraisals(sys), 1500);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function uploadAppraisal(file, onProgress) {
  const path = `${state.user.id}/${Date.now()}_${file.name}`;
  if (onProgress) onProgress('subiendo PDF...');
  const { error: upErr } = await sb.storage.from('appraisals').upload(path, file);
  if (upErr) throw upErr;
  const { data: inserted, error: insErr } = await sb.from('appraisals')
    .insert({ pdf_path: path, uploaded_by: state.user.id, status: 'pending' })
    .select().single();
  if (insErr) throw insErr;
  if (onProgress) onProgress('extrayendo datos con IA (puede tomar 30-60s)...');
  // Await edge function para procesar secuencialmente y evitar rate limit
  const { error: fnErr } = await sb.functions.invoke('extract-appraisal', { body: { appraisalId: inserted.id } });
  if (fnErr) throw new Error(fnErr.message || 'Error en extract-appraisal');
  return inserted;
}

async function retryAppraisal(appraisalId, sysId) {
  await sb.from('appraisals').update({ status: 'pending', error_message: null }).eq('id', appraisalId);
  const sys = findSystem(sysId);
  if (sys) openAppraisals(sys);
  try {
    await sb.functions.invoke('extract-appraisal', { body: { appraisalId } });
  } catch (e) {
    console.error(e);
  }
  if (sys) setTimeout(() => openAppraisals(sys), 1000);
}

async function viewAppraisal(id) {
  const { data: a } = await sb.from('appraisals').select('*').eq('id', id).single();
  if (!a) return;
  const fmt = n => n == null ? '—' : (typeof n === 'number' ? n.toLocaleString('en-US') : n);
  const { data: urlData } = await sb.storage.from('appraisals').createSignedUrl(a.pdf_path, 3600);
  const pdfUrl = urlData?.signedUrl;
  const row = (k, v) => `<div class="flex justify-between py-1 border-b border-slate-100 text-sm"><span class="text-slate-500">${k}</span><span class="font-medium">${v ?? '—'}</span></div>`;
  const comps = (a.comparables || []).map(c => `
    <div class="bg-slate-50 rounded p-2 text-xs">
      <div class="font-semibold">${c.address || '—'}</div>
      <div class="text-slate-600">${c.sale_price ? '$'+(+c.sale_price).toLocaleString() : '—'} • ${c.gla_sqft || '—'} sqft • ${c.sale_date || '—'}</div>
    </div>
  `).join('') || '<p class="text-xs text-slate-400">Sin comparables extraídos</p>';

  openModal(`📄 ${a.property_address || 'Appraisal'}`, `
    <div class="grid grid-cols-2 gap-6">
      <div>
        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Propiedad</h4>
        ${row('Dirección', a.property_address)}
        ${row('Ciudad', `${a.city || ''}, ${a.state || ''} ${a.zip || ''}`)}
        ${row('Condado', a.county)}
        ${row('Effective date', a.effective_date)}

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Características</h4>
        ${row('GLA (sqft)', fmt(a.gla_sqft))}
        ${row('Lot size (sqft)', fmt(a.lot_size_sqft))}
        ${row('Año', a.year_built)}
        ${row('Beds / Baths', `${a.bedrooms || '—'} / ${a.bathrooms || '—'}`)}
        ${row('Garage', a.garage_spaces)}
        ${row('Pisos', a.stories)}
        ${row('Condition', a.condition_rating)}
        ${row('Quality', a.quality_rating)}

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Valoración</h4>
        ${row('Appraised value', a.appraised_value ? '$'+(+a.appraised_value).toLocaleString() : '—')}
        ${row('$/sqft', a.price_per_sqft ? '$'+(+a.price_per_sqft).toFixed(2) : '—')}

        ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" class="block mt-4 text-center bg-slate-900 text-white text-sm py-2 rounded-lg hover:bg-slate-700">📄 Ver PDF original</a>` : ''}
      </div>
      <div>
        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2">Comparables</h4>
        <div class="space-y-2">${comps}</div>

        <h4 class="text-xs font-bold text-slate-600 uppercase mb-2 mt-4">Notas IA</h4>
        <p class="text-xs text-slate-600 bg-slate-50 rounded p-3 leading-relaxed">${a.notes || '—'}</p>

        ${a.status === 'error' ? `<div class="mt-4 text-xs text-red-600 bg-red-50 rounded p-3"><strong>Error:</strong> ${a.error_message}</div>` : ''}
      </div>
    </div>
  `);
}

async function deleteAppraisal(id, sysId) {
  if (!confirm('¿Borrar este appraisal y su PDF?')) return;
  const { data: a } = await sb.from('appraisals').select('pdf_path').eq('id', id).single();
  if (a?.pdf_path) await sb.storage.from('appraisals').remove([a.pdf_path]);
  await sb.from('appraisals').delete().eq('id', id);
  const sys = findSystem(sysId);
  if (sys) openAppraisals(sys);
}

// --- Tabla ---
function openTable(sys) {
  const cols = sys.config.columns || [];
  const rows = sys.data.rows || [];
  openModal(`📋 ${sys.name}`, `
    <div class="space-y-3">
      <div class="overflow-x-auto border border-slate-200 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>${cols.map(c => `<th class="text-left px-3 py-2 font-semibold text-slate-700">${c}</th>`).join('')}<th class="w-10"></th></tr>
          </thead>
          <tbody id="tbl-body">
            ${rows.map((r, i) => `
              <tr class="border-t border-slate-200">
                ${cols.map((c, ci) => `<td class="px-3 py-2"><input data-row="${i}" data-col="${ci}" value="${(r[ci] || '').replace(/"/g,'&quot;')}" class="w-full bg-transparent focus:bg-white focus:outline-1 focus:outline-slate-300 rounded px-1" /></td>`).join('')}
                <td class="px-2 text-center"><button onclick="tableDelRow('${sys.id}',${i})" class="text-slate-400 hover:text-red-600">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button onclick="tableAddRow('${sys.id}')" class="text-sm text-slate-600 hover:text-slate-900">+ Agregar fila</button>
    </div>`);
  document.getElementById('tbl-body').addEventListener('input', e => {
    if (e.target.tagName !== 'INPUT') return;
    const r = +e.target.dataset.row, c = +e.target.dataset.col;
    if (!sys.data.rows) sys.data.rows = [];
    if (!sys.data.rows[r]) sys.data.rows[r] = [];
    sys.data.rows[r][c] = e.target.value;
    saveSystemData(sys);
  });
}
function findSystem(sysId) {
  for (const arr of Object.values(state.systems)) {
    const s = arr.find(x => x.id === sysId);
    if (s) return s;
  }
}
function tableAddRow(sysId) {
  const sys = findSystem(sysId);
  if (!sys.data.rows) sys.data.rows = [];
  sys.data.rows.push(sys.config.columns.map(() => ''));
  saveSystemData(sys);
  openTable(sys);
}
function tableDelRow(sysId, idx) {
  const sys = findSystem(sysId);
  sys.data.rows.splice(idx, 1);
  saveSystemData(sys);
  openTable(sys);
}

// --- Checklist ---
function openChecklist(sys) {
  const items = sys.config.items || [];
  const checked = sys.data.checked || {};
  openModal(`✅ ${sys.name}`, `
    <div class="space-y-2">
      ${items.map((it, i) => `
        <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" data-i="${i}" ${checked[i] ? 'checked' : ''} class="w-5 h-5 rounded" />
          <span class="${checked[i] ? 'line-through text-slate-400' : 'text-slate-800'}">${it}</span>
        </label>`).join('')}
      <div class="pt-3 text-xs text-slate-500">${Object.values(checked).filter(Boolean).length} / ${items.length} completados</div>
      <button onclick="checklistReset('${sys.id}')" class="text-xs text-slate-500 hover:text-slate-900">Reiniciar</button>
    </div>`);
  document.getElementById('modal-body').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const i = e.target.dataset.i;
    if (!sys.data.checked) sys.data.checked = {};
    sys.data.checked[i] = e.target.checked;
    saveSystemData(sys);
    openChecklist(sys);
  });
}
function checklistReset(sysId) {
  const sys = findSystem(sysId);
  sys.data.checked = {};
  saveSystemData(sys);
  openChecklist(sys);
}

// --- Calculadora genérica ---
function openCalculator(sys) {
  const inputs = sys.config.inputs || [];
  const values = sys.data.values || {};
  openModal(`🧮 ${sys.name}`, `
    <div class="space-y-3">
      ${inputs.map(inp => `
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">${inp.label}</label>
          <input type="number" data-name="${inp.name}" value="${values[inp.name] ?? ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>`).join('')}
      <div class="mt-4 p-4 bg-slate-900 text-white rounded-lg">
        <div class="text-xs text-slate-400">${sys.config.resultLabel || 'Resultado'}</div>
        <div id="calc-result" class="text-2xl font-bold mt-1">—</div>
      </div>
    </div>`);
  const recompute = () => {
    const vars = {};
    document.querySelectorAll('#modal-body input[data-name]').forEach(el => { vars[el.dataset.name] = parseFloat(el.value) || 0; });
    sys.data.values = vars;
    saveSystemData(sys);
    try {
      // SEGURIDAD: evaluador whitelisted en vez de new Function() (RCE).
      // Solo permite vars del calc, números, paréntesis, operadores aritméticos
      // y un set fijo de funciones Math.
      const res = safeEvalFormula(sys.config.formula, vars);
      document.getElementById('calc-result').textContent = Number.isFinite(res) ? res.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : '—';
    } catch { document.getElementById('calc-result').textContent = 'Error'; }
  };
  document.getElementById('modal-body').addEventListener('input', recompute);
  recompute();
}

// --- Notas ---
function openNotes(sys) {
  openModal(`📝 ${sys.name}`, `
    <textarea id="notes-area" rows="18" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="Escribe aquí...">${sys.data.text || ''}</textarea>
    <p class="text-xs text-slate-400 mt-2">Se guarda automáticamente</p>`);
  document.getElementById('notes-area').addEventListener('input', e => {
    sys.data.text = e.target.value;
    saveSystemData(sys);
  });
}

// --- Cash-Out Refi (ARV + Payoff + closing detallado) ---
function migrateCashoutData(sys) {
  if (sys.data && sys.data.deals && sys.data.settings) return;
  const old = sys.data || {};
  const firstDeal = old.deals ? Object.values(old.deals)[0] : null;
  sys.data = {
    settings: {
      ltv: 75,
      // CALIBRADO con Michelle Ct (5/2026): 8.04% = $25,832 / $321,000
      // + Garden Path, Bramble, Wellington — promedio TX investor cashout 2026
      closingCostsFixed: 25500,
      useCostsPct: true,        // por default usar % — más preciso que fijo
      closingCostsPct: 8        // calibrado a 3 deals reales TX 2026
    },
    currentDealId: 'd1',
    deals: {
      d1: {
        name: firstDeal?.name || 'Deal ejemplo',
        arv: firstDeal?.arv ?? old.arv ?? 380000,
        payoff: firstDeal?.payoff ?? old.payoff ?? 211543
      }
    }
  };
}

async function openCashout(sys) {
  migrateCashoutData(sys);
  await loadProperties();
  const fmt = n => (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const s = sys.data.settings;
  const d = sys.data.deals[sys.data.currentDealId];

  const dealOptions = Object.entries(sys.data.deals).map(([id, dd]) =>
    `<option value="${id}" ${id === sys.data.currentDealId ? 'selected' : ''}>${dd.name || id}</option>`
  ).join('');

  // Parámetros editables por TODOS (admin + viewers). El equipo necesita ajustar LTV
  // y closing costs cuando hacen cálculos reales para cada deal.
  const showAdminSettings = true;
  window._cashoutCurrentSys = sys;

  openModal(`💰 ${sys.name}`, `
    ${propertySelectorHtml(d.propertyId, 'cashoutOnPropertyChange', 'cashoutSaveProperty')}
    <div class="flex items-center justify-between text-[10px] mb-3 -mt-1">
      <span class="text-emerald-700 font-bold">🔒 Auto-guardado — los números persisten al cerrar el modal</span>
      <span id="co-saved-badge" class="text-emerald-600 font-bold opacity-0 transition-opacity"></span>
    </div>
    <div class="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200">
      <label class="text-xs font-semibold text-slate-600 uppercase">Deal:</label>
      <select id="co-deal-select" class="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm">${dealOptions}</select>
      <button onclick="cashoutNewDeal('${sys.id}')" class="text-xs bg-slate-900 text-white px-3 py-1.5 rounded">+ Nuevo</button>
      <button onclick="cashoutDeleteDeal('${sys.id}')" class="text-xs text-red-600 hover:bg-red-50 px-2 py-1.5 rounded">Borrar</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Propiedad</label>
          <input id="co-name" value="${d.name || ''}" placeholder="Ej: 1100 Echo Lane" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Valor del appraisal (ARV)</label>
          <input type="number" id="co-arv" value="${d.arv ?? ''}" class="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg" />
          <p class="text-xs text-slate-500 mt-1">Lo que tasó la propiedad ya remodelada</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Préstamo actual (Payoff)</label>
          <input type="number" id="co-payoff" value="${d.payoff ?? ''}" class="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg" />
          <p class="text-xs text-slate-500 mt-1">Lo que debes hoy al Hard Money Lender</p>
        </div>

        ${showAdminSettings ? `
        <details class="border border-slate-200 rounded-lg">
          <summary class="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 uppercase hover:bg-slate-50">⚙️ Parámetros del cálculo (editables por el equipo)</summary>
          <div class="p-3 space-y-3 border-t border-slate-200">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">LTV % del refi</label>
              <input type="number" step="0.01" id="co-ltv" value="${s.ltv}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <p class="text-[10px] text-slate-400 mt-0.5">75% típico para conv. cash-out refi</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1">Closing costs estimados</label>
              <div class="flex gap-2 mb-2">
                <label class="flex items-center gap-1 text-xs"><input type="radio" name="co-mode" value="fixed" ${!s.useCostsPct ? 'checked' : ''}> Monto fijo</label>
                <label class="flex items-center gap-1 text-xs"><input type="radio" name="co-mode" value="pct" ${s.useCostsPct ? 'checked' : ''}> % del loan</label>
              </div>
              <div id="co-costs-fixed" class="${s.useCostsPct ? 'hidden' : ''}">
                <input type="number" id="co-costs-fixed-input" value="${s.closingCostsFixed}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <p class="text-[10px] text-slate-400 mt-0.5">Calibrado: ~$25,500 promedio TX investor 2026</p>
              </div>
              <div id="co-costs-pct" class="${s.useCostsPct ? '' : 'hidden'}">
                <input type="number" step="0.1" id="co-costs-pct-input" value="${s.closingCostsPct}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <p class="text-[10px] text-slate-400 mt-0.5">Calibrado: 8% deals reales TX 2026 (Michelle Ct: 8.04%)</p>
              </div>
              <div class="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-600">
                <strong>📋 Desglose típico TX investor cashout 8%:</strong>
                <ul class="ml-3 list-disc mt-1 space-y-0.5">
                  <li>Lender (orig + UW + proc + doc): ~2.2% del loan</li>
                  <li>Title + endorsements + recording: ~$3,000 flat</li>
                  <li>Prepaid interest (4-10 días): ~0.1% del loan</li>
                  <li>Insurance año + escrow 3mo: ~$2,400</li>
                  <li>Property tax escrow 6-8mo + tax bill catch-up: ~5% del loan</li>
                </ul>
              </div>
            </div>
          </div>
        </details>` : ''}
      </div>

      <div class="bg-slate-900 text-white rounded-xl p-6 self-start sticky top-0">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Estimación</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-slate-300">Nuevo préstamo (<span id="co-ltv-show">75</span>% × ARV)</span><span id="co-loan" class="font-semibold">—</span></div>
          <div class="flex justify-between text-red-300"><span>− Payoff actual</span><span id="co-payoff-out">—</span></div>
          <div class="flex justify-between text-red-300"><span>− Closing costs estimados</span><span id="co-costs">—</span></div>
          <div class="border-t border-slate-700 pt-4 mt-4">
            <div class="text-xs text-slate-400 uppercase tracking-wide">Cash-out estimado</div>
            <div id="co-cashout" class="text-4xl font-bold mt-1">—</div>
            <div id="co-warning" class="hidden mt-2 text-xs text-amber-300"></div>
          </div>

          <!-- Desglose del closing — separar fees REALES (perdido) vs escrow (tu plata) -->
          <details class="border border-slate-700 rounded-lg mt-4">
            <summary class="cursor-pointer px-3 py-2 text-[11px] font-bold text-slate-300 uppercase hover:bg-slate-800">📋 Desglose del closing</summary>
            <div class="p-3 border-t border-slate-700 space-y-1 text-[11px]">
              <div class="text-red-300 font-bold">Lo que SE PIERDE (fees lender + title):</div>
              <div class="flex justify-between pl-2"><span>Lender fees (~2.2% loan)</span><span id="co-bd-lender">—</span></div>
              <div class="flex justify-between pl-2"><span>Title + recording (~$3,000)</span><span id="co-bd-title">—</span></div>
              <div class="flex justify-between pl-2"><span>Prepaid interest (~0.1%)</span><span id="co-bd-prepaid">—</span></div>
              <div class="flex justify-between text-red-200 font-bold border-t border-slate-700 pt-1 mt-1"><span>= Subtotal "lost money"</span><span id="co-bd-lost">—</span></div>

              <div class="text-amber-300 font-bold mt-3">Lo que se queda en ESCROW (tu plata):</div>
              <div class="flex justify-between pl-2"><span>Insurance año + 3mo escrow</span><span id="co-bd-ins">—</span></div>
              <div class="flex justify-between pl-2"><span>Property tax escrow (6-8mo + bill)</span><span id="co-bd-tax">—</span></div>
              <div class="flex justify-between text-amber-200 font-bold border-t border-slate-700 pt-1 mt-1"><span>= Subtotal escrow</span><span id="co-bd-escrow">—</span></div>
            </div>
          </details>

          <div class="border-t border-slate-700 pt-3 mt-3 space-y-1 text-xs text-slate-400">
            <div class="flex justify-between"><span>Cash-out vs ARV</span><span id="co-cashout-arv">—</span></div>
            <div class="flex justify-between"><span>Payoff vs nuevo loan</span><span id="co-ltc">—</span></div>
          </div>
          <p class="text-[10px] text-slate-500 mt-4 leading-relaxed">Calibrado con Michelle Ct (5/2026, $321k loan, 8.04% closing real). Margen ±$300 vs cierre real.</p>
        </div>
        ${aiBoxHtml('cashout-refi', 'Validar con mercado en vivo', 'Claude busca comps reales, valida ARV, trae LTV real de lenders Texas mayo 2026, tasas actuales', 'cashoutRunAI')}
      </div>
    </div>`);
  // Render AI result si existe
  setTimeout(() => {
    const aiState = window.aiState['cashout-refi'];
    const el = document.getElementById('ai-result-cashout-refi');
    if (el && aiState?.analysis) el.innerHTML = aiResultGenericHtml(aiState.analysis);
  }, 50);

  document.getElementById('co-deal-select').addEventListener('change', e => {
    sys.data.currentDealId = e.target.value;
    saveSystemData(sys);
    openCashout(sys);
  });

  const recompute = () => {
    const dd = sys.data.deals[sys.data.currentDealId];
    dd.name = document.getElementById('co-name').value;
    dd.arv = parseFloat(document.getElementById('co-arv').value) || 0;
    dd.payoff = parseFloat(document.getElementById('co-payoff').value) || 0;

    if (showAdminSettings) {
      s.ltv = parseFloat(document.getElementById('co-ltv').value) || 75;
      s.useCostsPct = document.querySelector('input[name="co-mode"]:checked').value === 'pct';
      s.closingCostsFixed = parseFloat(document.getElementById('co-costs-fixed-input').value) || 0;
      s.closingCostsPct = parseFloat(document.getElementById('co-costs-pct-input').value) || 0;
      document.getElementById('co-costs-fixed').classList.toggle('hidden', s.useCostsPct);
      document.getElementById('co-costs-pct').classList.toggle('hidden', !s.useCostsPct);
    }

    const loan = dd.arv * (s.ltv / 100);
    const closingCosts = s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed;
    const cashout = loan - dd.payoff - closingCosts;

    document.getElementById('co-ltv-show').textContent = s.ltv;
    document.getElementById('co-loan').textContent = fmt(loan);
    document.getElementById('co-payoff-out').textContent = fmt(dd.payoff);
    document.getElementById('co-costs').textContent = fmt(closingCosts);
    const co = document.getElementById('co-cashout');
    co.textContent = fmt(cashout);
    co.className = `text-4xl font-bold mt-1 ${cashout < 0 ? 'text-red-400' : cashout < 5000 ? 'text-amber-300' : 'text-green-400'}`;
    const warn = document.getElementById('co-warning');
    if (cashout < 0) { warn.textContent = `⚠️ Faltarían ${fmt(Math.abs(cashout))} para cubrir el cierre`; warn.classList.remove('hidden'); }
    else if (cashout < 5000) { warn.textContent = `⚠️ Cash-out marginal — revisar números`; warn.classList.remove('hidden'); }
    else warn.classList.add('hidden');

    document.getElementById('co-cashout-arv').textContent = dd.arv ? `${(cashout/dd.arv*100).toFixed(2)}%` : '—';
    document.getElementById('co-ltc').textContent = loan ? `${(dd.payoff/loan*100).toFixed(1)}%` : '—';

    // Desglose del closing — separa fees PERDIDOS vs ESCROW (tu plata)
    // Calibrado con Michelle Ct 5/2026 (real $25,832 / $321k = 8.04%)
    const bdLender = loan * 0.022;          // ~2.2% loan: orig + UW + processing + doc prep
    const bdTitle = 3000;                    // ~$3k flat: title ins + endorsements + recording + closing fee
    const bdPrepaid = loan * 0.001;         // ~0.1% loan: prepaid interest 4-10 días
    const bdLost = bdLender + bdTitle + bdPrepaid;
    const bdEscrow = Math.max(0, closingCosts - bdLost);  // resto = escrow (tax + ins)
    const bdIns = Math.min(bdEscrow, 2400);  // ~$2.4k insurance año + 3mo escrow
    const bdTax = Math.max(0, bdEscrow - bdIns);  // resto = tax escrow + bill catch-up
    const setBd = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
    setBd('co-bd-lender', bdLender);
    setBd('co-bd-title', bdTitle);
    setBd('co-bd-prepaid', bdPrepaid);
    setBd('co-bd-lost', bdLost);
    setBd('co-bd-ins', bdIns);
    setBd('co-bd-tax', bdTax);
    setBd('co-bd-escrow', bdEscrow);

    const opt = document.querySelector(`#co-deal-select option[value="${sys.data.currentDealId}"]`);
    if (opt) opt.textContent = dd.name || sys.data.currentDealId;

    saveSystemData(sys);
    // Mostrar badge de guardado por 2s
    const b = document.getElementById('co-saved-badge');
    if (b) {
      b.textContent = '💾 Guardado ' + new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      b.classList.remove('opacity-0'); b.classList.add('opacity-100');
      clearTimeout(window._coSavedTimer);
      window._coSavedTimer = setTimeout(() => { b.classList.remove('opacity-100'); b.classList.add('opacity-0'); }, 2000);
    }
  };

  // input → re-calcula visualmente en vivo (sin guardar)
  // change → guarda al hacer blur (evita 5 escrituras a Supabase mientras tipeás "2000")
  const visualUpdate = () => {
    // Solo actualiza la UI; no toca DB
    const dd = sys.data.deals[sys.data.currentDealId];
    dd.name = document.getElementById('co-name').value;
    dd.arv = parseFloat(document.getElementById('co-arv').value) || 0;
    dd.payoff = parseFloat(document.getElementById('co-payoff').value) || 0;
    if (showAdminSettings) {
      s.ltv = parseFloat(document.getElementById('co-ltv').value) || 75;
      s.closingCostsFixed = parseFloat(document.getElementById('co-costs-fixed-input').value) || 0;
      s.closingCostsPct = parseFloat(document.getElementById('co-costs-pct-input').value) || 0;
    }
    const loan = dd.arv * (s.ltv / 100);
    const closingCosts = s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed;
    const cashout = loan - dd.payoff - closingCosts;
    document.getElementById('co-ltv-show').textContent = s.ltv;
    document.getElementById('co-loan').textContent = fmt(loan);
    document.getElementById('co-payoff-out').textContent = fmt(dd.payoff);
    document.getElementById('co-costs').textContent = fmt(closingCosts);
    const co = document.getElementById('co-cashout');
    co.textContent = fmt(cashout);
    co.className = `text-4xl font-bold mt-1 ${cashout < 0 ? 'text-red-400' : cashout < 5000 ? 'text-amber-300' : 'text-green-400'}`;
    document.getElementById('co-cashout-arv').textContent = dd.arv ? `${(cashout/dd.arv*100).toFixed(2)}%` : '—';
    document.getElementById('co-ltc').textContent = loan ? `${(dd.payoff/loan*100).toFixed(1)}%` : '—';
  };

  ['co-name','co-arv','co-payoff'].forEach(id => {
    document.getElementById(id).addEventListener('input', visualUpdate);
    document.getElementById(id).addEventListener('change', recompute);
  });
  if (showAdminSettings) {
    ['co-ltv','co-costs-fixed-input','co-costs-pct-input'].forEach(id => {
      document.getElementById(id).addEventListener('input', visualUpdate);
      document.getElementById(id).addEventListener('change', recompute);
    });
    document.querySelectorAll('input[name="co-mode"]').forEach(el => el.addEventListener('change', recompute));
  }
  recompute();
}

function cashoutNewDeal(sysId) {
  const sys = findSystem(sysId);
  const name = prompt('Nombre del nuevo deal (ej: "1100 Echo Lane"):');
  if (!name) return;
  const id = 'd' + Date.now();
  sys.data.deals[id] = { name, arv: 0, payoff: 0 };
  sys.data.currentDealId = id;
  saveSystemData(sys);
  openCashout(sys);
}

function cashoutDeleteDeal(sysId) {
  const sys = findSystem(sysId);
  if (Object.keys(sys.data.deals).length <= 1) return alert('Debe quedar al menos un deal');
  const dd = sys.data.deals[sys.data.currentDealId];
  if (!confirm(`¿Borrar "${dd.name || sys.data.currentDealId}"?`)) return;
  delete sys.data.deals[sys.data.currentDealId];
  sys.data.currentDealId = Object.keys(sys.data.deals)[0];
  saveSystemData(sys);
  openCashout(sys);
}

// ===== Cashout — integración con properties =====
function cashoutOnPropertyChange(propId) {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  if (!propId) { d.propertyId = null; saveSystemData(sys); openCashout(sys); return; }
  const p = window.propertiesCache.find(x => x.id === propId);
  if (!p) return;
  // 1) Buscar si ya hay un deal vinculado a esta propiedad — si existe, activarlo (NO sobrescribir)
  const existingDealId = Object.entries(sys.data.deals).find(([id, dd]) => dd.propertyId === p.id)?.[0];
  if (existingDealId && existingDealId !== sys.data.currentDealId) {
    sys.data.currentDealId = existingDealId;
    saveSystemData(sys);
    openCashout(sys);
    return;
  }
  // 2) Si NO había deal previo para esta propiedad, vincular el deal actual + traer defaults desde properties
  d.propertyId = p.id;
  if (p.address) d.name = p.address;
  if (p.arv) d.arv = +p.arv;
  if (p.payoff_hml) d.payoff = +p.payoff_hml;
  saveSystemData(sys);
  openCashout(sys);
}

async function cashoutRunAI(force = false) {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  const s = sys.data.settings;
  const loan = (+d.arv || 0) * ((+s.ltv || 75) / 100);
  const closingCosts = s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed;
  window._aiRefreshCb = () => openCashout(sys);
  await aiAnalyze('cashout-refi', {
    name: d.name, address: d.name,
    arv: d.arv, payoff: d.payoff,
    ltv: s.ltv,
    closing_costs: closingCosts,
    sqft: null, zip: null
  }, force);
}

async function cashoutSaveProperty() {
  const sys = window._cashoutCurrentSys;
  const d = sys.data.deals[sys.data.currentDealId];
  const s = sys.data.settings;
  const loan = (+d.arv || 0) * ((+s.ltv || 75) / 100);
  const cashout = loan - (+d.payoff || 0) - (s.useCostsPct ? loan * (s.closingCostsPct / 100) : s.closingCostsFixed);
  const payload = {
    address: d.name || 'Sin nombre',
    arv: d.arv,
    payoff_hml: d.payoff,
    cashout_estimated: cashout
  };
  const newId = await upsertProperty(payload, d.propertyId);
  if (newId) {
    d.propertyId = newId;
    saveSystemData(sys);
    await loadProperties();
    openCashout(sys);
    alert('✓ Propiedad guardada/actualizada');
  }
}

// ============================================================
// ÁREAS
// ============================================================
document.getElementById('add-area-btn').addEventListener('click', async () => {
  const name = prompt('Nombre del área:');
  if (!name) return;
  const icon = prompt('Ícono (emoji):', '📁') || '📁';
  const description = prompt('Descripción:') || '';
  const id = uid();
  const position = state.areas.length;
  const { error } = await sb.from('areas').insert({ id, name, icon, description, position });
  if (error) return alert('Error: ' + error.message);
  await loadData();
  state.currentAreaId = id;
  render();
});

document.getElementById('add-system-btn').addEventListener('click', openAddSystem);

// ============================================================
// INIT
// ============================================================
initAuth();

// ============================================================
// 🔔 Sistema de alertas nativas del browser
// Notification API + chequeo periódico. Sin VAPID, sin push server.
// Cuando hay críticas atrasadas o cambios importantes, dispara una
// notification del SO. Funciona instalado como PWA o en pestaña abierta.
// ============================================================
window.notifyState = {
  enabled: false,
  lastDigestDate: null,
  lastChecks: { critical_count: 0 }
};

async function notifyRequestPermission() {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones.');
    return false;
  }
  if (Notification.permission === 'granted') {
    window.notifyState.enabled = true;
    return true;
  }
  if (Notification.permission === 'denied') {
    alert('Las notificaciones están bloqueadas. Activalas desde la configuración del navegador.');
    return false;
  }
  const perm = await Notification.requestPermission();
  window.notifyState.enabled = perm === 'granted';
  if (perm === 'granted') {
    notifySend('🔔 Notificaciones activadas', { body: 'Te avisaré cuando haya críticas atrasadas o cosas importantes.', tag: 'enabled' });
  }
  return perm === 'granted';
}

function notifySend(title, opts) {
  if (!window.notifyState.enabled || Notification.permission !== 'granted') return;
  const o = opts || {};
  try {
    // Preferir el SW para que las notifs persistan
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body: o.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: o.tag || 'eos-' + Date.now(),
          data: o.data || {},
          requireInteraction: !!o.persistent
        });
      });
    } else {
      new Notification(title, { body: o.body || '', icon: '/icon-192.png', tag: o.tag });
    }
  } catch (e) {
    console.warn('notifySend failed:', e);
  }
}

// Chequea cosas importantes y dispara notifications si corresponde.
// Se ejecuta al cargar y cada 15 minutos si la app sigue abierta.
async function notifyCheckCriticals() {
  if (!window.notifyState.enabled) return;
  try {
    // Buscar weekly_activities críticas atrasadas
    const todayIso = new Date().toISOString().slice(0,10);
    const { data } = await sb.from('weekly_activities')
      .select('id, activity_name, property_name, date, status, priority, notes')
      .or('priority.eq.critical,priority.eq.urgent')
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .lt('date', todayIso);
    const overdueCritical = (data || []).filter(a => a.date < todayIso);
    const prev = window.notifyState.lastChecks.critical_count || 0;
    if (overdueCritical.length > prev) {
      const newOnes = overdueCritical.length - prev;
      notifySend(`⚠️ ${newOnes} nueva${newOnes>1?'s':''} crítica${newOnes>1?'s':''} atrasada${newOnes>1?'s':''}`, {
        body: overdueCritical.slice(0,3).map(a => `• ${a.activity_name} (${a.property_name||'—'})`).join('\n'),
        tag: 'critical-overdue',
        persistent: true,
        data: { url: '/?wp_mode=worker&wp_day=' + todayIso }
      });
    }
    window.notifyState.lastChecks.critical_count = overdueCritical.length;
  } catch (e) {
    console.warn('notifyCheckCriticals failed:', e);
  }
}

// Auto-iniciar check cada 15 min y al cargar
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Auto-activar si ya está concedido (no preguntar)
    if ('Notification' in window && Notification.permission === 'granted') {
      window.notifyState.enabled = true;
      // Primer check 30s después de cargar (dar tiempo a auth)
      setTimeout(() => notifyCheckCriticals(), 30000);
      // Recurrente cada 15 min
      setInterval(() => notifyCheckCriticals(), 15 * 60 * 1000);
    }
  });
}

// ────────────────────────────────────────────────────────────
// 📤 Digest diario — genera mensaje con las cosas del día y abre WhatsApp
// ────────────────────────────────────────────────────────────
async function generateDailyDigest() {
  try {
    const todayIso = new Date().toISOString().slice(0,10);
    const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0,10);

    // Cargar lo necesario
    const [actsRes, projsRes] = await Promise.all([
      sb.from('weekly_activities').select('*').gte('date', todayIso).lte('date', tomorrowIso),
      sb.from('remodel_projects').select('id,name,address,status').neq('status', 'completed').neq('status', 'cancelled')
    ]);
    const acts = actsRes.data || [];
    const projs = projsRes.data || [];

    // Atrasadas críticas
    const { data: overdueData } = await sb.from('weekly_activities')
      .select('*')
      .or('priority.eq.critical,priority.eq.urgent')
      .neq('status', 'done').neq('status', 'cancelled')
      .lt('date', todayIso);
    const overdueCritical = overdueData || [];

    // Tareas de hoy
    const hoyActs = acts.filter(a => a.date === todayIso);
    const hoyDone = hoyActs.filter(a => a.status === 'done').length;
    const manana = acts.filter(a => a.date === tomorrowIso);

    const fecha = new Date().toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });

    let msg = `📊 *DIGEST DIARIO · ${fecha.toUpperCase()}*\n\n`;

    if (overdueCritical.length > 0) {
      msg += `🔴 *${overdueCritical.length} CRÍTICA${overdueCritical.length>1?'S':''} ATRASADA${overdueCritical.length>1?'S':''}*\n`;
      overdueCritical.slice(0,5).forEach(a => {
        const daysLate = Math.round((new Date(todayIso+'T00:00:00') - new Date(a.date+'T00:00:00'))/86400000);
        msg += `• ${a.activity_name} (${a.property_name||'—'}) — ${daysLate}d\n`;
      });
      msg += '\n';
    }

    msg += `📅 *HOY · ${hoyActs.length} tareas* (${hoyDone} hechas)\n`;
    if (hoyActs.length > 0) {
      const byHome = {};
      hoyActs.forEach(a => { (byHome[a.property_name||'—'] = byHome[a.property_name||'—'] || []).push(a); });
      Object.entries(byHome).slice(0,4).forEach(([home, list]) => {
        msg += `🏠 ${home}: ${list.filter(a=>a.status==='done').length}/${list.length}\n`;
      });
      msg += '\n';
    }

    if (manana.length > 0) {
      msg += `🔜 *MAÑANA · ${manana.length} tareas planeadas*\n\n`;
    }

    msg += `🏗️ ${projs.length} obras activas\n`;
    msg += `\n📱 Ver dashboard: ${window.location.origin}/?rd_mode=ceo`;

    return msg;
  } catch (e) {
    return '❌ Error generando digest: ' + e.message;
  }
}

// ────────────────────────────────────────────────────────────
// ⏰ Schedule del digest diario
// Configurable por usuario en localStorage. Mientras la app esté
// abierta o instalada como PWA, dispara notification a la hora
// configurada y pre-genera el mensaje.
// ────────────────────────────────────────────────────────────
function getDigestSchedule() {
  try {
    const raw = localStorage.getItem('digest_schedule');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, hour: 19, minute: 0, days: [1,2,3,4,5], phone: '', lastFired: null };
}
function setDigestSchedule(patch) {
  const cur = getDigestSchedule();
  const next = { ...cur, ...patch };
  try { localStorage.setItem('digest_schedule', JSON.stringify(next)); } catch {}
  return next;
}

function openDigestScheduleConfig() {
  const cfg = getDigestSchedule();
  const dayLabels = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  openModal('⏰ Programar digest diario', `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        El digest se prepara automáticamente a la hora elegida. Mientras la app esté abierta o instalada como PWA,
        recibís una notificación con botón para enviar por WhatsApp.
      </div>
      <div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input id="ds-enabled" type="checkbox" ${cfg.enabled?'checked':''} class="w-4 h-4"/>
          <span class="text-sm font-semibold">Activar digest programado</span>
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Hora</label>
          <input id="ds-hour" type="number" min="0" max="23" value="${cfg.hour}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Minutos</label>
          <input id="ds-minute" type="number" min="0" max="59" value="${cfg.minute}" class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Días de la semana</label>
        <div class="grid grid-cols-7 gap-1">
          ${dayLabels.map((d, i) => `
            <label class="flex flex-col items-center gap-1 cursor-pointer">
              <input type="checkbox" data-day="${i}" ${cfg.days.includes(i)?'checked':''} class="w-4 h-4"/>
              <span class="text-[10px] font-bold">${d}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📞 Número WhatsApp (con código país, sin +)</label>
        <input id="ds-phone" type="text" value="${cfg.phone||''}" placeholder="521555..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="saveDigestSchedule()" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded">💾 Guardar</button>
      </div>
    </div>
  `);
}

function saveDigestSchedule() {
  const days = Array.from(document.querySelectorAll('[data-day]:checked')).map(el => +el.getAttribute('data-day'));
  setDigestSchedule({
    enabled: document.getElementById('ds-enabled').checked,
    hour: Math.min(23, Math.max(0, +document.getElementById('ds-hour').value || 19)),
    minute: Math.min(59, Math.max(0, +document.getElementById('ds-minute').value || 0)),
    days,
    phone: document.getElementById('ds-phone').value.replace(/[^0-9]/g, '')
  });
  closeModal();
  if (window.toast) toast('✓ Schedule guardado', 'success');
  else alert('✓ Schedule guardado');
}

// Chequeo recurrente cada minuto
async function digestScheduleTick() {
  const cfg = getDigestSchedule();
  if (!cfg.enabled) return;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (cfg.lastFired === today) return; // ya disparó hoy
  if (!cfg.days.includes(now.getDay())) return;
  if (now.getHours() !== cfg.hour || now.getMinutes() !== cfg.minute) return;

  // Marcar como fired ANTES de procesar (evitar re-fire en mismo minuto)
  setDigestSchedule({ lastFired: today });

  // Pre-generar y notificar
  try {
    const msg = await generateDailyDigest();
    if (window.notifyState?.enabled) {
      notifySend('📤 Digest diario listo', {
        body: 'Tu resumen del día está preparado. Tap para revisar y enviar por WhatsApp.',
        tag: 'digest-' + today,
        persistent: true,
        data: { url: '/?open_digest=1' }
      });
    }
    // Si hay número configurado, ofrecer link directo
    window._pendingDigest = { msg, phone: cfg.phone, date: today };
  } catch (e) {
    console.warn('digestScheduleTick failed:', e);
  }
}

// Iniciar el tick cada minuto cuando la app cargue
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    digestScheduleTick();
    setInterval(digestScheduleTick, 60000);
  });
  // Si la URL trae ?open_digest=1 → auto-abrir
  window.addEventListener('DOMContentLoaded', () => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('open_digest') === '1') {
      setTimeout(() => openDailyDigest(), 1500);
    }
  });
}

async function openDailyDigest() {
  const btn = document.querySelector('[onclick="openDailyDigest()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando...'; }
  const msg = await generateDailyDigest();
  if (btn) { btn.disabled = false; btn.textContent = '📤 Digest del día'; }

  openModal('📤 Digest diario', `
    <div class="space-y-3">
      <div class="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
        Resumen automático de lo que pasó hoy y lo que viene. Editalo y mandalo por WhatsApp a quien necesite el update.
      </div>
      <textarea id="digest-msg" rows="14" class="w-full border border-violet-300 rounded p-3 text-sm font-mono">${msg.replace(/</g,'&lt;')}</textarea>
      <div>
        <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">📞 Número (opcional)</label>
        <input id="digest-phone" type="text" placeholder="521555..." class="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"/>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-200">
        <button onclick="closeModal()" class="flex-1 bg-slate-100 hover:bg-slate-200 text-sm py-2 rounded">Cancelar</button>
        <button onclick="(()=>{const m=document.getElementById('digest-msg').value;const p=(document.getElementById('digest-phone').value||'').replace(/[^0-9]/g,'');const u=p?\`https://wa.me/\${p}?text=\${encodeURIComponent(m)}\`:\`https://wa.me/?text=\${encodeURIComponent(m)}\`;window.open(u,'_blank');closeModal();})()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded">💬 Enviar WhatsApp</button>
      </div>
    </div>
  `);
}
