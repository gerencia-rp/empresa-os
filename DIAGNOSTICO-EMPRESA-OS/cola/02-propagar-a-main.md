TAREA: PROPAGAR a main los arreglos ya verificados, para que el SITIO PÚBLICO
(empresa-os.vercel.app, el que ven inversores) quede limpio e IDÉNTICO al de admin.
Autorizado explícitamente por el CEO. Es un deploy a producción pública → máximo cuidado.

CONTEXTO: los arreglos (SVG crudo, alertas honestas, unidades/ocupación, asistente
combinado) están en la rama/worktree merge/consolidacion, que alimenta empresa-os-admin.
main está detrás y por eso empresa-os.vercel.app todavía muestra el bug viejo.

PASOS (con respaldo, sin sorpresas):
1. Respaldo ANTES: git tag backup-main-antes-propagar && git push origin backup-main-antes-propagar
   (además ya existen backup-main-antes-fusion / backup-rama-antes-merge).
2. Traé a main el contenido verificado de merge/consolidacion: merge/fast-forward de
   merge/consolidacion → main preservando historial. Si hay conflictos, GANA la versión
   de merge/consolidacion (es la verificada y más nueva). Push a main.
3. Dejá que empresa-os.vercel.app auto-deploye de main (o forzá el deploy del proyecto
   público). Esperá READY.

VERIFICACIÓN (los DOS dominios deben quedar iguales y limpios):
- Sobre el bundle EN VIVO de empresa-os.vercel.app (público) confirmá: (a) NO aparece
  `class=icn` / svg como texto en breadcrumbs/headers; (b) la barra de alertas es el
  resumen honesto, no cientos; (c) unidades/ocupación consistentes; (d) el asistente carga.
- Confirmá que empresa-os-admin sigue igual de limpio (no se rompió).
- Re-chequeá contra Supabase que los números no cambiaron (déficit $297,690; cartera
  $18,636; ocupación 70.59%).
- Si algo se ve mal en el público, revertí main a backup-main-antes-propagar y reportá.
  NO dejes el sitio público peor que antes.

Escribí evidencia por dominio en AUDITORIA-RENTAL-PROFITSS.md. La confirmación final en
pantalla (ambos dominios) es del CEO. Al terminar escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
