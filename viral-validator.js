/* viral-validator.js — valida el output del API contra las reglas de marca.
   Errores DUROS → regeneran (max 3). Warnings → se muestran pero no bloquean.
   Depende del global OPERA (viral-opera.js). Expone window.Validator. */
(function () {
  'use strict';

  function getData() { return (typeof OPERA !== 'undefined' && OPERA) ? OPERA : null; }

  // Normaliza un término prohibido: saca paréntesis aclaratorios y espacios.
  function cleanTerm(t) { return String(t).replace(/\(.*?\)/g, '').trim(); }

  // ¿Aparece el término en el texto? Frases (con espacio) = substring; palabra suelta = con límites.
  function hasTerm(text, term) {
    const t = term.toLowerCase(), hay = text.toLowerCase();
    if (!t) return false;
    if (t.indexOf(' ') !== -1) return hay.indexOf(t) !== -1;
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-záéíóúüñ])' + esc + '($|[^a-záéíóúüñ])', 'i').test(hay);
  }

  function validate(textGenerado, data, tipo, estilo) {
    data = data || getData();
    const text = String(textGenerado || '');
    const errores = [], warnings = [];
    if (!data) return { ok: true, errores, warnings, palabrasDeMarcaUsadas: [], frasesUsadas: [] };
    const arq = data.arquetipo;

    // 1. Palabras prohibidas (error duro)
    arq.palabrasProhibidas.forEach(p => {
      const term = cleanTerm(p);
      if (term && hasTerm(text, term)) errores.push(`Palabra prohibida: "${term}"`);
    });

    // 2. Palabras de marca (warning si < 3)
    const palabrasDeMarcaUsadas = arq.palabrasDeMarca.filter(p => hasTerm(text, p));
    if (palabrasDeMarcaUsadas.length < 3) warnings.push(`Solo ${palabrasDeMarcaUsadas.length} palabra(s) de marca (mínimo 3).`);

    // 3. Frase recurrente (warning si 0)
    const frases = [].concat(arq.frasesRecurrentes.bandera, arq.frasesRecurrentes.cierre);
    const frasesUsadas = frases.filter(f => text.toLowerCase().indexOf(String(f).toLowerCase()) !== -1);
    if (frasesUsadas.length === 0) warnings.push('No usa ninguna frase recurrente (mínimo 1).');

    // 4. CTA con palabra DM en MAYÚSCULAS.
    // Verbo "comentá" case-insensitive; el TOKEN se testea sin /i (debe ser real mayúscula).
    // El manifiesto NO lleva CTA-DM (estilo Apple Think Different) → solo warning.
    const mCta = text.match(/coment[aá]([^.]{0,40})/i);
    const ctaPideDM = (mCta && /[A-ZÁÉÍÓÚÑ]{3,}/.test(mCta[1])) || /\b[A-ZÁÉÍÓÚÑ]{3,}\b[^.]{0,30}\bDM\b/.test(text);
    if (!ctaPideDM) {
      const msg = 'El CTA no pide una palabra clave por DM en MAYÚSCULAS (ej: "Comentá MÉTODO").';
      // manifiesto (Apple Think Different) y alejandra_style (CTA conversacional) → solo warning
      if (tipo === 'manifiesto' || estilo === 'alejandra_style') warnings.push(msg); else errores.push(msg);
    }

    // 5. Promesa amplia (error duro)
    if (/multiplic\w* (tu )?(capital|dinero|plata)/i.test(text)) errores.push('Promesa amplia "multiplicar capital" — usar "primer flip sin perder capital".');

    return { ok: errores.length === 0, errores, warnings, palabrasDeMarcaUsadas, frasesUsadas };
  }

  // Texto de feedback para reinyectar al prompt en el reintento.
  function feedbackPrompt(validacion) {
    return `\n\nEL INTENTO ANTERIOR FALLÓ la validación de marca. Corregí estos ERRORES y regenerá:\n- ${validacion.errores.join('\n- ')}\nMantené todo lo demás (foco F&F, palabras de marca, frase recurrente, CTA con palabra DM en MAYÚSCULAS).`;
  }

  // ===== Validadores estructurales por estilo (sección 5 del doc maestro) =====
  // Operan sobre el OBJETO variante (no el texto flatten). Errores duros → regeneran.
  const CAPS_RE = /[A-ZÁÉÍÓÚÑ]{3,}/;

  function validateRamiro(v) {
    const e = [];
    const slides = Array.isArray(v.slides) ? v.slides : [];
    if (slides.length < 6 || slides.length > 8) e.push(`ramiro_style: el carrusel debe tener 6-8 slides (tiene ${slides.length}).`);
    const s1 = slides[0] || {};
    if (!s1.badge || !s1.titulo || !s1.palabra_naranja) e.push('ramiro_style: el slide 1 (portada) necesita badge + titulo + palabra_naranja.');
    const medios = slides.slice(1, -2);
    medios.forEach((s, i) => {
      if (!/paso/i.test(s.badge || '') || !s.titulo || !s.screenshot) e.push(`ramiro_style: el slide ${s.n || i + 2} debe ser "PASO N" con titulo + screenshot.`);
    });
    const penult = slides[slides.length - 2] || {};
    const nb = Array.isArray(penult.bullets) ? penult.bullets.length : 0;
    if (penult.tipo !== 'resultado' || nb < 4 || nb > 5) e.push('ramiro_style: el penúltimo slide debe ser RESULTADO con 4-5 bullets.');
    const last = slides[slides.length - 1] || {};
    if (last.tipo !== 'cta' || !/coment[aá]/i.test(last.boton || '') || !CAPS_RE.test(last.boton || '')) e.push('ramiro_style: el último slide debe ser CTA con botón COMENTÁ "PALABRA" en MAYÚSCULAS.');
    if (!/^Comentá [A-ZÁÉÍÓÚÑ0-9]+ ⬇️$/.test(String(v.caption || ''))) e.push('ramiro_style: caption debe ser exactamente "Comentá PALABRA ⬇️".');
    return { ok: e.length === 0, errores: e };
  }

  const EMOJI_EMO_RE = /🥲|🥹|🔥|🎬|💔|😤/;
  function validateAlejandra(v) {
    const e = [];
    const slides = Array.isArray(v.slides) ? v.slides : [];
    if (slides.length < 6 || slides.length > 10) e.push(`alejandra_style: el carrusel debe tener 6-10 slides (tiene ${slides.length}).`);
    const s1 = slides[0] || {};
    if (!s1.headline_top || !s1.headline_bottom || !s1.foto_autor) e.push('alejandra_style: el slide 1 necesita headline_top + headline_bottom (sandwich) + foto_autor.');
    const hook = String(v.hook || s1.headline_top || '');
    const letras = hook.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, '');
    const caps = hook.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
    if (letras.length && caps.length / letras.length < 0.3) e.push('alejandra_style: el hook debe tener al menos 30% en MAYÚSCULAS.');
    const cap = String(v.caption || '');
    if (cap.length < 200 || cap.length > 500) e.push(`alejandra_style: caption debe tener 200-500 chars (tiene ${cap.length}).`);
    if (!EMOJI_EMO_RE.test(cap)) e.push('alejandra_style: caption debe incluir al menos 1 emoji emocional (🥲 🥹 🔥 🎬 💔 😤).');
    return { ok: e.length === 0, errores: e };
  }

  function validateStyle(variant, tipo, estilo) {
    if (!variant || !estilo) return { ok: true, errores: [] };
    if (estilo === 'ramiro_style') return validateRamiro(variant);
    if (estilo === 'alejandra_style') return validateAlejandra(variant);
    return { ok: true, errores: [] };
  }

  window.Validator = { validate, validateStyle, feedbackPrompt, hasTerm, cleanTerm };
})();
