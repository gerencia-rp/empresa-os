// 🏠 TAB Activos del proyecto (extraído de remodel-pro.js)
// Matterport + scope + audio + planos + archivos del proyecto.
// Depende de: rmState, supabase storage, sb.

// ─── ACTIVOS DEL PROYECTO: Matterport + scope + audio + planos ───
function rmRenderAssets() {
  // Matterport bloquea iframe (X-Frame-Options). Usar link clickable + thumbnail.
  let matterportPreview = '';
  if (rmState.matterportUrl) {
    const match = rmState.matterportUrl.match(/(?:my\.matterport\.com\/show\/\?m=|matterport\.com\/discover\/space\/|my\.matterport\.com\/models\/)([A-Za-z0-9]+)/);
    const modelId = match ? match[1] : null;
    const cleanUrl = modelId ? `https://my.matterport.com/show/?m=${modelId}` : rmState.matterportUrl;
    matterportPreview = `
      <div class="mt-2 border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
        <div class="flex items-center gap-3">
          <div class="text-4xl">🌐</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-blue-900">Tour 360° vinculado ✓</div>
            ${modelId ? `<div class="text-[10px] text-slate-500 font-mono">Model ID: ${modelId}</div>` : ''}
            <div class="text-[10px] text-blue-700 truncate">${rmEsc(cleanUrl)}</div>
          </div>
          <a href="${rmEsc(cleanUrl)}" target="_blank" rel="noopener" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded whitespace-nowrap">🚀 Abrir tour</a>
        </div>
        <p class="text-[10px] text-slate-500 mt-2">⚠️ Matterport bloquea embed inline. Abre en nueva pestaña para medir. Claude SÍ puede analizarlo cuando ejecutes 🤖 IA.</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-xl p-4 border border-slate-200">
      <h3 class="text-xs font-bold text-slate-700 uppercase mb-3">📐 Activos del proyecto (mejoran precisión IA)</h3>

      <!-- Matterport -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">🌐 Tour 360° Matterport (URL)</label>
        <input value="${rmEsc(rmState.matterportUrl)}" oninput="rmState.matterportUrl=this.value.trim()" onchange="rmRenderTabPreservingFocus()" placeholder="https://my.matterport.com/show/?m=XXXXX" class="w-full border ${rmState.matterportUrl && !rmIsValidMatterport(rmState.matterportUrl) ? 'border-amber-400' : 'border-slate-300'} rounded px-3 py-2 text-sm" />
        ${rmState.matterportUrl && !rmIsValidMatterport(rmState.matterportUrl) ? `
          <p class="text-[10px] text-amber-700 mt-0.5 flex items-start gap-1"><span>⚠️</span><span>URL no parece de Matterport (esperado <code class="bg-amber-50 px-1 rounded">/show/?m=…</code>, <code class="bg-amber-50 px-1 rounded">/models/…</code> o <code class="bg-amber-50 px-1 rounded">/discover/space/…</code>). Se guarda igual.</span></p>
        ` : `
          <p class="text-[10px] text-slate-400 mt-0.5">Pega el link y click fuera del campo para preview.</p>
        `}
        ${matterportPreview}
      </div>

      <!-- Scope text -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📝 Scope del proyecto (texto)</label>
        <textarea oninput="rmState.scopeText=this.value" rows="5" placeholder="Describe qué vas a hacer: 'Cocina completa nueva con cabinets blancos, quartz countertop, backsplash subway. Bañera principal tear out completo con tile floor + walls, vanity doble. Pintar toda la casa, cambiar pisos a LVP roble. Reparar foundation crack en sala...'" class="w-full border border-slate-300 rounded px-3 py-2 text-sm">${rmState.scopeText}</textarea>
        <p class="text-[10px] text-slate-400 mt-0.5">Cuanto más específico, mejor la estimación de IA.</p>
      </div>

      <!-- Audio recorder + upload -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">🎙️ Audio scope (graba o sube)</label>
        <div class="flex gap-2 items-center">
          <button onclick="rmToggleRecord()" class="${rmState.isRecording?'bg-red-600 animate-pulse':'bg-slate-900'} hover:opacity-80 text-white text-xs font-bold px-3 py-2 rounded">${rmState.isRecording?'⏹ Detener':'🎙️ Grabar'}</button>
          <input type="file" id="rm-audio-upload" accept="audio/*" class="hidden" onchange="rmUploadAudio(this.files[0])" />
          <label for="rm-audio-upload" class="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">📁 Subir audio</label>
          ${rmState.scopeAudioPath ? `<button onclick="rmPlayAudio()" class="text-xs bg-blue-600 text-white px-3 py-2 rounded">▶️ Reproducir</button><button onclick="rmTranscribeAudio()" class="text-xs bg-purple-600 text-white px-3 py-2 rounded">📝 Transcribir</button>` : ''}
          ${rmState.scopeAudioPath ? `<span class="text-[10px] text-emerald-700">✓ Audio guardado</span>` : ''}
        </div>
        ${rmState.scopeAudioTranscript ? `<div class="mt-2 bg-slate-50 rounded p-2 text-xs"><strong>Transcripción:</strong> ${rmState.scopeAudioTranscript}</div>` : ''}
      </div>

      <!-- Planos -->
      <div class="mb-4">
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📐 Planos (PDF / imagen)</label>
        <input type="file" id="rm-plans-upload" accept=".pdf,image/*" multiple class="hidden" onchange="rmUploadFiles(this.files, 'plans')" />
        <label for="rm-plans-upload" class="inline-block text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">+ Subir planos</label>
        <div class="mt-2 grid grid-cols-3 gap-2">
          ${rmState.plans.map((p, i) => `
            <div class="bg-slate-50 rounded p-2 text-xs flex items-center justify-between">
              <span class="truncate">${p.type==='pdf'?'📄':'🖼️'} ${p.name}</span>
              <button onclick="rmRemoveAsset('plans', ${i})" class="text-red-600 hover:text-red-800 ml-1">✕</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fotos -->
      <div>
        <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">📷 Fotos de la casa (antes)</label>
        <input type="file" id="rm-photos-upload" accept="image/*" multiple class="hidden" onchange="rmUploadFiles(this.files, 'photos')" />
        <label for="rm-photos-upload" class="inline-block text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded cursor-pointer">+ Subir fotos</label>
        <div class="mt-2 grid grid-cols-4 gap-2">
          ${rmState.photos.map((p, i) => `
            <div class="bg-slate-50 rounded p-1 text-xs flex items-center justify-between">
              <span class="truncate">🖼️ ${p.name}</span>
              <button onclick="rmRemoveAsset('photos', ${i})" class="text-red-600 hover:text-red-800 ml-1">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function rmUploadFiles(files, kind) {
  for (const file of files) {
    const userId = state.user?.id || 'anon';
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await sb.storage.from('remodel-assets').upload(path, file);
    if (error) { alert('Error: ' + error.message); continue; }
    const type = file.type.includes('pdf') ? 'pdf' : 'image';
    rmState[kind].push({ path, name: file.name, type });
  }
  rmRenderTab();
}

async function rmRemoveAsset(kind, idx) {
  const item = rmState[kind][idx];
  if (item?.path) await sb.storage.from('remodel-assets').remove([item.path]);
  rmState[kind].splice(idx, 1);
  rmRenderTab();
}

async function rmToggleRecord() {
  if (rmState.isRecording) {
    rmState.mediaRecorder?.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rmState.audioChunks = [];
    rmState.mediaRecorder = new MediaRecorder(stream);
    rmState.mediaRecorder.ondataavailable = e => rmState.audioChunks.push(e.data);
    rmState.mediaRecorder.onstop = async () => {
      const blob = new Blob(rmState.audioChunks, { type: 'audio/webm' });
      const userId = state.user?.id || 'anon';
      const path = `${userId}/scope_${Date.now()}.webm`;
      const { error } = await sb.storage.from('remodel-assets').upload(path, blob);
      if (error) alert('Error: ' + error.message);
      else rmState.scopeAudioPath = path;
      rmState.isRecording = false;
      stream.getTracks().forEach(t => t.stop());
      rmRenderTab();
    };
    rmState.mediaRecorder.start();
    rmState.isRecording = true;
    rmRenderTab();
  } catch (e) {
    alert('No se pudo acceder al micrófono: ' + e.message);
  }
}

async function rmUploadAudio(file) {
  if (!file) return;
  const userId = state.user?.id || 'anon';
  const path = `${userId}/scope_${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from('remodel-assets').upload(path, file);
  if (error) return alert('Error: ' + error.message);
  rmState.scopeAudioPath = path;
  rmRenderTab();
}

async function rmPlayAudio() {
  const { data } = await sb.storage.from('remodel-assets').createSignedUrl(rmState.scopeAudioPath, 3600);
  if (data?.signedUrl) {
    const audio = new Audio(data.signedUrl);
    audio.play();
  }
}

// Transcripción con Web Speech API (browser local, gratis)
async function rmTranscribeAudio() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return alert('Tu navegador no soporta transcripción nativa. Sube el audio y escribe el scope manualmente en el textarea.');
  }
  // Browser speech recognition requiere reproducir el audio en vivo — workaround:
  // por ahora, le pedimos al usuario que dicte de nuevo y transcribe en vivo
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recog = new SR();
  recog.lang = 'es-MX';
  recog.continuous = true;
  recog.interimResults = false;
  let finalText = '';
  recog.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      finalText += e.results[i][0].transcript + ' ';
    }
    rmState.scopeAudioTranscript = finalText.trim();
    rmRenderTab();
  };
  recog.onerror = e => alert('Error transcribiendo: ' + e.error);
  recog.start();
  alert('🎙️ Reproduciendo audio y transcribiendo en vivo. Dicta lo que dice el audio o reprodúcelo cerca del mic. Click el botón otra vez para detener.');
  setTimeout(() => recog.stop(), 60000); // máximo 1 min
}

// ============================================================
// SCOPE OF WORK — Generador formato lender (LRC / STX / 04 Rehab)
// ============================================================

