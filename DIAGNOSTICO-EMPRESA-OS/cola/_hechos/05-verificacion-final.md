TAREA FINAL: verificación honesta de TODO lo hecho + informe simple para el CEO. Esta es
la ÚLTIMA de la cola: solo escribí el sentinel de fin cuando de verdad revisaste todo.

1. RE-VERIFICÁ contra Supabase que los números clave siguen correctos (no se rompió nada):
   déficit total activo $297,690 · Capitol $0 · Virginia $70,529 · cartera vencida
   $18,636 (15 morosos) · horizontes 3/5/8 · renta = rent-roll actual. Si algo regresó,
   arreglalo o revertí ese pedazo y anotalo.
2. CONFIRMÁ sobre el bundle en vivo de empresa-os-admin que los bugs VISIBLES están fuera:
   (a) NO aparece `class="icn"` / `<svg…>` como texto en breadcrumbs/headers (fix 01);
   (b) la pantalla de Rentas NO muestra el bloque alarmante de cientos de alertas (fix 02);
   (c) unidades/ocupación consistentes entre vistas (fix 03);
   (d) hay UN solo asistente (Jarvis + Cerebro combinados) y responde con números reales (04).
   Para cada uno, escribí la evidencia concreta. NO declares algo "ok" sin evidencia real;
   si no lo pudiste confirmar, decilo claro.
3. Escribí un informe simple en `RESUMEN-FINAL-CEO.md` (lenguaje de negocio, sin tecnicismos):
   - ✅ Lo que quedó hecho y en vivo (lista corta y clara).
   - 👀 La lista EXACTA de lo que el CEO debe confirmar en pantalla (5–8 puntos, cada uno una
     frase: "abrí X, mirá que Y").
   - 🙋 Lo que necesita del equipo y NINGÚN software puede hacer solo: crear/llenar el campo
     de MÉTODO DE PAGO en Airtable (hoy está 100% vacío), y que Carlos reconcilie las
     unidades dudosas listadas. Explicá por qué (no hay dato de origen).
   - ↩️ Cómo revertir si algo sale mal (tags de respaldo backup-rama-antes-merge /
     backup-main-antes-fusion).
4. Actualizá AUDITORIA-RENTAL-PROFITSS.md con el estado final.

Cuando el informe esté escrito y la verificación hecha, escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
