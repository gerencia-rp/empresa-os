# Sprint 5 — IA agente + propuesta cliente + cierre

El sprint final. Aquí el módulo Remodel Pro pasa de "muy bueno" a "industria standard".

## S5-G11 · PDF propuesta cliente (✅ Hecho)

Sin schema. Función `rmGenerateProposalPDF()` que:
- Construye HTML branded (logo Rental Profitss, watermark DRAFT/FINAL según status del proyecto)
- Tabla por fase con breakdown completo (code, descripción, qty, $/u, total)
- Box de pricing con contingencia, overhead, soft costs, markup, inversión total, $/ft²
- Términos legales + bloque de firma (cliente y RP)
- Abre en ventana nueva con `window.print()` auto-trigger → usuario guarda como PDF desde diálogo del navegador
- Botón "📄 Generar propuesta cliente PDF" en el sidebar del Editor (debajo del Export Excel)

## S5-G12 · Fotos georreferenciadas por actividad (✅ Hecho)

Sin schema (extiende el JSONB `photos` que ya existía).

- `rmFieldUploadPhoto()` ahora prompt-ea ANTES / DESPUÉS / PROCESO + nota y persiste a `remodel_projects.photos`
- Metadata enriquecida: `{path, activity_code, taken_at, before_after, note, uploaded_by}`
- Nueva función `rmShowPhotoGallery(activityCode)` que muestra overlay full-screen con grid de fotos firmadas (signed URLs, cache 1h) coloreadas según before_after
- Botón "🖼️ N fotos" por actividad en Vista campo (deshabilitado si 0)

## S5-G8 · Vendor invoices (✅ Hecho)

### Schema (`supabase/s5-g8-invoices.sql`)

- Tabla `remodel_vendor_invoices`: project_id, supplier_id, activity_code (nullable), invoice_number, invoice_date, pdf_path, total_amount, tax_amount, subtotal (generated), status (pending/reconciled/disputed/paid), reconciled_actual_id.
- View `remodel_invoices_summary` por proyecto.
- RLS habilitado.

### UI

Sección **🧾 Facturas recibidas (N)** dentro del tab 🛒 Lista compra. Aparece arriba del agregado de compra estimada.

