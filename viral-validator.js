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

  function validate(textGenerado, data) {
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

    // 4. CTA con palabra DM en MAYÚSCULAS (error duro).
    // Verbo "comentá" case-insensitive; el TOKEN se testea sin /i (debe ser real mayúscula).
    const mCta = text.match(/coment[aá]([^.]{0,40})/i);
    const ctaPideDM = (mCta && /[A-ZÁÉÍÓÚÑ]{3,}/.test(mCta[1])) || /\b[A-ZÁÉÍÓÚÑ]{3,}\b[^.]{0,30}\bDM\b/.test(text);
    if (!ctaPideDM) errores.push('El CTA no pide una palabra clave por DM en MAYÚSCULAS (ej: "Comentá MÉTODO").');

    // 5. Promesa amplia (error duro)
    if (/multiplic\w* (tu )?(capital|dinero|plata)/i.test(text)) errores.push('Promesa amplia "multiplicar capital" — usar "primer flip sin perder capital".');

    return { ok: errores.length === 0, errores, warnings, palabrasDeMarcaUsadas, frasesUsadas };
  }

  // Texto de feedback para reinyectar al prompt en el reintento.
  function feedbackPrompt(validacion) {
    return `\n\nEL INTENTO ANTERIOR FALLÓ la validación de marca. Corregí estos ERRORES y regenerá:\n- ${validacion.errores.join('\n- ')}\nMantené todo lo demás (foco F&F, palabras de marca, frase recurrente, CTA con palabra DM en MAYÚSCULAS).`;
  }

  window.Validator = { validate, feedbackPrompt, hasTerm, cleanTerm };
})();
