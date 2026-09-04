(function () {
  'use strict';

  const VIEW_META = {
    today: { eyebrow: 'Jornada guiada', title: 'Qué hacer hoy' },
    command: { eyebrow: 'Vista ejecutiva', title: 'Mando semanal' },
    radar: { eyebrow: 'Evidencia antes de crear', title: 'Fuentes reales y radar' },
    teams: { eyebrow: 'Sistema operativo', title: 'Equipos de agentes' },
    lab: { eyebrow: 'Ejecuciones verificables', title: 'Agentes en vivo' },
    flow: { eyebrow: 'De señal a aprendizaje', title: 'Flujo integral' },
    approval: { eyebrow: 'Supervisión humana', title: 'Aprobación semanal' },
    calendar: { eyebrow: 'Cobertura multiplataforma', title: 'Calendario editorial' },
    learning: { eyebrow: 'Evidencia para decidir', title: 'Aprendizaje' },
    quality: { eyebrow: 'Compuerta final', title: 'Consejo de calidad' }
  };

  const STATUS_LABELS = {
    draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobada · demo', revision: 'Revisión', scheduled: 'Programada · demo',
    active: 'Activo · demo', attention: 'Atención · demo', supervised: 'Supervisado · demo', planned: 'Planeado', done: 'Listo · demo',
    passed: 'Aprobado · demo', improve: 'Mejorar', blocked: 'Bloqueado', running: 'En curso', review: 'Revisar · demo',
    completed: 'Completado', test: 'Probar', discard: 'Descartada', verified: 'Verificado', configured: 'Configurado · sin prueba',
    not_configured: 'No configurado', unverified: 'No verificado', idle: 'Sin ejecutar', error: 'Falló',
    usable: 'Utilizable', needs_review: 'Requiere revisión'
  };

  const TEAM_ICONS = {
    management: 'target', virality: 'trending-up', avatars: 'users', production: 'factory', magnets: 'package',
    conversations: 'message', nurture: 'sparkles', analytics: 'chart', quality: 'shield-check'
  };

  const state = {
    view: 'today', mode: 'demo', snapshot: null, repository: null, loading: false,
    teamFilter: 'Todos', pieceFilter: 'Pendientes', qaFilter: 'Todos', signalFilter: 'Todos', authClient: null,
    integrationCheck: { checkedAt: null, source: 'pending', error: null }, researchCheck: { checkedAt: null, error: null },
    agentRuntime: { configured: false, fixture: false, catalog: [] }, agentRuns: [], agentClient: null, agentBrief: '', runningAll: false, activeBatchId: null
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const esc = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const icon = (name, size) => window.osIcon ? window.osIcon(name, { size: size || 16 }) : '';
  const formatNumber = value => new Intl.NumberFormat('es-AR', { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
  const percent = (value, target) => Math.max(0, Math.min(100, Math.round((value / target) * 100)));

  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(element => {
      const label = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
      element.insertAdjacentHTML('afterbegin', icon(element.dataset.icon, element.classList.contains('banner-icon') ? 16 : 15));
      if (!label && !element.getAttribute('aria-label')) element.setAttribute('aria-hidden', 'true');
      element.removeAttribute('data-icon');
    });
  }

  function statusBadge(status) {
    return `<span class="badge ${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
  }

  function statusDot(status, label) {
    const map = { active: 'ok', done: 'ok', approved: 'ok', scheduled: 'ok', passed: 'ok', completed: 'ok', verified: 'ok', usable: 'ok', supervised: 'warn', attention: 'warn', pending: 'warn', improve: 'warn', configured: 'warn', test: 'warn', running: 'warn', needs_review: 'warn', revision: 'bad', blocked: 'bad', error: 'bad', planned: 'off', draft: 'off', discard: 'off', not_configured: 'off', unverified: 'off', idle: 'off' };
    return window.kitStatusDot ? window.kitStatusDot(map[status] || 'off', label || STATUS_LABELS[status] || status) : statusBadge(status);
  }

  function toast(message, kind) {
    const region = $('#toast-region');
    if (!region) return;
    region.replaceChildren();
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = icon(kind === 'error' ? 'alert' : 'check', 15) + `<span>${esc(message)}</span>`;
    region.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function isLocalPreview() {
    return ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('auth') === 'demo';
  }

  async function initAuth() {
    const shell = $('#auth-shell');
    const app = $('#growth-app');
    if (isLocalPreview()) {
      shell.hidden = true;
      app.hidden = false;
      $('#user-email').textContent = 'Vista local segura';
      return startApp();
    }

    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      showAuthError('No se pudo validar la sesión. Volvé a Empresa OS e intentá de nuevo.');
      return;
    }

    state.authClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    let decided = false;
    const enter = async session => {
      if (decided) return;
      decided = true;
      try {
        const { data: assurance } = await state.authClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance && assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
          location.href = '/';
          return;
        }
        const { data: profile, error } = await state.authClient.from('profiles').select('role,active').eq('id', session.user.id).single();
        if (error || !profile || profile.active === false || profile.role !== 'admin') {
          await state.authClient.auth.signOut();
          showAuthError('Este centro está reservado para una cuenta administradora activa.');
          return;
        }
        shell.hidden = true;
        app.hidden = false;
        $('#user-email').textContent = session.user.email || 'Sesión privada';
        const initials = (session.user.email || 'NL').split('@')[0].split(/[._-]/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
        $('#user-initials').textContent = initials || 'NL';
        await startApp();
      } catch (_) {
        showAuthError('No pudimos comprobar los permisos de esta cuenta.');
      }
    };
    const showForm = () => {
      if (decided) return;
      decided = true;
      $('#auth-loading').hidden = true;
      $('#auth-form').hidden = false;
      $('#auth-copy').textContent = 'Ingresá con tu cuenta administradora de Empresa OS.';
      $('#auth-email').focus();
    };

    state.authClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) enter(session);
      else if (event === 'INITIAL_SESSION') showForm();
    });
    try {
      const { data } = await state.authClient.auth.getSession();
      if (data.session) await enter(data.session);
    } catch (_) {
      showForm();
    }
    setTimeout(showForm, 2200);
  }

  function showAuthError(message) {
    $('#auth-loading').hidden = true;
    $('#auth-form').hidden = false;
    $('#auth-copy').textContent = 'Acceso privado';
    const error = $('#auth-error');
    error.textContent = message;
    error.hidden = false;
  }

  async function submitAuth(event) {
    event.preventDefault();
    const errorBox = $('#auth-error');
    errorBox.hidden = true;
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Comprobando acceso';
    try {
      const email = $('#auth-email').value.trim();
      const password = $('#auth-password').value;
      const { error } = await state.authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.reload();
    } catch (_) {
      errorBox.textContent = 'Email o contraseña incorrectos, o cuenta sin acceso.';
      errorBox.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Entrar al centro';
    }
  }

  async function logout() {
    if (state.authClient) await state.authClient.auth.signOut();
    location.href = '/';
  }

  async function startApp() {
    state.agentRuns = window.GrowthAgents.loadRuns();
    state.agentClient = new window.GrowthAgents.GrowthAgentClient({ authClient: state.authClient, localPreview: isLocalPreview() });
    bindEvents();
    hydrateIcons(document);
    syncTheme();
    await loadSnapshot();
  }

  function bindEvents() {
    $('#auth-form').addEventListener('submit', submitAuth);
    $('#logout-btn').addEventListener('click', logout);
    $('#back-to-os').addEventListener('click', () => { location.href = '/'; });
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#demo-state').addEventListener('change', event => {
      state.mode = event.target.value;
      loadSnapshot();
    });
    $('#reset-demo').addEventListener('click', async () => {
      if (state.repository && state.repository.reset) await state.repository.reset();
      state.mode = 'demo';
      $('#demo-state').value = 'demo';
      toast('El escenario demo volvió a su estado inicial.');
      await loadSnapshot();
    });
    $$('.nav-item').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
    $('#view-root').addEventListener('click', handleViewAction);
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('empresa-os-growth-theme', next);
    syncTheme();
  }

  function syncTheme() {
    const saved = localStorage.getItem('empresa-os-growth-theme');
    if (saved) document.documentElement.dataset.theme = saved;
    const isLight = document.documentElement.dataset.theme === 'light';
    $('#theme-toggle').innerHTML = icon(isLight ? 'moon' : 'sun', 16);
    $('#theme-toggle').setAttribute('aria-label', isLight ? 'Usar tema oscuro' : 'Usar tema claro');
  }

  function navigate(view) {
    if (!VIEW_META[view]) return;
    state.view = view;
    $$('.nav-item').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('#view-eyebrow').textContent = VIEW_META[view].eyebrow;
    $('#view-title').textContent = VIEW_META[view].title;
    render();
    $('#workspace').scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderLoading() {
    $('#app-status').innerHTML = `
      <div class="loading-grid" aria-label="Cargando centro de mando">
        ${Array.from({ length: 4 }, () => `<div class="loading-card ui-card">${window.kitSkeletonRows ? window.kitSkeletonRows(4, 12) : 'Cargando'}</div>`).join('')}
      </div>`;
    $('#view-root').innerHTML = '';
  }

  async function loadSnapshot() {
    state.loading = true;
    renderLoading();
    state.repository = window.GrowthData.createRepository(state.mode);
    try {
      state.snapshot = await state.repository.getSnapshot();
      if (!state.agentBrief) state.agentBrief = state.snapshot.agentTest.brief;
      await loadIntegrationReadiness();
      await loadPublicResearch();
      $('#app-status').innerHTML = '';
      updateCounts();
      state.loading = false;
      render();
    } catch (error) {
      state.snapshot = null;
      $('#app-status').innerHTML = '';
      $('#view-root').innerHTML = `
        <div class="error-state ui-card">
          <div class="state-symbol">${icon('alert', 24)}</div>
          <h2>No pudimos cargar esta vista</h2>
          <p>${esc(error.message || 'Ocurrió un error inesperado.')}</p>
          <button class="btn btn-primary" type="button" data-action="retry">${icon('refresh', 14)} Reintentar</button>
        </div>`;
    } finally {
      state.loading = false;
    }
  }

  async function loadIntegrationReadiness() {
    const client = new window.GrowthIntegrations.GrowthIntegrationClient({ authClient: state.authClient, localPreview: isLocalPreview() });
    try {
      const result = await client.getReadiness(state.snapshot.integrations);
      state.snapshot.integrations = result.integrations;
      state.agentRuntime = result.agentRuntime || { configured: false, fixture: false, catalog: [] };
      state.integrationCheck = { checkedAt: result.checkedAt, source: result.source, error: null };
    } catch (error) {
      state.integrationCheck = { checkedAt: null, source: 'failed', error: error.message };
      state.agentRuntime = { configured: false, fixture: false, catalog: [] };
      state.snapshot.integrations = state.snapshot.integrations.map(item => ({ ...item, status: item.id === 'supabase-auth' ? 'verified' : 'unverified' }));
    }
    const allOperational = state.snapshot.integrations.filter(item => item.id !== 'supabase-auth').every(item => item.status === 'verified');
    state.snapshot.firstDay.steps = state.snapshot.firstDay.steps.map(step => step.calculated === 'connections'
      ? { ...step, status: allOperational ? 'completed' : 'blocked' }
      : step);
  }

  function researchBrief(research) {
    const best = research?.youtube?.topShorts?.[0];
    const transcribed = research?.youtube?.transcripts?.filter(item => item.transcriptStatus === 'available').length || 0;
    return `Corrida operativa sobre investigación pública verificada el ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(research.collectedAt))}. Analizar el desempeño público visible de @soynicolaslara y @Flippingrentalss. YouTube: mejor Short visible “${best?.title || 'sin dato'}” con ${formatNumber(best?.views || 0)} vistas; ${transcribed} transcripciones disponibles dentro de research. Crear una semana completa para Instagram, TikTok, YouTube, LinkedIn y X: conceptos, guiones/copies nativos, carrusel, CTA con recurso, nutrición, experimento medible y siguientes acciones. Usar como hechos únicamente research; tratar funnel, calendario, señales y métricas del escenario como demo. No publicar ni fingir Metricool, Drive, conversaciones, retención o conversiones.`;
  }

  async function loadPublicResearch(force) {
    const previousDemoBrief = state.snapshot.agentTest.brief;
    const client = new window.GrowthIntegrations.GrowthIntegrationClient({ authClient: state.authClient, localPreview: isLocalPreview() });
    try {
      const research = await client.getContentResearch();
      if (!research) {
        state.researchCheck = { checkedAt: null, error: 'La vista local no consulta redes externas.' };
        return;
      }
      state.snapshot.research = research;
      state.researchCheck = { checkedAt: research.collectedAt, error: null };
      state.snapshot.agentTest.inputLabel = 'Cuentas públicas verificadas + tablero operativo demo';
      state.snapshot.agentTest.brief = researchBrief(research);
      if (force || !state.agentBrief || state.agentBrief === previousDemoBrief) state.agentBrief = state.snapshot.agentTest.brief;
    } catch (error) {
      state.snapshot.research = null;
      state.researchCheck = { checkedAt: null, error: error.message || 'No pudimos actualizar las fuentes públicas.' };
    }
  }

  function updateCounts() {
    const snapshot = state.snapshot;
    if (!snapshot) return;
    const completedAgents = window.GrowthAgents.CATALOG.filter(agent => latestRun(agent.id)?.status === 'completed').length;
    snapshot.firstDay.steps = snapshot.firstDay.steps.map(step => step.calculated === 'agents' ? { ...step, status: completedAgents === window.GrowthAgents.CATALOG.length ? 'completed' : 'pending' } : step);
    $('#approval-count').textContent = snapshot.pieces.filter(piece => ['pending', 'revision'].includes(piece.status)).length;
    $('#quality-count').textContent = snapshot.qualityCouncil.reviewers.filter(item => item.status !== 'passed').length;
    $('#today-count').textContent = snapshot.firstDay.steps.filter(item => item.status !== 'completed').length;
    $('#agent-run-count').textContent = completedAgents;
  }

  function render() {
    if (!state.snapshot || state.loading) return;
    const empty = !state.snapshot.teams.length;
    if (empty) {
      $('#view-root').innerHTML = `
        <div class="empty-state ui-card">
          <div class="state-symbol">${icon('inbox', 24)}</div>
          <h2>Todavía no hay una semana configurada</h2>
          <p>Cuando exista una directiva, este espacio mostrará equipos, piezas, calendario, controles y resultados. No vamos a inventar actividad.</p>
          <button class="btn btn-primary" type="button" data-action="show-demo">${icon('flask', 14)} Ver escenario demo</button>
        </div>`;
      return;
    }
    const renderers = { today: renderToday, command: renderCommand, radar: renderRadar, teams: renderTeams, lab: renderLab, flow: renderFlow, approval: renderApproval, calendar: renderCalendar, learning: renderLearning, quality: renderQuality };
    $('#view-root').innerHTML = renderers[state.view]();
  }

  function integrationStatusText(status) {
    return STATUS_LABELS[status] || 'Estado desconocido';
  }

  function renderIntegrationCards() {
    const check = state.integrationCheck;
    const checked = check.checkedAt
      ? `Comprobado en servidor: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(check.checkedAt))}`
      : check.source === 'local-preview' ? 'Vista local: no se consultó producción' : check.error || 'Verificación no disponible';
    return `<div class="connection-grid">${state.snapshot.integrations.map(item => `
      <article class="connection-card ui-card">
        <div class="connection-head"><div><span class="section-kicker">${esc(item.id)}</span><h3>${esc(item.name)}</h3></div>${statusDot(item.status, integrationStatusText(item.status))}</div>
        <p>${esc(item.purpose)}</p>
        <small>${esc(item.detail || item.action || 'Requiere configuración externa.')}</small>
        ${item.required && item.required.length ? `<details><summary>Ver requisitos</summary><ul>${item.required.map(name => `<li><code>${esc(name)}</code></li>`).join('')}</ul></details>` : ''}
      </article>`).join('')}</div><p class="connection-check">${icon('lock', 12)} ${esc(checked)}. “Configurado” solo confirma presencia de variables; no equivale a una conexión probada.</p>`;
  }

  function renderToday() {
    const data = state.snapshot;
    const steps = data.firstDay.steps;
    const completed = steps.filter(step => step.status === 'completed').length;
    const actionable = steps.filter(step => step.status !== 'blocked').length;
    const progress = percent(completed, Math.max(1, actionable));
    const next = steps.find(step => step.status === 'pending');
    return `<div class="stack">
      <section class="today-hero ui-card">
        <div><p class="eyebrow">Primer día operable · escenario demo</p><h2>${esc(data.firstDay.title)}</h2><p>${esc(data.firstDay.outcome)}</p></div>
        <div class="today-progress" aria-label="${completed} de ${actionable} pasos accionables completados"><strong>${progress}%</strong><span>${completed} de ${actionable}<br>pasos accionables</span></div>
      </section>
      <section class="section-grid">
        <div>
          <div class="section-head"><div><span class="section-kicker">Secuencia recomendada</span><h2>Una decisión a la vez</h2><p>Los cambios se guardan solo en este navegador como demostración.</p></div>${next ? `<button class="btn btn-primary" type="button" data-action="open-step" data-view="${esc(next.view)}">Continuar con el paso ${esc(next.order)} ${icon('arrow-right', 13)}</button>` : ''}</div>
          <div class="day-list">${steps.map(step => `
            <article class="day-step ui-card ${step.status === 'completed' ? 'is-complete' : step.status === 'blocked' ? 'is-blocked' : ''}">
              <span class="day-number">${String(step.order).padStart(2, '0')}</span>
              <div><div class="piece-head"><h3>${esc(step.title)}</h3>${statusBadge(step.status)}</div><p>${esc(step.detail)}</p><small>${esc(step.owner)}</small></div>
              <div class="day-actions">
                <button class="btn" type="button" data-action="open-step" data-view="${esc(step.view)}">Abrir</button>
                ${!step.calculated && step.status !== 'blocked' ? `<button class="btn ${step.status === 'completed' ? '' : 'btn-primary'}" type="button" data-action="day-status" data-id="${esc(step.id)}" data-status="${step.status === 'completed' ? 'pending' : 'completed'}">${step.status === 'completed' ? 'Reabrir' : 'Marcar listo'}</button>` : ''}
              </div>
            </article>`).join('')}</div>
        </div>
        <aside class="panel ui-card today-side"><span class="section-kicker">Salida segura de hoy</span><h2>Preparar, no publicar</h2><p>Mientras Drive y Metricool sigan sin verificar, la salida correcta es revisar, aprobar y exportar un paquete manual. Ningún botón de esta aplicación publica contenido.</p><button class="btn btn-primary btn-wide" type="button" data-action="open-step" data-view="calendar">Preparar entrega manual</button><div class="today-rule">${icon('shield-check', 14)} El Consejo de calidad conserva la última palabra antes de cualquier salida.</div></aside>
      </section>
      <section id="connections"><div class="section-head"><div><span class="section-kicker">Estado real del entorno</span><h2>Conexiones y bloqueos</h2><p>La aplicación consulta el servidor después de validar la sesión y nunca devuelve secretos.</p></div></div>${renderIntegrationCards()}</section>
    </div>`;
  }

  function renderPublicResearch() {
    const research = state.snapshot.research;
    if (!research) return `<section class="research-empty ui-card"><div><span class="section-kicker">Fuentes públicas</span><h2>No hay una lectura disponible</h2><p>${esc(state.researchCheck.error || 'Todavía no se consultaron las cuentas públicas.')}</p></div><button class="btn btn-primary" type="button" data-action="refresh-research">${icon('refresh', 13)} Volver a intentar</button></section>`;
    const yt = research.youtube;
    const collected = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(research.collectedAt));
    return `<section class="research-stack">
      <div class="research-hero ui-card"><div><p class="eyebrow">Lectura pública real · ${esc(collected)}</p><h2>El contenido que ya está funcionando</h2><p>${esc(research.scope)}</p></div><button class="btn" type="button" data-action="refresh-research">${icon('refresh', 13)} Actualizar ahora</button></div>
      <div class="research-profiles">${research.profiles.map(profile => `<a class="research-profile ui-card" href="${esc(profile.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(profile.platform)}</span><strong>${esc(profile.handle)}</strong><div><b>${formatNumber(profile.followers || 0)}</b> seguidores · <b>${formatNumber(profile.posts || 0)}</b> piezas${profile.likes ? ` · <b>${formatNumber(profile.likes)}</b> me gusta` : ''}</div><small>${esc(profile.source)}</small></a>`).join('')}</div>
      <div class="research-summary ui-card"><div><span>Mejor Short visible</span><strong>${formatNumber(yt.summary.bestShortViews)}</strong></div><div><span>Mediana Shorts · muestra</span><strong>${formatNumber(yt.summary.medianShortViews)}</strong></div><div><span>Mejor video largo reciente</span><strong>${formatNumber(yt.summary.bestRecentVideoViews)}</strong></div><div><span>Mediana largos · muestra</span><strong>${formatNumber(yt.summary.medianRecentVideoViews)}</strong></div></div>
      <div class="section-grid equal">
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Ranking verificable</span><h2>Shorts con más vistas</h2><p>${esc(yt.sample.note)}</p></div><span class="source-chip">${yt.sample.shorts} visibles</span></div><div class="content-rank">${yt.topShorts.map((item, index) => `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(item.title)}</strong><b>${formatNumber(item.views)}</b></a>`).join('')}</div></div>
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Desempeño reciente</span><h2>Videos largos</h2><p>Vistas públicas; no equivalen a alcance único ni retención.</p></div><span class="source-chip">${yt.sample.videos} visibles</span></div><div class="content-rank">${yt.topVideos.map((item, index) => `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(item.title)}</strong><b>${formatNumber(item.views)}</b></a>`).join('')}</div></div>
      </div>
      <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Texto fuente</span><h2>Transcripciones de las piezas líderes</h2><p>Subtítulos públicos automáticos. Revisar nombres, cifras y términos antes de convertirlos en afirmaciones.</p></div></div><div class="transcript-list">${yt.transcripts.map(item => `<details><summary><span>${formatNumber(item.views)} vistas</span><strong>${esc(item.title)}</strong><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Ver video</a></summary>${item.transcriptStatus === 'available' ? `<p>${esc(item.transcript)}</p>` : `<p>No disponible: ${esc(item.transcriptError || 'sin subtítulos públicos')}</p>`}</details>`).join('')}</div></div>
      <div class="research-limits ui-card"><strong>Qué falta para analítica completa</strong><ul>${research.limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>
    </section>`;
  }

  function renderRadar() {
    const data = state.snapshot;
    const filters = ['Todos', ...data.platforms.map(platform => platform.name)];
    const platformId = data.platforms.find(platform => platform.name === state.signalFilter)?.id;
    const signals = state.signalFilter === 'Todos' ? data.signals : data.signals.filter(signal => signal.platform === platformId);
    return `<div class="stack">
      ${renderPublicResearch()}
      <section class="radar-intro ui-card"><div><p class="eyebrow">Investigación demo, no escucha automática</p><h2>De una señal a una prueba deliberada</h2><p>Estas señales son ficticias y sirven para probar el flujo. Cada una exige fuente, vigencia, ajuste de marca y una decisión humana.</p></div><div class="radar-legend"><span>${data.signals.filter(item => item.decision === 'test').length} por probar</span><span>${data.signals.filter(item => item.decision === 'discard').length} descartadas</span></div></section>
      <section><div class="team-toolbar"><div><span class="section-kicker">Radar priorizado</span><h2>Señales con vida útil</h2></div><div class="filter-pills" aria-label="Filtrar señales por plataforma">${filters.map(filter => `<button type="button" class="filter-pill ${filter === state.signalFilter ? 'is-active' : ''}" data-action="signal-filter" data-value="${esc(filter)}">${esc(filter)}</button>`).join('')}</div></div>
        <div class="signal-grid">${signals.map(signal => { const platform = data.platforms.find(item => item.id === signal.platform); return `<article class="signal-card ui-card"><div class="signal-card-top"><span class="platform-badge">${esc(platform?.short || signal.platform)}</span>${statusBadge(signal.decision)}</div><h3>${esc(signal.pattern)}</h3><p>${esc(signal.why)}</p><dl><div><dt>Fuente</dt><dd>${esc(signal.source)}</dd></div><div><dt>Ventana</dt><dd>${esc(signal.window)}</dd></div><div><dt>Ajuste</dt><dd>${esc(signal.fit)}</dd></div></dl><div class="signal-actions"><button class="btn btn-primary" type="button" data-action="signal-decision" data-id="${esc(signal.id)}" data-status="test">Probar</button><button class="btn" type="button" data-action="signal-decision" data-id="${esc(signal.id)}" data-status="discard">Descartar</button></div></article>`; }).join('')}</div>
      </section>
    </div>`;
  }

  function latestRun(agentId) {
    if (state.activeBatchId) return state.agentRuns.find(run => run.agentId === agentId && run.batchId === state.activeBatchId) || null;
    return state.agentRuns.find(run => run.agentId === agentId) || null;
  }

  function agentRunButton(agentId, compact) {
    const run = latestRun(agentId);
    const disabled = state.runningAll || run?.status === 'running' || (!state.agentRuntime.configured && !state.agentRuntime.fixture);
    const label = run?.status === 'running' ? 'Ejecutando…' : run?.status === 'completed' ? 'Volver a probar' : 'Ejecutar prueba';
    return `<button class="btn ${compact ? '' : 'btn-primary'}" type="button" data-action="run-agent" data-id="${esc(agentId)}" ${disabled ? 'disabled' : ''}>${run?.status === 'running' ? '<span class="ui-spinner" aria-hidden="true"></span>' : icon('play', 12)} ${label}</button>`;
  }

  function renderRunResult(agent, run) {
    if (!run) return `<article class="agent-run-card ui-card"><div class="agent-run-head"><div><span class="section-kicker">${esc(agent.id)}</span><h3>${esc(agent.name)}</h3></div>${statusBadge('idle')}</div><p class="run-empty">Todavía no hay evidencia. Ejecutá una prueba para ver qué recibe, qué entrega y cómo pasa los controles.</p>${agentRunButton(agent.id)}</article>`;
    if (run.status === 'running') return `<article class="agent-run-card ui-card is-running"><div class="agent-run-head"><div><span class="section-kicker">${esc(agent.id)}</span><h3>${esc(agent.name)}</h3></div>${statusBadge('running')}</div><div class="run-progress"><span class="ui-spinner" aria-hidden="true"></span><p>El agente está procesando el brief y las entregas previas. No ejecuta acciones externas.</p></div></article>`;
    if (run.status === 'error') return `<article class="agent-run-card ui-card is-error"><div class="agent-run-head"><div><span class="section-kicker">${esc(agent.id)}</span><h3>${esc(agent.name)}</h3></div>${statusBadge('error')}</div><p class="run-error">${esc(run.error || 'La prueba no pudo completarse.')}</p>${agentRunButton(agent.id)}</article>`;
    const output = run.output || {};
    return `<article class="agent-run-card ui-card is-complete">
      <div class="agent-run-head"><div><span class="section-kicker">${esc(agent.id)} · ${esc(run.model)}</span><h3>${esc(agent.name)}</h3></div>${statusBadge(output.verdict || 'needs_review')}</div>
      <div class="run-score"><strong>${esc(run.score)}%</strong><span>controles<br>automáticos</span><small>${(Number(run.durationMs || 0) / 1000).toFixed(1)} s</small></div>
      <h4>${esc(output.headline || 'Entrega sin titular')}</h4><p class="run-summary">${esc(output.summary || '')}</p>
      <details class="run-details"><summary>Revisar entrega completa</summary>
        ${output.communication ? `<div class="run-section"><h5>Decisión de comunicación</h5><div class="run-communication"><div><span>Tensión</span><p>${esc(output.communication.tension)}</p></div><div><span>Reencuadre</span><p>${esc(output.communication.reframe)}</p></div><div><span>Idea repetible</span><p>${esc(output.communication.repeatable_idea)}</p></div><div><span>Dato → beneficio → escena</span><p>${esc(output.communication.data_to_scene)}</p></div><div><span>Credibilidad</span><p>${esc(output.communication.credibility_guardrail)}</p></div></div></div>` : ''}
        <div class="run-section"><h5>Entregables</h5>${(output.deliverables || []).map(item => `<div class="run-deliverable"><strong>${esc(item.label)}</strong><p>${esc(item.content)}</p></div>`).join('') || '<p>Sin entregables.</p>'}</div>
        <div class="run-columns"><div class="run-section"><h5>Fuentes y evidencia</h5><ul>${(output.evidence || []).map(item => `<li><strong>${esc(item.source)}:</strong> ${esc(item.note)}</li>`).join('')}</ul></div><div class="run-section"><h5>Supuestos</h5><ul>${(output.assumptions || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></div><div class="run-section"><h5>Riesgos</h5><ul>${(output.risks || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></div></div>
        <div class="run-section"><h5>Siguientes acciones</h5><div class="next-action-list">${(output.next_actions || []).map(item => `<div><strong>${esc(item.owner)}</strong><span>${esc(item.action)}</span><small>${esc(item.due || 'Sin fecha')}</small></div>`).join('')}</div></div>
        <div class="run-section"><h5>Control automático del contrato</h5><div class="check-list">${(run.checks || []).map(check => `<span class="${check.passed ? 'is-pass' : 'is-fail'}">${icon(check.passed ? 'check' : 'alert', 11)} ${esc(check.label)}</span>`).join('')}</div></div>
      </details>
      <div class="run-foot"><span>${run.fixture ? 'Fixture local · no IA' : `Ejecución IA real · ${esc(run.provider || 'proveedor configurado')} · datos ${esc(run.inputMode)}`}</span>${agentRunButton(agent.id, true)}</div>
    </article>`;
  }

  function renderLab() {
    const catalog = window.GrowthAgents.CATALOG;
    const completed = catalog.filter(agent => latestRun(agent.id)?.status === 'completed').length;
    const failed = catalog.filter(agent => latestRun(agent.id)?.status === 'error').length;
    const realReady = state.agentRuntime.configured;
    const canRun = realReady || state.agentRuntime.fixture;
    return `<div class="stack">
      <section class="agent-lab-hero ui-card">
        <div><p class="eyebrow">Banco de pruebas controlado</p><h2>Hacé trabajar al equipo y revisá la evidencia</h2><p>Cada agente recibe el mismo brief, su misión y las entregas previas relevantes. La batería produce propuestas estructuradas; no publica, agenda ni escribe en servicios externos.</p><div class="runtime-line">${statusDot(completed ? 'verified' : realReady ? 'configured' : state.agentRuntime.fixture ? 'unverified' : 'blocked', completed ? 'Motor probado en este navegador' : realReady ? `Motor listo para probar · ${esc(state.agentRuntime.provider || 'proveedor configurado')}` : state.agentRuntime.fixture ? 'Fixture exclusiva de localhost' : 'Motor IA no disponible')}<span>${completed}/9 completados${failed ? ` · ${failed} fallaron` : ''}</span></div></div>
        <div class="lab-primary-actions"><button class="btn btn-primary" type="button" data-action="run-all" ${!canRun || state.runningAll ? 'disabled' : ''}>${state.runningAll ? '<span class="ui-spinner" aria-hidden="true"></span> Ejecutando equipo…' : `${icon('play', 13)} Ejecutar los 9 agentes`}</button><button class="btn" type="button" data-action="export-runs" ${completed ? '' : 'disabled'}>${icon('download', 13)} Exportar resultados</button></div>
      </section>
      <section class="brief-panel ui-card"><div class="brief-copy"><span class="section-kicker">Entrada compartida</span><h2>Brief de la prueba</h2><p>${esc(state.snapshot.agentTest.inputLabel)}. Podés editarlo antes de ejecutar. Se envía al modelo, pero no se guarda en Supabase.</p></div><label for="agent-brief">Contexto y objetivo</label><textarea id="agent-brief" rows="5" maxlength="5000">${esc(state.agentBrief)}</textarea><div class="brief-foot"><span>${icon('lock', 12)} ${esc(state.snapshot.agentTest.rule)}</span><button class="text-action" type="button" data-action="reset-brief">Restaurar entrada recomendada</button></div></section>
      <section><div class="section-head"><div><span class="section-kicker">Evidencia por función</span><h2>Entradas, salidas y control</h2><p>Los resultados quedan solo en este navegador hasta que se active Supabase Growth.</p></div><button class="text-action" type="button" data-action="clear-runs" ${state.agentRuns.length ? '' : 'disabled'}>Limpiar resultados</button></div><div class="agent-run-grid">${catalog.map(agent => renderRunResult(agent, latestRun(agent.id))).join('')}</div></section>
    </div>`;
  }

  function renderCommand() {
    const data = state.snapshot;
    return `<div class="stack">
      <section class="directive-card ui-card">
        <p class="eyebrow">Directiva de la semana</p>
        <h2>${esc(data.directive.title)}</h2>
        <p>${esc(data.directive.summary)}</p>
        <div class="directive-meta">
          <span class="meta-pill">Foco: <strong>${esc(data.directive.focus)}</strong></span>
          <span class="meta-pill">Meta: <strong>${esc(data.directive.target)}</strong></span>
          <span class="meta-pill">Confianza: <strong>${esc(data.directive.confidence)}</strong></span>
        </div>
      </section>

      <section class="communication-system">
        <div class="section-head"><div><span class="section-kicker">Sistema de comunicación</span><h2>${esc(data.communicationPlaybook.title)}</h2><p>${esc(data.communicationPlaybook.thesis)}</p></div><span class="source-chip">${icon('book-open', 12)} ${esc(data.communicationPlaybook.source)}</span></div>
        <div class="communication-formula ui-card" aria-label="Fórmula para traducir información en comunicación">
          ${data.communicationPlaybook.formula.map((step, index) => `<div><span>0${index + 1}</span><strong>${esc(step)}</strong></div>${index < data.communicationPlaybook.formula.length - 1 ? `<i aria-hidden="true">${icon('arrow-right', 13)}</i>` : ''}`).join('')}
        </div>
        <div class="communication-grid">${data.communicationPlaybook.principles.map(principle => `<article class="communication-card ui-card"><span>${esc(principle.name)}</span><p>${esc(principle.rule)}</p></article>`).join('')}</div>
        <div class="weekly-communication ui-card"><strong>Aplicación esta semana</strong><div>${data.communicationPlaybook.weeklyUse.map(rule => `<span>${icon('check', 11)} ${esc(rule)}</span>`).join('')}</div></div>
      </section>

      <section>
        <div class="section-head"><div><span class="section-kicker">Embudo completo</span><h2>De atención a ingreso</h2><p>Los porcentajes indican conversión desde la etapa anterior.</p></div><button class="text-action" type="button" data-action="go-learning">Ver aprendizaje ${icon('arrow-right', 13)}</button></div>
        <div class="funnel">${data.funnel.map(step => `
          <article class="funnel-step">
            <span class="funnel-label">${esc(step.label)}</span>
            <strong class="funnel-value">${formatNumber(step.value)}</strong>
            <div class="funnel-foot"><span>${step.conversion == null ? 'Inicio' : esc(step.conversion) + '% conv.'}</span><span>meta ${formatNumber(step.target)}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${percent(step.value, step.target)}%"></div></div>
          </article>`).join('')}</div>
      </section>

      <section>
        <div class="section-head"><div><span class="section-kicker">Acuerdo semanal</span><h2>Cobertura por plataforma</h2><p>Mínimo de cinco piezas planeadas por canal. Planificar no equivale a publicar.</p></div></div>
        <div class="platform-grid">${data.platforms.map(platform => `
          <article class="platform-card ui-card">
            <div class="platform-top"><span class="platform-badge">${esc(platform.short)}</span><span class="trend ${platform.trend >= 0 ? 'up' : 'down'}">${icon(platform.trend >= 0 ? 'trending-up' : 'trending-down', 12)} ${platform.trend >= 0 ? '+' : ''}${esc(platform.trend)}%</span></div>
            <h3>${esc(platform.name)}</h3>
            <div class="platform-count">${esc(platform.planned)} <small>/ ${esc(platform.goal)} piezas</small></div>
            <div class="progress-track"><div class="progress-fill" style="width:${percent(platform.planned, platform.goal)}%"></div></div>
          </article>`).join('')}</div>
      </section>

      <section class="section-grid">
        <div class="panel ui-card">
          <div class="section-head"><div><span class="section-kicker">Atención requerida</span><h2>Alertas que cambian decisiones</h2></div></div>
          <div class="alert-list">${data.alerts.map(alert => `
            <article class="alert-row"><span class="alert-icon ${esc(alert.severity)}">${icon(alert.severity === 'info' ? 'info' : 'alert', 14)}</span><div><strong>${esc(alert.title)}</strong><p>${esc(alert.detail)}</p></div><span class="owner-tag">${esc(alert.owner)}</span></article>`).join('')}</div>
        </div>
        <div class="panel ui-card">
          <div class="section-head"><div><span class="section-kicker">Estado verificable</span><h2>Integraciones</h2><p>Configuración no equivale a conexión probada.</p></div><button class="text-action" type="button" data-action="open-step" data-view="today">Ver requisitos ${icon('arrow-right', 13)}</button></div>
          <div class="integration-list">${data.integrations.map(item => `<div class="integration-row"><div><strong>${esc(item.name)}</strong><small>${esc(item.purpose)}</small></div>${statusDot(item.status, integrationStatusText(item.status))}</div>`).join('')}</div>
        </div>
      </section>
    </div>`;
  }

  function renderTeams() {
    const data = state.snapshot;
    const areas = ['Todos', ...new Set(data.teams.map(team => team.area))];
    const teams = state.teamFilter === 'Todos' ? data.teams : data.teams.filter(team => team.area === state.teamFilter);
    return `<div class="stack">
      <section class="team-toolbar"><div><span class="section-kicker">${data.teams.length} equipos coordinados</span><h2>Contratos operativos visibles</h2></div><div class="filter-pills" aria-label="Filtrar equipos">${areas.map(area => `<button type="button" class="filter-pill ${area === state.teamFilter ? 'is-active' : ''}" data-action="team-filter" data-value="${esc(area)}">${esc(area)}</button>`).join('')}</div></section>
      <section class="team-grid">${teams.map(team => `
        <article class="team-card ui-card">
          <div class="team-card-top"><span class="team-icon">${icon(TEAM_ICONS[team.id] || 'bot', 17)}</span>${statusDot(team.status)}</div>
          <div><h3>${esc(team.name)}</h3><span class="team-area">${esc(team.area)}</span><p class="team-mission">${esc(team.mission)}</p></div>
          <div class="contract-grid"><div><h4>Entradas</h4><ul>${team.inputs.map(value => `<li>${esc(value)}</li>`).join('')}</ul></div><div><h4>Entregas</h4><ul>${team.outputs.map(value => `<li>${esc(value)}</li>`).join('')}</ul></div></div>
          <div class="team-bottom"><span class="cadence">${icon('clock', 12)} ${esc(team.cadence)}</span><div class="kpi-tags">${team.kpis.map(kpi => `<span class="kpi-tag">${esc(kpi)}</span>`).join('')}</div><span class="cadence">Última: ${esc(team.lastRun)} · Próxima: ${esc(team.nextRun)}</span><div class="team-run-control">${agentRunButton(team.id, true)}${latestRun(team.id)?.status === 'completed' ? `<button class="text-action" type="button" data-action="open-step" data-view="lab">Ver resultado</button>` : ''}</div></div>
        </article>`).join('')}</section>
    </div>`;
  }

  function renderFlow() {
    const data = state.snapshot;
    return `<div class="stack">
      <section class="panel-flat">
        <div class="section-head"><div><span class="section-kicker">Sistema de extremo a extremo</span><h2>Cada entrega habilita la siguiente</h2><p>El consejo de calidad funciona como compuerta entre decisión y salida.</p></div></div>
        <div class="flow-board"><div class="flow-line">${data.stages.map((stage, index) => `
          <article class="stage-card ui-card"><span class="stage-index">0${index + 1} · ${esc(stage.verb)}</span><div>${statusDot(stage.status)}</div><h3>${esc(stage.label)}</h3><strong class="stage-count">${esc(stage.count)}</strong><p>${esc(stage.detail)}</p><div class="stage-owner"><strong>${esc(stage.owner)}</strong><br>${esc(stage.sla)}</div></article>`).join('')}</div></div>
        <div class="flow-rule">
          <article class="rule-card ui-card"><h3>${icon('lock', 14)} Regla de salida</h3><p>Nada llega a calendario con controles abiertos o sin una decisión humana registrada.</p></article>
          <article class="rule-card ui-card"><h3>${icon('eye', 14)} Regla de evidencia</h3><p>Cada recomendación muestra fuente, hipótesis, responsable y métrica. Sin datos, el estado es vacío.</p></article>
          <article class="rule-card ui-card"><h3>${icon('refresh', 14)} Regla de aprendizaje</h3><p>El resultado vuelve a estrategia. Se aprende el patrón y se reescribe la creatividad.</p></article>
        </div>
      </section>
    </div>`;
  }

  function renderApproval() {
    const data = state.snapshot;
    const filters = ['Pendientes', 'Todas', 'Aprobadas'];
    const pieces = data.pieces.filter(piece => {
      if (state.pieceFilter === 'Pendientes') return ['pending', 'revision'].includes(piece.status);
      if (state.pieceFilter === 'Aprobadas') return ['approved', 'scheduled'].includes(piece.status);
      return true;
    });
    return `<div class="stack">
      <section class="piece-toolbar"><div><span class="section-kicker">Revisión humana obligatoria</span><h2>Decidí con contexto completo</h2></div><div class="filter-pills" aria-label="Filtrar piezas por estado">${filters.map(filter => `<button type="button" class="filter-pill ${filter === state.pieceFilter ? 'is-active' : ''}" data-action="piece-filter" data-value="${esc(filter)}">${esc(filter)}</button>`).join('')}</div></section>
      <section class="piece-list">${pieces.length ? pieces.map(piece => `
        <article class="piece-card ui-card">
          <div>
            <div class="piece-head">${statusBadge(piece.status)}<span class="badge draft">${esc(piece.category)}</span><span class="piece-sub">${piece.platforms.map(id => esc(data.platforms.find(item => item.id === id)?.short || id)).join(' · ')}</span></div>
            <h3>${esc(piece.title)}</h3><span class="piece-sub">${esc(piece.format)} · ${esc(piece.owner)} · vence ${esc(piece.due)}</span>
            <div class="piece-detail-grid">
              <div class="piece-detail"><span>Avatar y ángulo</span><p>${esc(piece.avatar)}. ${esc(piece.angle)}.</p></div>
              <div class="piece-detail"><span>Gancho</span><p>${esc(piece.hook)}</p></div>
              <div class="piece-detail"><span>Prueba</span><p>${esc(piece.proof)}</p></div>
              <div class="piece-detail"><span>CTA</span><p>${esc(piece.cta)}</p></div>
              <div class="piece-detail"><span>Riesgo a validar</span><p>${esc(piece.risk)}</p></div>
              <div class="piece-detail"><span>Activo</span><p>${esc(piece.asset?.label || 'Sin activo')} · ${esc(piece.asset?.detail || 'Sin vínculo verificado.')}</p></div>
            </div>
          </div>
          <div class="piece-actions">
            <button class="btn btn-primary" type="button" data-action="piece-status" data-id="${esc(piece.id)}" data-status="approved">${icon('check', 13)} Aprobar</button>
            <button class="btn btn-danger" type="button" data-action="piece-status" data-id="${esc(piece.id)}" data-status="revision">${icon('refresh', 13)} Pedir mejora</button>
          </div>
        </article>`).join('') : `<div class="empty-state ui-card"><div class="state-symbol">${icon('check', 24)}</div><h2>No hay piezas en este filtro</h2><p>Cambiá el filtro para revisar el resto del escenario.</p></div>`}</section>
    </div>`;
  }

  function renderCalendar() {
    const data = state.snapshot;
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const slots = ['Mañana', 'Mediodía', 'Tarde'];
    const at = (day, slot) => data.calendar.filter(item => item.day === day && (slot === 'Mañana' ? Number(item.time.split(':')[0]) < 11 : slot === 'Mediodía' ? Number(item.time.split(':')[0]) < 15 : Number(item.time.split(':')[0]) >= 15));
    const metricool = data.integrations.find(item => item.id === 'metricool');
    const drive = data.integrations.find(item => item.id === 'drive');
    return `<div class="stack">
      <section class="calendar-gate ui-card"><div><span class="section-kicker">Salida controlada</span><h2>Adaptaciones y dependencias visibles</h2><p>El estado “programada” es parte del escenario: no implica conexión con Metricool ni activo disponible en Drive.</p><div class="calendar-deps"><span>${statusDot(metricool?.status || 'not_configured', `Metricool · ${integrationStatusText(metricool?.status || 'not_configured')}`)}</span><span>${statusDot(drive?.status || 'not_configured', `Drive · ${integrationStatusText(drive?.status || 'not_configured')}`)}</span></div></div><div class="calendar-actions"><button class="btn btn-primary" type="button" data-action="export-week">${icon('download', 13)} Exportar paquete manual</button><button class="btn" type="button" disabled aria-describedby="publish-disabled-reason">Programar en Metricool</button><small id="publish-disabled-reason">Disponible solo después de configurar y probar la integración.</small></div></section>
      <section class="calendar-wrap"><div class="calendar-grid">
        <div class="calendar-cell calendar-head">Franja</div>${days.map(day => `<div class="calendar-cell calendar-head">${day}</div>`).join('')}
        ${slots.map(slot => `<div class="calendar-cell calendar-time">${slot}</div>${days.map(day => `<div class="calendar-cell">${at(day, slot).map(item => { const piece = data.pieces.find(candidate => candidate.id === item.pieceId); const platform = data.platforms.find(candidate => candidate.id === item.platform); return `<article class="calendar-item"><div class="calendar-meta"><span>${esc(item.time)} · ${esc(platform?.short || item.platform)}</span>${statusBadge(item.status)}</div><strong>${esc(piece?.title || 'Pieza sin detalle')}</strong></article>`; }).join('')}</div>`).join('')}`).join('')}
      </div></section>
      <p class="qa-disclaimer">${icon('info', 14)} Este calendario representa intención editorial. La primera integración real deberá confirmar pieza, activo, destino, fecha, zona horaria y respuesta del proveedor antes de mostrar “publicado”. El archivo exportado lleva una prohibición explícita de publicación.</p>
    </div>`;
  }

  function renderLearning() {
    const data = state.snapshot;
    const weekly = data.metrics.weekly;
    const max = Math.max(...weekly.map(item => item.reach));
    const points = weekly.map((item, index) => ({ x: 18 + (index * (364 / Math.max(1, weekly.length - 1))), y: 205 - ((item.reach / max) * 176) }));
    const line = points.map(point => `${point.x},${point.y}`).join(' ');
    const area = `18,205 ${line} 382,205`;
    return `<div class="stack">
      <section class="section-grid">
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Tendencia demo</span><h2>Alcance semanal</h2><p>La atención solo importa si avanza por el embudo.</p></div><span class="signal">+70% en la muestra</span></div>
          <div class="learning-chart"><div class="chart-y"><span>${formatNumber(max)}</span><span>${formatNumber(max / 2)}</span><span>0</span></div><div class="chart-area"><svg viewBox="0 0 400 220" role="img" aria-label="Alcance demo de cinco semanas"><line class="chart-grid-line" x1="18" y1="29" x2="382" y2="29"></line><line class="chart-grid-line" x1="18" y1="117" x2="382" y2="117"></line><line class="chart-grid-line" x1="18" y1="205" x2="382" y2="205"></line><polygon class="chart-area-fill" points="${area}"></polygon><polyline class="chart-line" points="${line}"></polyline>${points.map(point => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join('')}</svg><div class="chart-labels">${weekly.map(item => `<span>${esc(item.week)}</span>`).join('')}</div></div></div>
        </div>
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Embudo de aprendizaje</span><h2>Resultados asociados</h2></div></div><div class="integration-list">${weekly.map(item => `<div class="integration-row"><div><strong>${esc(item.week)}</strong><small>${formatNumber(item.reach)} alcance</small></div><span class="signal">${item.leads} leads · ${item.calls} agendas · ${item.sales} ventas</span></div>`).join('')}</div></div>
      </section>
      <section class="section-grid equal">
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Mínimo de evidencia</span><h2>Patrones observados</h2></div></div><div class="pattern-list">${data.metrics.patterns.map(pattern => `<article class="pattern-row"><div class="pattern-top"><strong>${esc(pattern.name)}</strong><span class="signal">${esc(pattern.signal)}</span></div><p>${esc(pattern.evidence)}. Próxima decisión: ${esc(pattern.action)}.</p></article>`).join('')}</div></div>
        <div class="panel ui-card"><div class="section-head"><div><span class="section-kicker">Próxima iteración</span><h2>Experimentos</h2></div></div><div class="experiment-list">${data.metrics.experiments.map(experiment => `<article class="experiment-row"><div class="experiment-top"><strong>${esc(experiment.hypothesis)}</strong>${statusBadge(experiment.status)}</div><p>Métrica: ${esc(experiment.metric)}. Dueño: ${esc(experiment.owner)}.</p></article>`).join('')}</div></div>
      </section>
    </div>`;
  }

  function renderQuality() {
    const council = state.snapshot.qualityCouncil;
    const filters = ['Todos', 'Mejorar', 'Aprobados'];
    const reviewers = council.reviewers.filter(item => state.qaFilter === 'Todos' || (state.qaFilter === 'Mejorar' ? item.status !== 'passed' : item.status === 'passed'));
    const open = council.reviewers.filter(item => item.status !== 'passed').length;
    return `<div class="stack">
      <section class="qa-hero">
        <div class="qa-gate ui-card ${council.status === 'passed' ? 'is-passed' : ''}"><div class="qa-gate-top"><span class="qa-gate-icon">${icon(council.status === 'passed' ? 'shield-check' : 'shield', 20)}</span>${statusBadge(council.status)}</div><h2>${esc(council.verdict)}</h2><p>${esc(council.summary)}</p></div>
        <div class="qa-scope ui-card"><div class="qa-scope-row"><span>Alcance</span><strong>${esc(council.scope)}</strong></div><div class="qa-scope-row"><span>Última revisión</span><strong>${new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(council.reviewedAt))}</strong></div><div class="qa-scope-row"><span>Controles</span><strong>${council.reviewers.length}</strong></div><div class="qa-scope-row"><span>Hallazgos abiertos</span><strong>${open}</strong></div></div>
      </section>
      <section>
        <div class="qa-toolbar"><div><span class="section-kicker">Revisión independiente</span><h2>Criterios, hallazgos y evidencia</h2></div><div class="filter-pills" aria-label="Filtrar controles de calidad">${filters.map(filter => `<button type="button" class="filter-pill ${filter === state.qaFilter ? 'is-active' : ''}" data-action="qa-filter" data-value="${esc(filter)}">${esc(filter)}</button>`).join('')}</div></div>
        <div class="qa-grid">${reviewers.map((reviewer, index) => `<article class="qa-card ui-card"><span class="qa-number">${String(index + 1).padStart(2, '0')}</span><div><div class="piece-head"><h3>${esc(reviewer.name)}</h3>${statusBadge(reviewer.status)}</div><p class="qa-specialty">${esc(reviewer.specialty)}</p><p class="qa-finding">${esc(reviewer.finding)}</p><span class="qa-evidence">${icon('file', 11)} Evidencia: ${esc(reviewer.evidence)}</span></div><div class="qa-actions"><button class="btn" type="button" title="Marcar aprobado" aria-label="Marcar ${esc(reviewer.name)} como aprobado" data-action="qa-status" data-id="${esc(reviewer.id)}" data-status="passed">${icon('check', 13)}</button><button class="btn btn-danger" type="button" title="Pedir mejora" aria-label="Pedir mejora en ${esc(reviewer.name)}" data-action="qa-status" data-id="${esc(reviewer.id)}" data-status="improve">${icon('refresh', 13)}</button></div></article>`).join('')}</div>
        <div class="qa-disclaimer">${icon('info', 14)} Este dictamen reduce riesgo con los controles y la evidencia disponibles. No garantiza que una pieza se vuelva viral ni que el sistema esté libre de todo fallo. Nicolás conserva la decisión final de salida.</div>
      </section>
    </div>`;
  }

  function captureAgentBrief() {
    const field = $('#agent-brief');
    if (field) state.agentBrief = field.value.trim();
    return state.agentBrief;
  }

  function setLatestRun(agentId, run) {
    state.agentRuns = [run, ...state.agentRuns.filter(item => item.agentId !== agentId)].slice(0, 9);
  }

  async function executeAgent(agentId, options) {
    const brief = captureAgentBrief();
    if (brief.length < 20) {
      toast('Agregá un contexto concreto antes de ejecutar.', 'error');
      return null;
    }
    const batchId = options?.batchId || null;
    const previous = batchId
      ? state.agentRuns.filter(run => run.status === 'completed' && run.agentId !== agentId && run.batchId === batchId)
      : agentId === 'quality'
        ? state.agentRuns.filter(run => run.status === 'completed' && run.agentId !== agentId)
        : [];
    setLatestRun(agentId, { agentId, batchId, status: 'running', startedAt: new Date().toISOString() });
    updateCounts();
    render();
    try {
      const result = await state.agentClient.run(agentId, brief, state.snapshot, previous);
      const completed = { ...result, batchId, status: 'completed' };
      setLatestRun(agentId, completed);
      window.GrowthAgents.saveRuns(state.agentRuns);
      updateCounts();
      render();
      if (!options?.silent) toast(`${result.agentName} entregó una prueba para revisión.`);
      return completed;
    } catch (error) {
      const failed = { agentId, batchId, status: 'error', error: error.message, completedAt: new Date().toISOString() };
      setLatestRun(agentId, failed);
      window.GrowthAgents.saveRuns(state.agentRuns);
      updateCounts();
      render();
      if (!options?.silent) toast(error.message, 'error');
      return failed;
    }
  }

  async function executeAllAgents() {
    if (state.runningAll) return;
    captureAgentBrief();
    if (state.agentBrief.length < 20) { toast('Agregá un contexto concreto antes de ejecutar.', 'error'); return; }
    state.runningAll = true;
    const batchId = crypto.randomUUID();
    state.activeBatchId = batchId;
    render();
    try {
      await executeAgent('management', { silent: true, batchId });
      await Promise.all(['virality', 'avatars'].map(id => executeAgent(id, { silent: true, batchId })));
      await Promise.all(['production', 'magnets'].map(id => executeAgent(id, { silent: true, batchId })));
      await Promise.all(['conversations', 'nurture'].map(id => executeAgent(id, { silent: true, batchId })));
      await executeAgent('analytics', { silent: true, batchId });
      await executeAgent('quality', { silent: true, batchId });
      const failures = state.agentRuns.filter(run => run.batchId === batchId && run.status === 'error').length;
      toast(failures ? `La batería terminó con ${failures} fallos para revisar.` : 'Los 9 agentes terminaron. Revisá las entregas antes de usar.', failures ? 'error' : undefined);
    } finally {
      state.runningAll = false;
      updateCounts();
      render();
    }
  }

  async function handleViewAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'retry') return loadSnapshot();
    if (action === 'show-demo') {
      state.mode = 'demo';
      $('#demo-state').value = 'demo';
      await loadSnapshot();
      navigate('today');
      return;
    }
    if (action === 'go-learning') return navigate('learning');
    if (action === 'open-step') {
      navigate(target.dataset.view || 'today');
      if ((target.dataset.view || '') === 'today') setTimeout(() => $('#connections')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }
    if (action === 'team-filter') { state.teamFilter = target.dataset.value; return render(); }
    if (action === 'piece-filter') { state.pieceFilter = target.dataset.value; return render(); }
    if (action === 'qa-filter') { state.qaFilter = target.dataset.value; return render(); }
    if (action === 'signal-filter') { state.signalFilter = target.dataset.value; return render(); }
    if (action === 'run-agent') return executeAgent(target.dataset.id);
    if (action === 'run-all') return executeAllAgents();
    if (action === 'refresh-research') {
      target.disabled = true;
      toast('Actualizando cuentas y transcripciones públicas…');
      await loadPublicResearch(true);
      render();
      toast(state.snapshot.research ? 'Fuentes públicas actualizadas. Los agentes usarán esta evidencia.' : state.researchCheck.error, state.snapshot.research ? undefined : 'error');
      return;
    }
    if (action === 'reset-brief') { state.agentBrief = state.snapshot.agentTest.brief; render(); toast('Brief de demostración restaurado.'); return; }
    if (action === 'clear-runs') {
      state.agentRuns = [];
      window.GrowthAgents.clearRuns();
      updateCounts();
      render();
      toast('Resultados locales eliminados. Podés volver a ejecutar la batería.');
      return;
    }
    if (action === 'export-runs') {
      captureAgentBrief();
      window.GrowthAgents.downloadRuns(state.agentRuns.filter(run => run.status === 'completed'), state.agentBrief);
      toast('Resultados exportados. El archivo no autoriza publicación.');
      return;
    }
    if (action === 'export-week') {
      window.GrowthIntegrations.downloadCalendarExport(state.snapshot);
      toast('Paquete demo exportado. No autoriza publicación.');
      return;
    }
    if (action === 'day-status') {
      target.disabled = true;
      try {
        await state.repository.updateFirstDayStep(target.dataset.id, target.dataset.status);
        state.snapshot = await state.repository.getSnapshot();
        await loadIntegrationReadiness();
        updateCounts();
        render();
        toast(target.dataset.status === 'completed' ? 'Paso marcado como listo en este navegador.' : 'Paso reabierto en el escenario demo.');
      } catch (error) { toast(error.message, 'error'); }
      return;
    }
    if (action === 'signal-decision') {
      target.disabled = true;
      try {
        await state.repository.updateSignalDecision(target.dataset.id, target.dataset.status);
        state.snapshot = await state.repository.getSnapshot();
        await loadIntegrationReadiness();
        updateCounts();
        render();
        toast(target.dataset.status === 'test' ? 'Señal priorizada para una prueba demo.' : 'Señal descartada con decisión visible.');
      } catch (error) { toast(error.message, 'error'); }
      return;
    }
    if (action === 'piece-status') {
      target.disabled = true;
      try {
        await state.repository.updatePieceStatus(target.dataset.id, target.dataset.status);
        state.snapshot = await state.repository.getSnapshot();
        await loadIntegrationReadiness();
        updateCounts();
        render();
        toast(target.dataset.status === 'approved' ? 'Pieza aprobada en el escenario demo.' : 'La pieza quedó marcada para mejora.');
      } catch (error) { toast(error.message, 'error'); }
      return;
    }
    if (action === 'qa-status') {
      target.disabled = true;
      try {
        await state.repository.updateQaCheck(target.dataset.id, target.dataset.status);
        state.snapshot = await state.repository.getSnapshot();
        await loadIntegrationReadiness();
        updateCounts();
        render();
        toast(target.dataset.status === 'passed' ? 'Control aprobado con evidencia demo.' : 'El control volvió a pedir una mejora.');
      } catch (error) { toast(error.message, 'error'); }
    }
  }

  document.addEventListener('DOMContentLoaded', initAuth);
})();
