-- Inserts adicionales: Diagnóstico + Estados del Estudiante


-- ─── 🎯 Cuestionario de Diagnóstico Inicial ───
delete from public.fm_documents where categoria = 'diagnostico';
insert into public.fm_documents (etapa, categoria, titulo, subtitulo, contenido_md, posicion, tags) values (
  'INDICE',
  'diagnostico',
  $FMO0KJ1G$🎯 Cuestionario de Diagnóstico Inicial$FMO0KJ1G$,
  $FMO0KJ1G$8 bloques de preguntas para ubicar al estudiante en E0-E5 y generar plan personalizado$FMO0KJ1G$,
  $FMO0KJ1G$# 🎯 CUESTIONARIO DE DIAGNÓSTICO INICIAL
**Cómo ubicar a una persona en la metodología FlipMentoría**

> Este cuestionario lo usa el coach (o la IA del sistema) para identificar EXACTAMENTE en qué etapa del método E0-E5 está cada estudiante nuevo. La idea es no asumir nada y armar un plan personalizado en base a respuestas estructuradas.

---

## 🧭 BLOQUE 1 — Resultado deseado (¿A dónde quiere llegar?)

### Pregunta 1.1 — ¿Cuál es el resultado que querés lograr en los próximos 12 meses?

Opciones:
- **A.** Cerrar mi **primer Fix & Flip** (compra, remodelo, vendo, gano)
- **B.** Empezar **portfolio de Fix & Hold** (rentas long-term, cash flow mensual)
- **C.** Hacer **wholesaling** (asignar contratos sin remodelar, ganar fees)
- **D.** Modelo **híbrido** (algunos flips para capital + algunos holds para cash flow)
- **E.** **Escalar** un negocio que ya tengo (sistemas, equipo, múltiples deals simultáneos)

**Mapping al método:**
- A → Foco E0 → E1 → E2 → E3 → E4 (flip ciclo completo)
- B → Foco E0 → E1 (Buy Box renta) → E2 → E3 → E4 (refi DSCR en lugar de listar)
- C → Foco E1 (deal sourcing) + E2.3 (wholesalers) + lead gen propio de E5.2.2
- D → Plan combinado E0 → E1 (ambos Buy Box) → E2 → E3 → E4
- E → Saltar a E5 directamente (SOPs, equipo, expansión)

---

### Pregunta 1.2 — ¿En qué mercado (estado/ciudad) querés operar?

Opciones:
- **A.** **Ya tengo mercado definido:** [Texas / Florida / Georgia / Arizona / otro]
- **B.** **Tengo 2-3 candidatos** pero no decidí
- **C.** **No sé todavía** — necesito ayuda para elegir

**Mapping:**
- A → Pasar a E1.2.1 (investigación de mercado profunda)
- B → Necesita E1.2.4 (mapeo zonas A/B/C) en cada candidato + comparativo
- C → Empezar por análisis macro: empleo, migración, regulación, costos (E5.4.2 criterios)

---

### Pregunta 1.3 — ¿Cuánto tiempo le podés dedicar al negocio semanalmente?

- **A.** > 30 horas/semana (full-time o casi)
- **B.** 15-30 horas/semana (medio tiempo serio)
- **C.** < 15 horas/semana (paralelo a trabajo)

**Mapping a velocidad:**
- A → Cronograma normal: primer deal en 6-9 meses
- B → Cronograma extendido: primer deal en 9-12 meses
- C → Cronograma lento: primer deal en 12-18 meses; necesita PRIORIZAR brutalmente

---

## 💰 BLOQUE 2 — Capital y financiamiento

### Pregunta 2.1 — ¿Cuánto capital propio tenés disponible HOY para invertir?

- **A.** < \$20K
- **B.** \$20K - \$50K
- **C.** \$50K - \$100K
- **D.** > \$100K

**Mapping:**
- A → **Insuficiente para flip directo.** Opciones: (1) Wholesaling primero para acumular capital sin riesgo, (2) Partnership 50/50 con quien tenga capital, (3) Esperar y ahorrar
- B → **Justo para 1 deal con HML.** Necesita HML que financie 90% LTC. Sin margen para error.
- C → **Confortable para 1 deal con buffer.** Puede absorber 1 sorpresa de \$15-25K
- D → **Cómodo para 1-2 deals simultáneos o 1 deal grande**

---

### Pregunta 2.2 — ¿Cuál es tu credit score (FICO) actual?

- **A.** > 720 (excelente)
- **B.** 660-720 (bueno, califica para HML)
- **C.** 600-660 (limitado, opciones reducidas)
- **D.** < 600 (necesita reconstruir antes de empezar)
- **E.** No sé / no tengo historial en USA

**Mapping:**
- A → Acceso a casi todos los HMLs nacionales con mejores tasas
- B → Acceso a la mayoría de HMLs estándar (Kiavi, Lima One, RCN)
- C → Solo HMLs locales más flexibles, tasas 13-15% en lugar de 10-12%
- D → Reconstruir crédito 6-12 meses ANTES de aplicar (secured card, pago a tiempo)
- E → Build credit first (ITIN o SSN required first) o usar partnership con socio US

---

### Pregunta 2.3 — ¿Tenés acceso a OTRO capital adicional al tuyo?

- **A.** Familiar/amigo dispuesto a prestarme (Private Money)
- **B.** HELOC disponible sobre mi vivienda principal
- **C.** Socio de capital identificado (partnership formal)
- **D.** Nada — solo mi capital
- **E.** Esto lo voy a buscar como parte del proceso

**Mapping:**
- A → E2.1.3 (Private Money) — estructurar formalmente con Note + Deed of Trust
- B → E2.1.4 — evaluar HELOC como capital barato
- C → Estructurar JV operating agreement antes del primer deal
- D → Plan acotado a HML + capital propio. Pipeline más lento
- E → E5.2.1 (red de financiadores) desde el inicio en paralelo

---

## 🏗️ BLOQUE 3 — Fundación legal (E0)

### Pregunta 3.1 — ¿Tenés LLC formada?

- **A.** Sí, en el estado donde planeo invertir
- **B.** Sí, pero en otro estado distinto al de inversión
- **C.** No, todavía no la formé
- **D.** Tengo otro tipo de entidad (S-Corp, INC, etc)

**Mapping:**
- A → ✅ E0.1.1 completado
- B → ⚠️ Revisar foreign LLC registration; considerar segunda LLC en el estado de inversión
- C → ❌ E0.1.1 es la PRIMERA tarea — 1-4 semanas dependiendo del estado
- D → Validar con CPA si la estructura existente sirve para Fix & Flip

---

### Pregunta 3.2 — ¿Tenés Operating Agreement, EIN, cuenta bancaria de negocio y contabilidad activa?

Marcar cada uno:
- ☐ Operating Agreement firmado (E0.1.2)
- ☐ EIN del IRS obtenido (E0.1.1)
- ☐ Cuenta bancaria de negocio (E0.1.3)
- ☐ Tarjeta de crédito de negocio (E0.1.3)
- ☐ Software de contabilidad activo (E0.1.4)
- ☐ CPA identificado (E0.1.5)
- ☐ Abogado de real estate identificado (E0.1.5)

**Mapping:** completar las que estén en blanco antes de cerrar primer deal.

---

### Pregunta 3.3 — ¿Tenés Big Why personal por escrito y bloque diario de tiempo no negociable?

- ☐ Big Why escrito y firmado (E0.2.1)
- ☐ Bloque diario de 90+ min en calendario (E0.2.2)
- ☐ Quick Win semana 1 completado (E0.2.3)
- ☐ Portal Taskade configurado (E0.3.1)
- ☐ Stack de herramientas básico activo (E0.3.2)
- ☐ Accountability partner o coach activo (Anexo C.2)

**Mapping:** Estos son los **predictores #1 de no abandono**. Sin ellos, 80% no completa el programa.

---

## 🔍 BLOQUE 4 — Capacidad de evaluación (E1)

### Pregunta 4.1 — ¿Tenés Buy Box definido por escrito?

- **A.** Sí, 5+ Buy Box por estrategia con criterios numéricos
- **B.** Tengo 1-2 Buy Box parciales
- **C.** Sé qué tipo de propiedad quiero pero no documentado
- **D.** No tengo Buy Box

**Mapping:**
- A → ✅ E1.1 completado
- B → Completar a 5 Buy Box (E1.1.1 / E1.1.2)
- C → E1.1.1, E1.1.2, E1.1.3, E1.1.4, E1.1.5 todo pendiente
- D → Empezar E1.1 desde cero (15-20 horas trabajo)

---

### Pregunta 4.2 — ¿Sabés calcular ARV y MAO de una propiedad?

- **A.** Sí, lo hago con 5+ comparables y ajustes documentados
- **B.** Sé qué es pero solo lo he hecho en teoría
- **C.** Sé qué significa pero no lo he practicado
- **D.** No estoy familiarizado con estos términos

**Mapping:**
- A → ✅ E1.3 completado
- B → Practicar con 50 ARV en E1.3.1-E1.3.4 (real)
- C → Empezar por leer Anexo A (caso real) + Anexo B.2-B.3 (calculadoras)
- D → Empezar por Anexo C.6 (glosario) y luego E1.3 completo

---

### Pregunta 4.3 — ¿Cuántas ofertas formales has enviado en los últimos 30 días?

- **A.** 10+ ofertas
- **B.** 1-9 ofertas
- **C.** 0 ofertas pero deals analizados
- **D.** Ni siquiera estoy analizando deals todavía

**Mapping:**
- A → Bien encaminado en E1.4. Foco en mejorar tasa de conversión
- B → Aumentar volumen a 10+/mes (E1.4.1)
- C → Bottleneck en pasar de análisis a oferta. Falta confianza o info
- D → Empezar el pipeline desde E2.3.1 (wholesalers) en paralelo con E1

---

## 🏗️ BLOQUE 5 — Red operativa (E2)

### Pregunta 5.1 — ¿Tenés HML pre-aprobado?

- **A.** Sí, primario + backup
- **B.** Sí, solo primario
- **C.** He hablado con HMLs pero sin pre-aprobación formal
- **D.** No tengo contacto con ningún HML

**Mapping:**
- A → ✅ E2.1.5 completado
- B → Conseguir backup (E2.1.5)
- C → Push para conseguir pre-aprobación formal con docs requeridos
- D → Empezar E2.1.1 (entrevistar 10 HMLs)

---

### Pregunta 5.2 — ¿Cuántos wholesalers tenés en tu buyer list activa?

- **A.** 10+
- **B.** 3-9
- **C.** 1-2
- **D.** 0

**Mapping:**
- A → ✅ E2.3.4 completado
- B → Ampliar hasta 10+ (E2.3.1-E2.3.4)
- C → Plan agresivo para llegar a 10+ en 60 días
- D → E2.3 completo desde cero (3-4 semanas trabajo)

---

### Pregunta 5.3 — ¿Tenés GC primario + backup identificados y validados?

- **A.** Sí, ambos con licencia + seguros verificados
- **B.** Sí, primario pero sin backup
- **C.** He hablado con algunos pero sin elegir
- **D.** No tengo GCs identificados

**Mapping:**
- A → ✅ E2.4 completado
- B → Identificar backup (E2.4.5)
- C → Completar selección (E2.4.2-E2.4.4)
- D → E2.4 completo desde cero (4-6 semanas)

---

### Pregunta 5.4 — ¿Conocés el proceso de permisos e inspecciones de tu ciudad?

- **A.** Sí, tengo contacto en Building Department + flujo documentado
- **B.** Sé el básico pero no en detalle
- **C.** Sé que existen pero no investigué a fondo
- **D.** No estoy familiarizado

**Mapping:**
- A → ✅ E2.5 completado
- B → Completar E2.5.1 + E2.5.4
- C/D → E2.5 completo desde cero (1-2 semanas)

---

## 🔨 BLOQUE 6 — Ejecución (E3) — solo si ya tiene deal cerrado

### Pregunta 6.1 — ¿Tenés deal activo actualmente?

- **A.** Sí, en E2 (preparación pre-obra)
- **B.** Sí, en E3 (obra en curso)
- **C.** Sí, en E4 (listo para listar o ya listado)
- **D.** No, todavía no cierro mi primer deal

**Si A/B/C**, continuar este bloque. Si **D**, saltar a Bloque 8.

---

### Pregunta 6.2 — Sobre tu deal activo en E3 (obra), ¿cómo está?

- **A.** En cronograma + presupuesto
- **B.** Retraso < 2 semanas / sobrecosto < 10%
- **C.** Retraso 2-4 semanas / sobrecosto 10-20%
- **D.** Retraso > 4 semanas / sobrecosto > 20%

**Mapping:**
- A → Mantener disciplina E3.1-E3.3
- B → Activar plan contingencia E3.2.3 + reunión semanal con GC
- C → Escalar al coach, revisar SOW, considerar GC backup
- D → 🚨 Crisis — sesión emergencia con coach inmediato

---

### Pregunta 6.3 — ¿Estás haciendo bitácoras semanales + tracking de presupuesto?

- ☐ Visitas obra 3x/semana documentadas con fotos
- ☐ Reunión semanal con GC con minuta
- ☐ Budget Tracker actualizado cada lunes
- ☐ Draw schedule respetado (pagos contra avance)
- ☐ Plan de contingencia activo

---

## 🎯 BLOQUE 7 — Salida (E4) — solo si tiene deal listo

### Pregunta 7.1 — Sobre tu deal en E4, ¿qué tenés definido?

- ☐ Staging contratado
- ☐ Fotografía profesional lista
- ☐ Precio de lista validado con CMA actual
- ☐ Walking number calculado
- ☐ Agente especializado en flip seleccionado
- ☐ Plan de marketing multi-plataforma

---

## 🚀 BLOQUE 8 — Escala (E5) — solo si ya cerró 1+ deal

### Pregunta 8.1 — ¿Cuántos deals exitosos has cerrado?

- **A.** Ninguno todavía
- **B.** 1 deal
- **C.** 2-4 deals
- **D.** 5+ deals

**Mapping:**
- A → Foco en cerrar el primer deal (E0-E4)
- B → Post-mortem (E5.1.1) + SOPs (E5.1.2)
- C → Sistemas + capital + leads propios (E5.1, E5.2)
- D → Equipo (PM) + portfolio simultáneo (E5.3, E5.4)

---

### Pregunta 8.2 — ¿Cuál es tu mayor cuello de botella para escalar?

- **A.** Capital (no me alcanza para más deals simultáneos)
- **B.** Tiempo (estoy haciendo todo yo mismo)
- **C.** Deals (no encuentro suficientes que pasen mi Buy Box)
- **D.** Equipo (no tengo PM ni soporte operativo)
- **E.** Sistemas (todo está en mi cabeza, no documentado)

**Mapping:**
- A → E5.2.1 (red privada) + E5.2.2 (capital diverso)
- B → E5.3.1 (PM) urgente
- C → E5.2.2 (lead gen propio) + ampliar Buy Box
- D → E5.3 (equipo completo: PM, asistente, contractor in-house)
- E → E5.1 (post-mortem + SOPs) antes de hacer otro deal

---

## 🎁 OUTPUT DEL DIAGNÓSTICO — PLAN PERSONALIZADO

Una vez completado el cuestionario, el coach (o la IA del sistema) genera:

```
═══════════════════════════════════════════════════════════
PLAN PERSONALIZADO — [Nombre del Estudiante]
Fecha: [Hoy]
═══════════════════════════════════════════════════════════

DIAGNÓSTICO:
- Etapa actual identificada: [E0 / E1 / E2 / E3 / E4 / E5]
- Resultado objetivo: [12 meses → Primer flip cerrado]
- Mercado: [Estado/Ciudad]
- Tiempo disponible: [X horas/semana]
- Cronograma esperado: [6-9 meses / 9-12 / 12-18]

FORTALEZAS IDENTIFICADAS:
✓ [Lista de lo que ya tiene resuelto]

GAPS PRIORITARIOS (próximas 4 semanas):
1. [Tarea E.X.Y crítica]
2. [Tarea E.X.Y crítica]
3. [Tarea E.X.Y crítica]

QUICK WIN SUGERIDO (semana 1):
- [Acción concreta del Anexo C / E0.2.3]

CONTACTOS A ACTIVAR (de Documento A — Base de Contactos):
- [3-5 contactos específicos por etapa según gaps]

PLATAFORMAS A SETUPEAR (de Documento B — Stack):
- [3-5 plataformas/software prioritarios]

CALCULADORAS A DESCARGAR (de Anexo B):
- [B.X - B.Y - B.Z según etapa actual]

LECTURA RECOMENDADA (de Anexo A y C):
- [Caso de estudio + secciones específicas de mindset]

PRIMER HITO MEDIBLE (30 días):
- [Hito específico cuantitativo]

REVISIÓN PROGRAMADA:
- Sesión 1 con coach: [Fecha]
- Cadencia: Semanal
═══════════════════════════════════════════════════════════
```

---

## 🤖 INSTRUCCIÓN PARA LA IA DEL SISTEMA

Cuando un usuario pida "ayúdame a diagnosticar dónde estoy", debes:

1. **Hacer las preguntas UNA POR VEZ** (no las 8 al mismo tiempo). Conversacional.
2. Después de cada respuesta, mostrar feedback corto (1-2 oraciones) reconociendo el estado.
3. Si la respuesta del usuario es ambigua, repreguntar para clarificar.
4. NO hacer las preguntas de bloques irrelevantes (si dice "no tengo deal", saltar Bloques 6-7).
5. Al final, generar el PLAN PERSONALIZADO con formato del template arriba.
6. Toda recomendación debe referenciar específicamente:
   - Código de tarea (E0.1.1, E1.4.2, etc) del documento correspondiente
   - Contactos específicos del Documento A
   - Plataformas específicas del Documento B
   - Calculadoras del Anexo B
7. NUNCA inventar tareas que no estén en la metodología.
8. Tono: directo, sin adulación, profesional, accionable.

---

*Cuestionario de Diagnóstico — FlipMentoría · Versión 1.0*
$FMO0KJ1G$,
  2,
  ARRAY['diagnostico', 'cuestionario', 'plan personalizado', 'onboarding']::text[]
);