- Botón "+ Subir factura" → prompts (supplier name, invoice #, total, tax, activity_code opcional) + upload PDF a storage
- Tabla compacta: fecha, supplier, #, activity, total, status, acciones (👁️ ver PDF, Reconciliar)
- **Reconciliar** = suma el `total_amount` al `real_cost` de la actividad asociada (alimenta el modelo de aprendizaje de S1-G1)

Funciones: `rmLoadInvoices`, `rmUploadInvoice`, `rmReconcileInvoice`, `rmViewInvoicePDF`.

## S5-G9 · IA Agente Claude (✅ Hecho)

El más complejo: Claude con function calling que puede tomar acciones reales sobre el proyecto.

### Edge Function (`supabase/functions/remodel-ai/index.ts`)

Deno + std lib HTTP server. Proxy a Anthropic con:
- 5 tools declaradas: `add_activity_to_project`, `update_activity_qty`, `remove_activity`, `suggest_supplier_for_code`, `generate_sow_description`
- System prompt en español rioplatense con contexto del negocio (Rental Profitss, Austin TX, fix & flip)
- Inyección de `project_context` en el primer mensaje (catálogo, suppliers, benchmarks, proyecto cargado)
- Modelo: `claude-sonnet-4-6`

**Deploy** (una sola vez):
```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os
supabase functions deploy remodel-ai --no-verify-jwt --use-api
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### UI Frontend

Tab nueva **🤖 IA Agente** después de Vista campo.

- Chat panel con scroll de 380px de alto
- Mensajes del usuario alineados a la derecha (negro), de Claude a la izquierda (gris)
- Tool calls se muestran como chips púrpuras debajo del mensaje
- Input + botón Enviar con disabled durante request en flight

**Flujo (multi-round):**
1. Usuario manda mensaje → `rmAgentSend(text)`
2. Frontend POST a Edge Function con `messages + project_context`
3. Edge llama Claude
4. Si `stop_reason === 'tool_use'`: frontend ejecuta tools en JS via `rmAgentExecuteTool`, posta `tool_results`, loop continúa
5. Si `stop_reason === 'end_turn'`: corta y muestra respuesta final
6. Safety counter de 6 iteraciones para evitar loops infinitos

**Tools ejecutadas en JS (no en Edge, para mantener RLS y rmState consistente):**
- `add_activity_to_project(code, qty, vu_override?)` → muta `rmState.selectedActivities`
- `update_activity_qty(code, qty)` → muta qty + recalcula días
- `remove_activity(code)` → delete
- `suggest_supplier_for_code(code)` → lee `rmState.priceSummary[code]`
- `generate_sow_description(tone)` → devuelve resumen para que Claude lo cite

### Casos de uso típicos

- *"Agregame quartz countertops 45 sqft con sink y faucet"* → Claude llama add_activity_to_project para `5.4.2` y `5.4.4`
- *"Dónde compro tile barato?"* → Claude llama suggest_supplier_for_code('5.3.1') y responde con supplier preferido + precio
- *"Estoy en 14% margen, qué cambio?"* → Claude analiza pricing y sugiere subir markup o reducir activities específicas
- *"Generá descripción cliente"* → Claude llama generate_sow_description('cliente') y arma texto narrativo
- *"Qué falta para una cocina completa?"* → Claude inspecciona selected_activities, identifica gaps (sink, appliances, etc), pregunta o agrega

### Limitaciones conocidas

- No persiste chat log (vive en memoria por sesión). Mejorable agregando tabla `remodel_ai_chat_log`.
- No transcribe audio scope todavía (requiere Whisper API o segundo Edge Function).
- No genera embeddings ni RAG sobre histórico. Para eso necesitamos pgvector + Voyage embeddings (patrón Universidad RE).
- Tool `generate_sow_description` solo devuelve resumen estructurado; Claude tiene que parsear y narrar.

---

## Cierre del proyecto

**Sprints completados** (en una sola sesión):
1. ✅ Quick Wins (6 items)
2. ✅ S1 — G1 Tracking granular + G2 Versionado/Change Orders
3. ✅ S2 — G4 Catálogo editable + G5 Suppliers
4. ✅ S3 — G3 CPM real con dependencias
5. ✅ S4 — G6 Crew + G7 Lista compra + G10 Vista campo mobile
6. ✅ S5 — G8 Vendor invoices + G9 IA agente + G11 PDF + G12 Fotos georef

**Lo que NO se hizo** (intencionalmente fuera de scope):
- ❌ OCR automático de facturas con Claude vision (mencionado como future en doc)
- ❌ Chat log persistido (mejora menor, fácil sumar)
- ❌ Embeddings + RAG sobre histórico de proyectos (sprint propio)
- ❌ Webhooks de Stripe / pagos (no era prioridad de remodelación)
- ❌ Vista mobile para CRUD completo (solo Vista campo, suficiente para foreman)

**Próximos pasos sugeridos:**
1. Aplicar los SQL pendientes del Sprint 5 (1 sola pegada: `s5-g8-invoices.sql`)
2. Deployar la Edge Function `remodel-ai` (un solo comando)
3. Setear `ANTHROPIC_API_KEY` en Supabase secrets
4. Cargar 1-2 workers reales (Mike, Luis) en el tab Crew
5. Generar la primera propuesta PDF para validar el branding
6. Probar el agente con preguntas reales sobre un proyecto

**Commit recomendado** después de testear:
```bash
cd ~/Desktop/CLAUDE\ CODE/empresa-os
git add .
git commit -m "feat(remodel-pro): sprints 1-5 completos — tracking, versionado, catálogo, CPM, crew, IA agente"
git push
```

Vercel auto-deploya en seguida.
