TAREA: dejar UN SOLO sistema (adiós a los dos proyectos y a los "bugs fantasma").
Decisión del CEO: un solo proyecto Vercel (empresa-os, GitHub-linked, auto-deploy desde
main), UNA sola rama (main), UN solo dominio (empresa-os.vercel.app).

Si ya está consolidado, confirmalo breve y terminá.

PASOS (con respaldo):
1. Respaldo: git tag backup-antes-consolidar-uno && push del tag.
2. Asegurá que main tiene TODO lo verificado (merge/consolidacion y feat/portal-inversionista-v2
   ya están casi iguales que main; fusioná lo que falte a main; si hay conflicto, gana la
   versión más nueva verificada). Push a main. De aquí en más se trabaja SOBRE main.
3. Verificá que el proyecto GitHub-linked "empresa-os" auto-deploya main a empresa-os.vercel.app
   (target production). Confirmá que el dominio sirve el último commit de main.
4. Retirá el uso del proyecto duplicado "empresa-os-admin": dejá de deployar ahí. NO hace falta
   borrarlo (déjalo archivado); solo que nadie más publique en él. Documentá que el único
   flujo válido ahora es: commit → push a main → auto-deploy a empresa-os.vercel.app.
5. En el repo, dejá una nota corta (CONTRIBUTING/README) con ese flujo único para que no se
   vuelva a bifurcar.

VERIFICACIÓN: sobre el bundle EN VIVO de empresa-os.vercel.app confirmá que es el último main.
Números intactos contra Supabase (déficit $297,690; cartera $18,636; ocupación 70.59%).

Al terminar escribí EXACTAMENTE al final:
    === AUDITORIA COMPLETA ===