-- ─── 🗺️ Estados del Estudiante — 8 Perfiles ───
delete from public.fm_documents where categoria = 'perfiles';
insert into public.fm_documents (etapa, categoria, titulo, subtitulo, contenido_md, posicion, tags) values (
  'INDICE',
  'perfiles',
  $FMTM6PGL$🗺️ Estados del Estudiante — 8 Perfiles$FMTM6PGL$,
  $FMTM6PGL$Mapa de rutas personalizadas: cero absoluto, sin crédito, atascado, escalando, F&H, wholesaling, internacional, lender pasivo$FMTM6PGL$,
  $FMTM6PGL$# 🗺️ ESTADOS DEL ESTUDIANTE — Mapa de Rutas Personalizadas
**8 perfiles típicos + plan de acción específico para cada uno**

> Cada estudiante que llega no empieza desde cero. Llega con un estado distinto. Este documento mapea los 8 perfiles más comunes y exactamente qué tareas de E0-E5 priorizar en cada caso.

---

## 👤 PERFIL #1 — "Cero absoluto"
**Características:**
- Sin LLC, sin EIN, sin cuenta de negocio
- Sin Buy Box, sin red de contactos
- Capital propio: \$20K-\$50K
- Credit score: 660+
- Sin experiencia previa en real estate

**Ruta recomendada (6-9 meses al primer deal):**

```
SEMANA 1-2 (E0):
- E0.1.1 — Formar LLC en estado de inversión
- E0.2.1 — Big Why personal
- E0.2.2 — Bloque diario 90 min
- E0.2.3 — Quick Win (Opción A: primera oferta en vivo)
- E0.3.1 — Setup Taskade
- E0.3.2 — Stack herramientas básico

SEMANA 3-4 (E0 + inicio E1):
- E0.1.2 — Operating Agreement
- E0.1.3 — Cuenta bancaria + tarjeta
- E0.1.4 — Software contabilidad (Stessa o QuickBooks)
- E0.1.5 — CPA + abogado identificados
- Iniciar E1.1.1 — Primer Buy Box renta
- Iniciar E1.1.2 — Primer Buy Box venta

SEMANA 5-8 (E1 + inicio E2):
- Completar E1.1 (5 Buy Box completos)
- E1.2.1 — Investigación de mercado profunda por ZIP
- E1.2.2 — Calificación A/B/C
- E1.3.1 — 10 comparables por ZIP (50 totales)
- Iniciar E2.1.1 — Entrevistar 10 HMLs en paralelo

SEMANA 9-12 (E1 + E2):
- E1.3.2 — Calcular 50 ARVs
- E1.3.3 — Estimar 50 rehabs
- E1.3.4 — Calcular 50 MAOs
- E1.4.1 — Primera oferta enviada
- E2.1.5 — HML primario pre-aprobado
- E2.3.1 — Lista de 20 wholesalers

SEMANA 13-20 (E2 intenso):
- E2.2 — Eventos REIA
- E2.3.2-E2.3.5 — Activar wholesalers
- E2.4 — Identificar 10 GCs, reuniones, bids
- E2.5 — Permisos + zonificación + inspecciones
- E2.6 — SOW maestro

SEMANA 21-26 — PRIMER DEAL CERRADO:
- Oferta aceptada
- HML activado
- Due diligence completo
- Closing
- Inicio obra (E3)

SEMANA 27-42 (E3):
- Visitas 3x/semana
- Bitácoras semanales
- Draw schedule respetado

SEMANA 43-52 (E4) — VENTA:
- Staging + fotografía
- Listing en 4 plataformas
- Open house semana 1
- Closing del segundo deal
```

**Contactos prioritarios:** Northwest Registered Agent (LLC), Stessa o QuickBooks (contabilidad), Kiavi + Lima One (HMLs), 1 REIA local.

**Calculadoras a descargar primero:** B.1 (Deal Analyzer), B.2 (ARV), B.3 (MAO), B.4 (Rehab).

---

## 👤 PERFIL #2 — "Tengo capital pero no tengo crédito"
**Características:**
- Capital propio: \$50K+
- Credit score: < 660 o sin historial US
- Sin LLC

**Ruta recomendada:**

```
PRIORIDAD ALTA — Trabajo paralelo:
TRACK 1 — Reconstruir crédito (6-12 meses):
- Secured credit card (Discover It Secured o Capital One Platinum)
- Pago a tiempo 100% por 6 meses
- Mantener utilization < 30%
- Authorized user en tarjeta de familiar con buen score

TRACK 2 — Iniciar negocio en paralelo:
- E0.1.1 — Formar LLC
- E0.1.2 — Operating Agreement
- E0.1.3 — Cuenta bancaria de negocio (con EIN sirve)
- E0.1.4 — Software contabilidad
- E0.1.5 — CPA + abogado

ALTERNATIVA SI NO QUIERE ESPERAR 6 MESES:
Opción A — Partnership con socio que tenga crédito (50/50)
Opción B — Empezar con Wholesaling (no requiere crédito ni capital grande)
Opción C — Buscar HMLs locales más flexibles (FICO 600+, tasas 13-15%)
Opción D — Comprar 100% cash (con capital propio + private money familiar)
```

**Contactos clave:** Easy Street Capital (más flexible), Anchor Loans, HMLs locales del Documento A según estado.

---

## 👤 PERFIL #3 — "Empezó pero está atascado en evaluación"
**Características:**
- LLC formada
- Algunos contactos pero sin red activa
- Lleva 3-6 meses analizando deals sin enviar ofertas
- Frustración alta

**Ruta de desbloqueo:**

```
DIAGNÓSTICO:
La mayoría se atasca por:
1. Miedo a perder dinero → Anexo C.7 (plan acción bloqueado)
2. Parálisis por análisis → forzar volumen de ofertas
3. Buy Box demasiado restrictivo → ampliar
4. Sin HML pre-aprobado → no se anima a ofertar

ACCIÓN — 30 DÍAS DE BREAKTHROUGH:
SEMANA 1:
- E0.2.3 — Quick Win OBLIGATORIO (1ra oferta en vivo)
- E2.1.5 — HML pre-aprobado si no lo tiene

SEMANA 2-4:
- E1.4.1 — Meta 10 ofertas/semana (no /mes)
- E1.4.2 — Negociar activamente con 2 contraofertas mínimo
- E1.4.4 — Tracking en B.8 (Pipeline)

ACCOUNTABILITY:
- Sesión semanal con coach SIN FALTA
- Accountability partner del programa
- Compartir métricas en grupo (acountability público)

REGLA: Si en 30 días no llegó a 30 ofertas enviadas, escalar a coach.
```

---

## 👤 PERFIL #4 — "Cerró 1 deal y quiere escalar"
**Características:**
- 1 deal exitoso cerrado
- Capital de equity disponible
- Quiere hacer 3-5 deals al año

**Ruta de escala:**

```
INMEDIATO (mes 1-2 post primer deal):
- E5.1.1 — POST-MORTEM completo del primer deal
- E5.1.2 — Top 3 SOPs documentados
- E5.2.1 — Iniciar red de private money (pitch deck)
- E5.3.2 — Plan anual con metas

CORTO PLAZO (mes 3-6):
- Segundo deal en pipeline (aplicando lecciones)
- E5.2.2 — Sistema de generación de leads activo (1 canal)
- Mantener relación con red E2 (HML, wholesalers, GCs)

MEDIANO PLAZO (mes 6-12):
- 3 deals simultáneos (E5.4.1)
- Evaluar PM (E5.3.1) cuando llegue a 3 simultáneos
- Capital diversificado (HML + Private + HELOC)

REGLA: NO escalar a más de 2 simultáneos sin SOPs documentados.
```

---

## 👤 PERFIL #5 — "Quiere Fix & Hold, no Fix & Flip"
**Características:**
- Objetivo: cash flow mensual a largo plazo
- Inquilinos long-term (no Airbnb)
- Sin urgencia de venta

**Ruta adaptada:**

```
DIFERENCIAS vs Fix & Flip:
- Buy Box: foco en cash-on-cash ≥ 8%, no en ARV
- E1.1.1 (renta) en lugar de E1.1.2 (venta)
- E2 igual pero con DSCR refi en mente (no listing)
- E3 obra más simple (no premium upgrades — solo lo necesario)
- E4 NO se lista — se refinancia con DSCR loan + se renta

ETAPAS:
- E0 — IGUAL
- E1.1.1 + E1.2 + E1.3 — IGUAL pero con Buy Box renta
- E2 — HML para acquisition + DSCR pre-aprobado para refi
- E3 — Obra ligera/media, no premium (recuperar inversión vía cash flow)
- E4.NEW — Listing como RENTAL, no como venta:
  · Zillow Rentals, Apartments.com, PadSplit (si coliving)
  · Tenant screening profesional
  · Property Manager si > 1 propiedad
- E5 — BRRRR escalado (Buy, Rehab, Rent, Refinance, Repeat)

LENDERS DSCR PRIORITARIOS:
- Visio Lending (DSCR 1.0 mínimo)
- Kiavi (también ofrece DSCR)
- Lima One (Fix2Rent — combo HML + DSCR)
```

---

## 👤 PERFIL #6 — "Quiere hacer wholesaling primero"
**Características:**
- Capital limitado (< \$20K)
- Quiere generar ingresos rápido sin riesgo de comprar
- Aprender el mercado antes de invertir capital

**Ruta wholesaling-first:**

```
LEGAL FIRST:
- E0.1.1 — LLC OBLIGATORIO (wholesaling sin LLC = riesgo personal)
- Verificar legalidad de wholesaling en tu estado (algunos requieren licencia)

CORE WHOLESALING (3-6 meses):
- E1.1 — Buy Box (qué tipo de propiedades buscás para wholesalear)
- E2.3.1 — Conectar con compradores cash (tu buyer list propia)
- E5.2.2 — Sistema de generación de leads (Direct Mail, Driving for Dollars, Cold Call)

CICLO WHOLESALE:
1. Encontrar motivated seller
2. Lock contrato bajo MAO
3. Buscar buyer en tu lista
4. Assignment contract + assignment fee (\$5K-\$25K)

CONTACTOS CLAVE:
- PropStream (lead generation)
- BatchSkipTracing (encontrar owners)
- DealMachine (driving for dollars)
- Carrot (website + SEO)
- BiggerPockets Wholesaling Forum

OBJETIVO 12 MESES:
- 6-12 deals wholesaleados (\$30K-\$200K ganancia)
- Acumular capital para hacer fix & flip propio en año 2
```

---

## 👤 PERFIL #7 — "Tiene experiencia internacional pero es nuevo en USA"
**Características:**
- Ya hizo flips en su país de origen
- Domina conceptos básicos
- Nuevo en regulación, taxes, financiamiento USA

**Ruta acelerada con foco en diferencias USA:**

```
SKIP (ya domina):
- Conceptos básicos de evaluation, ARV, rehab
- Mentalidad de inversor

PRIORIDAD ABSOLUTA:
- E0.1.1 — LLC USA (entidad legal diferente a su país)
- E0.1.5 — CPA QUE ENTIENDA SU CASO INTERNACIONAL
  · ITIN vs SSN
  · Taxes federales + estatales
  · Treaties de doble tributación
- E2.5 — Permisos y regulación específica del estado (MUY distinto entre estados)
- Anexo C.6 — Glosario técnico (terms en inglés)

DIFERENCIAS CLAVE A APRENDER:
- HML estructura (no existe igual en muchos países)
- DSCR loans (concepto USA)
- 1031 exchange (tax deferral USA)
- Section 1031, Section 121
- Opportunity Zones (federal)
- Property taxes (varían 0.5-2.5% por estado)

CONTACTOS PRIORITARIOS:
- CPA bilingüe especializado en investors internacionales
- Abogado con experiencia visa/tax internacional
- HML que financie a non-residents (algunos lo hacen)
```

---

## 👤 PERFIL #8 — "Quiere ser pasivo (private money lender)"
**Características:**
- No quiere operar el negocio
- Quiere prestar capital y recibir intereses
- Capital \$50K+

**Ruta alternativa (NO es estudiante de FlipMentoría tradicional):**

```
ROL: Private Money Lender, no operador

LO QUE NECESITA APRENDER:
- Cómo evaluar un deal (E1.3 — ARV, MAO)
- Cómo evaluar un operador (red flags del que pide prestado)
- Estructura legal de préstamo:
  · Note (instrumento de deuda)
  · Deed of Trust o Mortgage (garantía)
  · 1st lien position (prioridad de cobro)
- Documentos legales:
  · Promissory Note
  · Loan Agreement
  · Deed of Trust + Recording
  · Title Insurance del lender

RETURN TÍPICO:
- 8-12% anual sobre capital prestado
- Plazo 6-12 meses por deal
- 1st lien position = mayor protección
- LTV máximo 70% para protección de capital

DUE DILIGENCE ANTES DE PRESTAR:
- Track record del operador
- Numbers del deal (ARV, rehab, MAO)
- LTV calculado conservadoramente
- Insurance coverage de la propiedad
- Estados mensuales recibidos
- Visitas a propiedad (opcional pero saludable)

ACCIÓN RECOMENDADA:
1. Conectar con operadores de FlipMentoría que necesitan capital
2. Empezar con 1 deal pequeño (\$50K-\$100K)
3. Construir relación de confianza antes de escalar
4. Diversificar entre 3-5 operadores (no todos los huevos en 1 canasta)
```

---

## 🎯 CÓMO USAR ESTE DOCUMENTO

1. **Coach o IA del sistema** identifica el perfil del estudiante en la primera sesión
2. **Estudiante** recibe su Plan Personalizado basado en su perfil
3. **Coach** ajusta el plan trimestralmente según evolución
4. **Sistema** track del progreso del estudiante contra su perfil objetivo

**Regla de oro:** ningún estudiante encaja 100% en un solo perfil. Mezclá perfiles y adaptá. La metodología E0-E5 sigue siendo la espina dorsal.

---

*Estados del Estudiante — FlipMentoría · Mapa de Rutas Personalizadas*
$FMTM6PGL$,
  3,
  ARRAY['perfiles', 'rutas', 'plan', 'personalizacion']::text[]
);

select etapa, categoria, titulo from public.fm_documents where categoria in ('diagnostico','perfiles') order by posicion;
