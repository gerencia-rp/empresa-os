# AI-EVIDENCE-CONTRACT.md

**Versión:** v0.3 (BORRADOR) · **Fecha:** 2026-08-25 · Redactó: Claude · Incorpora obs. Codex

Reglas para Jarvis (y toda IA del sistema): fuentes, evidencia y confianza. Aplica a los dos productos.

## 1. Evidencia = tres dimensiones ortogonales (corregido v0.3 — obs. Codex)
"Manual" y "Verificado" **no son el mismo tipo de cosa**. Se separan tres ejes **independientes** en cada dato:

**A. Origen** (de dónde vino):
`public_record` · `mls` · `broker_packet/disclosure` · `rentcast` · `otro_proveedor` · `foto` · `pdf` · `usuario_manual` · `calculado` (derivado por fórmula del contrato) · `ia_inferido`.

**B. Estado de verificación** (qué tan confirmado está):
`verificado` (confirmado contra fuente oficial/confiable) · `sin_verificar` · `calculado` (sale de fórmula sobre otros datos) · `inferido` (estimado por IA/heurística) · `no_disponible` (la fuente no lo entrega — no se completa con nada).

**C. Confianza** (0–100 o alta/media/baja) — **obligatoria** para `inferido` y `sin_verificar`.

Ejemplos: un dato ingresado por el usuario → origen `usuario_manual`, verificación `sin_verificar` (hasta confirmarlo), confianza según el caso. Un MAO → origen `calculado`, verificación `calculado`, confianza alta. La condición leída de fotos → origen `foto`, verificación `inferido`, confianza media.

## 2. Metadatos por dato
Cada dato relevante expone: `origin` (eje A) · `verification` (eje B) · `confidence` (eje C) · `source` (la fuente concreta) · `retrieved_at` (fecha/hora) · `cost` (si aplica) · `method` (cómo se calculó/estimó, para la Sala de evidencia).

## 3. Reglas duras
1. **Nunca presentar una inferencia como hecho.** Un dato Inferido se muestra como inferencia, con su confianza y su método.
2. **No inventar datos ausentes.** Si no hay compradores, contratistas, showings, permisos, proveedores u otro dato, Jarvis dice **"No disponible"**. Prohibido rellenar huecos con afirmaciones falsas.
3. **Datos derivados de IA (visión de fotos, extracción de OM/disclosures)** son **Inferido**, nunca Verificado, salvo confirmación por fuente oficial.
4. **Sala de evidencia:** cada número y recomendación debe poder **abrir su fuente, fecha, estado, confianza y método**. Si no tiene respaldo, no se muestra como conclusión.
5. **Sin ATTOM ni proveedor nuevo en esta etapa (D-025).** El ARV usa los recursos existentes y siempre declara si proviene de comparables verificados, RentCast AVM, appraisal/ARV existente o estimación local configurada.
6. **Bright Data sin crédito:** la interfaz sigue **sin interrumpir al cliente**, pero el dato se marca **`no_disponible` o desactualizado** (nunca se muestra como fresco) y se **genera una alerta operativa** (interna/admin). No se degrada "en silencio" hacia adentro; el dato faltante no se inventa.

## 4. Jarvis: comportamiento común
- **Cita fuentes y clases/sistemas** cuando corresponde; explica el matiz (ej. flip vs hold en IRR).
- **Recomendación explicada:** toda conclusión (GO/REVISAR/NO-GO, "conviene Flip/Hold/BRRRR", "esto es lo que falta para competir") viene con evidencia y confianza.
- **Deal-aware con aislamiento:** el Jarvis del estudiante trabaja solo sobre **los datos del propio estudiante** (RLS); no ve datos de otros ni de Rental Profitss.
- **Marca lo que falta verificar a mano** (title, appraisal, inspección, asesoría legal): el sistema **no reemplaza** eso y lo dice.

## 5. Dos experiencias, mismas reglas
- **Jarvis ejecutivo (Empresa OS)** y **Jarvis del estudiante (Bóveda Plus)** usan los **mismos motores** y **estas mismas reglas de evidencia**. Cambia el alcance de datos y el tono, no la honestidad ni la matemática.
- **Del laboratorio al producto** solo cruzan aprendizajes **agregados/anonimizados** (ver `PRODUCT-CONTRACT.md` §7 y `DATA-CONTRACT.md` §5).

## 6. Límite honesto declarado
No siempre se podrá obtener automáticamente "todas las ventas", quién compró, showings, contratistas o detalles personales — depende de MLS, brokers, permisos, documentos cargados, licencias y fuentes disponibles. El sistema es **explícito** sobre qué pudo y qué no, usando la clasificación de §1.
