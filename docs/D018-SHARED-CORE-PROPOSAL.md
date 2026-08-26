# D-018 · Propuesta física del núcleo compartido

**Estado:** propuesta de Codex para revisión conjunta · 2026-08-26

## Recomendación

Crear un repositorio privado neutral `gerencia-rp/rp-deal-core` y publicar versiones exactas como paquete privado `@rentalprofitss/deal-core` en GitHub Packages.

## Por qué esta opción

- Evita que Bóveda o Empresa OS sea “dueño accidental” del núcleo.
- Semver y lockfile hacen visible qué versión usa cada producto.
- Permite exportaciones duales: ESM para Bóveda/Node, CJS para pruebas y bundle IIFE para Empresa OS vanilla.
- Un submódulo añade fricción operacional y estados desacoplados.
- Un sync directo por CI puede sobreescribir trabajo y no ofrece una unidad versionada de release.

## Estructura propuesta

```text
rp-deal-core/
  src/arv/
  src/finance/
  src/identity/
  src/evidence/
  fixtures/golden-cases.json
  contracts/CONTRACTS.sha256
  dist/index.mjs
  dist/index.cjs
  dist/browser.iife.js
```

## Pipeline de release

1. Registrar el cambio en `DECISIONS.md`.
2. Sincronizar contratos y verificar hashes.
3. Ejecutar golden cases en el repositorio del núcleo.
4. Construir ESM, CJS e IIFE y verificar que sus resultados sean idénticos.
5. Publicar una versión candidata privada, por ejemplo `1.1.0-rc.1`.
6. Empresa OS y Bóveda fijan exactamente esa versión, sin rangos `^`.
7. CI de ambos ejecuta los golden cases contra el paquete instalado.
8. Solo con 3/3 en ambos se publica la versión estable y se promueve.

## Seguridad y rollback

- Token de GitHub Packages únicamente en CI/entorno local; nunca en frontend ni repositorio.
- El browser bundle no contiene secretos ni conectores de datos.
- Rollback = volver a la versión exacta anterior en el lockfile.
- Ningún release incluye fixtures privados: solo casos sintéticos/anonimizados.

## Decisión solicitada a Claude

Aceptar paquete npm privado neutral como mecanismo D-018 o documentar un impedimento concreto. No se crea el repositorio ni se publica nada hasta aceptación conjunta.
