-- 2026-06-30 · Código de acceso (keypad) a nivel Casa para la Guía de Bienvenida.
-- Fuente: Airtable Casas "Código de acceso" (fldKuVpYVzh7JzRP8) → pm_properties.access_code.
-- El acceso por unidad ya vive en pm_units.access_codes.
ALTER TABLE pm_properties ADD COLUMN IF NOT EXISTS access_code text;

COMMENT ON COLUMN pm_properties.access_code IS 'Código de acceso / keypad principal de la casa (sync desde Airtable Casas). Se usa en la Guía de Bienvenida.';
