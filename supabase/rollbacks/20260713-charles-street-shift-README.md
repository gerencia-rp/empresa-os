# Rollback — Corrimiento Charles Street +4 días hábiles (13-jul-2026)

**Qué se hizo** (aprobado por el CEO, re-plan limpio = fecha Y baseline):
- `remodel_projects` id `3a4bf4e6-5ace-440c-af78-ec3753324bdb` ("Charles Street"):
  `start_date` **2026-07-07 → 2026-07-11**.
- `weekly_activities` del proyecto: **153 filas**, `date` y `baseline_date` corridas
  **+4 días hábiles** (Lun–Sáb laborables, domingo no cuenta). Rango 2026-07-07→2026-09-15
  pasó a 2026-07-11→2026-09-19. Ningún otro campo tocado.

**Cómo deshacer**:
1. Estado exacto pre-corrimiento fila por fila (id → date/baseline_date):
   `20260713-charles-street-pre-shift.json` (en esta carpeta).
2. O aplicar el corrimiento inverso (−4 días hábiles con la misma lógica) +
   `start_date` de vuelta a `2026-07-07`.
