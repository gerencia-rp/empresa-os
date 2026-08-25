# Experiments

## Experiment Cards

### EXP-001 — Estado técnico visible
- Hypothesis: Creemos que el equipo detectará fallas antes de que afecten usuarios si existe una comprobación profunda con dependencia, versión y latencia.
- Type: smoke test
- Primary metric & threshold (pre-committed): `/api/health` responde en <5s y distingue ready/degraded.
- Guardrail metric: no expone secretos ni datos personales.
- Decision rule (pivot / persevere / iterate): mantener si detecta dependencia caída y no añade información sensible.
- Result & verdict: pendiente de deploy.

### EXP-002 — Integraciones acotadas
- Hypothesis: Creemos que los procesos dejarán de quedar colgados si toda llamada Vercel crítica tiene timeout explícito.
- Type: regression/resilience
- Primary metric & threshold (pre-committed): 100% de `fetch` en `api/` usa helper acotado; fallos regresan 502/503 dentro del límite.
- Guardrail metric: cero regresiones en golden tests y build.
- Decision rule (pivot / persevere / iterate): mantener si build+tests pasan y el timeout simulado falla rápido.
- Result & verdict: en progreso.

## Experiment Backlog

| Idea | ICE (impact/confidence/ease) | Status |
|---|---|---|
| Evidencia fechada en cada agente | 9/9/6 | pendiente |
| Centro único de decisiones con contexto | 10/8/6 | pendiente |
| QA autenticado de todas las rutas críticas | 10/9/5 | en progreso |
| Presupuesto de rendimiento por bundle/ruta | 8/8/7 | pendiente |

