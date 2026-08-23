# CONTRIBUTING — Flujo ÚNICO (sin bifurcaciones)

> Decisión del CEO (23-ago-2026): **un solo sistema.** Se acabaron los "dos proyectos"
> y los "bugs fantasma" causados por trabajar en ramas/dominios distintos.

## La única fuente de verdad

| Qué | Valor único |
|---|---|
| **Proyecto Vercel** | `empresa-os` (GitHub-linked, auto-deploy) |
| **Rama de trabajo** | `main` |
| **Dominio de producción** | https://empresa-os.vercel.app |

**No existe otro flujo válido.** El proyecto `empresa-os-admin` quedó **retirado**:
no se deploya más ahí (ver más abajo).

## El flujo (siempre este)

```
1. Trabajás SOBRE main:            git checkout main && git pull origin main
2. Hacés el cambio + build:        npm run build   (verificá node --check / gate)
3. Commit + push a main:           git commit -m "tipo(scope): ..." && git push origin main
4. Vercel auto-deploya main  →     https://empresa-os.vercel.app   (target production)
```

- **Prohibido** crear ramas de larga vida en paralelo a `main`. Si necesitás una rama
  corta para un cambio grande, mergeala a `main` **el mismo día** y borrala.
- **Prohibido** `vercel --prod` manual hacia otro proyecto. El deploy oficial lo hace
  el auto-deploy de GitHub desde `main`. (Si alguna vez hace falta un deploy manual,
  es al proyecto `empresa-os` y a `main`, nunca a `empresa-os-admin`.)
- Antes de pushear: `git pull origin main` (puede haber sesiones paralelas) y re-verificar.

## Proyecto retirado: `empresa-os-admin`

Históricamente hubo un segundo proyecto Vercel (`empresa-os-admin.vercel.app`) que recibía
los `vercel --prod` de las ramas. **Ya no se usa.** No lo borres (queda archivado como
respaldo histórico), pero **nadie debe volver a publicar ahí**. Todo cambio va por
`main → empresa-os.vercel.app`.

## Verificar que el dominio sirve el último `main`

```bash
# hash del commit desplegado (index.html es no-cache; version.json trae el commit)
curl -s https://empresa-os.vercel.app/version.json
# → {"version":"<hash-bundle>","commit":"<sha corto de main>","builtAt":"..."}
git rev-parse --short main   # debe coincidir con "commit"
```

La app además se **auto-actualiza**: detecta una versión nueva y ofrece recargar
(badge de versión en el sidebar). Ver `AUDITORIA-RENTAL-PROFITSS.md` (pasada auto-actualización).
