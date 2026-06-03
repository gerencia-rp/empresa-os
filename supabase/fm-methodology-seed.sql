-- ============================================================
-- FlipMentoría · Seed de contenido (14 documentos)
-- ============================================================

-- Limpiar antes de re-cargar (idempotente)
delete from public.fm_documents where true;


-- ─── INDICE · indice · 📘 Índice Maestro · Sistema FlipMentoría v3 ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'INDICE',
  'indice',
  null,
  $FMF0P7U7$📘 Índice Maestro · Sistema FlipMentoría v3$FMF0P7U7$,
  null,
  $FMF0P7U7$# 📘 SISTEMA OPERATIVO FLIPMENTORÍA
**Método E0–E5 · Nacional USA · v3 Final**

> Sistema completo de 71 tareas que lleva al estudiante desde la fundación legal del negocio hasta el escalamiento, ejecutable en cualquier ciudad de Estados Unidos.

---

## 🎯 PROPÓSITO DEL SISTEMA

El estudiante de FlipMentoría completa este sistema y obtiene:

1. **Fundación legal y financiera sólida** (LLC, banco, contabilidad, mindset)
2. **Criterio claro de evaluación** (5 Buy Box + investigación + ARV + MAO)
3. **Red operativa funcional** (HML, wholesalers, GCs, permisos)
4. **Capacidad de ejecución supervisada** (bitácoras, draw schedule, budget)
5. **Estrategia de salida rentable** (staging, listing, negociación)
6. **Infraestructura para escalar** (SOPs, PM, expansión)

Resultado esperado: **primer deal cerrado y vendido en 6-9 meses con margen ≥ 20%.**

---

## 📂 ESTRUCTURA DE DOCUMENTOS

```
SISTEMA FLIPMENTORÍA v3
│
├── 00_Indice_Maestro.md (este documento)
│
├── ETAPAS PRINCIPALES (71 tareas):
│   ├── E0_Fundacion.md ........... 10 tareas
│   ├── E1_Evaluar.md ............. 17 tareas
│   ├── E2_Estructurar.md ......... 26 tareas
│   ├── E3_Ejecutar.md ............  9 tareas
│   ├── E4_Estrategia_Salida.md ...  7 tareas
│   └── E5_Escalar.md .............  8 tareas
│
└── ANEXOS DE SOPORTE:
    ├── ANEXO_A_Caso_de_Estudio.md ........ Flip real con números
    ├── ANEXO_B_Calculadoras.md ........... 10 plantillas
    └── ANEXO_C_Mindset_Errores.md ........ Hábitos + Top 20 errores + FAQ
```

---

## 🗺️ MAPA DE FLUJO DEL ESTUDIANTE

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📚 LECTURA PREVIA (semana 0)                              │
│  → Anexo A: Caso de Estudio Completo                       │
│  → Anexo C: Mindset y Top 20 Errores                       │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏛️ E0 — FUNDACIÓN (2-4 semanas)                          │
│  LLC, banco, contabilidad, mindset, Quick Win              │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔍 E1 — EVALUAR (4-8 semanas, puede iniciarse en E0)     │
│  Buy Box, mercado, comparables, ARV, MAO, ofertas          │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🏗️ E2 — ESTRUCTURAR (paralelo con E1)                    │
│  HML, eventos, wholesalers, GCs, permisos, SOW             │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
                    🎯 PRIMER DEAL CERRADO
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔨 E3 — EJECUTAR (3-6 meses)                              │
│  Bitácoras, draw schedule, budget, inspecciones            │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💰 E4 — ESTRATEGIA DE SALIDA (1-2 meses)                  │
│  Staging, fotografía, listing, negociación, closing        │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
                    💵 GANANCIA REALIZADA
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📈 E5 — ESCALAR (continuo)                                │
│  Post-mortem, SOPs, capital privado, PM, expansión         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ TIMELINE ESPERADO (estudiante promedio)

| Hito | Semana |
|------|--------|
| Inicio del programa | 1 |
| LLC formada + EIN obtenido | 4 |
| Cuenta de negocio + contabilidad activa | 5 |
| Quick Win completado | 2-4 |
| 5 Buy Box construidos | 6 |
| Primera oferta enviada | 8 |
| HML pre-aprobado | 10 |
| Primer wholesaler activo enviando deals | 12 |
| Primer GC contratado para visita | 14 |
| **PRIMER DEAL CERRADO** | **20-26** |
| Obra iniciada | 21-27 |
| Final inspections aprobadas | 38-42 |
| Listing activo | 40-44 |
| **PRIMER DEAL VENDIDO** | **44-52** |
| Post-mortem completado | 54 |
| SOPs primer borrador | 56 |
| Segundo deal en pipeline | 56-60 |

---

## 📊 TOTAL DE TAREAS POR ETAPA

| Etapa | Punto Clave | Tareas | Tiempo estimado |
|-------|-------------|--------|-----------------|
| **E0 — Fundación** | 3 puntos clave | **10 tareas** | 30-50 horas |
| **E1 — Evaluar** | 4 puntos clave | **17 tareas** | 100-150 horas |
| **E2 — Estructurar** | 6 puntos clave | **26 tareas** | 80-120 horas |
| **E3 — Ejecutar** | 3 puntos clave | **9 tareas** | continuo durante obra |
| **E4 — Estrategia Salida** | 4 puntos clave | **7 tareas** | 40-60 horas |
| **E5 — Escalar** | 4 puntos clave | **8 tareas** | continuo |
| **TOTAL** | **24 puntos clave** | **71 tareas** | **6-9 meses** |

---

## 🧰 RECURSOS COMPLEMENTARIOS

### Anexo A — Caso de Estudio Completo
Un flip real de principio a fin con números reales. SFH 1,650 sqft, compra \$215K, rehab \$58.4K, venta \$390K, ganancia \$79K, ROI 25.5% en 5 meses. **Leer ANTES de hacer el primer deal.**

### Anexo B — Calculadoras y Plantillas
10 calculadoras descargables en formato Google Sheets / Excel:
- B.1 Deal Analyzer 1-página
- B.2 ARV Calculator detallado
- B.3 MAO Calculator (Regla 75%)
- B.4 Rehab Estimator
- B.5 Breakeven Calculator
- B.6 Draw Schedule Tracker
- B.7 Budget Tracker
- B.8 Pipeline Tracker
- B.9 KPI Dashboard mensual
- B.10 Cash Flow Projection 12 meses

### Anexo C — Mindset, Accountability y Errores
Sistema crítico para no abandonar:
- C.1 Sistema de hábitos diarios
- C.2 Accountability — 4 pilares
- C.3 Top 20 errores de novatos con casos reales
- C.4 FAQ por etapa (E0-E5)
- C.5 Sistema de comunicación con coach
- C.6 Glosario técnico (200+ términos)
- C.7 Plan de acción cuando estás bloqueado

---

## ✅ CRITERIOS DE FINALIZACIÓN DEL PROGRAMA

El estudiante completa el programa cuando:

```
□ Las 71 tareas del sistema completadas y subidas a Taskade
□ Primer deal cerrado (compra ejecutada)
□ Primer deal vendido (venta ejecutada con margen ≥ 20%)
□ Post-mortem del primer deal completado
□ SOPs primer borrador documentado
□ Plan anual para próximos 12 meses presentado
□ Pipeline con mínimo 2-3 deals proyectados próximo año
```

---

## 🎯 DIFERENCIADORES DE LA v3 NACIONAL USA

Esta versión v3 se diferencia de versiones anteriores en:

1. **Sin lock-in a Texas:** todas las referencias geográficas son nacionales o adaptables a cualquier estado USA
2. **Recursos nacionales verificados:** HMLs nacionales (Kiavi, Lima One, Visio, etc.), National REIA directory, plataformas que operan en 40+ estados
3. **Etapa E0 nueva:** fundación legal + financiera + mental ANTES de empezar (evita errores costosos)
4. **Quick Win en semana 1:** primera victoria documentada para sostener motivación
5. **Anexos pedagógicos:** caso de estudio completo + 10 calculadoras + sistema anti-abandono
6. **Guía adaptativa por estado:** cada tarea incluye cómo adaptar el recurso al estado/ciudad del estudiante
7. **Top 20 errores documentados:** anticipación proactiva de problemas comunes
8. **Sistema de accountability:** 4 pilares para que el 80% no abandone

---

## 📞 SOPORTE DEL PROGRAMA

```
COACH ASIGNADO:           [Nombre del coach]
EMAIL COACH:              [email]
TASKADE WORKSPACE:        [link al portal]
CADENCIA SESIONES:        Semanal (45-60 min)
COMUNIDAD ESTUDIANTES:    [Grupo WhatsApp/Slack/Discord]
SOPORTE TÉCNICO:          gerencia@rentalprofitss.com
```

---

*Sistema FlipMentoría v3 · Método E0-E5 · Nacional USA · Diseñado para Rental Profitss*
$FMF0P7U7$,
  0,
  ARRAY['indice', 'mapa', 'timeline']::text[],
  '{}'::jsonb
);

-- ─── E0 · tareas · 🏛️ E0 · Fundación — 10 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E0',
  'tareas',
  null,
  $FM1L7OF6$🏛️ E0 · Fundación — 10 tareas$FM1L7OF6$,
  $FM1L7OF6$Bases legales, financieras y mentales antes de empezar$FM1L7OF6$,
  $FM1L7OF6$# 🏛️ ETAPA E0 — FUNDACIÓN
**Bases legales, financieras y mentales antes de empezar**

> Antes de buscar deals, el estudiante debe estar legalmente protegido, financieramente listo y con la mentalidad correcta. Esta etapa toma 2-4 semanas y se ejecuta en paralelo con el inicio de E1.

---

## Punto Clave 0.1 — Estructura Legal y Tributaria

---

### 🎯 Tarea E0.1.1 — Formar LLC en el estado donde se invertirá
**Tiempo estimado:** 4-6 horas + tiempo de procesamiento (1-4 semanas según el estado)

**📌 Qué hace el estudiante**
Formar una LLC en el estado donde planea invertir para proteger patrimonio personal y operar con eficiencia tributaria.

**🧠 Cómo conecta con el método**
Sin LLC, el estudiante usa su nombre personal para comprar propiedades. Si hay demanda (inquilino lesionado, contractor que demanda, problema estructural), pierde casa propia, ahorros y carro. Con LLC, solo responde con activos de la LLC. **Es la diferencia entre perder un deal y perder todo.**

**🌐 Recursos nacionales verificados**
- **Buscar Secretary of State del estado** → Google "[State name] Secretary of State LLC formation"
- **Estados más comunes para inversores:**
  - **Texas:** https://www.sos.state.tx.us — \$300 filing fee, sin state income tax
  - **Florida:** https://dos.fl.gov — \$125 filing fee, sin state income tax
  - **California:** https://www.sos.ca.gov — \$70 filing fee + \$800 annual minimum franchise tax
  - **New York:** https://www.dos.ny.gov — \$200 filing fee + publication requirement (\$500-\$1,200)
  - **Georgia:** https://sos.ga.gov — \$100 filing fee
  - **Arizona:** https://azsos.gov — \$50 filing fee + publication
  - **Nevada:** https://www.nvsos.gov — \$425 total annual cost (popular por asset protection)
  - **Delaware:** https://corp.delaware.gov — \$90 filing fee (popular para holding)
- **IRS EIN Application (gratis)** → https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- **Servicios de formación recomendados:**
  - **Northwest Registered Agent** → https://www.northwestregisteredagent.com (\$39 + state fee, mejor calidad/precio)
  - **LegalZoom** → https://www.legalzoom.com (\$149 + state fee)
  - **ZenBusiness** → https://www.zenbusiness.com (\$0 + state fee plan básico)
  - **Inc Authority** → https://www.incauthority.com (gratis + state fee)

**📋 Regla clave para elegir estado:**
```
Forma la LLC en el ESTADO donde está la propiedad, no donde vives.
- Vives en California pero inviertes en Texas → LLC en Texas
- Vives en Nueva York pero inviertes en Florida → LLC en Florida
- Si vives e inviertes en el mismo estado → LLC en ese estado

Razón: Si formas LLC fuera del estado donde está la propiedad,
debes registrarla como "foreign LLC" en el estado de la propiedad
(double filing fee, double compliance).
```

**🪜 Paso a paso**
1. Decidir el estado donde se invertirá (no donde vives, el estado de la propiedad). Google "[State] Secretary of State LLC"
2. Verificar disponibilidad del nombre de la LLC en el portal del Secretary of State. **Tip:** incluir "LLC" o "Limited Liability Company" al final
3. Obtener Registered Agent (físico en ese estado). Opciones: usar servicio profesional (\$99-\$300/año) o ser propio agente si vives ahí
4. Llenar y enviar el Certificate of Formation / Articles of Organization (formato varía por estado). Pagar filing fee. Tiempo aprobación: 1-4 semanas según estado
5. Una vez aprobada la LLC, **solicitar EIN gratis al IRS** (https://www.irs.gov/ein) — toma 10 minutos online y se obtiene inmediatamente

**📦 Entregable**
LLC formada + Certificate of Formation (PDF) + EIN del IRS guardados en Taskade.

**✅ Criterio de cierre**
LLC aprobada por el estado + EIN obtenido + documentos archivados en Taskade.

**⚠️ Riesgos comunes**
- Formar LLC en Delaware/Nevada pensando que "protege más" (en realidad complica con foreign filing)
- No pagar el filing fee correcto del estado (el fee NO se evita usando servicios "free")
- Usar PO Box como Registered Agent (no permitido — debe ser dirección física)
- No mantener al día el annual report del estado (genera dissolución automática)

---

### 🎯 Tarea E0.1.2 — Operating Agreement firmado
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Crear y firmar el Operating Agreement de la LLC (incluso si es single-member LLC).

**🧠 Cómo conecta con el método**
El Operating Agreement es lo que las cortes usan para validar que la LLC es entidad separada del estudiante. Sin él, en un juicio pueden "piercear el corporate veil" y atacar bienes personales. Es la diferencia entre protección real y protección teórica.

**🌐 Recursos**
- **Template gratis LLC University** → https://www.llcuniversity.com/llc-operating-agreement
- **RocketLawyer** → https://www.rocketlawyer.com (templates premium)
- **LegalZoom Operating Agreement** → https://www.legalzoom.com
- **Northwest free template** (incluido con su servicio)

**🪜 Paso a paso**
1. Descargar template gratis (LLC University recomendado para inversores)
2. Llenar campos: nombre LLC, miembros + % ownership, manager-managed vs member-managed (recomendado: manager-managed para flexibilidad)
3. Definir: distribución de profits, voting rights, qué pasa si miembro muere o se va, buyout provisions
4. Firmar todos los miembros con notario (no obligatorio en todos los estados pero recomendado)
5. Archivar original en lugar seguro + copia digital en Taskade. **NO se envía al estado** — se mantiene interno

**📦 Entregable**
Operating Agreement firmado en Taskade.

**✅ Criterio de cierre**
Documento firmado y archivado + entendimiento claro de cláusulas clave.

**⚠️ Riesgos comunes**
- Operar sin Operating Agreement (deja vulnerable a piercing the veil)
- Copy-paste de template genérico sin adaptar
- No actualizar cuando entran nuevos socios

---

### 🎯 Tarea E0.1.3 — Cuenta bancaria de negocio + tarjeta de crédito
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Abrir cuenta bancaria a nombre de la LLC + tarjeta de crédito de negocio.

**🧠 Cómo conecta con el método**
**Mezclar plata personal con plata del negocio destruye la protección de la LLC.** Cuenta separada + tarjeta separada = cumplimiento contable + mejor crédito de negocio + categorización automática de gastos para taxes.

**🌐 Bancos recomendados para inversores (nacional)**
- **Chase Business Complete Banking** → https://www.chase.com/business (sin fee mínimo \$2K balance)
- **Bank of America Business Advantage** → https://www.bankofamerica.com/smallbusiness
- **Wells Fargo Business** → https://www.wellsfargo.com/biz
- **Capital One Spark Business** → https://www.capitalone.com/small-business-bank
- **US Bank Business** → https://www.usbank.com/business-banking.html
- **Online options (más fáciles):**
  - **Bluevine** → https://www.bluevine.com (sin fees, high APY)
  - **Novo** → https://www.novo.co (especial para small business)
  - **Mercury** → https://mercury.com (tech-forward, sin minimums)

**Tarjetas de crédito de negocio (recomendadas para inversores):**
- **Chase Ink Business Preferred** → 3x points en travel/shipping, \$95 annual fee
- **Capital One Spark Cash Plus** → 2% cash back universal, \$150 annual fee
- **American Express Business Gold** → 4x points en categorías rotativas, \$295 annual fee
- **Brex** → https://www.brex.com (sin personal guarantee para LLCs con ingresos)

**📋 Documentos para abrir cuenta:**
```
□ Certificate of Formation aprobado (de E0.1.1)
□ EIN letter del IRS (de E0.1.1)
□ Operating Agreement firmado (de E0.1.2)
□ ID personal (passport o driver's license)
□ Initial deposit (\$100-\$1,000 según banco)
□ Comprobante de domicilio (utility bill)
```

**🪜 Paso a paso**
1. Comparar 3 bancos arriba (1 tradicional + 1 online). Decidir según: fees, mínimo balance, integraciones con software contable
2. Agendar cita o aplicar online con los documentos listos
3. Depositar capital inicial (recomendado: \$5K-\$10K como working capital del negocio)
4. Aplicar a tarjeta de crédito de negocio (puede usar score personal en primera tarjeta). **No usar tarjeta para gastos personales nunca**
5. Conectar cuenta a software contable (siguiente tarea E0.1.4)

**📦 Entregable**
Cuenta de negocio activa + tarjeta de crédito aprobada + datos guardados en Taskade.

**✅ Criterio de cierre**
Cuenta funcionando con capital inicial + tarjeta activa + nunca usar para gastos personales.

**⚠️ Riesgos comunes**
- Usar cuenta personal "temporalmente" para el negocio (pierde protección legal)
- No mantener mínimo balance (fees mensuales innecesarios)
- Aplicar a 5+ tarjetas a la vez (hard inquiries dañan score)

---

### 🎯 Tarea E0.1.4 — Software de contabilidad activo
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Configurar software de contabilidad que registre todos los gastos del negocio desde el día 1.

**🧠 Cómo conecta con el método**
Sin contabilidad organizada, en abril el estudiante paga al contador 3x más para "reconstruir" el año. Peor: pierde deducciones porque no tiene recibos. Software automatizado = ahorro de \$5K-\$15K en impuestos anuales para un flipper activo.

**🌐 Software recomendados**
- **QuickBooks Online** → https://quickbooks.intuit.com (más completo, \$30-\$200/mes)
  - Versión recomendada: Simple Start o Essentials
- **Stessa** → https://www.stessa.com (GRATIS, diseñado para real estate investors)
- **Xero** → https://www.xero.com (\$15-\$78/mes, alternativa a QuickBooks)
- **Wave** → https://www.waveapps.com (GRATIS, básico pero funcional)
- **FreshBooks** → https://www.freshbooks.com (\$21-\$65/mes, fácil para principiantes)

**📋 Categorías de gastos a configurar para Fix & Flip:**
```
INGRESOS:
- Venta de propiedad
- Renta recibida
- Other income

GASTOS DE PROPIEDAD (por property/deal):
- Compra (purchase price)
- Closing costs compra
- Materiales de remodelación
- Mano de obra (GC + subs)
- Permisos e inspecciones
- Property taxes (durante holding)
- Utilities (durante holding)
- Insurance (during construction)
- HOA fees
- Marketing y staging
- Closing costs venta
- Comisiones agente

GASTOS GENERALES DEL NEGOCIO:
- Office/coworking
- Software y suscripciones
- Educación y mentorías
- Travel y vehicle
- Phone y internet
- Legal y profesional
- Marketing general
- Bank fees
```

**🪜 Paso a paso**
1. Elegir software (recomendado Stessa si solo tiene 1-2 propiedades, QuickBooks si planea escalar)
2. Conectar cuenta de banco y tarjeta de crédito de negocio (E0.1.3) para sincronización automática
3. Configurar las categorías arriba dentro del software (Chart of Accounts)
4. **Establecer ritual semanal:** todos los viernes 30 minutos categorizando transacciones de la semana
5. Configurar reportes automáticos: P&L mensual, P&L por property/deal, Cash Flow

**📦 Entregable**
Software configurado con bank/credit conectados + categorías de Fix & Flip + ritual semanal en calendario.

**✅ Criterio de cierre**
Software activo + transacciones categorizadas + P&L generándose automáticamente.

**⚠️ Riesgos comunes**
- Posponer la contabilidad ("lo hago al final del mes")
- No separar gastos por property/deal (no se sabe rentabilidad real)
- No backup de recibos (digital o foto en Drive/Dropbox)

---

### 🎯 Tarea E0.1.5 — Contador y abogado de real estate identificados
**Tiempo estimado:** 4-6 horas

**📌 Qué hace el estudiante**
Identificar y entrevistar mínimo 2 contadores y 2 abogados especializados en real estate antes de necesitarlos.

**🧠 Cómo conecta con el método**
Buscar contador en abril (deadline de taxes) = pagar 2x y recibir servicio mediocre. Buscar abogado cuando hay demanda = perder porque no hay tiempo de elegir bien. **Ambos se contratan ANTES de necesitarlos.**

**🌐 Dónde encontrar especialistas**
- **CPA de Real Estate:**
  - AICPA Directory → https://www.aicpa-cima.com/cpe-learning/find-a-cpa
  - BiggerPockets Find a Tax Pro → https://www.biggerpockets.com/professionals/tax-pros
  - Referidos en REIA local (E2.2)
  - Google: "real estate CPA [your city]"
- **Abogado de Real Estate:**
  - Avvo → https://www.avvo.com (ratings y reviews)
  - Martindale-Hubbell → https://www.martindale.com
  - State Bar Association directory
  - Referidos del title company

**📝 Preguntas para entrevistar CPA:**
```
1. "¿Cuántos clientes tienes que sean Fix & Flippers activos?"
2. "¿Manejas Schedule C vs S-Corp election para flippers?"
3. "¿Conoces el 1031 exchange y cuándo aplica vs no aplica?"
4. "¿Tu fee es flat fee anual o hourly?"
5. "¿Ofreces tax planning durante el año o solo tax filing en abril?"
6. "¿Cómo manejamos quarterly estimated taxes?"
7. "¿Recomiendas LLC taxed as S-Corp para mi caso? ¿Por qué?"
8. "¿Cuál es tu disponibilidad para preguntas urgentes durante el año?"
```

**📝 Preguntas para entrevistar abogado:**
```
1. "¿Has revisado contratos de Hard Money Lenders?"
2. "¿Manejas formación de Series LLC para múltiples propiedades?"
3. "¿Cuál es tu fee por revisar un contrato de compra (LOI/purchase agreement)?"
4. "¿Tienes retainer mensual? ¿Cuánto cubre?"
5. "¿Manejas disputas con contractors si surgieran?"
6. "¿Cuál es tu turnaround time para review de contratos?"
7. "¿Has trabajado con flippers/investors específicamente?"
```

**🪜 Paso a paso**
1. Identificar 3 CPAs + 3 abogados usando fuentes arriba. Verificar especialidad en real estate
2. Entrevistar a cada uno (30-45 min). Hacer las preguntas específicas
3. Pedir 2 referencias de clientes activos en real estate
4. Elegir 1 CPA primario + 1 abogado primario. Establecer retainer o relación formal
5. Documentar contactos en Taskade en sección "Equipo Profesional" con: nombre, especialidad, fees, contacto directo

**📦 Entregable**
CPA + abogado seleccionados con contacto en Taskade.

**✅ Criterio de cierre**
Ambos profesionales identificados antes de cerrar primer deal.

**⚠️ Riesgos comunes**
- Usar CPA generalista (no entiende real estate tax strategy)
- No tener abogado hasta que hay demanda
- Elegir por precio bajo sin validar especialidad

---

## Punto Clave 0.2 — Mentalidad y Compromiso

---

### 🎯 Tarea E0.2.1 — Definir Big Why personal por escrito
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Escribir 1-2 páginas detallando POR QUÉ está haciendo este programa: qué quiere lograr, en qué plazo, qué pasa si no lo logra.

**🧠 Cómo conecta con el método**
El Fix & Flip es difícil. Habrá rechazos (30+ ofertas rechazadas), problemas (contractor que desaparece), miedo (firmar contratos de \$300K+). El estudiante que tiene un Big Why claro persevera. El que no, abandona al primer obstáculo. **El 80% de los que fracasan no es por falta de información, es por falta de claridad de propósito.**

**📝 Template del Big Why:**
```
═══════════════════════════════════════════════════════════
MI BIG WHY — [Nombre del Estudiante]
Fecha: [DD/MM/AAAA]
═══════════════════════════════════════════════════════════

1. SITUACIÓN ACTUAL (¿Dónde estoy hoy?)
- Ingresos actuales: \$___
- Horas que trabajo: ___
- Lo que ME GUSTA de mi situación: [___]
- Lo que NO ME GUSTA de mi situación: [___]
- Lo que me FRUSTRA o me duele: [___]

2. VISIÓN A 5 AÑOS (¿Dónde quiero estar?)
- Ingresos objetivo: \$___ mensual
- Patrimonio: \$___
- Tiempo libre: ___ horas/semana para [familia/hobbies/etc]
- Estilo de vida específico: [___]
- Qué hago con mi tiempo: [___]

3. LO QUE PIERDO SI NO LO LOGRO
- Continúo siendo: [___]
- Mi familia sigue sin: [___]
- En 5 años seguiré: [___]
- Lo que más me duele de imaginar quedarme igual: [___]

4. POR QUÉ AHORA (¿Por qué este es el momento?)
- Mi edad / fase de vida: [___]
- Recursos que tengo hoy que mañana podría no tener: [___]
- Urgencia personal: [___]

5. COMPROMISOS NO NEGOCIABLES
Por los próximos 12 meses me comprometo a:
□ Asistir a __% de las sesiones del programa
□ Completar mínimo __ tareas por semana
□ Hacer mínimo __ ofertas por mes una vez en E1
□ NO abandonar antes de [fecha específica]

6. A QUIÉN COMPARTO ESTO (Accountability)
Comparto este Big Why con:
- Coach del programa
- [Persona cercana 1] — fecha: ___
- [Persona cercana 2] — fecha: ___

═══════════════════════════════════════════════════════════
FIRMA: ___________________  FECHA: __________
═══════════════════════════════════════════════════════════
```

**🪜 Paso a paso**
1. Bloquear 2-3 horas sin interrupciones. Lugar tranquilo, sin celular
2. Llenar el template arriba con honestidad brutal. **No editorializar — escribir como sale**
3. **Leer en voz alta** y ajustar lo que no se sienta verdadero
4. Firmar, fechar, imprimir y colocar en lugar visible (escritorio, espejo, pared del cuarto)
5. Compartir con coach y mínimo 2 personas cercanas para accountability

**📦 Entregable**
Big Why firmado en Taskade + foto del documento físico en lugar visible.

**✅ Criterio de cierre**
Documento firmado + compartido con 3 personas mínimo + en lugar visible diariamente.

**⚠️ Riesgos comunes**
- Big Why genérico ("quiero ser libre financieramente")
- No compartir con nadie (sin accountability)
- No releer cuando llegan los momentos difíciles

---

### 🎯 Tarea E0.2.2 — Bloque diario de tiempo no negociable
**Tiempo estimado:** 1 hora setup + cadencia diaria

**📌 Qué hace el estudiante**
Bloquear mínimo 90 minutos al día en el calendario para trabajo de Fix & Flip, sin excepciones.

**🧠 Cómo conecta con el método**
Sin tiempo dedicado, las 63 tareas se acumulan y nunca se completan. El bloque diario es la diferencia entre "estoy estudiando Fix & Flip" y "estoy CONSTRUYENDO mi negocio de Fix & Flip". Estudiantes con bloque diario completan el programa en 6-9 meses. Sin bloque, abandonan en mes 3.

**🌐 Herramientas**
- **Google Calendar** → https://calendar.google.com
- **Apple Calendar**
- **Outlook**
- **Calendly** para bloquear automático
- **Toggl Track** → https://toggl.com (medir tiempo real)
- **Forest App** → https://www.forestapp.cc (bloquear distracciones)

**📋 Sugerencias de bloques según situación:**
```
TRABAJADOR FULL-TIME 9-5:
- 6:00 AM - 7:30 AM: Antes del trabajo (recomendado)
- 9:00 PM - 10:30 PM: Después de la cena
- Sábado/Domingo 8:00 AM - 11:00 AM: Bloque largo

ENTREPRENEUR / FREELANCER:
- 8:00 AM - 10:00 AM: Primera cosa de la mañana
- 2:00 PM - 4:00 PM: Después del almuerzo
- Flexible según día

MADRE/PADRE:
- 5:30 AM - 7:00 AM: Antes que los niños se levanten
- 8:30 PM - 10:00 PM: Después que duermen
- Sábado mañana 1 hora dedicada
```

**📋 Reglas del bloque:**
```
□ Mismo horario todos los días (crear hábito)
□ Celular en otro cuarto o silencioso
□ Sin redes sociales
□ Sin email general (solo email del negocio si aplica)
□ Tiene tarea específica al iniciar (no "voy a trabajar en flips")
□ Si se interrumpe, no se compensa con menos tiempo otro día
```

**🪜 Paso a paso**
1. Revisar agenda actual y identificar bloque de 90 min disponible diariamente
2. Bloquearlo en el calendario como "FLIPPING NEGOCIO - NO DISPONIBLE" recurrente todos los días
3. Comunicar a familia/pareja: estos 90 min son sagrados, no se interrumpen
4. Tener lista de tareas pendientes lista la noche anterior (qué se va a trabajar mañana)
5. Trackear durante 30 días con Toggl o app. **Meta: 25 de 30 días cumplidos**

**📦 Entregable**
Bloque diario en calendario + log de cumplimiento 30 días.

**✅ Criterio de cierre**
25 de 30 días cumplidos en el primer mes (83% adherencia mínima).

**⚠️ Riesgos comunes**
- Bloque flexible ("a veces en la mañana, a veces en la noche")
- No comunicar a familia (interrupciones constantes)
- Esperar a "sentir ganas" para trabajar (nunca llegan)

---

### 🎯 Tarea E0.2.3 — Quick Win en semana 1
**Tiempo estimado:** 4-6 horas distribuidos en la semana

**📌 Qué hace el estudiante**
Lograr una victoria pequeña pero tangible en la primera semana del programa para construir momentum.

**🧠 Cómo conecta con el método**
El cerebro humano necesita victorias rápidas para sostener esfuerzo a largo plazo. Si en la semana 1 el estudiante no logra nada visible, su motivación cae 50% en semana 2 y abandona en semana 4. Esta tarea es la primera dopamina del programa.

**📋 Opciones de Quick Win (elegir 1):**

```
OPCIÓN A: PRIMERA OFERTA EN VIVO (más recomendado)
1. Identificar 1 propiedad cualquiera en Zillow en ZIP que te interese
2. Calcular ARV usando comparables Zillow Sold
3. Calcular MAO = ARV × 0.75 − Rehab estimado
4. Enviar una LOI formal al listing agent con tu MAO
5. RESULTADO: Primera oferta enviada en tu carrera

OPCIÓN B: PRIMER WHOLESALER EN BUYER LIST
1. Buscar 3 wholesalers en Facebook Groups locales
2. Enviar mensaje pidiendo ser agregado a buyer list
3. Recibir confirmación + primer deal por email
4. RESULTADO: En 1 buyer list con flujo de deals

OPCIÓN C: PRIMER EVENTO REIA ASISTIDO
1. Buscar tu REIA local en https://nationalreia.org/find-a-reia/
2. Registrarse al próximo evento (usualmente primer evento gratis)
3. Asistir físicamente + recolectar 5 tarjetas
4. RESULTADO: Primera red de contactos del ecosistema

OPCIÓN D: PRIMER HML CONTACTADO + TERM SHEET
1. Identificar 3 HMLs nacionales (Kiavi, Lima One, etc.)
2. Llamar a 1 y entrevistarlo con el script de E2.1.1
3. Pedir term sheet por email
4. RESULTADO: Primer term sheet en tu poder
```

**🌐 Recursos según opción elegida**
- Opción A: Zillow + LOI template de E1.4.1
- Opción B: Facebook Groups de tu ciudad + script E2.3.2
- Opción C: https://nationalreia.org/find-a-reia/ + https://www.meetup.com
- Opción D: https://www.kiavi.com, https://www.limaone.com + script E2.1.1

**🪜 Paso a paso**
1. Elegir 1 opción (la que más resuena o la más alcanzable)
2. Bloquear 4-6 horas distribuidas en la semana 1 para ejecutarla
3. Completar la acción con resultado tangible (oferta enviada, en buyer list, evento asistido, term sheet recibido)
4. **Documentar la victoria** en Taskade con screenshot/foto/captura como evidencia
5. **Compartir con coach y comunidad** del programa — la celebración multiplica el momentum

**📦 Entregable**
Quick Win documentado en Taskade con evidencia (screenshot, foto, email).

**✅ Criterio de cierre**
Quick Win completado y compartido antes de iniciar E1 formalmente.

**⚠️ Riesgos comunes**
- Saltarse el Quick Win por "ir directo a lo serio"
- No documentar (se pierde el efecto motivacional)
- No compartir con nadie (sin refuerzo social)

---

## Punto Clave 0.3 — Setup Operativo Inicial

---

### 🎯 Tarea E0.3.1 — Setup completo del portal Taskade
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Configurar el portal de Taskade con la estructura del programa lista para cargar tareas y entregables.

**🧠 Cómo conecta con el método**
Sin sistema de organización, los documentos se dispersan en email, Drive, WhatsApp y se pierden. Taskade centralizado = todo en un lugar = ejecución más rápida y revisión por coach más efectiva.

**🌐 Recursos**
- Acceso a Taskade del programa FlipMentoría (provisto por el coach)
- **Tutorial Taskade básico** → https://www.taskade.com/help

**📋 Estructura de carpetas a crear:**
```
📁 [Mi Nombre] — FlipMentoría
  📁 E0_Fundación
    📁 Documentos Legales (LLC, EIN, OA)
    📁 Banco y Contabilidad
    📁 Mindset (Big Why)
  📁 E1_Evaluar
    📁 Buy Box (Renta y Venta)
    📁 Investigación de Mercado
    📁 Comparables y ARV
    📁 Ofertas Enviadas
  📁 E2_Estructurar
    📁 HMLs y Capital
    📁 Eventos y Networking
    📁 Wholesalers
    📁 General Contractors
    📁 Permisos y Regulación
    📁 SOW y Renovación
  📁 E3_Ejecutar
    📁 [Por cada deal: Bitácoras semanales, Fotos, Budget Tracker]
  📁 E4_Estrategia_Salida
    📁 [Por cada deal: Listing, Marketing, Closing]
  📁 E5_Escalar
    📁 SOPs del Negocio
    📁 Post-Mortems
    📁 Plan Anual
  📁 Equipo
    📁 CPA y Abogado
    📁 GC primario y backup
    📁 HML primario y backup
    📁 Wholesalers activos
    📁 Agente listing
  📁 Recursos Generales
    📁 Templates
    📁 Calculadoras
    📁 Educación Continua
```

**🪜 Paso a paso**
1. Acceder al portal Taskade del programa con credenciales del coach
2. Crear la estructura de carpetas arriba (replicarla exacta para que coach navegue fácil)
3. Subir documentos de E0 ya completados: Certificate of Formation, EIN letter, Operating Agreement, Big Why
4. Personalizar perfil con foto profesional + bio corta + teléfono + email
5. Verificar acceso del coach al portal + agendar primera revisión semanal

**📦 Entregable**
Portal Taskade configurado con estructura completa + documentos iniciales subidos.

**✅ Criterio de cierre**
Coach puede navegar el portal y validar entregables.

**⚠️ Riesgos comunes**
- No usar Taskade y dispersar todo en otras apps
- No subir documentos (solo crear carpetas vacías)
- No invitar al coach al portal

---

### 🎯 Tarea E0.3.2 — Stack de herramientas básico activo
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Activar las herramientas básicas que se usarán en todo el programa.

**🧠 Cómo conecta con el método**
Cada tarea de E1-E5 asume herramientas específicas. Tenerlas todas listas el día 1 ahorra horas de fricción a lo largo del programa.

**📋 Stack mínimo recomendado:**

```
ANÁLISIS DE DEALS:
□ Zillow account → https://www.zillow.com (gratis)
□ Redfin account → https://www.redfin.com (gratis)
□ Realtor.com account → https://www.realtor.com (gratis)
□ BiggerPockets account → https://www.biggerpockets.com (gratis básico)
□ Rentometer → https://www.rentometer.com (5 búsquedas free)

NETWORKING:
□ LinkedIn perfil profesional actualizado
□ Facebook activo para Groups locales
□ Meetup → https://www.meetup.com (gratis)
□ Eventbrite → https://www.eventbrite.com (gratis)

COMUNICACIÓN:
□ Email profesional (puede ser Gmail con firma profesional)
□ WhatsApp Business → https://business.whatsapp.com
□ Calendly para agendar → https://calendly.com (free plan)

PRODUCTIVIDAD:
□ Google Drive o Dropbox para archivos pesados
□ Canva → https://www.canva.com (gratis) para visuales
□ Google Sheets / Excel para calculadoras
□ Loom → https://www.loom.com (videos rápidos)

OPCIONAL PERO RECOMENDADO:
□ PropStream trial → https://www.propstream.com (datos off-market)
□ DealMachine trial → https://www.dealmachine.com (driving for dollars)
```

**🪜 Paso a paso**
1. Crear cuenta en todas las plataformas gratis arriba
2. Configurar perfil profesional consistente: foto, bio, contacto
3. Crear firma de email profesional con: nombre, LLC, teléfono, link a Calendly
4. Conectar Calendly con calendario para agendamiento automático
5. Documentar credenciales en password manager (1Password, LastPass, Bitwarden)

**📦 Entregable**
Stack de herramientas activo + credenciales guardadas en password manager.

**✅ Criterio de cierre**
Acceso funcional a todas las herramientas + perfiles profesionales consistentes.

**⚠️ Riesgos comunes**
- No usar las herramientas después de crearlas
- Credenciales sin password manager (pierde acceso)
- Perfiles inconsistentes entre plataformas

---

*Fin Etapa E0 — Fundación · Base legal, financiera y mental antes de entrar a E1*
$FM1L7OF6$,
  10,
  ARRAY['LLC', 'EIN', 'banco', 'contabilidad', 'CPA', 'mindset', 'BigWhy']::text[],
  '{}'::jsonb
);

-- ─── E1 · tareas · 🔍 E1 · Evaluar — 17 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E1',
  'tareas',
  null,
  $FMAJFDNI$🔍 E1 · Evaluar — 17 tareas$FMAJFDNI$,
  $FMAJFDNI$Análisis profundo del mercado y la propiedad$FMAJFDNI$,
  $FMAJFDNI$# 🔍 ETAPA E1 — EVALUAR
**Análisis profundo del mercado y la propiedad**

> El estudiante termina E1 con criterio claro de DÓNDE invertir, QUÉ comprar y A QUÉ PRECIO, validado con datos reales y mínimo 10 ofertas enviadas.

---

## Punto Clave 1.1 — Definir el Buy Box

---

### 🎯 Tarea E1.1.1 — Construir 5 Buy Box para estrategia de RENTA
**Tiempo estimado:** 6-8 horas

**📌 Qué hace el estudiante**
Construir 5 perfiles de propiedad ideal para renta, cada uno en un ZIP Code distinto, con criterios numéricos claros que filtren cualquier propiedad en menos de 30 segundos.

**🧠 Cómo conecta con el método**
El Buy Box es el filtro #1 de toda la metodología. Sin Buy Box, el estudiante analiza propiedades al azar y pierde tiempo. Con Buy Box, cada propiedad se filtra rápido: entra o no entra.

**🌐 Recursos nacionales**
- **Zillow** → https://www.zillow.com — datos de mercado, precios medianos
- **Redfin** → https://www.redfin.com — datos vendidos, DOM
- **Rentometer** → https://www.rentometer.com — rentas comparables por ZIP
- **AirDNA** → https://www.airdna.co — para modelo Airbnb (si aplica)
- **PadSplit Map** → https://www.padsplit.com — para modelo room-by-room
- **Furnished Finder** → https://www.furnishedfinder.com — para modelo corporate housing
- Portal de Taskade del estudiante

**🪜 Paso a paso**
1. Abrir Taskade y crear documento "Buy Box Renta — [Nombre del Estudiante]"
2. Definir 5 ZIP Codes objetivo en tu mercado (priorizar zonas A/B con demanda de renta)
3. Para cada ZIP, llenar los 5 componentes: (a) estrategia (tradicional / coliving / Airbnb / corporate / sober / room-by-room), (b) presupuesto máximo, (c) métricas (cash-on-cash ≥ 8%, cap rate ≥ 6%), (d) tipo (SFH / duplex / multifamiliar), (e) hab/baños/sqft mínimos
4. Validar en Zillow + Redfin (precio mediano, DOM) y Rentometer/AirDNA (renta esperada). Si renta no cubre 1% del precio mensual, cambiar ZIP
5. Justificar el modelo de renta por escrito con datos del mercado y screenshot de la fuente

**📦 Entregable**
5 Buy Box completos (1 por ZIP) + screenshots de validación, descargable en PDF.

**✅ Criterio de cierre**
Cada Buy Box tiene los 5 componentes + ZIP + modelo justificado con datos.

**⚠️ Riesgos comunes**
- Elegir ZIPs solo por "intuición" sin validar números
- Mezclar criterios de renta tradicional con Airbnb (son negocios distintos)
- Definir Buy Box demasiado amplio (todo es deal, nada es deal)

---

### 🎯 Tarea E1.1.2 — Construir 5 Buy Box para estrategia de VENTA (Fix & Flip)
**Tiempo estimado:** 6-8 horas

**📌 Qué hace el estudiante**
Construir 5 perfiles de propiedad ideal para Fix & Flip, cada uno en un ZIP Code distinto, con ARV objetivo y MAO calculados.

**🧠 Cómo conecta con el método**
Renta y venta son negocios distintos con criterios distintos. El Buy Box de venta exige ARV alto, DOM bajo y demanda fuerte de compradores finales.

**🌐 Recursos**
- **Zillow** → https://www.zillow.com (filtrar: Sold + Last 6 months)
- **Redfin** → https://www.redfin.com (filtrar: Sold + Last 90 days)
- **Realtor.com** → https://www.realtor.com
- Portal de Taskade

**🪜 Paso a paso**
1. Crear documento "Buy Box Venta — [Estudiante]"
2. Elegir 5 ZIP Codes (priorizar zonas A y B con alta demanda de compradores finales)
3. Por ZIP definir: ARV objetivo (basado en 3 flips vendidos recientes), MAO (ARV × 75% − Rehab), margen mínimo ≥ 20%, DOM máximo (≤ 60 días ideal), perfil del comprador (familia, joven profesional, inversor)
4. En Zillow/Redfin buscar 3 flips vendidos recientemente por ZIP (filtrar "Sold last 6 months" + descripción que mencione "renovated/updated"). Guardar links como evidencia
5. Documentar Buy Box completo con justificación del margen mínimo y screenshots de los 3 flips referencia

**📦 Entregable**
5 Buy Box de venta, cada uno con ARV referenciado a 3 comparables reales.

**✅ Criterio de cierre**
Cada Buy Box tiene ARV objetivo, MAO calculado, margen ≥ 20% y 3 comparables.

**⚠️ Riesgos comunes**
- Usar ARV optimista del mejor comparable (siempre usar el conservador)
- No considerar costos de holding al calcular margen
- Elegir ZIPs con DOM > 90 días (matan el margen)

---

### 🎯 Tarea E1.1.3 — Lista de 20 características que SÍ quiere
**Tiempo estimado:** 1-2 horas

**📌 Qué hace el estudiante**
Lista de 20 características positivas que debe tener una propiedad para entrar en el Buy Box.

**🧠 Cómo conecta con el método**
Definir lo que SÍ se quiere acelera la decisión. Cuando ve 12 de sus 20 características en una casa, sabe que está cerca del Buy Box.

**🌐 Recursos**
- Portal de Taskade
- Fotos de los 3 flips referencia de E1.1.2

**🪜 Paso a paso**
1. Crear documento "Lista SÍ — Buy Box"
2. **Estructura (5):** cimientos sólidos, techo < 15 años, layout abierto, garaje 2 carros, lot ≥ 5,000 sqft
3. **Distribución (5):** mínimo 3 hab / 2 baños, primary suite, lavadería independiente, primer piso accesible, ventanas grandes
4. **Sistemas (5):** HVAC < 10 años, electrical actualizado (≥ 200 amps), plumbing cobre o PEX, agua municipal, gas o eléctrico moderno
5. **Ubicación (5):** ≤ 1 milla grocery store, escuela ≥ 6/10 GreatSchools, acceso highway < 10 min, sin HOA o HOA < \$50/mes, cerca empleo

**📦 Entregable**
20 puntos numerados con razón breve por qué importa.

**✅ Criterio de cierre**
Lista cubre las 4 dimensiones. Cada punto objetivo y verificable.

**⚠️ Riesgos comunes**
- Lista con puntos subjetivos ("casa bonita")
- No diferenciar entre "deseable" y "indispensable"

---

### 🎯 Tarea E1.1.4 — Lista de 20 características que NO quiere (red flags)
**Tiempo estimado:** 1-2 horas

**📌 Qué hace el estudiante**
Lista de 20 red flags que descalifican una propiedad automáticamente.

**🧠 Cómo conecta con el método**
Foundation issues, septic, flood zone, HOA agresiva → cada uno puede destruir un deal. Protege al estudiante de comprar problemas disfrazados.

**🌐 Recursos nacionales para verificación**
- **FEMA Flood Map** → https://msc.fema.gov/portal/home — flood zones (nacional)
- **County Assessor / Appraisal District** → buscar "[Your County] Property Appraiser" o "[Your County] Assessor" en Google
- **GreatSchools** → https://www.greatschools.org — rating escuelas
- **CrimeGrade** → https://www.crimegrade.org — crimen por ZIP
- **NeighborhoodScout** → https://www.neighborhoodscout.com — datos demográficos
- Portal de Taskade

**🪜 Paso a paso**
1. Crear documento "Lista NO — Buy Box"
2. **Red flags estructurales (5):** foundation grietas > 1/4", techo > 20 años, daño humedad/termitas, drenaje deficiente, pozo/septic system
3. **Red flags legales (5):** liens pendientes (Assessor), permisos vencidos, ADUs no permitidas, code violations activas, propiedad en trust o probate complicado
4. **Red flags ubicación (5):** flood zone A/AE/V (FEMA), zonificación incorrecta, vecindario rating < C, escuelas ≤ 3/10, crimen rating D o F
5. **Red flags financieros (5):** HOA > \$300/mes, taxes > 2.5% del valor anual, > 3 bajadas de precio en MLS, listada > 180 días, vendedor con expectativa fuera de mercado

**📦 Entregable**
20 red flags numerados con razón y herramienta para verificar cada uno.

**✅ Criterio de cierre**
Los 4 grupos completos + cada red flag con fuente para verificarlo.

**⚠️ Riesgos comunes**
- No verificar flood zone (riesgo alto en muchas áreas USA)
- Comprar en zona C sin saber que era zona C

---

### 🎯 Tarea E1.1.5 — Versión resumida del Buy Box (elevator pitch)
**Tiempo estimado:** 1 hora

**📌 Qué hace el estudiante**
Reducir Buy Box a 1 página, explicable en < 1 minuto, lista para enviar a contactos.

**🧠 Cómo conecta con el método**
El estudiante necesita compartir Buy Box con wholesalers, realtors, HMLs, inversores. Versión resumida = herramienta de networking más importante de E2.

**🌐 Recursos**
- Portal de Taskade
- Versión exportable a PDF (1 página)

**🪜 Paso a paso**
1. Crear "Buy Box Resumen — Pitch"
2. **Template:**
   ```
   📍 Mercado: [Ciudad, ZIP Codes 1-5]
   💰 Rango precio: \$[X] - \$[Y]
   🏠 Tipo: [SFH / Duplex / Multifamiliar]
   🛏️ Mínimo: [#] hab / [#] baños / [#] sqft
   🔧 Condición: [Ligera / Media / Pesada — qué SÍ acepta]
   🎯 Estrategia: [Fix & Flip / Fix & Hold / Coliving / Airbnb]
   ⚡ Cierro en: [14-21 días] / Cash o HML
   📞 Contacto: [Nombre, teléfono, email]
   ```
3. Hacer 1 versión para renta y 1 para venta
4. Practicar en voz alta hasta poder leerlo en < 60 segundos
5. Exportar a PDF en carpeta "Pitch — Listo para enviar"

**📦 Entregable**
2 documentos PDF (1 renta, 1 venta) de máximo 1 página cada uno.

**✅ Criterio de cierre**
Cada pitch incluye los 6 datos esenciales y se explica en < 1 minuto.

**⚠️ Riesgos comunes**
- Pitch demasiado largo (más de 1 página)
- No incluir el "cómo cierro" (cash, HML, días)

---

## Punto Clave 1.2 — Investigación de Mercado

---

### 🎯 Tarea E1.2.1 — Investigación de mercado profunda por ZIP
**Tiempo estimado:** 4-5 horas por ZIP (20-25h total)

**📌 Qué hace el estudiante**
Informe por cada uno de los 5 ZIPs con datos reales del comportamiento del mercado últimos 12 meses.

**🧠 Cómo conecta con el método**
El Buy Box dice DÓNDE y QUÉ. La investigación responde: ¿este mercado tiene velocidad y rentabilidad? Sin esta tarea el estudiante puede tener Buy Box bonito pero con ZIP que tarda 180 días vender.

**🌐 Recursos nacionales**
- **Zillow Research** → https://www.zillow.com/research (datos tendencias)
- **Redfin Data Center** → https://www.redfin.com/news/data-center (DOM, sale-to-list)
- **Realtor.com Market Trends** → https://www.realtor.com/research/data
- **NeighborhoodScout** → https://www.neighborhoodscout.com — datos demográficos
- **U.S. Census Quick Facts** → https://www.census.gov/quickfacts
- Portal de Taskade

**🪜 Paso a paso**
1. Abrir Zillow → buscar ZIP → click "Sold" + filtrar "Last 12 months" → exportar o screenshot de datos clave
2. Calcular en hoja de cálculo Taskade: (a) DOM promedio, (b) precio/sqft promedio, (c) tendencia precios mes a mes 12 meses, (d) absorción mensual (vendidas / activas), (e) sale-to-list ratio
3. Cruzar con Redfin Data Center para validar + perfil del comprador (cash vs financed) en NeighborhoodScout
4. Documentar "Investigación de Mercado — ZIP [#####]" con 1 página por ZIP + screenshots
5. **Regla decisión:** Si ZIP muestra DOM > 90 días o tendencia bajista 3+ meses, ajustar Buy Box

**📦 Entregable**
5 informes (1 por ZIP) con: DOM, precio/sqft, absorción, tendencia 12 meses, sale-to-list, perfil comprador + screenshots.

**✅ Criterio de cierre**
Cada informe tiene 6 datos mínimos + fuentes verificables. Buy Box ajustado si algún ZIP no cumple.

**⚠️ Riesgos comunes**
- Mirar solo precio mediano sin DOM
- No verificar tendencia (puede estar en mercado bajista)
- Confiar en data de > 6 meses

---

### 🎯 Tarea E1.2.2 — Calificación A/B/C del ZIP en 5 variables
**Tiempo estimado:** 2 horas por ZIP (10h total)

**📌 Qué hace el estudiante**
Calificar cada ZIP en 5 variables: crimen, escuelas, transporte, desarrollo futuro, empleo/comercio.

**🧠 Cómo conecta con el método**
Un ZIP con buenos números puede tener malos fundamentos. Esta tarea separa ZIPs A (premium), B (clase media) y C (entry-level), lo cual define qué comprador habrá y a qué precio se vende.

**🌐 Recursos nacionales**
- **Niche.com** → https://www.niche.com — overview ZIP
- **CrimeGrade** → https://www.crimegrade.org — calificación crimen
- **GreatSchools** → https://www.greatschools.org — rating escuelas
- **City-Data** → https://www.city-data.com — datos económicos
- **Walk Score** → https://www.walkscore.com — accesibilidad
- **U.S. Bureau of Labor Statistics** → https://www.bls.gov — empleo por área
- Portal de Taskade

**🪜 Paso a paso**
1. Abrir los 5 sitios y revisar cada ZIP en las 5 variables
2. Crear matriz en Taskade: 5 columnas (variables) × 5 filas (ZIPs)
3. Asignar A/B/C con justificación 2-3 líneas + screenshot. **Reglas:** A = top 25%, B = 50% medio, C = bottom 25%
4. Asignar calificación final: 3+ variables A → ZIP A; 3+ variables B → ZIP B; resto → ZIP C
5. Identificar comprador/inquilino por ZIP: A → familias estables, profesionales / B → familias clase media / C → renta entry-level, coliving, room-by-room

**📦 Entregable**
Matriz con 5 ZIP × 5 variables + clasificación A/B/C + screenshots.

**✅ Criterio de cierre**
Cada celda con justificación + screenshot. Clasificación coherente con datos.

**⚠️ Riesgos comunes**
- Calificar por intuición sin fuentes
- No alinear clasificación con estrategia

---

### 🎯 Tarea E1.2.3 — Visita física al ZIP Code (drive-through)
**Tiempo estimado:** 2-3 horas por ZIP (6-9h total)

**📌 Qué hace el estudiante**
Manejar por mínimo 3 de los 5 ZIPs en 2 horarios distintos (día/noche) y documentar con fotos y notas.

**🧠 Cómo conecta con el método**
Los números cuentan una historia, la calle cuenta otra. Esta visita es la validación cualitativa que ningún dataset reemplaza. Diferencia entre inversor de spreadsheet y inversor real.

**🌐 Recursos**
- Google Maps para planear ruta → https://www.google.com/maps
- Celular con cámara
- Portal de Taskade
- App de notas

**🪜 Paso a paso**
1. Planear ruta por 3 ZIPs en 2 horarios (día laboral 10am-12pm y noche/fin semana 6pm-8pm)
2. **Lista durante drive-through:** (a) mantenimiento de casas, (b) comercio activo, (c) tráfico y ruido, (d) presencia de niños/familias en parques, (e) basura, casas abandonadas, grafiti
3. Tomar 5-10 fotos por ZIP
4. Subir al portal "Field Notes — ZIP [#####]" con etiquetas
5. Escribir 1 página por ZIP con observaciones y comparación con lo visto en Zillow

**📦 Entregable**
Notas de campo (1 página por ZIP) + galería de 5-10 fotos por ZIP.

**✅ Criterio de cierre**
3 ZIPs visitados en 2 horarios cada uno + notas y fotos cargadas.

**⚠️ Riesgos comunes**
- Visitar solo de día
- No bajarse del carro en zonas seguras
- No comparar fotos con imagen vendida en Zillow

---

### 🎯 Tarea E1.2.4 — Identificar zonas A, B y C de la ciudad
**Tiempo estimado:** 2 horas

**📌 Qué hace el estudiante**
Mapa de la ciudad objetivo con zonas A/B/C clasificadas + estrategia por zona.

**🧠 Cómo conecta con el método**
Zona A → Fix & Flip premium. Zona B → Fix & Hold tradicional. Zona C → coliving, room-by-room, PadSplit. Sin este mapa el estudiante aplica misma estrategia a todos los ZIPs y pierde rentabilidad.

**🌐 Recursos**
- Mapa de la ciudad (Google Maps o impreso)
- Datos de E1.2.1, E1.2.2, E1.2.3
- **Buscar "[Your City] demographic map" o "[Your City] zoning map"** en Google
- Portal de Taskade

**🪜 Paso a paso**
1. Imprimir o capturar mapa de la ciudad en alta resolución
2. Marcar con colores: verde (A), amarillo (B), rojo (C) según datos previos
3. Por cada zona escribir 3 razones objetivas con cita de fuente
4. **Asignar estrategia por zona:**
   - **Zona A:** Fix & Flip premium (\$400K-\$800K ARV), Fix & Hold corporate housing
   - **Zona B:** Fix & Flip mid-market (\$250K-\$400K ARV), Fix & Hold tradicional, BRRRR
   - **Zona C:** Coliving, room-by-room, PadSplit, Affordable Housing, sober living
5. Subir al portal "Mapa de Zonas — [Ciudad]" con leyenda y notas

**📦 Entregable**
Mapa con zonas A/B/C + documento con justificación y estrategia por zona.

**✅ Criterio de cierre**
Cada zona con 3 razones objetivas + estrategia coherente.

**⚠️ Riesgos comunes**
- Misma estrategia a zonas A y C
- No actualizar mapa cuando el mercado cambia (revisar cada 6 meses)

---

## Punto Clave 1.3 — Análisis de Comparables y ARV

---

### 🎯 Tarea E1.3.1 — Analizar 10 casas comparables por ZIP Code
**Tiempo estimado:** 30-45 min por casa (25-35h total para 50 casas)

**📌 Qué hace el estudiante**
Por cada uno de los 5 ZIPs, analizar 10 comparables vendidas últimos 180 días → 50 análisis totales.

**🧠 Cómo conecta con el método**
El ARV es el número más importante del Fix & Flip. Entrena el ojo del estudiante: ver una casa y saber sin calcular en cuánto se vende remodelada.

**🌐 Recursos**
- **Zillow Sold filter** → https://www.zillow.com (Recently Sold + filters)
- **Redfin Sold filter** → https://www.redfin.com (Sold + Last 6 months)
- Hoja de cálculo dentro de Taskade
- **Filtros estrictos:** vendida ≤ 180 días, ≤ 1 milla del target, mismo tipo, ± 20% sqft, ± 1 hab

**🪜 Paso a paso**
1. En Zillow filtrar ZIP: vendidas últimos 180 días, mismo tipo, hab/baños similares. Mínimo 15 candidatos por ZIP → quedan los 10 mejores
2. **Por cada comparable verificar 3 filtros estrictos:** ≤180 días, ≤1 milla, mismo tipo. Si no cumple los 3 → descartar
3. Documentar en hoja "Comparables — ZIP [#####]": dirección, fecha venta, precio, sqft, hab/baños, condición (remodelada/parcial/original), \$/sqft, link Zillow
4. Marcar características que aumentaron valor: kitchen renovada, baños nuevos, pisos LVP/madera, ADU, garaje, lot grande, primary suite
5. Calcular **\$/sqft promedio ponderado** del ZIP (peso mayor a los más recientes) — dato maestro del ZIP

**📦 Entregable**
"Comparables por ZIP" con 50 registros (10 por cada ZIP) + \$/sqft promedio.

**✅ Criterio de cierre**
Mínimo 8 de cada 10 comparables cumplen 3 filtros estrictos. Cada ZIP con \$/sqft promedio.

**⚠️ Riesgos comunes**
- Comparables de > 6 meses (el mercado cambia rápido)
- Comparar SFH con duplex (mercados distintos)
- No filtrar por condición

---

### 🎯 Tarea E1.3.2 — Calcular ARV (conservador + optimista)
**Tiempo estimado:** 20-30 min por casa (15-25h total para 50 ARVs)

**📌 Qué hace el estudiante**
Calcular ARV de cada una de las 50 casas usando los comparables, generando escenario conservador y optimista.

**🧠 Cómo conecta con el método**
El ARV no es un número, son dos: peor caso y mejor caso. Conservador protege en negociación; optimista guía la estrategia de remodelación.

**🌐 Recursos**
- Comparables de E1.3.1 cargados
- Hoja de cálculo en Taskade
- **Fórmula maestra:**
  - ARV base = \$/sqft promedio × sqft de la propiedad target ± ajustes
  - ARV conservador = ARV base × 0.95
  - ARV optimista = ARV base × 1.05

**🪜 Paso a paso**
1. Tomar 3 mejores comparables por propiedad (más cercanos en sqft, hab/baños, ubicación, fecha)
2. Calcular \$/sqft promedio ponderado de esos 3 → multiplicar por sqft de la propiedad target = **ARV base**
3. **Ajustes por diferencias** (sumar o restar):
   - +\$15K-25K por baño adicional
   - +\$10K-20K por garaje doble
   - +\$25K-50K por ADU
   - ±\$/sqft por diferencia de lot > 30%
4. **ARV conservador** = ARV base × 0.95 // **ARV optimista** = ARV base × 1.05
5. Documentar: 3 comparables usados, ARV base, ajustes, ARV conservador y optimista

**📦 Entregable**
50 ARVs documentados (conservador + optimista) con desglose de comparables y ajustes.

**✅ Criterio de cierre**
Cada ARV usa mínimo 3 comparables + ajustes documentados.

**⚠️ Riesgos comunes**
- Usar ARV optimista para ofertar (siempre usar conservador)
- No ajustar por diferencias significativas
- Ignorar fecha de venta de comparables

---

### 🎯 Tarea E1.3.3 — Estimar remodelación por nivel
**Tiempo estimado:** 15-20 min por casa (12-17h total para 50 estimaciones)

**📌 Qué hace el estudiante**
Estimar costo de remodelación de cada una de las 50 propiedades clasificando: ligera, media o pesada.

**🧠 Cómo conecta con el método**
Sin costo de remodelación no hay MAO. Entrena al estudiante a leer una propiedad y estimar rehab con margen razonable antes de tener contratista.

**🌐 Recursos nacionales**
- Fotos de Zillow/Redfin de cada propiedad
- **Rangos de costo por nivel (USA 2026 — varía por mercado):**
  - **Mercados de costo bajo (Texas, Florida, Georgia, Carolinas):**
    - Ligera: \$15-30/sqft
    - Media: \$30-55/sqft
    - Pesada: \$55-90/sqft
  - **Mercados de costo medio (Arizona, Tennessee, Ohio, Indiana):**
    - Ligera: \$20-35/sqft
    - Media: \$35-65/sqft
    - Pesada: \$65-100/sqft
  - **Mercados de costo alto (California, NY, Washington, Massachusetts):**
    - Ligera: \$30-50/sqft
    - Media: \$50-90/sqft
    - Pesada: \$90-150/sqft
- **Home Depot Pro Desk** → https://www.homedepot.com/c/PRO_Services
- **Lowe's Pro** → https://www.lowes.com/l/Pro/pros.html
- **RSMeans Construction Cost Data** → https://www.rsmeans.com (referencia profesional por ciudad)
- Portal de Taskade

**🪜 Paso a paso**
1. Revisar fotos de cada propiedad en Zillow/Redfin y clasificar nivel: ligera/media/pesada
2. **Desglosar por categoría con rangos:**
   - Cocina: \$8K-25K (ligera) / \$25K-50K (media) / \$50K-80K (pesada)
   - Baños: \$5K-12K cada uno según nivel
   - Pisos: \$4-8/sqft (LVP) / \$6-15/sqft (madera ingenierada)
   - HVAC: \$7K-15K (sistema nuevo completo)
   - Techo: \$8K-20K (según material y sqft)
   - Exterior + paint: \$5K-15K
3. Calcular total: sqft × precio del nivel + extras (ADU, foundation, roof completo). **Ajustar por mercado local**
4. Agregar contingencia mental: ligera +10%, media +12%, pesada +15%
5. Documentar rango (\$low - \$high), nivel asignado y justificación

**📦 Entregable**
50 estimaciones con desglose por categoría y rango.

**✅ Criterio de cierre**
Cada estimación con nivel + desglose + rango + justificación basada en fotos.

**⚠️ Riesgos comunes**
- Subestimar problemas estructurales no visibles
- No considerar permisos y trade work obligatorio
- Usar precios genéricos en vez del mercado local

---

### 🎯 Tarea E1.3.4 — Aplicar la Regla del 75% (MAO)
**Tiempo estimado:** 5-10 min por casa (4-8h total para 50 MAO)

**📌 Qué hace el estudiante**
Calcular el MAO (Maximum Allowable Offer) de cada propiedad usando: **MAO = ARV × 0.75 − Rehab**.

**🧠 Cómo conecta con el método**
El MAO es el número que el estudiante lleva a negociación. Sin MAO negocia con emoción; con MAO negocia con disciplina.

**🌐 Recursos**
- ARV conservador de E1.3.2
- Costo de remodelación de E1.3.3
- Precio de lista actual (Zillow)
- Hoja de cálculo en Taskade

**🪜 Paso a paso**
1. Tomar **ARV conservador** (no el optimista) de E1.3.2
2. Multiplicar por 0.75 (Regla del 75% — incluye margen + holding + closing)
3. Restar costo de remodelación de E1.3.3 (usar extremo alto del rango para protegerse)
4. **MAO = ARV conservador × 0.75 − Rehab (extremo alto)**
5. Comparar MAO con precio de lista → identificar gap. Marcar como **DEAL NEGOCIABLE** donde MAO ≥ precio o gap ≤ 10%

**📦 Entregable**
Tabla con 50 MAO + comparación vs precio lista + 10+ propiedades marcadas como negociables.

**✅ Criterio de cierre**
Mínimo 10 propiedades identificadas como negociables.

**⚠️ Riesgos comunes**
- Usar ARV optimista (inflates el MAO)
- Usar extremo bajo del rehab (subestima costos)
- No identificar propiedades negociables

---

## Punto Clave 1.4 — Ofertas y Negociación

---

### 🎯 Tarea E1.4.1 — Enviar mínimo 10 ofertas formales al mes
**Tiempo estimado:** 30-45 min por oferta (5-8h por 10 ofertas)

**📌 Qué hace el estudiante**
Enviar mínimo 10 ofertas formales al mes basadas en MAO calculado.

**🧠 Cómo conecta con el método**
La mayoría de estudiantes se queda en evaluación y nunca oferta. Sin ofertas no hay deals. 10 ofertas/mes = cerrar 1 deal cada 30-60 días.

**🌐 Recursos**
- **LOI templates en BiggerPockets** → https://www.biggerpockets.com (sección Forms)
- **State Real Estate Commission forms** → cada estado tiene su Realtor Association con contratos oficiales (ej. Texas TREC, Florida FAR, California CAR)
- **Proof of Funds (POF)** → del HML pre-aprobado de E2.1.5
- Email del estudiante

**📝 LOI Template (universal, adaptar a tu estado):**
```
LETTER OF INTENT TO PURCHASE REAL ESTATE

Date: [Fecha]
Property Address: [Dirección completa]

Buyer: [Nombre LLC o personal]
Seller: [Nombre del vendedor]

Purchase Price: \$[MAO]
Earnest Money: \$[\$1,000 - \$5,000]
Closing Date: [Máximo 21-30 días desde aceptación]
Financing: [Cash / Hard Money Lender pre-approved]
Inspection Period: 7-10 days
Contingencies: Title clear, no liens

This is a non-binding letter of intent. A formal purchase 
agreement will follow upon acceptance.

Signed: [Nombre + firma]
Contact: [Email + teléfono]
```

**🪜 Paso a paso**
1. De las propiedades marcadas como negociables en E1.3.4, seleccionar 10 más atractivas del mes (mayor margen, mejor ZIP, mejor pain del vendedor)
2. Preparar LOI por cada propiedad con MAO + adjuntar Proof of Funds del HML
3. Enviar por escrito al listing agent (si MLS) o al wholesaler (si off-market). Email con asunto: "Cash Offer — [Dirección] — Quick Close"
4. Documentar log "Ofertas Enviadas — [Mes]" con: propiedad, MAO, fecha, canal, respuesta esperada, screenshot del email
5. Mantener log actualizado semanalmente con estado de cada oferta

**📦 Entregable**
Log "Ofertas Enviadas — [Mes]" con 10 ofertas + MAO + fecha + screenshot + LOI adjunto.

**✅ Criterio de cierre**
10 ofertas enviadas en el mes, cada una con MAO documentado, prueba de envío y fecha.

**⚠️ Riesgos comunes**
- Ofertar sin proof of funds (90% se rechazan)
- Ofertar sin closing rápido (la velocidad es el principal diferenciador)
- Esperar respuesta antes de ofertar la siguiente (paralelizar siempre)

---

### 🎯 Tarea E1.4.2 — Negociar activamente cada oferta
**Tiempo estimado:** 1-2h por negociación

**📌 Qué hace el estudiante**
Negociar activamente cada oferta enviada, mínimo 2 contra-ofertas por deal antes de cerrar o descartar.

**🧠 Cómo conecta con el método**
Oferta enviada y olvidada = plata perdida. La negociación es donde se gana el margen real.

**🌐 Recursos**
- Email y teléfono del vendedor o su agente
- MAO calculado y walking number (MAX absoluto)
- Comparables de E1.3.1
- Portal de Taskade

**📝 Scripts:**

**Cuando llega contra-oferta sobre el MAO:**
```
"Thank you for your counter. After running the numbers with 
our contractors and comparables in [ZIP], the maximum we can 
offer is \$[MAO]. This accounts for \$[Rehab] in renovation 
costs and current market conditions where similar properties 
sold at \$[\$/sqft promedio] in the last 90 days.

We can close in 14 days, cash, no inspection contingencies 
if needed. This is our best and final at \$[MAO]. Happy to 
walk through the numbers if helpful."
```

**Cuando el vendedor parece ceder pero quiere "splittear":**
```
"I appreciate the flexibility. Instead of splitting the 
difference, I can offer:
- \$[MAO + \$2K] with closing in 10 days, or
- \$[MAO] with closing in 14 days and we cover all closing costs.

Which works better for your timeline?"
```

**🪜 Paso a paso**
1. Al recibir respuesta del vendedor, **no responder en < 4 horas** — proyecta seriedad
2. Analizar contra-oferta vs MAO: ¿queda dentro del margen? ¿se puede ceder en términos en lugar de precio?
3. Preparar contra-respuesta con justificación basada en datos (comparables, costo reparación, DOM)
4. Documentar cada ronda: oferta inicial, contra-oferta del vendedor, respuesta del estudiante, fecha, tono
5. Cerrar con: SÍ (firmar), NO definitivo (descartar), o seguimiento en 30 días

**📦 Entregable**
Log de negociación con mínimo 2 contra-ofertas documentadas por deal activo.

**✅ Criterio de cierre**
Cada negociación con mínimo 2 rondas + decisión final (aceptada/rechazada/standby).

**⚠️ Riesgos comunes**
- Subir el precio por encima del MAO por "no perder el deal"
- Responder en caliente (siempre esperar mínimo 4 horas)
- No documentar las rondas

---

### 🎯 Tarea E1.4.3 — Identificar el "pain point" del vendedor
**Tiempo estimado:** 30-45 min por deal

**📌 Qué hace el estudiante**
Por cada deal activo, hacer discovery del vendedor para identificar pain point real.

**🧠 Cómo conecta con el método**
El precio no siempre mueve al vendedor. A veces es tiempo, evitar comisiones, no querer reparar, divorcio, herencia. Conocer el pain permite ofertas creativas que ganan deals sin subir precio.

**🌐 Recursos**
- Teléfono o email del vendedor o agente
- Background: MLS history, owner records en County Assessor
- Portal de Taskade

**📝 Script de discovery:**
```
1. "¿Qué los motivó a vender ahora?"
   → Revela: urgencia, divorcio, herencia, downsizing, problemas financieros

2. "¿Cuándo idealmente quieren cerrar?"
   → Revela: timing es prioridad o flexible

3. "¿Qué planean hacer después de vender?"
   → Revela: necesidad de mudanza, plata para otra propiedad

4. "¿Hay algo específico que sea importante para ustedes en esta 
    transacción además del precio?"
   → Revela: post-occupancy, no inspecciones, transparencia, comisiones

5. "¿Han recibido otras ofertas? ¿Cómo se compararon?"
   → Revela: competencia, expectativa real de precio
```

**🪜 Paso a paso**
1. Antes de siguiente ronda de negociación, agendar llamada o intercambio con el vendedor
2. Hacer mínimo 3 preguntas de discovery (script arriba). No interrogar — conversar
3. Identificar pain point dominante: precio / tiempo / certeza / comisiones / reparaciones / mudanza
4. **Ajustar siguiente oferta para atacar el pain:**
   - Pain = tiempo → closing 7-14 días cash
   - Pain = certeza → waive inspection contingency
   - Pain = comisiones → ofertar directo sin agente
   - Pain = mudanza → post-occupancy 30-60 días gratis
   - Pain = reparaciones → "as-is" + closing rápido
5. Documentar discovery en Taskade en ficha del deal

**📦 Entregable**
Ficha de discovery por deal activo con pain identificado y estrategia ajustada.

**✅ Criterio de cierre**
Mínimo 3 preguntas hechas y respondidas + pain identificado + estrategia ajustada.

**⚠️ Riesgos comunes**
- Preguntas como interrogatorio (vendedor se cierra)
- No actuar sobre el pain identificado
- Asumir el pain sin preguntar

---

### 🎯 Tarea E1.4.4 — Documentar resultado de cada oferta
**Tiempo estimado:** 15 min por oferta (2-3h/mes)

**📌 Qué hace el estudiante**
Mantener actualizado semanalmente el estado de cada oferta + reporte mensual con métricas.

**🧠 Cómo conecta con el método**
Sin tracking, el estudiante no sabe qué funciona. Esta tarea genera la data que permite ajustar la estrategia.

**🌐 Recursos**
- Log de ofertas de E1.4.1
- Portal de Taskade
- Calendario para recordatorio semanal

**📊 Métricas clave:**
- **Tasa de respuesta:** ofertas con respuesta / total (target ≥ 50%)
- **Tasa de contra-oferta:** contra-ofertas / total respondidas (target ≥ 30%)
- **Tasa de aceptación:** aceptadas / total enviadas (target ≥ 5-10%)
- **Tiempo promedio cierre:** días desde oferta hasta aceptación

**🪜 Paso a paso**
1. Cada lunes 9am abrir "Ofertas Enviadas" en Taskade (recordatorio en calendario)
2. Actualizar estado: enviada / sin respuesta / contra-oferta / aceptada / rechazada / cerrada
3. Calcular métricas del mes
4. **Identificar patrones:** ¿qué ZIP responde más? ¿qué propiedad acepta MAO? ¿qué canal tiene mejor tasa?
5. Documentar 3 ajustes a aplicar próximo mes basados en data

**📦 Entregable**
Log actualizado semanalmente + reporte mensual con métricas + 3 ajustes propuestos.

**✅ Criterio de cierre**
100% ofertas con estado actualizado + reporte mensual entregado al coach.

**⚠️ Riesgos comunes**
- Saltarse semanas de actualización
- No actuar sobre patrones identificados
- No compartir con coach

---

*Fin Etapa E1 — Evaluar · Sistema enriquecido nacional USA*
$FMAJFDNI$,
  20,
  ARRAY['BuyBox', 'mercado', 'ARV', 'MAO', 'ofertas', 'negociacion', '75rule']::text[],
  '{}'::jsonb
);

-- ─── E2 · tareas · 🏗️ E2 · Estructurar — 26 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E2',
  'tareas',
  null,
  $FMFX1A9D$🏗️ E2 · Estructurar — 26 tareas$FMFX1A9D$,
  $FMFX1A9D$Financiamiento, equipo y plan de renovación$FMFX1A9D$,
  $FMFX1A9D$# 🏗️ ETAPA E2 — ESTRUCTURAR
**Financiamiento, equipo y plan de renovación**

> El estudiante construye la red de contactos operativa: capital, contratistas, wholesalers y conocimiento regulatorio.

---

## Punto Clave 2.1 — Financiamiento (Hard Money Lenders + alternativas)

---

### 🎯 Tarea E2.1.1 — Llamar y entrevistar 10 Hard Money Lenders
**Tiempo estimado:** 45 min por llamada (8-10h por 10 HML)

**📌 Qué hace el estudiante**
Llamar a 10 HML y entrevistarlos para entender términos y construir relación.

**🧠 Cómo conecta con el método**
Sin capital, el deal mejor analizado se pierde. El HML es el motor del Fix & Flip. Esta tarea le da al estudiante un banco de opciones listas para activarse cuando se acepta una oferta en E1.4.

**🌐 HMLs Nacionales (operan en la mayoría de los 50 estados)**

**Top HMLs nacionales 2026:**
- **Kiavi** (antes LendingHome) → https://www.kiavi.com — opera 32+ estados
- **Lima One Capital** → https://www.limaone.com — 40+ estados
- **Visio Lending** → https://www.visiolending.com — 39 estados
- **LendingOne** → https://www.lendingone.com — 46 estados
- **RCN Capital** → https://www.rcncapital.com — 40+ estados
- **Anchor Loans** → https://www.anchorloans.com — 48 estados
- **Civic Financial Services** → https://www.civicfs.com — 40+ estados
- **Renovo Financial** → https://www.renovofinancial.com — Midwest focus
- **Sherman Bridge Lending** → https://www.shermanbridge.com — sur USA
- **Lima One** y **Easy Street Capital** → https://www.easystreetcap.com

**Cómo encontrar HMLs locales en tu mercado:**
- **BiggerPockets Lender Marketplace** → https://www.biggerpockets.com/hard-money-lenders (filtrar por estado)
- **HardMoneyHome** → https://hardmoneyhome.com (directorio por estado)
- **Scotsman Guide HML directory** → https://www.scotsmanguide.com/Profiles/Search
- **Google:** "hard money lender [tu ciudad]" o "[tu ciudad] fix and flip lender"
- **Referidos en REIA local** (E2.2)
- **Facebook Groups:** "Real Estate Investors [tu ciudad]"

**📝 Script de llamada con HML:**
```
"Hi [Name], my name is [Estudiante], real estate investor focused 
on Fix & Flip in [tu ciudad/estado]. I'm building my lender list.

Could you walk me through:
1. Typical LTV and LTC?
2. Interest rate and points?
3. Loan term length and prepayment penalty?
4. Experience required (previous flips)?
5. Closing timeline?
6. Do you fund 100% or need skin in the game?
7. Rehab draw schedule?
8. Pre-approval documents required?

Could you send me a term sheet by email?"
```

**🪜 Paso a paso**
1. Construir lista de 10 HML (mezclar 5 nacionales + 5 locales de tu mercado)
2. Llamar a cada uno con el script. Llamar 9am-12pm para mejor tasa de respuesta
3. Por cada HML documentar ficha: nombre, contacto, % LTV (70-80%), % LTC (90-100%), tasa (10-13% en 2026), puntos (2-4), plazo (6-12 meses), requisitos experiencia, mercados cubiertos
4. Pedir 2 referencias de inversores activos del HML
5. Construir tabla comparativa lado a lado de los 10 HML

**📦 Entregable**
"HML Database" con 10 fichas + tabla comparativa.

**✅ Criterio de cierre**
10 fichas completas con 8 datos mínimos + comparativo.

**⚠️ Riesgos comunes**
- No preguntar fees ocultos
- Solo HML nacionales (los locales suelen ser más flexibles)
- No pedir referencias verificables

---

### 🎯 Tarea E2.1.2 — Solicitar term sheets oficiales
**Tiempo estimado:** 30 min por solicitud + espera

**📌 Qué hace el estudiante**
Solicitar term sheet oficial (PDF) a mínimo 5 HML.

**🧠 Cómo conecta con el método**
Documento legal que respalda los números de la llamada. Tener 5 term sheets permite responder a un deal en 24h con financiamiento real.

**📝 Email template:**
```
Subject: Term Sheet Request — Fix & Flip Investor [Tu Ciudad]

Hi [Name],

Following our call. I'm planning to close 1-2 Fix & Flip deals 
in the next 90 days in [tu mercado].

Could you send your formal term sheet with:
- Interest rate and points
- LTV and LTC
- Loan term and prepayment penalty
- Draw schedule for rehab funds
- Pre-approval documentation required

Looking forward to a long-term relationship.

[Nombre + teléfono + email]
```

**🪜 Paso a paso**
1. Elegir 5 HML con mejores términos para tu Buy Box
2. Enviar email con el template
3. Revisar term sheet línea por línea: tasa, puntos, plazo, prepayment penalty, draw schedule, fees al cierre
4. Archivar los 5 term sheets en carpeta "HML — Term Sheets"
5. Resaltar HML primario candidato y backup candidato

**📦 Entregable**
5 term sheets PDF archivados + comparativo.

**✅ Criterio de cierre**
5 term sheets recibidos + HML primario y secundario identificados.

**⚠️ Riesgos comunes**
- No leer letra pequeña (prepayment penalties, balloon payments)
- Aceptar términos verbales sin documento
- No comparar fees totales al cierre

---

### 🎯 Tarea E2.1.3 — Investigar opciones de Private Money
**Tiempo estimado:** 1h por conversación (5-8h total)

**📌 Qué hace el estudiante**
Mínimo 5 conversaciones con potenciales private money lenders del círculo cercano.

**🧠 Cómo conecta con el método**
Private money cuesta menos que HML (sin puntos, 8-10% vs 12-14%). Mejora margen drásticamente.

**📝 Pitch private money:**
```
1. EL NEGOCIO: "Compro casas que necesitan trabajo, las remodelo 
   y las vendo en 4-6 meses."

2. LA OPORTUNIDAD: "Busco capital privado al 8-10% anual con 
   plazo 6-12 meses, respaldado por la propiedad."

3. PROTECCIÓN: "Tu plata está respaldada por hipoteca de primer 
   gravamen. Si algo sale mal, eres el primero en recuperar."

4. RETORNO: "Si me prestas \$100K al 9%, recibes \$9,000 de 
   intereses al año más tu capital al final del plazo."

5. PROCESO: "Firmas Note + Deed of Trust con tu abogado, 
   te envío estados mensuales, te pago intereses."
```

**🪜 Paso a paso**
1. Lista de 10-15 contactos con capital disponible \$50K+
2. Agendar conversación con mínimo 5: presentar modelo con el pitch
3. Proponer estructura: 6-12 meses al 8-10% anual con 1st lien position
4. Documentar interés: frío / tibio / caliente / comprometido + razón
5. Follow-up cada 30 días con "tibios" y "calientes"

**📦 Entregable**
"Private Money Pipeline" con 5+ contactos clasificados.

**✅ Criterio de cierre**
5 conversaciones documentadas + mínimo 1 "caliente" o "comprometido".

**⚠️ Riesgos comunes**
- Pedir plata antes de mostrar credibilidad
- No explicar protección legal (Note + Deed of Trust)
- Mezclar plata sin estructura legal

---

### 🎯 Tarea E2.1.4 — Evaluar HELOC sobre vivienda principal
**Tiempo estimado:** 3-5 horas

**📌 Qué hace el estudiante**
Evaluar equity disponible y viabilidad de HELOC.

**🧠 Cómo conecta con el método**
HELOC es de los capitales más baratos (Prime + 1-2%). Evaluar con datos, no descartar por desconocimiento.

**🌐 Bancos con HELOC nacionales**
- **Chase** → https://www.chase.com
- **Wells Fargo** → https://www.wellsfargo.com
- **Bank of America** → https://www.bankofamerica.com
- **PNC Bank** → https://www.pnc.com
- **US Bank** → https://www.usbank.com
- **Citizens Bank** → https://www.citizensbank.com
- **PenFed Credit Union** → https://www.penfed.org (nacional, tasas competitivas)
- **Navy Federal** (si elegible) → https://www.navyfederal.org
- **Figure** → https://www.figure.com (HELOC digital, rápida)
- Credit unions locales de tu estado

**📊 Fórmula:**
```
Equity = Valor casa − Balance mortgage
HELOC máxima ≈ Equity × 80%
Costo HELOC 2026 ≈ Prime Rate + 0.5-2% (8-10%)
```

**🪜 Paso a paso**
1. Calcular equity: valor (Zillow + ajuste) − balance mortgage
2. Solicitar cotización a 2 bancos (1 nacional + 1 credit union local)
3. Analizar: tasa, draw period (10 años típico), DTI requirements, fees apertura
4. Comparar HELOC vs HML para deal típico. Ej: \$100K HML 12% por 6m = \$6K vs HELOC 9% por 6m = \$4.5K
5. Documentar decisión: usar / no usar / capital de emergencia

**📦 Entregable**
Evaluación con 2 cotizaciones y decisión justificada.

**✅ Criterio de cierre**
2 cotizaciones + decisión documentada.

**⚠️ Riesgos comunes**
- Usar 100% HELOC en un solo deal (sin reserva)
- No considerar que HELOC pone en riesgo la vivienda principal
- No comparar costo real combinado (HELOC + HML)

---

### 🎯 Tarea E2.1.5 — Elegir HML primario + backup
**Tiempo estimado:** 1-2 horas

**📌 Qué hace el estudiante**
Cerrar selección eligiendo HML primario y secundario + obtener pre-aprobación.

**🧠 Cómo conecta con el método**
Primario + backup garantizan que si primario rechaza, backup activa en 24-48h. La pre-aprobación se adjunta a cada oferta de E1.4.1.

**🪜 Paso a paso**
1. Revisar comparativo de 10 HML y elegir 2 finalistas
2. Filtrar por: cubre tus ZIPs, LTV/LTC competitivo, tasa ≤12%, requisitos cumplibles
3. Segunda llamada con los 2 finalistas para confirmar proceso de pre-aprobación
4. **Solicitar pre-aprobación al HML primario.** Documentos: bank statements 2 meses, credit report, LLC docs, business plan corto
5. Documentar: HML #1 primario + HML #2 backup + carta de pre-aprobación archivada

**📦 Entregable**
Matriz de decisión + carta de pre-aprobación del HML primario.

**✅ Criterio de cierre**
HML primario con pre-aprobación + HML secundario identificado.

**⚠️ Riesgos comunes**
- No tener pre-aprobación cuando llega deal urgente
- Elegir solo por tasa baja (ignorar velocidad de cierre)
- No mantener relación activa con backup

---

## Punto Clave 2.2 — Eventos y Networking de Real Estate

---

### 🎯 Tarea E2.2.1 — Identificar y registrarse a 5 eventos
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Identificar 5 eventos de real estate en tu mercado y registrarse para próximos 60 días.

**🧠 Cómo conecta con el método**
Networking presencial genera 70% de deals reales. HMLs, wholesalers, contratistas se conocen en eventos.

**🌐 Cómo encontrar eventos de real estate en CUALQUIER ciudad USA**

**Paso 1: Encuentra tu REIA local**
- **National REIA Chapter Directory** → https://nationalreia.org/find-a-reia/ (120+ chapters en USA)
- Mapa interactivo: ingresa tu dirección y encuentra REIA más cercano
- Primer meeting usualmente GRATIS

**Paso 2: Plataformas generales (funcionan en cualquier ciudad)**
- **Meetup** → https://www.meetup.com (buscar: "real estate investing [tu ciudad]")
- **Eventbrite** → https://www.eventbrite.com (buscar: "real estate investor [tu ciudad]")
- **Facebook Events** → filtrar por ciudad
- **BiggerPockets Local Meetups** → https://www.biggerpockets.com/events (gratis, en muchas ciudades)

**Paso 3: REIAs específicos por mercado principal (ejemplos)**
- **New York:** REIA NYC (https://reianyc.org), NYREIA
- **Los Angeles:** LA South REIA, LA County REIA
- **Chicago:** Chicago REIA (https://www.chicagoreia.com)
- **Houston:** Greater Houston REIA (https://www.greaterhoustonreia.com)
- **Atlanta:** Atlanta REIA (https://atlantareia.com)
- **Phoenix:** AZREIA (https://azreia.org)
- **Miami:** Miami Real Estate Investor Association
- **Dallas:** Texas REIAs / Dallas REIA (https://reiadallas.com)
- **Boston:** Boston REIA / BostonAREIA
- **Denver:** ICOR Denver
- **Seattle:** Real Estate Association of Puget Sound (REAPS)
- **Tampa/Orlando/Jacksonville:** Florida REIA chapters
- **Las Vegas:** Las Vegas REIA
- **San Antonio:** Alamo REIA

**Paso 4: Eventos nacionales/grandes**
- **Think Realty Conference** → https://thinkrealty.com (varias ciudades al año)
- **BiggerPockets Conference** → annual event
- **Inman Connect** → https://www.inman.com/events

**Paso 5: Cámara de Comercio local + LinkedIn Events**
- "[Tu Ciudad] Chamber of Commerce" — eventos de business locales
- LinkedIn Events → filtrar real estate + tu ciudad

**🪜 Paso a paso**
1. **Empezar con National REIA Directory:** https://nationalreia.org/find-a-reia/ — ingresar dirección y encontrar el chapter local
2. Buscar eventos próximos 60 días en Meetup + Eventbrite + Facebook con keyword "real estate investor [tu ciudad]"
3. Filtrar por relevancia: enfocados a inversores activos (no primer-time buyers, no realtors agentes). Mínimo 5 eventos
4. Registrarse a los 5. Algunos gratis (primer REIA meeting), otros \$20-100. Vale pagar por los mejores
5. Confirmar fecha + agregar a calendario con recordatorio 24h antes. Documentar lista en Taskade

**📦 Entregable**
Lista en Taskade con 5 eventos confirmados con fecha en calendario.

**✅ Criterio de cierre**
5 eventos confirmados próximos 60 días con registro completado.

**⚠️ Riesgos comunes**
- Inscribirse y no asistir
- Solo eventos gratis (los pagos suelen tener mejor calidad)
- No diversificar (todo REIA o todo BiggerPockets)

---

### 🎯 Tarea E2.2.2 — Asistir físicamente a los eventos
**Tiempo estimado:** 2-4 horas por evento (10-20h total)

**📌 Qué hace el estudiante**
Asistir a 5 eventos y recolectar mínimo 5 contactos calificados por evento.

**🧠 Cómo conecta con el método**
Cada evento bien aprovechado genera 1 wholesaler activo, 1 contratista referenciado, 1 inversor potencial.

**🌐 Recursos**
- Buy Box resumido PDF en celular (E1.1.5)
- Tarjetas de presentación (50+, **Vistaprint** → https://www.vistaprint.com o **Moo.com** → https://www.moo.com)
- App de notas en celular
- Outfit business casual

**📝 Elevator pitch (30 seg):**
```
"Hi, I'm [Nombre], real estate investor focused on Fix & Flip 
and Fix & Hold in [ZIP Codes] in [tu ciudad]. Looking for SFH/duplex 
\$[X]-\$[Y] with light-to-medium rehab. I close cash in 14-21 days 
with my HML. Are you a buyer, seller, wholesaler, or contractor?"
```

**🎯 Tipos de contacto:**
- Wholesalers (buyer list + deals/semana)
- General Contractors (\$/sqft + disponibilidad)
- Hard Money Lenders (agregar a la lista)
- Inversores experimentados (mentor potencial)
- Realtors investor-friendly
- Property Managers (Fix & Hold)

**🪜 Paso a paso**
1. Llegar 15 min antes para presentarse al organizador
2. Meta: hablar con mínimo 7 personas. Preguntar "¿qué haces en real estate?" antes del pitch propio
3. Tomar notas inmediatas: nombre, rol, contacto, gancho específico para follow-up
4. Quedarse al networking informal post-evento (ahí se cierran relaciones)
5. Subir contactos a Taskade en máximo 24h: "Contactos — [Evento]"

**📦 Entregable**
25 contactos clasificados en Taskade.

**✅ Criterio de cierre**
5 eventos asistidos + 25 contactos cargados.

**⚠️ Riesgos comunes**
- No tener tarjetas
- Hablar solo con conocidos
- No tomar notas inmediatas

---

### 🎯 Tarea E2.2.3 — Follow-up en 48 horas
**Tiempo estimado:** 5-10 min por contacto (4-5h total)

**📌 Qué hace el estudiante**
Follow-up personalizado con los 25 contactos en primeras 48h.

**🧠 Cómo conecta con el método**
95% de la gente no hace follow-up. Distingue al estudiante como serio.

**📝 Templates por tipo:**

**Wholesaler:**
```
"Hi [Name], great meeting at [Event]. Looking for [SFH/duplex] 
in [ZIP] \$[X]-\$[Y]. Please add me to buyer list — Buy Box PDF 
attached. Looking forward to your next deal!"
```

**GC:**
```
"Hi [Name], great connecting at [Event]. Love to grab coffee 
to discuss collaboration. Running 1-2 flips this year, looking 
for long-term GC partner. Thursday or Friday afternoon work?"
```

**Inversor experimentado:**
```
"Hi [Name], really enjoyed our chat at [Event] — your insights 
on [tema] were super helpful. Would love to grab coffee and 
learn more about scaling to [X] flips/year. What works in 
your calendar?"
```

**🪜 Paso a paso**
1. Dentro de 48h post-evento, abrir lista de contactos
2. Enviar mensaje personalizado por el canal preferido del contacto
3. Para los 5 más calificados por evento, proponer café/llamada 30 min con día/hora específicos
4. Agendar mínimo 1 reunión 1-a-1 por evento (5 reuniones totales)
5. Documentar con estado: enviado / respondido / reunión agendada / relación activa

**📦 Entregable**
Log con 25 follow-ups enviados + 5 reuniones 1-a-1 agendadas.

**✅ Criterio de cierre**
100% follow-ups en 48h + mínimo 5 reuniones agendadas.

**⚠️ Riesgos comunes**
- Follow-up genérico
- Esperar > 48h
- No proponer reunión concreta

---

## Punto Clave 2.3 — Red de Wholesalers

---

### 🎯 Tarea E2.3.1 — Identificar 20 wholesalers activos
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Lista de 20 wholesalers activos en tu mercado.

**🧠 Cómo conecta con el método**
Wholesalers son la principal fuente de deals off-market. Sin esta red el estudiante depende solo de MLS (poco margen).

**🌐 Dónde encontrar wholesalers (cualquier ciudad USA)**

**Facebook Groups (buscar tu ciudad):**
- "[Tu Ciudad] Real Estate Investors"
- "Real Estate Investors [Tu Estado]"
- "Wholesale Deals [Tu Ciudad]"
- "Off-Market Properties [Tu Ciudad]"
- "Cash Buyers [Tu Ciudad]"

**Plataformas dedicadas (nacionales):**
- **BiggerPockets Marketplace** → https://www.biggerpockets.com/marketplace
- **PropStream** → https://www.propstream.com (datos + marketplace)
- **InvestorLift** → https://www.investorlift.com (deals nacionales)
- **DealMachine** → https://www.dealmachine.com
- **REI BlackBook** → https://www.reiblackbook.com
- **Connected Investors** → https://connectedinvestors.com

**Google searches efectivas:**
- "wholesaler [tu ciudad]"
- "off-market deals [ZIP]"
- "cash buyer real estate [tu ciudad]"
- "[tu ciudad] wholesale properties"

**Otras fuentes:**
- Contactos de E2.2.2 (eventos)
- **Craigslist** → https://[tuciudad].craigslist.org/search/rea
- **Bandit signs** ("We Buy Houses" en cruces de calles)
- **LinkedIn search:** "wholesaler" + tu ciudad

**🪜 Paso a paso**
1. Buscar en Facebook Groups arriba. Screenshot wholesalers con posts < 30 días
2. Google con términos exactos. Revisar primeros 30 resultados
3. Cruzar con contactos de eventos E2.2.2 (5-10 esperados)
4. Documentar "Wholesalers Pipeline": nombre, empresa, ZIPs cubre, deals/mes, canal, link perfil
5. Verificar actividad reciente (posts < 30 días). Si no, reemplazar

**📦 Entregable**
Lista con 20 wholesalers verificados + datos contacto.

**✅ Criterio de cierre**
20 wholesalers con contacto + actividad reciente confirmada.

**⚠️ Riesgos comunes**
- Wholesalers fuera de ZIPs del Buy Box
- No verificar actividad
- No diversificar fuentes

---

### 🎯 Tarea E2.3.2 — Contactar y presentar Buy Box
**Tiempo estimado:** 15 min por contacto (5h total)

**📌 Qué hace el estudiante**
Mensaje inicial a los 20 wholesalers con Buy Box resumido.

**🧠 Cómo conecta con el método**
El wholesaler envía deals al primer buyer que reconoce como serio.

**📝 Templates (3 versiones):**

**Conocido de evento:**
```
"Hi [Name], great connecting at [Event]. Cash buyer in 
[ZIP Codes]. Buy Box: [Tipo] \$[X]-\$[Y], [#] hab/[#] baños, 
light-to-medium rehab. Close in 14-21 days with HML, proof 
of funds available. Please add me to buyer list — Buy Box PDF 
attached."
```

**Frío vía Facebook:**
```
"Hi [Name], saw your recent post about [propiedad ZIP X]. 
Cash buyer in [ZIP X, Y, Z] looking for [tipo] \$[X]-\$[Y]. 
14-21 day closes with HML pre-approval. Please add to buyer 
list. Buy Box + POF available."
```

**Formal/email:**
```
"Subject: Cash Buyer — [Tu Ciudad] Fix & Flip — Buyer List

Hi [Name],

Adding to your buyer list. Active cash buyer in [ZIP Codes], 
[Tipo] \$[X]-\$[Y] range, light-to-medium rehab.

Close 14-21 days, cash or HML, POF on request. Buy Box attached.

[Nombre + teléfono + email]"
```

**🪜 Paso a paso**
1. Adaptar versión al canal del wholesaler
2. Personalizar con algo específico (deal reciente, evento, conexión)
3. Enviar a los 20 en máximo 1 semana (3-5/día)
4. Documentar fecha envío, canal, status
5. Esperar 7 días para respuestas. Filtrar 10 más activos

**📦 Entregable**
Log con 20 mensajes enviados + tasa de respuesta.

**✅ Criterio de cierre**
20 mensajes + mínimo 10 respuestas (50%).

**⚠️ Riesgos comunes**
- Copiar/pegar sin personalizar
- No incluir POF ni Buy Box
- Enviar y olvidar

---

### 🎯 Tarea E2.3.3 — Llamada 1-a-1 con wholesalers
**Tiempo estimado:** 30-45 min por llamada (5-8h total)

**📌 Qué hace el estudiante**
Llamada 1-a-1 con mínimo 10 wholesalers que respondieron.

**🧠 Cómo conecta con el método**
La llamada convierte contacto frío en relación activa.

**📝 10 preguntas clave:**
```
1. "¿Cuántos deals envían por semana/mes?"
2. "¿Qué ZIP Codes cubren?"
3. "¿Tipo de propiedad más común?"
4. "¿Rango de precio promedio?"
5. "¿Cómo manejan proceso de oferta? First come, bid blind, mejor precio?"
6. "¿Qué necesitan ver de mí como buyer para ser prioridad?"
7. "¿Trabajan con muchos buyers o grupo selecto?"
8. "¿Cómo distribuyen deals — email, SMS, WhatsApp?"
9. "¿Comisión transparente al buyer o ya viene en el precio?"
10. "¿Qué los hace diferente de otros wholesalers?"
```

**🪜 Paso a paso**
1. Agendar 10 llamadas en próximos 14 días
2. Antes de cada llamada revisar deals publicados últimos 30 días
3. Hacer las 10 preguntas. Tomar notas en tiempo real
4. Pedir explícitamente: "Please add me to your buyer list"
5. Documentar notas + follow-up de agradecimiento el mismo día

**📦 Entregable**
10 llamadas completadas + notas + follow-ups.

**✅ Criterio de cierre**
10 llamadas con notas + suscripción a buyer list confirmada.

**⚠️ Riesgos comunes**
- No investigar antes
- Olvidar pedir buyer list
- No follow-up el mismo día

---

### 🎯 Tarea E2.3.4 — Suscribirse a buyer lists
**Tiempo estimado:** 15 min por wholesaler (2-3h total)

**📌 Qué hace el estudiante**
Suscribirse a buyer list de los 10 wholesalers calificados.

**🧠 Cómo conecta con el método**
Buyer list = canal por donde llegan deals. 10 listas = 10x el flow.

**🪜 Paso a paso**
1. Pedir ser incluido por el canal específico (email broadcast, SMS, WhatsApp)
2. Confirmar inscripción recibiendo primer deal en 7 días
3. **Configurar filtros email** para deals lleguen a carpeta específica
4. Verificar después de 7 días: deals mínimo 2/semana. Si no, follow-up
5. Documentar canal y frecuencia esperada

**📦 Entregable**
10 suscripciones confirmadas + carpeta email configurada.

**✅ Criterio de cierre**
Deals recibidos mínimo 2 veces/semana de la red.

**⚠️ Riesgos comunes**
- 10 listas sin filtro (overload)
- No verificar recibe deals
- Suscribirse y no responder (te sacan)

---

### 🎯 Tarea E2.3.5 — Análisis express de cada deal entrante
**Tiempo estimado:** 20-30 min por deal

**📌 Qué hace el estudiante**
Responder a cada deal en máximo 24h con: paso / oferto \$X / interesado.

**🧠 Cómo conecta con el método**
Wholesalers priorizan buyers que responden rápido.

**📊 Filtro 30 segundos:**
```
¿ZIP del Buy Box? Sí continuar / No PASO
¿Precio dentro Buy Box? Sí continuar / No PASO
¿Tipo de propiedad? Sí continuar / No PASO
```

**📊 Cálculo 15 minutos si pasa:**
```
1. ARV = sqft × \$/sqft promedio del ZIP (E1.3.1)
2. Rehab = sqft × \$/sqft del nivel
3. MAO = ARV × 0.75 − Rehab
4. ¿MAO ≥ precio? OFERTAR
   ¿Gap ≤ 10%? INTERESADO/NEGOCIAR
   ¿Gap > 10%? PASO
```

**📝 Respuestas template:**

**PASO:** *"Thanks. Numbers don't work on this one. Keep them coming!"*

**OFERTO:** *"Interested. My max is \$[MAO]. Cash close 14-21 days, no inspection. Room there?"*

**NECESITO VISITA:** *"Numbers look promising. Want to confirm rehab. Can I see tomorrow or Wednesday?"*

**🪜 Paso a paso**
1. Notification activa. Abrir deal en máximo 4h
2. Aplicar filtro rápido (30 seg)
3. Si pasa, calcular ARV + rehab + MAO usando \$/sqft promedio del ZIP
4. Responder con template apropiado
5. Documentar en "Deals Recibidos" incluso si pasa

**📦 Entregable**
"Deals Recibidos" con 100% respondidos + decisión documentada.

**✅ Criterio de cierre**
100% respondidos en < 24h durante 30 días consecutivos.

**⚠️ Riesgos comunes**
- Ignorar deals (te sacan en 30 días)
- Análisis profundo en deals que claramente no pasan
- No documentar

---

## Punto Clave 2.4 — General Contractors

---

### 🎯 Tarea E2.4.1 — Identificar y contactar 10 GCs
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Lista de 10 GCs potenciales.

**🧠 Cómo conecta con el método**
El GC determina si el deal cumple tiempo y presupuesto.

**🌐 Dónde encontrar GCs (cualquier ciudad USA)**

**Plataformas online (nacionales):**
- **HomeAdvisor** → https://www.homeadvisor.com (filtrar por tu ciudad)
- **Angi (antes Angie's List)** → https://www.angi.com
- **Houzz** → https://www.houzz.com (con portfolio visual)
- **Thumbtack** → https://www.thumbtack.com
- **Porch** → https://porch.com
- **Google Maps Reviews** → "general contractor [tu ciudad]" filtrar 4.5+ estrellas, 50+ reviews

**Verificación de licencia (varía por estado):**
- **Por estado:** buscar "[tu estado] contractor license lookup"
- **California:** CSLB → https://www.cslb.ca.gov
- **Florida:** DBPR → https://www.myfloridalicense.com
- **Texas:** TDLR (solo trades específicos) → https://www.tdlr.texas.gov/LicenseSearch
- **New York:** varía por ciudad/condado
- **Arizona:** AZ ROC → https://roc.az.gov
- **Georgia:** SLBGC → https://sos.ga.gov/general-licensing-board
- **NOTA:** Algunos estados NO requieren licencia estatal de GC (como Texas). Cada ciudad maneja sus propios registros

**Otras fuentes:**
- Referidos de wholesalers (E2.3.3)
- Referidos de HML (E2.1.1 — algunos tienen GC partners)
- Eventos REIA (E2.2.2)
- Facebook Groups: "Contractors [tu ciudad]"

**📝 Email inicial:**
```
"Hi [Name], real estate investor doing Fix & Flip in [tu ciudad]. 
Building GC team for 1-2 flips this year, looking for long-term partner.

Could we set up 30-min call this week to discuss:
- Specialty (light/medium/heavy rehab)
- Typical pricing per sqft
- Capacity and timeline
- How you work with investors

Let me know what works."
```

**🪜 Paso a paso**
1. Buscar en HomeAdvisor, Angi, Google Reviews. Filtrar: 50+ reviews, 4.5+ rating, residential rehab
2. Cruzar con referidos de wholesalers/HML/eventos
3. **Verificar antes de contactar:** licencia activa (según tu estado) + website/Google Business profile activo
4. Contactar a los 10 por teléfono o email. Pedir cita 30 min
5. Documentar "GCs Pipeline": nombre, empresa, licencia (link verificación), seguros, especialidad, referencias, rango \$/sqft

**📦 Entregable**
Lista con 10 GCs contactados + datos + verificación licencia.

**✅ Criterio de cierre**
10 GCs contactados verificados + cita agendada con mínimo 5.

**⚠️ Riesgos comunes**
- No verificar licencia (problema legal)
- Elegir solo por precio bajo
- No diversificar fuentes

---

### 🎯 Tarea E2.4.2 — Reunión con cada GC
**Tiempo estimado:** 45-60 min por reunión (8-10h total)

**📌 Qué hace el estudiante**
Reunión con cada uno de los 10 GCs.

**🧠 Cómo conecta con el método**
La reunión revela info que no se ve online.

**📝 15 preguntas clave:**
```
PRECIOS Y CAPACIDAD
1. "¿Rango de precios por sqft según nivel (ligera/media/pesada)?"
2. "¿Cuántos proyectos simultáneos?"
3. "¿Timeline típico para flip de [sqft]?"
4. "¿Equipo in-house o subs? ¿Cómo manejas calidad?"

PROCESO Y POLÍTICA
5. "¿Política de pagos? ¿Draw schedule?"
6. "¿% máximo al inicio?"
7. "¿Manejo de change orders?"
8. "¿Seguros (GL + Workers Comp)? ¿COI disponible?"
9. "¿Garantía sobre el trabajo?"

EXPERIENCIA CON INVESTORS
10. "¿Cuántos flippers en últimos 12 meses?"
11. "¿Referencias de 2-3 inversores activos?"
12. "¿Has trabajado con HML? ¿Conoces inspecciones?"

ESPECIALIDAD Y RED
13. "¿Fortaleza? (cocinas, baños, addition, sistemas)"
14. "¿Plumbers/electricistas/HVAC trusted en equipo?"
15. "¿Manejas permisos o yo lo coordino?"
```

**🪜 Paso a paso**
1. Llegar con Buy Box + propiedad ejemplo + 15 preguntas
2. Hacer preguntas en orden. Tomar notas
3. Pedir referencias de 2-3 inversores
4. Observar señales no verbales
5. Documentar y clasificar: "candidato fuerte" / "regular" / "descartar"

**📦 Entregable**
10 fichas con notas de 15 preguntas + clasificación.

**✅ Criterio de cierre**
10 reuniones + 3 finalistas clasificados.

**⚠️ Riesgos comunes**
- No preguntar por seguros
- No pedir referencias verificables
- Confiar solo en lo que dicen

---

### 🎯 Tarea E2.4.3 — Solicitar bid sobre propiedad muestra
**Tiempo estimado:** 1-2 semanas

**📌 Qué hace el estudiante**
Bid sobre la misma propiedad a 3 GCs finalistas.

**🧠 Cómo conecta con el método**
Comparar bids sobre misma propiedad = forma más objetiva de evaluar.

**📝 Email solicitando bid:**
```
Subject: Bid Request — [Dirección] — Fix & Flip Project

Hi [GC Name],

Bid request for renovation of:
[Dirección]
[sqft, hab/baños, lot size]

Project type: Fix & Flip
Target completion: [X semanas]
Expected resale: \$[ARV]

Attached:
- Full Scope of Work (line-by-line)
- Property photos (current condition)
- Floor plan (if available)

Visit on [Date/Time] for walkthrough?
Expecting bid in 7-10 days with:
- Line-by-line pricing matching SOW
- Timeline by phase
- Payment/draw schedule
- Materials brand recommendations

[Nombre + teléfono]
```

**🪜 Paso a paso**
1. Elegir propiedad real de E1.3
2. Preparar SOW claro (plantilla E2.6.1) + enviar a 3 GCs finalistas
3. Agendar visita (mismo día reduce tiempo, separado evita comparación)
4. Recibir bids en máximo 14 días con desglose línea por línea
5. Comparativo "Bids — [Propiedad]": precio total, por categoría, timeline, payment

**📦 Entregable**
3 bids comparables + tabla comparativa.

**✅ Criterio de cierre**
3 bids con desglose + comparativo entregado al coach.

**⚠️ Riesgos comunes**
- Bids sin desglose línea por línea
- No dar el mismo SOW
- Elegir solo por precio bajo

---

### 🎯 Tarea E2.4.4 — Verificar licencia, seguros y referencias
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Verificar licencia, seguros y referencias de los 3 finalistas.

**🧠 Cómo conecta con el método**
GC sin licencia/seguros = riesgo legal y financiero.

**🌐 Verificación según tu estado**
- Google: "[tu estado] contractor license lookup" o "[tu estado] contractor verification"
- Cada estado tiene su Department of Consumer Affairs o equivalente
- **Verificar Certificate of Insurance (COI)** directamente con la aseguradora del GC

**📝 5 preguntas a referencias:**
```
1. "¿Cumplió presupuesto inicial o sobrecostos? ¿Cuánto variación?"
2. "¿Cumplió timeline o retrasos? ¿Cuánta variación?"
3. "¿Calidad final del trabajo? ¿Problemas post-entrega?"
4. "¿Manejo de change orders durante el proyecto?"
5. "¿Lo recontratarías? ¿Recomendarías?"
```

**🪜 Paso a paso**
1. **Verificar licencia** en el portal estatal apropiado. Confirmar "Active"
2. **Verificar COI:** pedir copia al GC, llamar a aseguradora con número de póliza. Verificar GL mínimo \$1M, Workers Comp si tiene empleados
3. **Llamar 2 referencias por GC** con las 5 preguntas
4. Validar autorización local de la ciudad (algunos requieren registro municipal)
5. Documentar con screenshots de licencia, foto del COI, notas de llamadas

**📦 Entregable**
Carpeta por GC finalista con verificaciones completas.

**✅ Criterio de cierre**
Mínimo 2 GCs validados como "ready to hire".

**⚠️ Riesgos comunes**
- No verificar COI con aseguradora directamente
- Aceptar "referencias amigas"
- No validar licencias de subs

---

### 🎯 Tarea E2.4.5 — Cultivar relación a largo plazo
**Tiempo estimado:** 30 min/mes por GC

**📌 Qué hace el estudiante**
Contacto mensual con los 3 GCs primarios sin proyecto activo.

**🧠 Cómo conecta con el método**
GC que se siente parte del equipo prioriza tus proyectos.

**📝 Mensaje mensual:**
```
"Hey [Name], checking in. How's your month?

On my end:
- Still looking deals in [ZIP X, Y]. If you hear anything, 
  send my way
- Updated Buy Box (attached)
- Saw [article/event/news] — thought of you

Coffee this month? Always good to stay connected!"
```

**🪜 Paso a paso**
1. Recordatorio mensual en calendario (primer lunes del mes)
2. Mensaje corto con template arriba
3. Invitar a 1 evento real estate al año
4. Compartir Buy Box actualizado
5. Documentar interacción en ficha del GC

**📦 Entregable**
Log con mínimo 1 contacto/mes por GC durante 3 meses.

**✅ Criterio de cierre**
3 GCs con cadencia mensual sostenida 3 meses sin proyecto activo.

**⚠️ Riesgos comunes**
- Solo contactar cuando se necesita (transaccional)
- Olvidar el recordatorio
- No actualizar al GC

---

## Punto Clave 2.5 — Investigación Regulatoria

---

### 🎯 Tarea E2.5.1 — Investigar proceso de permisos
**Tiempo estimado:** 4-5 horas

**📌 Qué hace el estudiante**
Documentar proceso de permisos en tu ciudad/condado.

**🧠 Cómo conecta con el método**
Sin entender permisos, el estudiante compra un deal y descubre 6 meses de tramitología.

**🌐 Cómo encontrar el Building Department de cualquier ciudad USA**

**Búsquedas de Google:**
- "[Tu Ciudad] building permits"
- "[Tu Ciudad] development services"
- "[Tu Condado] permits residential"
- "[Tu Ciudad] residential remodel permit"

**Ejemplos de portales por ciudad principal:**
- **Los Angeles:** LADBS → https://www.ladbs.org
- **New York:** NYC DOB → https://www.nyc.gov/site/buildings
- **Chicago:** Chicago Building Permits → https://www.chicago.gov/city/en/depts/bldgs.html
- **Houston:** Houston Public Works → https://www.houstonpermittingcenter.org
- **Phoenix:** Phoenix Development Services → https://www.phoenix.gov/pdd
- **Philadelphia:** L&I Philadelphia → https://www.phila.gov/departments/department-of-licenses-and-inspections
- **San Antonio:** SA Development Services → https://www.sa.gov/Directory/Departments/DSD
- **Dallas:** Dallas Building Inspection → https://dallascityhall.com/departments/sustainabledevelopment/buildinginspection
- **Austin:** Austin Development Services → https://www.austintexas.gov/department/development-services
- **Jacksonville:** Jacksonville Building Inspection → https://www.coj.net
- **San Francisco:** SF DBI → https://sfdbi.org
- **Indianapolis:** Indy Permits → https://www.indy.gov
- **Columbus:** Columbus Building → https://www.columbus.gov/bzs
- **Charlotte:** Charlotte Permits → https://charlottenc.gov/landdevelopment
- **Seattle:** SDCI → https://www.seattle.gov/sdci
- **Denver:** Denver Permits → https://www.denvergov.org/Government/Agencies-Departments-Offices/Community-Planning-and-Development

**🪜 Paso a paso**
1. Buscar el Building Department de tu ciudad (búsquedas arriba). Crear cuenta si tiene portal online
2. **Documentar tipos de permisos:**
   - Building Permit (estructural, additions)
   - Express/Minor Permits (repairs menores)
   - Electrical Permit
   - Plumbing Permit
   - Mechanical/HVAC Permit
3. Por cada permiso: costo, tiempo aprobación, departamento, contacto directo
4. Identificar obras exentas (cada ciudad tiene su lista)
5. Documento "Permisos — [Tu Ciudad]" con info + links oficiales

**📦 Entregable**
Documento con proceso de permisos detallado + links oficiales de tu ciudad.

**✅ Criterio de cierre**
5 tipos de permisos documentados con costo, tiempo, contacto.

**⚠️ Riesgos comunes**
- Asumir que no requiere permisos
- No considerar tiempo de plan review en cronograma
- No conocer programas de aceleración (Express, Self-certification)

---

### 🎯 Tarea E2.5.2 — Visita o llamada al Building Department
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Contacto directo con funcionario del Building Department.

**🧠 Cómo conecta con el método**
Funcionario aliado destraba situaciones que toman semanas.

**📝 Preguntas clave:**
```
1. "¿Tiempo real promedio aprobación residential remodel (no el publicado)?"
2. "¿Errores frecuentes que generan rechazos en plan review?"
3. "¿Contacto directo para electrical, plumbing, HVAC?"
4. "¿Programa para inversores que acelere proceso?"
5. "¿Documentos a tener listos antes de aplicar?"
6. "¿Self-certification disponible? ¿Qué proyectos califican?"
```

**🪜 Paso a paso**
1. Llamar al número principal y solicitar reunión informativa para inversor
2. Si presencial: llevar Buy Box + preguntas, vestir profesional
3. Hacer las 6 preguntas. Tomar notas
4. Pedir folletos, formularios, guía del inversor si existe
5. Guardar nombre y contacto directo. Email agradecimiento el mismo día

**📦 Entregable**
Contacto del funcionario + folletos digitalizados + notas.

**✅ Criterio de cierre**
Mínimo 1 contacto directo + folletos guardados.

**⚠️ Riesgos comunes**
- No agradecer ni follow-up
- No preguntar por programas de aceleración
- Ir sin preparación

---

### 🎯 Tarea E2.5.3 — Restricciones de zonificación por ZIP
**Tiempo estimado:** 1-2 horas por ZIP (5-10h total)

**📌 Qué hace el estudiante**
Documentar zonificación de los 5 ZIPs del Buy Box.

**🧠 Cómo conecta con el método**
Zonificación determina qué se puede hacer: ADU, STR, multifamiliar. Comprar para Airbnb donde no se permite = perder el deal.

**🌐 Recursos**
- Buscar "[Tu Ciudad] zoning map" en Google
- **Municode** → https://library.municode.com (códigos municipales nacionales)
- Departamento de Planning de tu ciudad
- **Short-Term Rental regulations:** buscar "[tu ciudad] short term rental regulations"
- **ADU regulations:** buscar "[tu ciudad] ADU accessory dwelling unit"

**📊 Datos clave por ZIP:**
```
1. Zonificación predominante (SF-1, R-1, R-2, MF, etc.)
2. Max unidades permitidas por lot
3. ADU permitida? Tipo?
4. STR permitido? Tipo? (Airbnb regulations)
5. Mixed-use permitido?
6. Setbacks y height limits
7. Parking requirements
8. Historic district u overlay
```

**🪜 Paso a paso**
1. Acceder al zoning map oficial de tu ciudad
2. Por ZIP, identificar zonificación predominante
3. **Verificar específicamente:** ADU, STR (muchas ciudades USA restringen STR agresivamente: NY, San Francisco, Austin, Denver), multifamiliar
4. Identificar zonas con permisos especiales (historic, overlay, neighborhood plan)
5. Matriz "Zonificación por ZIP" con 8 variables × 5 ZIPs

**📦 Entregable**
Matriz con 5 ZIPs × 8 variables.

**✅ Criterio de cierre**
Cada ZIP con zonificación, ADU, STR, multifamiliar documentados + link oficial.

**⚠️ Riesgos comunes**
- Asumir Airbnb permitido (muchas ciudades USA lo restringen)
- No considerar overlay districts
- Confiar en MLS listing sobre zonificación

---

### 🎯 Tarea E2.5.4 — Mapear inspecciones obligatorias
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Diagrama del flujo de inspecciones del Fix & Flip.

**🧠 Cómo conecta con el método**
Cada inspección requiere agendamiento, espera y posible retrabajo.

**📋 Inspecciones típicas USA (secuencia estándar):**
```
FASE 1 - PRE-OBRA: Pre-construction meeting (si aplica)

FASE 2 - ROUGH-IN (estructura abierta):
- Rough Plumbing
- Rough Electrical
- Rough Mechanical/HVAC
- Framing
- Insulation

FASE 3 - DRYWALL: Drywall inspection (después drywall, antes pintura)

FASE 4 - FINAL:
- Final Electrical
- Final Plumbing
- Final Mechanical/HVAC
- Final Building (Certificate of Occupancy)
```

**🪜 Paso a paso**
1. Listar inspecciones aplicables (referencia arriba, ajustar según tu ciudad)
2. Por inspección: cuándo, costo, tiempo respuesta (típicamente 24-72h), qué se inspecciona
3. Diagrama de flujo con orden secuencial
4. Validar con GC primario o funcionario Building Department
5. Documento final "Flujo Inspecciones — [Tu Ciudad] Fix & Flip"

**📦 Entregable**
Diagrama con inspecciones secuenciales + datos.

**✅ Criterio de cierre**
Diagrama validado por GC o Building Department.

**⚠️ Riesgos comunes**
- No agendar con anticipación
- Cubrir drywall antes de rough inspections
- No considerar que inspección que falla retrasa todo

---

### 🎯 Tarea E2.5.5 — Identificar programas especiales
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Investigar programas especiales: affordable housing, historic district, opportunity zone, tax abatement.

**🧠 Cómo conecta con el método**
Programas especiales pueden agregar 5-15% margen.

**🌐 Programas nacionales USA**
- **Opportunity Zones (federal)** → https://opportunityzones.hud.gov (mapa nacional, beneficios fiscales)
- **HUD Programs** → https://www.hud.gov (housing programs por estado)
- **Federal Historic Preservation Tax Incentives** → https://www.nps.gov/tps/tax-incentives.htm
- **State Housing Finance Agencies (HFAs)** → cada estado tiene la suya
- **Local programs:** buscar "[tu ciudad] affordable housing program" o "[tu ciudad] economic development incentives"

**🪜 Paso a paso**
1. Buscar en sitio oficial de tu ciudad "Economic Development" o "Housing Programs"
2. Verificar Opportunity Zones en mapa federal (HUD)
3. Cruzar con ZIPs del Buy Box: ¿Opportunity Zone? ¿Historic district? ¿Affordable housing zone?
4. Llamar departamento responsable. Validar requisitos actuales
5. Documento con 3 programas: elegibilidad, beneficio cuantificado, proceso, deadline

**📦 Entregable**
Reporte con 3 programas aplicables + datos de elegibilidad.

**✅ Criterio de cierre**
3 programas documentados + validación de elegibilidad para mínimo 1 ZIP.

**⚠️ Riesgos comunes**
- Ignorar Opportunity Zones (beneficios fiscales significativos)
- No validar vigencia
- No considerar trade-offs

---

## Punto Clave 2.6 — Scope of Work y Plan de Renovación

---

### 🎯 Tarea E2.6.1 — Crear plantilla maestra de SOW
**Tiempo estimado:** 4-6 horas

**📌 Qué hace el estudiante**
Plantilla maestra de Scope of Work reutilizable.

**🧠 Cómo conecta con el método**
SOW = contrato técnico con el GC. Sin SOW claro hay sobrecostos.

**🌐 Recursos**
- **BiggerPockets SOW templates** → https://www.biggerpockets.com (sección Fix & Flip)
- **HomeAdvisor cost guides** → https://www.homeadvisor.com/cost
- Portal de Taskade

**📋 Estructura del SOW (12 categorías):**
```
1. DEMO
2. FRAMING / STRUCTURAL
3. ELECTRICAL
4. PLUMBING
5. HVAC
6. INSULATION
7. DRYWALL
8. PISOS
9. PINTURA INTERIOR/EXTERIOR
10. COCINA (cabinets, countertops, appliances, sink, hardware)
11. BAÑOS (vanities, tubs/showers, toilets, hardware, mirrors)
12. EXTERIOR Y PAISAJISMO (roof, siding, paint, deck, landscaping)
```

**🪜 Paso a paso**
1. Crear documento "SOW Maestro — Plantilla"
2. Organizar por las 12 categorías
3. Por categoría listar 5-8 items estándar con descripción + unidad de medida
4. Dejar espacios para llenar: cantidades, marca/modelo materiales, especificaciones
5. Validar con GC primario que cubre items que cotiza normalmente

**📦 Entregable**
Plantilla SOW maestra con 60+ items.

**✅ Criterio de cierre**
Plantilla validada por GC + lista para reutilizar.

**⚠️ Riesgos comunes**
- SOW genérico sin especificaciones de materiales
- No incluir trade work obligatorio
- No validar con GC

---

### 🎯 Tarea E2.6.2 — Aplicar SOW a un caso real
**Tiempo estimado:** 3-5 horas

**📌 Qué hace el estudiante**
Llenar plantilla SOW con datos de propiedad real de E1.3.

**🧠 Cómo conecta con el método**
La plantilla en abstracto no sirve. Hacer el primer SOW completo entrena al estudiante.

**🪜 Paso a paso**
1. Elegir propiedad real de E1.3
2. Visitar la propiedad o usar fotos detalladas
3. Llenar cada línea con cantidades + especificaciones (marca, modelo, color)
4. Validar SOW completo con GC primario en sesión presencial
5. Subir SOW final al portal en la ficha del deal

**📦 Entregable**
SOW completo listo para enviar a 3 GCs.

**✅ Criterio de cierre**
SOW completo + validado por GC + listo para bids.

**⚠️ Riesgos comunes**
- Llenar sin visitar la propiedad
- No especificar marcas
- No validar con GC

---

### 🎯 Tarea E2.6.3 — Cronograma con hitos clave
**Tiempo estimado:** 2-3 horas

**📌 Qué hace el estudiante**
Cronograma del proyecto desde demo hasta listing.

**🧠 Cómo conecta con el método**
Cronograma = contrato de tiempo con el GC.

**🌐 Herramientas**
- **Taskade Gantt View** (built-in)
- **GanttPRO** → https://ganttpro.com
- **TeamGantt** → https://www.teamgantt.com
- **Asana Timeline** → https://asana.com

**🪜 Paso a paso**
1. Tomar SOW de E2.6.2. Agrupar tareas en fases: demo, rough-in, drywall, acabados, staging, listing
2. Asignar duración a cada fase (consultar GC)
3. **Identificar hitos críticos:** termino demo, aprobación inspecciones rough, termino drywall, termino acabados, listing date
4. Cronograma en Gantt o tabla
5. Validar con GC y ajustar antes de firmar contrato

**📦 Entregable**
Cronograma con fases, hitos, fechas.

**✅ Criterio de cierre**
Cronograma validado por GC + hitos críticos definidos.

**⚠️ Riesgos comunes**
- Cronograma sin contingencia
- No alinear con tiempos de permits/inspecciones
- No validar con GC

---

### 🎯 Tarea E2.6.4 — Calcular contingencia 10-15%
**Tiempo estimado:** 1 hora

**📌 Qué hace el estudiante**
Agregar línea de contingencia 10-15% al presupuesto total.

**🧠 Cómo conecta con el método**
Nunca un Fix & Flip cumple presupuesto exacto.

**📊 Reglas:**
```
Remodelación ligera: 10%
Remodelación media: 12-15%
Remodelación pesada: 15%
```

**🪜 Paso a paso**
1. Tomar presupuesto total remodelación del SOW
2. Aplicar % según nivel
3. Justificar % elegido
4. Sumar contingencia + comparar con rehab estimado en E1.3.3
5. Si presupuesto + contingencia > estimación inicial, ajustar MAO antes de cerrar oferta

**📦 Entregable**
Presupuesto con contingencia + justificación.

**✅ Criterio de cierre**
Contingencia agregada con % justificado + MAO ajustado si aplica.

**⚠️ Riesgos comunes**
- No usar contingencia
- Usar % bajo en remodelación pesada
- No ajustar MAO

---

*Fin Etapa E2 — Estructurar · Sistema enriquecido nacional USA*
$FMFX1A9D$,
  30,
  ARRAY['HML', 'privatemoney', 'wholesalers', 'GC', 'permisos', 'SOW']::text[],
  '{}'::jsonb
);

-- ─── E3 · tareas · 🔨 E3 · Ejecutar — 9 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E3',
  'tareas',
  null,
  $FMOIR0UW$🔨 E3 · Ejecutar — 9 tareas$FMOIR0UW$,
  $FMOIR0UW$Gerencia activa de la renovación$FMOIR0UW$,
  $FMOIR0UW$# 🔨 ETAPA E3 — EJECUTAR
**Gerencia activa de la renovación**

> La ejecución es donde se gana o se pierde el dinero. El estudiante actúa como Project Manager del flip: visitas constantes, seguimiento del cronograma, control del presupuesto y resolución rápida de problemas.

---

## Punto Clave 3.1 — Visitas y Control Físico de Obra

---

### 🎯 Tarea E3.1.1 — Visitar la propiedad mínimo 3 veces por semana
**Tiempo estimado:** 1-2 horas por visita (4-6h/semana)

**📌 Qué hace el estudiante**
Visitar físicamente la propiedad mínimo 3 veces por semana durante toda la duración del proyecto.

**🧠 Cómo conecta con el método**
La obra avanza al ritmo de la supervisión. Si el GC sabe que el estudiante visita poco, los tiempos se extienden y la calidad baja. Esta tarea es la disciplina operativa que sostiene el cronograma de E2.6.3.

**🌐 Recursos necesarios**
- Celular con cámara (alta resolución)
- App de medición: **MagicPlan** → https://www.magicplan.app o **RoomScan Pro**
- Checklist por fase (crear en Taskade)
- Portal de Taskade

**📋 Checklist por fase para cada visita:**

**FASE DEMO:**
```
□ Todos los materiales removidos según SOW
□ No hay daño estructural inesperado
□ Foundation visible está sin grietas mayores
□ Plumbing y electrical visibles para evaluar
□ Basura/escombros sacados al final del día
```

**FASE ROUGH-IN:**
```
□ Electrical rough cumple especificación SOW
□ Plumbing rough en cobre/PEX según spec
□ HVAC ductos colocados correctamente
□ Framing nuevo (si aplica) plomo y nivel
□ Permits visibles en el sitio
```

**FASE DRYWALL Y ACABADOS:**
```
□ Drywall liso sin defectos visibles
□ Cabinets nivelados y bien anclados
□ Countertops sin chips o defectos
□ Pisos sin gaps mayores a 1/8"
□ Pintura sin marcas de rodillo o gotas
□ Trim ajustado correctamente
```

**🪜 Paso a paso**
1. Agendar 3 visitas fijas por semana en el calendario (ej. lunes 9am, miércoles 3pm, viernes 11am)
2. Llegar con el checklist de la fase actual del cronograma
3. Caminar la obra completa con el GC o foreman. Revisar avance vs cronograma punto por punto
4. **Hacer mínimo 10 fotos por visita** documentando avance por área. Etiquetar foto con fecha + área
5. Subir fotos + notas al portal de Taskade en la bitácora del proyecto el mismo día

**📦 Entregable**
Bitácora semanal en Taskade con 3 visitas documentadas + fotos etiquetadas.

**✅ Criterio de cierre**
3 visitas semanales sostenidas + bitácora actualizada cada semana.

**⚠️ Riesgos comunes**
- Visitar solo una vez por semana
- Visitar sin checklist (no se nota lo que falta)
- No documentar con fotos (sin evidencia para disputas)

---

### 🎯 Tarea E3.1.2 — Reunión semanal de avance con el GC
**Tiempo estimado:** 1 hora por semana

**📌 Qué hace el estudiante**
Reunión semanal estructurada con el GC para revisar avance, presupuesto y próximos hitos.

**🧠 Cómo conecta con el método**
La reunión semanal previene desviaciones de cronograma y presupuesto. Sin esta cadencia, los problemas se acumulan hasta que es tarde para corregir.

**🌐 Herramientas**
- **Google Calendar** o **Calendly** → para agendar
- **Zoom** o **Google Meet** → si remoto
- Portal de Taskade

**📋 Agenda estándar de la reunión (15-15-15-15):**

```
MINUTOS 1-15: AVANCE
- % avance real vs planeado (por fase)
- Tareas completadas esta semana
- Tareas planeadas próxima semana

MINUTOS 15-30: PRESUPUESTO
- Gastos de la semana (con facturas)
- Variación vs presupuesto (% y \$)
- Próximos pagos pendientes

MINUTOS 30-45: PROBLEMAS Y DECISIONES
- Issues encontrados en la semana
- Decisiones requeridas (con propuesta + costo)
- Change orders propuestos

MINUTOS 45-60: PRÓXIMOS PASOS
- Hitos próxima semana
- Inspecciones a agendar
- Materiales a comprar
- Responsables de cada acción
```

**🪜 Paso a paso**
1. Fijar día y hora de reunión semanal en calendario (ej. viernes 4pm) durante toda duración del proyecto
2. Llevar a cada reunión: cronograma actualizado, budget tracker (E3.2.2), fotos de la semana
3. Seguir agenda 15-15-15-15 arriba sin desviarse
4. **Tomar decisiones en la reunión** (no posponer). Asignar responsable + deadline por cada acción
5. Documentar minuta en Taskade en la bitácora el mismo día. Enviar copia al GC por email

**📦 Entregable**
Minuta semanal en Taskade con avance, gastos, decisiones, responsables.

**✅ Criterio de cierre**
Reunión sostenida semanalmente sin saltarse ninguna durante el proyecto.

**⚠️ Riesgos comunes**
- Reunión sin agenda (se desvía)
- No documentar minuta (decisiones se pierden)
- Posponer decisiones

---

### 🎯 Tarea E3.1.3 — Documentar con fotos antes/durante/después
**Tiempo estimado:** 15 min por sesión (1-2h/semana)

**📌 Qué hace el estudiante**
Documentar cada área del proyecto con fotos antes, durante y después de la remodelación.

**🧠 Cómo conecta con el método**
Las fotos son evidencia para inspecciones, marketing de venta (E4.1.2), disputas con el GC y portafolio de mentoría.

**🌐 Herramientas recomendadas**
- **Google Photos** o **iCloud Photos** → backup automático
- **Snapseed** o **Lightroom Mobile** → edición rápida
- **Canva** → para crear comparativos antes/después → https://www.canva.com
- Portal de Taskade (galería del proyecto)

**📋 Estructura de carpetas en Taskade:**
```
📁 PROYECTO [Dirección]
  📁 01_Antes
    └─ Fotos del estado original (30-50 fotos)
  📁 02_Demo_Semana_X
  📁 03_Rough_in_Semana_X
  📁 04_Drywall_Semana_X
  📁 05_Acabados_Semana_X
  📁 06_Después
    └─ Fotos finales alta calidad (40-60 fotos)
  📁 07_Comparativos
    └─ Comparativos antes/después (cocina, baños, sala)
```

**🪜 Paso a paso**
1. **Antes de iniciar obra:** tomar 30-50 fotos del estado original (todas las habitaciones, baños, cocina, exteriores, sistemas visibles)
2. **Durante la obra:** fotos semanales por fase. Mismo ángulo que las "antes" para comparativos
3. **Al cierre:** 40-60 fotos finales en alta calidad para listing. Idealmente coordinar con la sesión de fotos profesional de E4.1.2
4. Organizar en Taskade por carpetas según estructura arriba
5. **Crear 5 comparativos antes/después** usando Canva (cocina, baño principal, baño secundario, sala, exterior). Estos se usan en marketing de E4.3

**📦 Entregable**
Galería completa en Taskade dividida en antes/durante/después + 5 comparativos clave.

**✅ Criterio de cierre**
Mínimo 200 fotos organizadas + 5 comparativos antes/después listos para marketing.

**⚠️ Riesgos comunes**
- No tomar fotos del "antes" (no hay comparativo posible)
- Fotos mal iluminadas (no sirven para marketing)
- No respaldar (cambio de celular = pérdida)

---

## Punto Clave 3.2 — Control de Presupuesto y Pagos

---

### 🎯 Tarea E3.2.1 — Controlar cada pago con draw schedule
**Tiempo estimado:** 30 min por draw (2-3h/mes)

**📌 Qué hace el estudiante**
Pagar al GC solo según draw schedule basado en avance real verificado en obra.

**🧠 Cómo conecta con el método**
Pagar adelantado es el error más común que destruye flips. Si el GC tiene mucha plata adelantada, se relaja o desaparece. Draw schedule basado en avance protege al estudiante.

**🌐 Recursos**
- Plantilla de Draw Schedule (crear en Taskade)
- Bank app del estudiante para hacer pagos
- Cámara para fotos de validación
- Portal de Taskade

**📋 Draw Schedule típico (6 hitos):**

```
DRAW #1 - Al firmar contrato:      10% (anticipo limitado)
DRAW #2 - Demo completado:          15%
DRAW #3 - Rough-in aprobado:        20%
DRAW #4 - Drywall completado:       20%
DRAW #5 - Acabados completados:     25%
DRAW #6 - Final inspection passed:  10% (retención)

TOTAL:                              100%
```

**Cada draw requiere antes de pagar:**
```
□ Visita física a la propiedad
□ Validación visual que el hito está 100% completo
□ Fotos del hito completado
□ Factura formal del GC
□ Inspecciones oficiales aprobadas (si aplica)
```

**🪜 Paso a paso**
1. Antes de iniciar la obra, firmar con el GC el draw schedule con 5-7 hitos vinculados a avance verificable. Plantilla arriba como referencia
2. Antes de cada pago, visitar la propiedad y validar que el hito esté 100% completo (no 90%)
3. Tomar fotos del hito completado. Documentar en Taskade "Draw Schedule Log" con: fecha, hito, fotos, factura
4. Hacer el pago solo después de validación física (no antes). Pagar por wire o check con descripción "Draw #X — [Hito]"
5. **Mantener nunca más del 10% del total adelantado al GC.** Si el GC pide más, decir no — es red flag

**📦 Entregable**
Draw schedule firmado + log en Taskade con cada pago documentado contra avance.

**✅ Criterio de cierre**
100% pagos hechos contra avance verificado + nunca más del 10% adelantado.

**⚠️ Riesgos comunes**
- Pagar antes de validar visualmente
- Adelantar > 10% (perder leverage)
- No documentar fotos del hito (sin evidencia)

---

### 🎯 Tarea E3.2.2 — Budget tracker actualizado semanalmente
**Tiempo estimado:** 1 hora por semana

**📌 Qué hace el estudiante**
Actualizar semanalmente tracker de presupuesto comparando presupuesto vs gastado real.

**🧠 Cómo conecta con el método**
Tracker semanal detecta desviaciones cuando aún hay tiempo de corregir. Esperar al final es ver el daño cuando ya no se puede arreglar.

**🌐 Herramientas**
- **Taskade hoja de cálculo** (built-in)
- **Google Sheets** → https://docs.google.com/spreadsheets
- **Excel** o **Numbers**
- **Receipt Bank / Dext** → para digitalizar facturas

**📋 Estructura del Budget Tracker:**

```
CATEGORÍA              | PRESUPUESTO | GASTADO | % USADO | VARIACIÓN
─────────────────────────────────────────────────────────────────────
Demo                   | \$X          | \$Y      | %       | \$
Framing                | \$X          | \$Y      | %       | \$
Electrical             | \$X          | \$Y      | %       | \$
Plumbing               | \$X          | \$Y      | %       | \$
HVAC                   | \$X          | \$Y      | %       | \$
Insulation             | \$X          | \$Y      | %       | \$
Drywall                | \$X          | \$Y      | %       | \$
Pisos                  | \$X          | \$Y      | %       | \$
Pintura                | \$X          | \$Y      | %       | \$
Cocina                 | \$X          | \$Y      | %       | \$
Baños                  | \$X          | \$Y      | %       | \$
Exterior               | \$X          | \$Y      | %       | \$
Permisos               | \$X          | \$Y      | %       | \$
Contingencia (15%)     | \$X          | \$Y      | %       | \$
─────────────────────────────────────────────────────────────────────
TOTAL                  | \$X          | \$Y      | %       | \$

INDICADOR CLAVE: 
% GASTADO vs % AVANCE PROYECTO
Si Gastado > Avance → DESVIACIÓN (revisar)
```

**🪜 Paso a paso**
1. Crear hoja "Budget Tracker — [Proyecto]" en Taskade con presupuesto por categoría (de E2.6.2)
2. Cada lunes cargar gastos reales por categoría (materiales, mano de obra, permisos)
3. Calcular % gastado vs % avance del proyecto. Si gastado > avance → desviación
4. Identificar categoría con mayor desviación. Entender por qué: sorpresa, mala estimación, scope creep
5. Reportar estado en reunión semanal con GC (E3.1.2). Tomar acciones inmediatas si hay desviación > 5%

**📦 Entregable**
Tracker en Taskade actualizado semanalmente con gastos reales y % desviación.

**✅ Criterio de cierre**
Tracker actualizado cada semana sin saltarse + reportado en reunión.

**⚠️ Riesgos comunes**
- Actualizar mensual en vez de semanal (tarde para corregir)
- No usar contingencia hasta el final (es para imprevistos, no buffer)
- No actuar cuando hay desviación

---

### 🎯 Tarea E3.2.3 — Plan de contingencia para retrasos
**Tiempo estimado:** 2 horas

**📌 Qué hace el estudiante**
Plan de contingencia documentado para los 3 riesgos más probables de retraso.

**🧠 Cómo conecta con el método**
Los retrasos no son si pasan, es cuándo pasan. Tener plan listo permite responder en 24-48h. Cada día de retraso = plata perdida en intereses HML.

**📋 Plantilla del Plan de Contingencia:**

```
RIESGO #1: Inspección que falla
TRIGGER: Inspector reporta fallas en rough/final
ACCIÓN INMEDIATA: 
- Llamar a inspector mismo día para entender causa
- Reunión emergencia con GC en 24h
- Si error del GC, reparación a su costo
- Re-inspección agendada en máximo 7 días
BACKUP: Contacto directo Building Department (E2.5.2)

RIESGO #2: Material que no llega
TRIGGER: Proveedor reporta delay > 1 semana
ACCIÓN INMEDIATA:
- Llamar a 3 proveedores alternativos mismo día
- Verificar inventario en Home Depot Pro y Lowe's Pro
- Si delay > 2 semanas, sustituir con material equivalente
BACKUP: Lista de 5 proveedores alternativos por categoría

RIESGO #3: Sub-contratista que no aparece
TRIGGER: Sub falta más de 2 días consecutivos sin avisar
ACCIÓN INMEDIATA:
- GC contacta inmediatamente
- Si no responde en 24h, activar backup sub
- Documentar comportamiento para evitar futuras contrataciones
BACKUP: Lista de 2 subs alternativos por trade (verificar con GC)
```

**🌐 Recursos para backups**
- **Home Depot Pro** → https://www.homedepot.com/c/PRO_Services
- **Lowe's Pro** → https://www.lowes.com/l/Pro/pros.html
- **Ferguson Plumbing Supply** → https://www.ferguson.com
- TDLR para verificar licencia de backup subs

**🪜 Paso a paso**
1. Identificar los 3 riesgos más probables del proyecto actual
2. Por cada riesgo definir: trigger, acción inmediata, responsable, recurso de respaldo
3. **Tener backup GC y backup proveedor de materiales listos para activar** (no esperar a la crisis)
4. Documentar plan en Taskade y compartir con el GC para alinear expectativas
5. Revisar plan en cada reunión semanal de E3.1.2 y ajustar según evolución

**📦 Entregable**
Plan de contingencia en Taskade con 3 escenarios + backups identificados.

**✅ Criterio de cierre**
Plan documentado + backups identificados + GC informado.

**⚠️ Riesgos comunes**
- Plan sin backups específicos (genérico)
- No comunicar al GC
- No actualizar cuando cambia el proyecto

---

## Punto Clave 3.3 — Inspecciones y Resolución de Problemas

---

### 🎯 Tarea E3.3.1 — Inspecciones de obra en hitos clave
**Tiempo estimado:** 1-2 horas por inspección

**📌 Qué hace el estudiante**
Coordinar y asistir a inspecciones oficiales en cada hito del flujo de E2.5.4.

**🧠 Cómo conecta con el método**
Las inspecciones son punto de control regulatorio. Una inspección que falla retrasa 1-2 semanas. Coordinarlas activamente acelera aprobaciones.

**🌐 Recursos**
- **tu ciudad Build + Connect (AB+C)** → https://abc.austintexas.gov (schedule inspections online)
- **tu ciudad Inspections phone** → 311 (en tu ciudad) o 512-974-2000
- **tu mercado Inspections** → 512-218-5550
- Portal de Taskade para log
- Diagrama de inspecciones de E2.5.4

**📋 Inspecciones típicas tu ciudad (orden):**
```
FASE ROUGH-IN (después de framing, antes de drywall):
□ Rough Plumbing
□ Rough Electrical
□ Rough Mechanical/HVAC
□ Framing
□ Insulation

FASE DRYWALL:
□ Drywall inspection (antes de pintura)

FASE FINAL (proyecto casi terminado):
□ Final Electrical
□ Final Plumbing
□ Final Mechanical/HVAC
□ Final Building (Certificate of Occupancy)
```

**🪜 Paso a paso**
1. Tomar el flujo de inspecciones de E2.5.4 y agendar cada una en AB+C según cronograma
2. **Antes de cada inspección**, revisar con el GC checklist de qué debe estar listo. No asumir
3. Asistir presencialmente (o estar disponible por teléfono) durante la inspección
4. Si inspección falla, identificar causa inmediatamente con el inspector. Agendar reinspección en máximo 7 días
5. Documentar cada inspección en Taskade: fecha, resultado (pass/fail), observaciones del inspector, fecha reinspección si aplica

**📦 Entregable**
Log de inspecciones en Taskade con resultado y documentación oficial.

**✅ Criterio de cierre**
Todas las inspecciones del flujo completadas con aprobación final (Certificate of Occupancy).

**⚠️ Riesgos comunes**
- No agendar con suficiente anticipación (delay 1-2 semanas)
- No asistir físicamente (perder oportunidad de aclarar)
- No documentar comentarios del inspector

---

### 🎯 Tarea E3.3.2 — Resolver problemas en 24 horas
**Tiempo estimado:** Variable según problema

**📌 Qué hace el estudiante**
Implementar protocolo: cualquier problema reportado por el GC se resuelve o tiene plan de resolución en máximo 24 horas.

**🧠 Cómo conecta con el método**
Cada hora que un GC espera una decisión es una hora sin trabajar. Si el estudiante demora 3 días en decidir, el proyecto se atrasa 3 días.

**🌐 Recursos**
- Canal comunicación primario con GC (WhatsApp recomendado para velocidad)
- Notification activa en celular
- Portal de Taskade para documentar

**📋 Protocolo de Resolución 24h:**

```
HORA 0: GC reporta problema
HORA 0-1: Estudiante responde acknowledge (no decisión final)
         "Got it. Looking into it. Will revert with decision 
          by [HORA específica]"

HORA 1-12: Reunir información completa
- ¿Cuál es exactamente el problema?
- ¿Cuáles son las opciones de solución?
- ¿Cuánto cuesta cada opción?
- ¿Cuánto tiempo agrega cada opción?
- ¿Hay que cambiar cronograma?

HORA 12-20: Consultar si es necesario
- Con coach/mentor si es decisión grande
- Con GC backup si requiere segunda opinión
- Con HML si impacta financiamiento

HORA 20-24: Comunicar decisión al GC
- Por escrito (WhatsApp o email)
- Con justificación clara
- Con next steps específicos
- Con responsable de cada acción

HORA 24-48: Follow-up para confirmar implementación
```

**🪜 Paso a paso**
1. Definir con el GC canal primario (WhatsApp) y comprometerse a responder en máximo 4 horas en horario laboral
2. Cuando llegue problema, **reunir info completa antes de decidir.** No decidir con poca data
3. Tomar la decisión en máximo 24 horas. Comunicar por escrito al GC con justificación
4. Si la decisión cambia presupuesto o cronograma, documentar el change order formalmente en Taskade
5. Follow-up al día siguiente para confirmar que la solución se implementó

**📦 Entregable**
Log de problemas en Taskade con tiempo de resolución por cada uno.

**✅ Criterio de cierre**
100% de problemas resueltos o con plan en menos de 24h durante todo el proyecto.

**⚠️ Riesgos comunes**
- Decidir en caliente sin info completa
- No documentar change orders
- No hacer follow-up

---

### 🎯 Tarea E3.3.3 — Generación de bitácoras semanales
**Tiempo estimado:** 1-2 horas por semana

**📌 Qué hace el estudiante**
Bitácora ejecutiva semanal del proyecto con avance, gastos, riesgos, próximos pasos.

**🧠 Cómo conecta con el método**
La bitácora es el reporte ejecutivo. Sirve para revisar con coach, socios, HML (algunos lo piden) y como base para post-mortem en E5.1.1.

**📋 Plantilla de Bitácora Semanal:**

```
═══════════════════════════════════════════════════════════
BITÁCORA SEMANAL — [Dirección del Proyecto]
Semana: [#] de [Total semanas]
Fecha: [DD/MM/AAAA]
═══════════════════════════════════════════════════════════

📊 KPIs DE LA SEMANA
- % Avance Real: __%
- % Avance Planeado: __%
- Variación: __ (adelanto/retraso en días)
- Presupuesto Gastado: \$__ ( __% del total)
- Variación vs Presupuesto: \$__ (+/-)

✅ COMPLETADO ESTA SEMANA
- [Lista de tareas/hitos completados]

🚧 EN PROGRESO
- [Lista de tareas en ejecución]

📅 PRÓXIMA SEMANA
- [Lista de tareas planeadas]
- Hitos críticos: [___]
- Inspecciones agendadas: [___]

⚠️ RIESGOS Y ALERTAS
- [Lista de issues identificados]
- Acciones tomadas: [___]

📸 FOTOS DESTACADAS
[Insertar 5-10 fotos clave de la semana]

💵 GASTOS DE LA SEMANA
- [Lista por categoría con monto]

🎯 DECISIONES TOMADAS
- [Decisiones clave + impacto]

═══════════════════════════════════════════════════════════
```

**🪜 Paso a paso**
1. Crear plantilla "Bitácora Semanal" en Taskade (template arriba)
2. Cada viernes llenar la bitácora con datos de la semana (toma 1-2h con el material acumulado de E3.1, E3.2)
3. Subir las 5-10 fotos representativas de la semana
4. Compartir la bitácora con: coach, HML (si lo pide), socios/private money lenders, equipo
5. Archivar todas las bitácoras del proyecto en Taskade para usar en E5.1.1 (post-mortem)

**📦 Entregable**
Bitácora semanal en Taskade durante toda duración del proyecto.

**✅ Criterio de cierre**
1 bitácora por semana sin saltarse + archivo completo al cierre del proyecto.

**⚠️ Riesgos comunes**
- Saltar bitácoras en semanas tranquilas (se pierde el ritmo)
- Bitácoras sin KPIs cuantitativos
- No compartir (la bitácora es comunicación, no archivo personal)

---

*Fin Etapa E3 — Ejecutar · Sistema enriquecido con templates, checklists y protocolos accionables*
$FMOIR0UW$,
  40,
  ARRAY['obra', 'drawschedule', 'budget', 'inspecciones', 'bitacora']::text[],
  '{}'::jsonb
);

-- ─── E4 · tareas · 💰 E4 · Estrategia de Salida — 7 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E4',
  'tareas',
  null,
  $FM2GSSRG$💰 E4 · Estrategia de Salida — 7 tareas$FM2GSSRG$,
  $FM2GSSRG$Venta exitosa o flujo de caja mensual$FM2GSSRG$,
  $FM2GSSRG$# 🚪 ETAPA E4 — ESTRATEGIA DE SALIDA
**Venta exitosa o flujo de caja mensual**

> El estudiante ejecuta una salida efectiva: precio agresivo pero justo, staging profesional, marketing multiplataforma y agente especializado en Fix & Flip. En Fix & Hold, foco en ocupación constante con inquilinos de calidad.

---

## Punto Clave 4.1 — Staging y Preparación del Producto

---

### 🎯 Tarea E4.1.1 — Staging profesional completado
**Tiempo estimado:** 2-3 días (proceso con vendor)

**📌 Qué hace el estudiante**
Contratar staging profesional antes de listing (Fix & Flip) o para sesión de fotos (Fix & Hold).

**🧠 Cómo conecta con el método**
El staging aumenta precio de venta 5-15% y reduce DOM significativamente. Cada día menos en mercado = intereses HML ahorrados. Convierte la casa en producto que el comprador "quiere".

**🌐 Dónde encontrar stagers USA**
- **HomeAdvisor (Home Stagers)** → https://www.homeadvisor.com/c.Home-Staging.tu ciudad.TX.html
- **RESA (Real Estate Staging Association)** → https://www.realestatestagingassociation.com/Find-a-Stager
- **Stagers locales tu ciudad específicos:**
  - Showhomes tu ciudad
  - White Glove Staging
  - Premier Staging Texas
  - Inhabit Staging tu ciudad
- **Houzz Pros (Stagers tu ciudad)** → https://www.houzz.com/professionals/home-staging/austin-tx-us-probr0-bo~t_11823~r_4671654
- **Referidos del agente de E4.4.1** (suelen tener stagers preferidos)
- **Facebook Groups:** "tu ciudad Home Stagers"
- **Google Reviews:** "home stager USA" + filtrar 4.5+ estrellas

**📋 Rangos de precio típicos (tu ciudad 2026):**
```
Staging completo de casa promedio (1,800 sqft): \$2,500-\$5,000/mes
Staging vacante (mes inicial + furniture rental): \$3,000-\$6,000/mes
Staging para fotos solamente (1-2 días): \$1,500-\$3,000
```

**🪜 Paso a paso**
1. Identificar 2-3 stagers locales. Solicitar cotización con datos: dirección, sqft, # habitaciones a stage, perfil del comprador objetivo
2. Elegir stager con mejor relación calidad/precio + portfolio que coincida con el ZIP. Agendar 1-2 días antes de sesión de fotos
3. **Definir estilo según perfil del comprador del ZIP:**
   - Familia clase media: tradicional, cálido, neutral
   - Joven profesional: moderno, minimalista
   - Downsizer: clásico, elegante
4. Validar staging al final del día: iluminación, distribución, accesorios, no demasiado vacío ni saturado
5. Tomar fotos preliminares y subir a Taskade en ficha del deal

**📦 Entregable**
Fotos del staging completo en Taskade + factura del staging.

**✅ Criterio de cierre**
Staging completado y validado + listo para sesión fotos profesionales.

**⚠️ Riesgos comunes**
- Staging estilo equivocado (rústico para zona moderna)
- No coordinar fecha con fotógrafo
- Sub-estimar la duración del staging (algunas necesitan rental mes mínimo)

---

### 🎯 Tarea E4.1.2 — Fotografía y video profesional listos
**Tiempo estimado:** 1 día (sesión + edición)

**📌 Qué hace el estudiante**
Contratar fotógrafo y videógrafo profesionales para sesión completa de la propiedad ya staged.

**🧠 Cómo conecta con el método**
La primera impresión del comprador es por las fotos del listing. Fotos malas matan deals antes de la visita.

**🌐 Dónde encontrar fotógrafos USA**
- **HomeJab** → https://www.homejab.com (servicio nacional, calidad consistente)
- **Aryeo** → https://www.aryeo.com (network de fotógrafos pre-validados)
- **VHT Studios** → https://www.vht.com
- **Fotógrafos locales tu ciudad específicos:**
  - Open Homes Photography
  - tu ciudad Real Estate Photographers
  - Modern Light Houses
- **Referido del agente** (E4.4.1 — suelen tener fotógrafo preferido)
- **Búsqueda directa:** "real estate photographer USA" en Google + filtrar portfolios

**📋 Paquete completo esperado:**
```
- 30-50 fotos HDR interiores y exteriores
- 1 video tour (60-90 segundos con música)
- 1 dron tour exterior (aerial shots + neighborhood context)
- Floor plan profesional
- Twilight photos (opcional, mejora 20% el CTR del listing)
- 3D walkthrough (Matterport, opcional)
- Edición y entrega en 24-48 horas
```

**📋 Rangos de precio (tu ciudad 2026):**
```
Paquete básico (30 fotos HDR + edition): \$200-\$400
Paquete completo (fotos + video + dron + floor plan): \$500-\$1,000
Premium (incluye twilight + Matterport): \$1,000-\$1,500
```

**🪜 Paso a paso**
1. Contratar fotógrafo profesional especializado en real estate (no genérico). **Verificar portafolio:** buscar fotos similares al ZIP, iluminación consistente, ángulos profesionales
2. Solicitar paquete completo: 30-50 fotos HDR, 1 video tour, 1 dron exterior, floor plan
3. Coordinar sesión en día de **buena luz natural** (mañana 9-11am o atardecer 4-6pm) con propiedad limpia, sin obras pendientes
4. Revisar entrega final: rechazar fotos mal iluminadas, con ángulos pobres, o con cosas fuera de lugar (controles remotos, basura, etc.)
5. Subir fotos finales en alta calidad al portal de Taskade en carpeta "Listing Assets"

**📦 Entregable**
30-50 fotos profesionales + 1 video + 1 dron + floor plan en Taskade.

**✅ Criterio de cierre**
Paquete completo entregado + validado por estudiante y agente.

**⚠️ Riesgos comunes**
- Contratar fotógrafo de bodas/eventos (no especializado en real estate)
- No revisar portafolio antes
- Fotos sin twilight (pierden 20% de impacto)

---

## Punto Clave 4.2 — Pricing y Listing Strategy

---

### 🎯 Tarea E4.2.1 — Precio de lista validado con comparables actuales
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Definir precio de lista final basado en comparables vendidos en últimos 90 días y propiedades activas.

**🧠 Cómo conecta con el método**
El precio inicial determina 70% del éxito del listing. Muy alto = se queda y termina vendido por menos. Muy bajo = plata sobre la mesa.

**🌐 Recursos**
- **CMA del agente de E4.4.1** (Comparative Market Analysis)
- **MLS access** (vía agente)
- **Zillow** → para activos en mercado
- **Redfin** → para vendidos últimos 90 días
- **Realtor.com** → comparables y tiempo en mercado
- **HomeLight** → https://www.homelight.com/home-value-estimator (segundo opinion)
- Portal de Taskade

**📊 3 Precios a definir:**
```
PRECIO AGRESIVO (lower bound):
- 95% del ARV conservador
- Mueve rápido (DOM esperado: 7-14 días)
- Puede generar múltiples ofertas

PRECIO JUSTO (target):
- 100% del ARV conservador
- Balance velocidad-precio (DOM 14-30 días)
- Espacio para negociar 2-5%

PRECIO TECHO (max):
- 105% del ARV conservador
- Solo si CMA actualizada soporta
- DOM esperado 30-60 días
```

**🪜 Paso a paso**
1. Pedir CMA actualizado al agente de E4.4.1
2. Validar comparables: vendidos últimos 90 días, ≤1 milla, mismo tipo, similar nivel remodelación. Mínimo 5 comparables sólidos
3. Comparar ARV original (E1.3.2) con CMA actual y ajustar
4. Definir los 3 precios (regla arriba). Calcular ganancia neta a cada precio
5. **Elegir precio de lista que deje espacio para negociar 2-5%** (la mayoría de compradores ofertan por debajo). Documentar en Taskade

**📦 Entregable**
Documento en Taskade con CMA + análisis de 3 precios + decisión final justificada.

**✅ Criterio de cierre**
Precio definido con CMA actualizado + estrategia de negociación clara.

**⚠️ Riesgos comunes**
- Listar por encima del CMA (DOM > 90 días, mata el margen)
- Listar muy bajo "por velocidad" (plata sobre la mesa)
- No considerar la temporada (verano vs invierno tienen diferentes velocidades)

---

### 🎯 Tarea E4.2.2 — Calcular breakeven y ganancia neta antes de listar
**Tiempo estimado:** 1-2 horas

**📌 Qué hace el estudiante**
Calcular precio mínimo de venta sin pérdida (breakeven) y ganancia neta a los 3 precios.

**🧠 Cómo conecta con el método**
Sin breakeven claro, el estudiante puede negociar a la baja sin saber cuándo está perdiendo. Define el piso absoluto para negociar con disciplina.

**📊 Costos a sumar para Breakeven:**
```
COSTOS DE ADQUISICIÓN:
- Precio de compra
- Closing costs compra (2-4% del precio)
- Inspecciones, appraisal compra

COSTOS DE REMODELACIÓN:
- Total del SOW + change orders
- Permisos
- Utilities durante la obra
- Insurance durante la obra

COSTOS DE FINANCIAMIENTO:
- Intereses HML acumulados (tasa × meses × monto)
- Puntos del HML
- Fees del HML

COSTOS DE HOLDING:
- Property taxes prorrateadas
- HOA si aplica
- Mantenimiento básico

COSTOS DE SALIDA:
- Staging
- Fotografía profesional
- Comisión agente (5-6% del precio venta)
- Closing costs venta (1-3% del precio venta)
- Marketing extra si aplica

TOTAL COSTOS = SUMA DE TODO LO ANTERIOR

BREAKEVEN = TOTAL COSTOS (precio mínimo sin pérdida)
```

**🌐 Calculadoras útiles**
- **BiggerPockets Fix & Flip Calculator** → https://www.biggerpockets.com/fix-and-flip-calculator (free con cuenta)
- **DealCheck** → https://dealcheck.io (app móvil)
- **Excel/Google Sheets** custom calculator
- Portal de Taskade

**🪜 Paso a paso**
1. Sumar todos los costos reales (no estimados): adquisición + remodelación + intereses HML + utilities + seguros + impuestos + comisiones + closing costs
2. Calcular breakeven = total de costos = precio mínimo sin pérdida
3. Calcular ganancia neta a los 3 precios definidos en E4.2.1 (agresivo, justo, techo)
4. **Definir "walking number":** precio bajo el cual NO se acepta oferta, así sea cash y cierre rápido. Típicamente breakeven + 10% mínimo
5. Documentar todo en Taskade en ficha del deal + comunicar al agente

**📦 Entregable**
Hoja de breakeven en Taskade con costos totales + ganancia neta a 3 precios + walking number.

**✅ Criterio de cierre**
Walking number definido + comunicado al agente antes de listar.

**⚠️ Riesgos comunes**
- Olvidar costos de holding e intereses HML
- No comunicar walking number al agente (negocia mal)
- Walking number = breakeven (sin margen de seguridad)

---

## Punto Clave 4.3 — Marketing Multiplataforma

---

### 🎯 Tarea E4.3.1 — Publicar en mínimo 4 plataformas
**Tiempo estimado:** 3-4 horas

**📌 Qué hace el estudiante**
Publicar el listing en mínimo 4 plataformas según modelo (Fix & Flip o Fix & Hold).

**🧠 Cómo conecta con el método**
Una sola plataforma limita el alcance. 4 plataformas maximizan exposición al comprador/inquilino correcto.

**🌐 Plataformas por modelo de negocio**

**FIX & FLIP (venta):**
- **MLS (vía agente)** → automáticamente se distribuye a Zillow, Realtor.com, Trulia, etc.
- **Zillow** → https://www.zillow.com (verificar listing aparece correctamente)
- **Realtor.com** → https://www.realtor.com (verificar listing)
- **Facebook Marketplace** → https://www.facebook.com/marketplace (alcance local importante)
- **Redfin** → https://www.redfin.com (cobertura adicional)
- **Cash buyer networks:** Norada Real Estate, Connected Investors

**FIX & HOLD (renta) — Modelo según estrategia:**

**Renta tradicional:**
- **Zillow Rentals** → https://www.zillow.com/rental-manager
- **Apartments.com** → https://www.apartments.com
- **Facebook Marketplace Rentals**
- **Trulia Rentals**

**Airbnb / Short-term rental:**
- **Airbnb** → https://www.airbnb.com/host
- **VRBO** → https://www.vrbo.com (próximo canal de Rental Profitss)
- **Booking.com** → https://www.booking.com (próximo canal)
- **Furnished Finder** → https://www.furnishedfinder.com

**Room-by-room / Coliving:**
- **PadSplit** → https://www.padsplit.com (activo en tu ciudad)
- **Facebook Marketplace Rooms**
- **Furnished Finder** (corporate/travel nurse)
- **SpareRoom** → https://www.spareroom.com

**Affordable Housing:**
- **HUD listings** → https://www.hud.gov
- **TDHCA listings** → https://www.tdhca.state.tx.us
- Programas locales de la ciudad

**📝 Template de copy del listing:**
```
ATTENTION GRABBING HEADLINE:
"Fully Renovated Modern Home in [ZIP/Neighborhood] — Move-In Ready!"

DESCRIPTION (3-4 párrafos):
Párrafo 1: Hook + características principales (hab/baños, sqft, lot)
Párrafo 2: Upgrades específicos (kitchen with quartz countertops, new HVAC, etc.)
Párrafo 3: Beneficios del vecindario (schools, comercio, parques)
Párrafo 4: Call to action ("Schedule your private tour today!")

KEY FEATURES (bullet list de 10-15 puntos):
✓ Brand new kitchen with [details]
✓ All new HVAC system (2026)
✓ New roof, plumbing, electrical
✓ Modern flooring throughout
✓ [Listar todos los upgrades]

OPEN HOUSE: [Día y hora]
SHOWING REQUESTS: [Email/teléfono del agente]
```

**🪜 Paso a paso**
1. Definir las 4 plataformas según modelo (lista arriba). Para Fix & Flip empezar con MLS + Zillow + Realtor + Facebook
2. Preparar copy del listing alineado al perfil del comprador/inquilino del ZIP usando template arriba
3. Subir fotos profesionales y video a cada plataforma. Verificar que se vean bien
4. **Activar el listing en todas las plataformas el mismo día** para maximizar momentum
5. Documentar en Taskade links de cada listing + screenshots de publicación

**📦 Entregable**
Listing activo en mínimo 4 plataformas + log de links en Taskade.

**✅ Criterio de cierre**
4 plataformas activas el mismo día + links documentados.

**⚠️ Riesgos comunes**
- Activar plataformas en días distintos (pierde momentum)
- Copy genérico sin destacar upgrades
- Fotos comprimidas o pobre calidad en plataformas secundarias

---

### 🎯 Tarea E4.3.2 — Open house en la primera semana
**Tiempo estimado:** 1-2 días (planeación + ejecución)

**📌 Qué hace el estudiante**
Programar open house dentro de primera semana de listing (aplica para Fix & Flip).

**🧠 Cómo conecta con el método**
Open house concentra compradores en un solo momento, genera urgencia y permite múltiples ofertas el mismo fin de semana. Herramienta más efectiva para acelerar venta primeros 14 días.

**🌐 Recursos**
- **Canva** para crear flyers → https://www.canva.com
- **Vistaprint** para imprimir flyers → https://www.vistaprint.com
- **Yard signs y direction signs** (el agente generalmente los tiene)
- **Open House signage** (de la brokerage del agente)
- **Visitors registration sheet** o app **Open Home Pro** → https://www.openhomepro.com

**📝 Promoción del Open House (días previos):**

**Plataformas digitales:**
- Post en Facebook personal + Marketplace
- Listing en Zillow/Realtor.com marca "Open House" automático
- Instagram Story + Reels con video tour
- Nextdoor app post para el vecindario
- Anuncios pagados en Facebook (\$50-100 para alcance 5,000+ personas locales)

**Plataformas físicas:**
- 10-15 flyers en buzones del vecindario (200 ft alrededor)
- Sign en yard 3 días antes + sign en cruces principales
- Flyer en cafés/laundromats locales

**🪜 Paso a paso**
1. Definir fecha: **sábado o domingo de la primera semana, 1-4pm** (horario óptimo en tu ciudad)
2. Promocionar en plataformas digitales y físicas (lista arriba) con 3-7 días de anticipación
3. Coordinar con agente la logística: refrigerios (galletas, agua, café), flyers de la propiedad, libro de visitas, music background suave
4. **Estar presente en el open house** para responder preguntas técnicas sobre la remodelación (cosas que el agente no sabe en detalle)
5. Recolectar contacto de cada visitante en libro de visitas o app. **Follow-up en 24h con todos**

**📦 Entregable**
Open house ejecutado + lista de visitantes en Taskade + follow-ups enviados.

**✅ Criterio de cierre**
Open house realizado en primera semana + mínimo 10 visitas registradas + follow-ups completos.

**⚠️ Riesgos comunes**
- No promocionar con anticipación (asistencia baja)
- No estar presente (perder oportunidad técnica)
- No hacer follow-up con visitantes (pierde leads calientes)

---

## Punto Clave 4.4 — Equipo de Salida

---

### 🎯 Tarea E4.4.1 — Agente de ventas seleccionado
**Tiempo estimado:** 4-6 horas

**📌 Qué hace el estudiante**
Seleccionar agente especializado en Fix & Flip (o property manager para Fix & Hold) que ejecute la salida.

**🧠 Cómo conecta con el método**
Agente generalista no entiende timelines del flipper. Agente especializado en flip sabe que cada día cuesta, prioriza el deal y conoce compradores cash. Puede acortar venta 30-50 días.

**🌐 Dónde encontrar agentes especializados tu ciudad**
- **Referidos del HML** (de E2.1) — algunos HML tienen agentes preferidos
- **Referidos de wholesalers** (de E2.3) — conocen agentes investor-friendly
- **Eventos REIA tu ciudad** (de E2.2) — agentes presentes regularmente
- **Búsqueda en Realtor.com con filtros** → https://www.realtor.com/realestateagents (buscar tu ciudad + filtrar por experiencia)
- **HomeLight Agent Match** → https://www.homelight.com/agents
- **UpNest** → https://www.upnest.com (agentes compiten por tu listing)
- **Facebook Groups tu ciudad Investors** — preguntar por referidos
- **LinkedIn search:** "real estate agent investor tu ciudad"

**📝 Preguntas para entrevistar al agente:**
```
EXPERIENCIA CON FLIPPERS
1. "¿Cuántos flips has listado en los últimos 12 meses?"
2. "¿Cuál fue el DOM promedio de tus listings de flip?"
3. "¿Qué % de tus listings se vendieron sobre precio de lista?"

ESTRATEGIA Y PROCESO
4. "¿Cómo fijas precio en un flip vs casa tradicional?"
5. "¿Cuál es tu estrategia de marketing para los primeros 14 días?"
6. "¿Tienes lista de cash buyers o inversores para deals rápidos?"
7. "¿Cómo manejas múltiples ofertas?"

COMISIÓN Y TÉRMINOS
8. "¿Cuál es tu comisión? ¿Negociable para flippers repetidos?"
9. "¿Cuál es la duración del Listing Agreement?"
10. "¿Hay cláusula de salida si no funciona la relación?"

COMUNICACIÓN
11. "¿Cuál es tu canal preferido (WhatsApp, email, llamada)?"
12. "¿Cómo manejas reportes semanales de avance?"
13. "¿Asistes personalmente a los open houses?"
```

**🪜 Paso a paso**
1. Identificar 3 agentes especializados en flip (usar fuentes arriba)
2. Entrevistar a los 3 con las 13 preguntas. Pedir comparativos de sus listings actuales con la propiedad del estudiante
3. **Verificar:** licencia activa en TREC → https://www.trec.texas.gov/apps/license-holder-search
4. Elegir agente con mejor track record en propiedades similares al ZIP/precio. Firmar **Listing Agreement** (típico 90-120 días)
5. Documentar la decisión en Taskade con el contrato firmado. Comunicar walking number, ARV objetivo, cronograma esperado

**📦 Entregable**
Listing Agreement firmado + agente registrado en Taskade.

**✅ Criterio de cierre**
Agente firmado con comisión y términos definidos + alineado al walking number de E4.2.2.

**⚠️ Riesgos comunes**
- Elegir agente "amigo" sin especialización
- Listing Agreement por 6+ meses (sin escape clause)
- No comunicar walking number al agente

---

*Fin Etapa E4 — Estrategia de Salida · Sistema enriquecido con plataformas verificadas y templates de copy*
$FM2GSSRG$,
  50,
  ARRAY['staging', 'fotografia', 'listing', 'marketing', 'openhouse', 'agente']::text[],
  '{}'::jsonb
);

-- ─── E5 · tareas · 🚀 E5 · Escalar — 8 tareas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'E5',
  'tareas',
  null,
  $FM0J605W$🚀 E5 · Escalar — 8 tareas$FM0J605W$,
  $FM0J605W$Sistematizar y crecer el negocio$FM0J605W$,
  $FM0J605W$# 🚀 ETAPA E5 — ESCALAR
**Sistematizar y crecer el negocio**

> Un flip es un logro. Un negocio de flips es un sistema. Escalar significa documentar procesos, construir equipo, acceder a más capital y hacer múltiples deals simultáneos con estructura y control.

---

## Punto Clave 5.1 — Documentación y SOPs

---

### 🎯 Tarea E5.1.1 — Análisis detallado del primer flip
**Tiempo estimado:** 6-10 horas

**📌 Qué hace el estudiante**
Post-mortem detallado del primer flip completado para identificar qué funcionó, qué no, y qué sistematizar.

**🧠 Cómo conecta con el método**
Sin análisis del primer flip, los errores se repiten. El post-mortem convierte experiencia en aprendizaje sistemático. Base para los SOPs de E5.1.2.

**🌐 Recursos**
- Todas las bitácoras semanales de E3.3.3
- Budget tracker final de E3.2.2
- Galería completa de fotos de E3.1.3
- Métricas finales de venta (E4)
- Portal de Taskade

**📋 Plantilla de Post-Mortem (10 secciones):**

```
═══════════════════════════════════════════════════════════
POST-MORTEM — [Dirección del Proyecto]
Fecha cierre: [DD/MM/AAAA]
═══════════════════════════════════════════════════════════

1. RESUMEN EJECUTIVO
- Tipo de proyecto: [Fix & Flip / Fix & Hold]
- Duración total: [X meses]
- ROI obtenido: __%
- Ganancia neta: \$__

2. FINANCIEROS (Presupuesto vs Real)
                    PRESUPUESTO    REAL      VARIACIÓN
Compra              \$              \$         %
Remodelación        \$              \$         %
Holding costs       \$              \$         %
Comisiones          \$              \$         %
Closing costs       \$              \$         %
TOTAL               \$              \$         %

Precio venta:       \$              \$
Ganancia neta:      \$              \$

3. CRONOGRAMA (Planeado vs Real)
                    PLANEADO       REAL      VARIACIÓN
Compra a inicio obra  X días        X días    +/-
Inicio a final obra   X semanas     X semanas +/-
Final obra a listing  X días        X días    +/-
Listing a venta       X días        X días    +/-
TOTAL                 X meses       X meses   +/-

4. ROI ANALYSIS
ROI esperado: __%
ROI obtenido: __%
Razón principal de variación: [___]

5. QUÉ FUNCIONÓ BIEN (Top 5)
1. [Lección + por qué importó]
2. [...]
3. [...]
4. [...]
5. [...]

6. QUÉ FALLÓ (Top 5)
1. [Error + impacto financiero/timeline + cómo evitar]
2. [...]
3. [...]
4. [...]
5. [...]

7. SORPRESAS Y CHANGE ORDERS
- Total change orders: \$__
- Categoría con más sorpresas: [___]
- Impacto en cronograma: [___]

8. ANÁLISIS DEL EQUIPO
- GC: rating 1-10 + razón + ¿recontrataría?
- HML: rating + ¿usaría de nuevo?
- Agente: rating + ¿usaría de nuevo?
- Wholesaler (si aplica): rating + relación futura

9. PROCESOS A SISTEMATIZAR (Top 3 SOPs)
1. [Proceso crítico que debe tener SOP escrito]
2. [...]
3. [...]

10. PLAN DE MEJORAS PARA PRÓXIMO DEAL
- [Acción específica + responsable + deadline]
- [...]
═══════════════════════════════════════════════════════════
```

**🪜 Paso a paso**
1. Reunir toda la data del proyecto: bitácoras semanales, budget tracker, fotos, decisiones, problemas resueltos
2. Hacer análisis financiero final: presupuesto vs real, tiempo planeado vs real, ROI esperado vs ROI real
3. Identificar **5 cosas que funcionaron bien (replicar)** y **5 cosas que se deben cambiar (corregir)**
4. Identificar 3 procesos críticos que deben sistematizarse en SOPs antes del próximo deal
5. Documentar el post-mortem completo en Taskade "Post-Mortem — [Deal]" usando plantilla arriba. **Presentar al coach en sesión 1-a-1**

**📦 Entregable**
Documento de análisis en Taskade con métricas finales + lecciones + 3 SOPs prioritarios identificados.

**✅ Criterio de cierre**
Post-mortem completo + presentado al coach + 3 procesos priorizados para sistematizar.

**⚠️ Riesgos comunes**
- Saltarse el post-mortem (urgencia del próximo deal)
- Post-mortem solo cualitativo sin números
- No presentar al coach (pierde la perspectiva externa)

---

### 🎯 Tarea E5.1.2 — SOPs creados para cada etapa del proceso
**Tiempo estimado:** 4-6 horas por SOP (3-5 SOPs)

**📌 Qué hace el estudiante**
Crear Standard Operating Procedures (SOPs) escritos para los procesos críticos del negocio identificados en el post-mortem.

**🧠 Cómo conecta con el método**
Los SOPs son lo que permite delegar. Sin SOPs, todo el conocimiento está en la cabeza del estudiante y el negocio no puede crecer. Cada SOP documenta cómo hacer una tarea sin que la haga el dueño.

**🌐 Herramientas para SOPs**
- **Taskade** (estructura built-in)
- **Notion** → https://www.notion.so (alternativa potente para SOPs)
- **Tango** → https://www.tango.us (graba pasos en pantalla automáticamente)
- **Loom** → https://www.loom.com (video tutoriales para SOPs visuales)
- **Process Street** → https://www.process.st (SOPs en formato checklist)

**📋 Plantilla estándar de SOP (8 secciones):**

```
═══════════════════════════════════════════════════════════
SOP — [Nombre del Proceso]
Versión: 1.0 | Fecha: [DD/MM/AAAA] | Owner: [Nombre]
═══════════════════════════════════════════════════════════

1. OBJETIVO
[¿Para qué sirve este SOP? Resultado esperado al ejecutarlo]

2. RESPONSABLE
- Quién ejecuta: [Rol]
- Quién supervisa: [Rol]
- Quién aprueba: [Rol]

3. CUÁNDO SE EJECUTA
- Trigger: [Evento que activa el SOP]
- Frecuencia: [Diario/Semanal/Por deal/etc.]
- Duración esperada: [X horas]

4. HERRAMIENTAS NECESARIAS
- [Software, plantillas, accesos requeridos]

5. PASOS (numerados, accionables)
1. [Acción específica + criterio de éxito]
2. [...]
3. [...]
...
N. [...]

6. CRITERIOS DE ÉXITO
- [Cómo saber que el SOP se ejecutó bien]
- [Métricas/KPIs aplicables]

7. CASOS ESPECIALES Y EXCEPCIONES
- Si [situación X] → entonces [acción Y]
- [...]

8. CHECKLIST FINAL
□ Item 1
□ Item 2
□ Item 3
═══════════════════════════════════════════════════════════
```

**📋 SOPs Críticos a documentar primero (Top 5):**
```
SOP #1: Evaluación de Deal (E1.4 + E2.3.5)
SOP #2: Solicitud y Aprobación de HML (E2.1)
SOP #3: Gestión Semanal de Obra (E3.1 + E3.2)
SOP #4: Listing y Marketing (E4.3)
SOP #5: Closing y Post-Cierre (E4.4 + E5.1.1)
```

**🪜 Paso a paso**
1. Tomar los 3-5 procesos priorizados en E5.1.1
2. Por cada proceso, escribir el SOP usando la plantilla arriba con TODOS los pasos numerados
3. **Validar el SOP** haciendo que otra persona (PM, asistente, VA) ejecute el proceso siguiendo solo el documento. Sin tu ayuda
4. Ajustar el SOP según fricciones encontradas en la prueba (donde la persona se perdió, faltó info, etc.)
5. Subir los SOPs al portal de Taskade en sección "SOPs del Negocio". Versionar cada uno (1.0, 1.1, etc.)

**📦 Entregable**
3-5 SOPs documentados en Taskade + validados con prueba real.

**✅ Criterio de cierre**
Cada SOP probado por una persona diferente al estudiante con resultado satisfactorio.

**⚠️ Riesgos comunes**
- SOPs genéricos sin pasos específicos
- No validar con tercero (asume claridad que no existe)
- No versionar (el SOP se desactualiza sin trazabilidad)

---

## Punto Clave 5.2 — Capital y Financiamiento

---

### 🎯 Tarea E5.2.1 — Red de financiadores privados en construcción
**Tiempo estimado:** Cadencia continua (5-10h/mes)

**📌 Qué hace el estudiante**
Construir activamente red de mínimo 10 private lenders interesados en financiar deals futuros.

**🧠 Cómo conecta con el método**
Para hacer 5-10 deals simultáneos, el HML no alcanza (limita por experiencia, concentración, costos). El private money es el capital que permite escalar sin tope.

**🌐 Herramientas para pitch deck**
- **Canva** → https://www.canva.com (templates de pitch deck)
- **Beautiful.ai** → https://www.beautiful.ai (pitch decks profesionales)
- **PowerPoint / Keynote** → tradicionales

**📋 Pitch Deck para Private Money (5-7 slides):**

```
SLIDE 1: PORTADA
- Nombre del negocio (LLC name)
- Tagline corto
- Foto profesional del estudiante
- Contacto

SLIDE 2: TRACK RECORD
- # flips completados: __
- Ganancia neta total: \$__
- ROI promedio: __%
- Tiempo promedio por flip: __ meses
- Fotos antes/después de 1-2 deals destacados

SLIDE 3: ESTRATEGIA Y MERCADO
- Mercados que cubre (tu mercado)
- Buy Box resumido
- Modelo de negocio (Fix & Flip / Fix & Hold)
- Por qué este mercado

SLIDE 4: LA OPORTUNIDAD PARA EL INVERSIONISTA
- Términos del préstamo: 8-10% anual
- Plazo: 6-12 meses
- Garantía: 1st lien position en la propiedad
- Documentación: Note + Deed of Trust

SLIDE 5: PROTECCIÓN DEL CAPITAL
- LTV máximo: __%
- Equity buffer mínimo: __%
- Insurance coverage
- Estados mensuales al lender
- Visitas a propiedad disponibles

SLIDE 6: PROYECCIONES Y EJEMPLO
- Si inviertes \$100K al 9%:
  - Intereses anuales: \$9,000
  - Capital regresa al cierre del flip
  - Posibilidad de reinvertir
- Ejemplo de deal histórico (números reales)

SLIDE 7: CALL TO ACTION
- Próximos pasos
- Información de contacto
- "¿Hablemos?"
```

**🌐 Dónde encontrar private lenders adicionales**
- Eventos REIA (E2.2) — pasan inversores con capital
- LinkedIn — buscar "real estate investor" + tu ciudad
- Referidos de los 5 contactos iniciales de E2.1.3
- Círculo profesional propio (médicos, abogados, empresarios)
- Mastermind groups de inversores

**🪜 Paso a paso**
1. Partir de 5 contactos identificados en E2.1.3 y ampliar a 10 nuevos cada trimestre
2. Crear pitch deck (5-7 slides) con plantilla arriba
3. Agendar conversaciones mensuales con 3-5 nuevos contactos potenciales (referidos, eventos, círculo profesional)
4. **Mantener cadencia trimestral** de actualización con la red completa: enviar reporte de proyectos activos y cerrados
5. Documentar en Taskade "Private Money Pipeline" con estado: prospecto / conversación / comprometido / activo

**📦 Entregable**
Pitch deck en Taskade + pipeline con 10 contactos clasificados por estado.

**✅ Criterio de cierre**
Mínimo 3 private lenders en estado "comprometido" listos para financiar próximos deals.

**⚠️ Riesgos comunes**
- Pitch deck sin track record (no genera confianza)
- No mantener cadencia trimestral (la red se enfría)
- Mezclar private money sin estructura legal

---

### 🎯 Tarea E5.2.2 — Sistema de generación de leads activo
**Tiempo estimado:** 8-12 horas iniciales + cadencia mensual

**📌 Qué hace el estudiante**
Construir sistema automatizado de generación de leads de deals que opere sin depender 100% del wholesaler.

**🧠 Cómo conecta con el método**
Depender solo de wholesalers limita el flow al ritmo del wholesaler. Generar leads propios diversifica el pipeline y mejora márgenes (sin comisión wholesaler).

**🌐 Canales de generación de leads (elegir 2)**

**1. DIRECT MAIL (cartas a propietarios)**
- **Skip tracing tools:** PropStream → https://www.propstream.com, BatchSkipTracing → https://batchskiptracing.com
- **Mail services:** Lob → https://www.lob.com, Click2Mail → https://www.click2mail.com
- **List sources:** Absentee owners, pre-foreclosure, probate, expired listings, tax delinquent
- **Costo:** \$0.50-\$1.50 por carta + lista skip traced
- **Tasa conversión esperada:** 1-3%

**2. DRIVING FOR DOLLARS**
- **App principal:** DealMachine → https://www.dealmachine.com (foto + skip trace + mail)
- **Alternativa:** PropStream Mobile App
- **Proceso:** manejar por ZIPs del Buy Box buscando casas "distressed" (jardín mal cuidado, techo dañado, ventanas tapiadas)
- **Costo:** \$59-\$199/mes app + skip trace per lead
- **Tasa conversión esperada:** 2-5%

**3. COLD CALLING**
- **Dialer:** Mojo Dialer → https://www.mojosells.com, BatchLeads → https://batchleads.io
- **Listas:** PropStream pulled lists
- **Scripts:** investor scripts (templates en BiggerPockets)
- **Costo:** \$99-\$299/mes + lista
- **Tasa conversión esperada:** 1-2% pero alto volumen

**4. FACEBOOK ADS / SOCIAL MEDIA**
- **Plataforma:** Facebook Ads Manager → https://www.facebook.com/business
- **Tipo de ad:** Lead generation ad apuntando a propietarios cansados
- **Costo:** \$20-\$50/lead
- **Tasa conversión esperada:** 5-10% lead a appointment

**5. WEBSITE + SEO**
- **Plataforma:** Carrot → https://www.oncarrot.com (websites para investors)
- **Costo:** \$99/mes + ads tráfico
- **Tasa conversión esperada:** orgánico lento pero high quality

**📊 Métricas de tracking:**
```
INPUT METRICS (esfuerzo)
- # contactos enviados (cartas, llamadas, ads visualizaciones)
- \$\$ gastados por mes

OUTPUT METRICS (resultados)
- # respuestas recibidas
- # conversaciones
- # appointments
- # ofertas enviadas
- # deals cerrados
- Costo por deal cerrado

KPI CLAVE: \$\$ por deal vs comisión de wholesaler (\$5,000-\$20,000)
```

**🪜 Paso a paso**
1. Elegir 1-2 canales de generación (recomendado: empezar con Direct Mail o Driving for Dollars)
2. Implementar el primer canal con 100 contactos iniciales (cartas, llamadas, conducciones)
3. Medir conversión semanal: contactos enviados → respuestas → conversaciones → ofertas
4. Después de 60 días, evaluar **costo por deal cerrado vs costo de wholesaler.** Comparar con \$5K-\$20K que paga el wholesaler en su margen
5. Documentar el sistema en Taskade como SOP para repetirlo cada mes. Si funciona, escalar el canal

**📦 Entregable**
Sistema activo en 1 canal + SOP documentado + métricas mensuales.

**✅ Criterio de cierre**
Mínimo 1 deal cerrado vía canal propio en los primeros 90 días del sistema activo.

**⚠️ Riesgos comunes**
- Probar todos los canales a la vez (no se domina ninguno)
- No medir conversión por etapa
- Abandonar antes de 60 días (los canales necesitan tiempo)

---

## Punto Clave 5.3 — Equipo y Delegación

---

### 🎯 Tarea E5.3.1 — Contratar Project Manager
**Tiempo estimado:** 20-30 horas (proceso de contratación)

**📌 Qué hace el estudiante**
Contratar Project Manager (PM) que asuma la ejecución diaria de obra mientras el estudiante se enfoca en buscar deals.

**🧠 Cómo conecta con el método**
La trampa del flipper es quedarse atrapado en E3 (ejecución) y nunca volver a E1 (evaluación). Sin PM, 2-3 flips al año. Con PM, 8-12. Libera el cuello de botella más importante para escalar.

**🌐 Dónde publicar la vacante**
- **LinkedIn Jobs** → https://www.linkedin.com/jobs (calidad alta)
- **Indeed** → https://www.indeed.com (volumen)
- **ZipRecruiter** → https://www.ziprecruiter.com (rápido)
- **Glassdoor** → https://www.glassdoor.com
- **AngelList** → https://wellfound.com (para startups y proyectos pequeños)
- **Builtin tu ciudad** → https://builtin.com/austin (tech-savvy local)
- **Facebook Groups:** "tu ciudad Construction Jobs", "Real Estate Jobs tu ciudad"
- **Referidos de la red** (E2.2, E2.4)

**📋 Perfil del PM ideal:**
```
EXPERIENCIA
- 3+ años en residential rehab o property management
- Experiencia con flippers (preferible)
- Manejo de 3-5 obras simultáneas
- Conocimiento de tu mercado market

HARD SKILLS
- Excel/Google Sheets avanzado
- Software de PM (Asana, ClickUp, Taskade, etc.)
- Lectura de blueprints y SOWs
- Conocimiento de permisos y inspecciones
- Manejo de subcontratistas

SOFT SKILLS
- Comunicación clara escrita y verbal
- Bilingual (inglés/español) — gran plus en tu ciudad
- Negociación con GCs y subs
- Resolución de problemas bajo presión
- Atención al detalle

COMPENSACIÓN (tu ciudad 2026 ranges)
- Salario base: \$55K-\$75K/año
- Bonus por proyecto: \$1K-\$3K por flip cerrado a tiempo y presupuesto
- Total package: \$65K-\$95K/año
```

**📋 Job description template:**
```
JOB TITLE: Project Manager — Real Estate Investment

ABOUT US: [LLC name] is a real estate investment firm focused 
on Fix & Flip in tu mercado. We've completed [X] flips 
since [year] and are scaling to [Y] projects/year.

WHAT YOU'LL DO:
- Manage 3-5 active flip projects simultaneously
- Coordinate GCs, subs, and inspections
- Maintain budgets and timelines
- Weekly reporting to ownership
- Field problem-solving and decision-making

REQUIREMENTS:
[Lista del perfil arriba]

WHAT WE OFFER:
- Competitive salary + project bonuses
- Equity opportunity after 1 year (TBD)
- Growth path to Operations Director
- [Otros beneficios]

HOW TO APPLY:
Send resume + 1 paragraph about a challenging project 
you managed to [email]
```

**📋 Proceso de entrevista (3 rondas):**
```
RONDA 1 — Screening (30 min, virtual)
- Validar experiencia
- Cultural fit inicial
- Expectativa salarial
- Preguntas básicas técnicas

RONDA 2 — Entrevista técnica (60 min, presencial)
- Caso real: dar un SOW y pedir cronograma + budget
- Preguntas sobre permisos tu ciudad
- Manejo de hipotéticos problemas
- Conocer al GC primario y química

RONDA 3 — Prueba pagada (2 semanas, \$1,500-\$3,000)
- Asignar 1 proyecto activo siguiendo SOPs de E5.1.2
- Evaluar ejecución real
- Decisión final
```

**🪜 Paso a paso**
1. Definir el perfil del PM (referencia arriba). Documentar job description
2. Publicar la vacante en LinkedIn + Indeed + ZipRecruiter + red de referidos
3. Entrevistar mínimo 5 candidatos en 2 rondas (screening + técnica)
4. **Hacer prueba pagada de 2 semanas** con el finalista usando los SOPs de E5.1.2
5. Contratar formalmente con **contrato escrito que defina KPIs, salario base, bonos por proyecto, expectativas de comunicación**

**📦 Entregable**
Contrato firmado + PM en operación + 1 obra delegada totalmente.

**✅ Criterio de cierre**
PM operando autónomamente con SOPs + estudiante reduce tiempo en obra mínimo 60%.

**⚠️ Riesgos comunes**
- Contratar sin prueba pagada (descubrir fit después de 3 meses)
- No tener SOPs antes de contratar (PM no tiene cómo operar)
- Micromanage al PM (anula el propósito de contratarlo)

---

### 🎯 Tarea E5.3.2 — Metas para el próximo año definidas
**Tiempo estimado:** 4-6 horas

**📌 Qué hace el estudiante**
Definir formalmente metas del negocio para los próximos 12 meses con números específicos.

**🧠 Cómo conecta con el método**
Sin metas, el estudiante avanza sin destino. Las metas convierten el negocio en sistema medible y alinean decisiones (contrataciones, capital, mercados).

**🌐 Herramientas**
- **OKRs framework** (Objectives + Key Results)
- **EOS Traction** → https://www.eosworldwide.com (framework escalamiento)
- **Notion/Taskade dashboard** para tracking
- **Google Sheets** para modelo financiero

**📋 Plantilla Plan Anual (5 secciones):**

```
═══════════════════════════════════════════════════════════
PLAN ANUAL — [Año]
[LLC name]
═══════════════════════════════════════════════════════════

1. METAS DE DEALS
Fix & Flip:
- Total cerrados: __
- ROI promedio target: __%
- Ganancia neta por deal: \$__

Fix & Hold:
- Total adquiridos: __
- Cash flow mensual target: \$__
- Cap rate promedio: __%

TOTAL DEALS: __

2. METAS FINANCIERAS
- Ingreso bruto: \$__
- Ganancia neta: \$__
- ROI promedio: __%
- Margen neto: __%

DESGLOSE TRIMESTRAL:
                Q1      Q2      Q3      Q4
Flips:          __      __      __      __
Holds:          __      __      __      __
Ingreso:        \$       \$       \$       \$
Ganancia:       \$       \$       \$       \$

3. METAS DE EQUIPO
Roles a contratar:
- [Posición + cuándo + salario]
Estructura organizacional final:
- [Org chart simplificado]

4. METAS DE CAPITAL
Necesidad total: \$__
Mezcla:
- HML: \$__ (__%)
- Private Money: \$__ (__%)
- Equity propia: \$__ (__%)
- HELOC: \$__ (__%)

5. METAS OPERATIVAS
- # SOPs documentados: __
- Sistemas implementados: [Lista]
- Tecnología/software a adoptar: [Lista]
- Nuevos mercados a evaluar: [Lista]

REVISIONES TRIMESTRALES PROGRAMADAS:
- Q1 Review: [Fecha]
- Q2 Review: [Fecha]
- Q3 Review: [Fecha]
- Q4 Review: [Fecha]
═══════════════════════════════════════════════════════════
```

**🪜 Paso a paso**
1. Definir meta de deals: # Fix & Flips + # Fix & Holds para próximos 12 meses (basado en track record + capacidad equipo)
2. Definir meta financiera: ingreso bruto, ganancia neta, ROI promedio por deal
3. Definir meta de equipo: roles a contratar, salarios proyectados, estructura final
4. Definir meta de capital: necesidad total + mezcla entre HML, private money, equity, HELOC
5. Documentar todo en Taskade "Plan Anual — [Año]" + agendar revisiones trimestrales en calendario

**📦 Entregable**
Plan anual en Taskade con metas, KPIs y revisión trimestral agendada.

**✅ Criterio de cierre**
Plan firmado por el estudiante + compartido con coach + revisiones trimestrales en calendario.

**⚠️ Riesgos comunes**
- Metas demasiado optimistas (10x el track record)
- No alinear metas con capacidad real de capital
- No agendar revisiones (plan que no se mide se olvida)

---

## Punto Clave 5.4 — Expansión y Escalabilidad

---

### 🎯 Tarea E5.4.1 — Múltiples deals simultáneos con estructura
**Tiempo estimado:** Cadencia operativa permanente

**📌 Qué hace el estudiante**
Gestionar mínimo 3 deals simultáneos sin perder control de cronograma, presupuesto ni calidad.

**🧠 Cómo conecta con el método**
La diferencia entre flipper de 1 deal y negocio de flips son los deals simultáneos. Requiere todo lo construido en E5.1 (SOPs), E5.2 (capital diversificado) y E5.3 (equipo).

**🌐 Herramientas para portfolio management**
- **Taskade Dashboard view** (built-in)
- **Notion Database** → https://www.notion.so para portfolio
- **Airtable** → https://www.airtable.com (potente para tracking)
- **Monday.com** → https://www.monday.com

**📋 Dashboard Ejecutivo de Portfolio (KPIs por deal):**

```
DEAL #1: [Dirección]
├── Fase actual: [E2/E3/E4]
├── Días en fase: __ días
├── Cronograma: __% completado vs __% planeado
├── Presupuesto: \$__ gastado de \$__ ( __%)
├── Variación: \$__ (+/-)
├── ROI proyectado: __%
├── Responsable: [PM/Estudiante]
└── Próximo hito: [Acción + fecha]

DEAL #2: [Dirección]
├── [Mismo formato]

DEAL #3: [Dirección]
├── [Mismo formato]

═══════════════════════════════════════════════════════════
PORTFOLIO SUMMARY
- Capital comprometido: \$__
- ROI promedio proyectado: __%
- Bottlenecks recurrentes: [Lista]
- Acciones esta semana: [Lista]
═══════════════════════════════════════════════════════════
```

**📋 Reunión Semanal de Portfolio (1 hora):**
```
MINUTOS 1-10: Vista general de los 3 deals
- Estado actual de cada uno
- Alertas críticas

MINUTOS 10-30: Deep dive por deal (10 min cada uno)
- Avance vs plan
- Issues y decisiones requeridas
- Próximos hitos

MINUTOS 30-45: Bottlenecks compartidos
- Patrones recurrentes
- Acciones sistémicas

MINUTOS 45-60: Próxima semana
- Prioridades del portfolio
- Asignaciones
- Recursos requeridos
```

**🪜 Paso a paso**
1. Tomar 3 deals en distintas fases del pipeline (uno en E2, uno en E3, uno en E4) y asignar responsables del equipo (incluye PM de E5.3.1)
2. Implementar reunión semanal de portfolio (1 hora) que revise los 3 deals con KPIs clave
3. Usar dashboard ejecutivo único en Taskade (template arriba) que muestre: días en cada fase, % gastado vs presupuesto, ROI proyectado
4. Identificar bottlenecks recurrentes entre los 3 deals y atacarlos con SOPs adicionales o contrataciones
5. Documentar mensualmente el portfolio en bitácora ejecutiva para revisión con coach

**📦 Entregable**
Dashboard de portfolio activo + 3 deals corriendo sin descarrilar.

**✅ Criterio de cierre**
3 deals simultáneos sostenidos por mínimo 90 días sin desviarse más de 10% en presupuesto o cronograma.

**⚠️ Riesgos comunes**
- Manejar 3 deals con misma intensidad que 1 (quemar al equipo)
- No tener dashboard centralizado (información dispersa)
- Saltarse la reunión semanal en semanas tranquilas

---

### 🎯 Tarea E5.4.2 — Evaluar expansión a segundo mercado
**Tiempo estimado:** 20-40 horas (proceso de evaluación)

**📌 Qué hace el estudiante**
Estudio de viabilidad para expandir el negocio a un segundo mercado (Houston, Phoenix, Miami u otro identificado).

**🧠 Cómo conecta con el método**
Un solo mercado limita el crecimiento. Expansión multiplica el universo de deals y diversifica riesgo macroeconómico. Aplica toda la metodología E1-E4 a un mercado nuevo de forma estructurada.

**🌐 Recursos para análisis de mercado**
- **Census Quick Facts** → https://www.census.gov/quickfacts (datos demográficos)
- **BLS Employment Data** → https://www.bls.gov (empleo y salarios por ciudad)
- **Zillow Research** → https://www.zillow.com/research (tendencias precio)
- **Redfin Data Center** → https://www.redfin.com/news/data-center
- **BiggerPockets Best Markets** → https://www.biggerpockets.com/insights
- **HouseCanary** → https://www.housecanary.com (forecasting)
- **NeighborhoodScout** → https://www.neighborhoodscout.com

**📋 Mercados objetivo de Rental Profitss (de Phase 1):**
```
Houston TX:
- Coliving y room-by-room
- REIA presencia: Houston RENC

Phoenix AZ:
- Mercado migración fuerte
- Sober living, assisted living

Miami FL:
- Vacation rental + flips
- Población latina (negocio bilingüe)
```

**📋 Criterios de evaluación del nuevo mercado (10 puntos):**
```
1. Tendencia precios últimos 24 meses (no en pico)
2. Tendencia rentas (crecimiento sostenido)
3. DOM promedio < 60 días
4. Crecimiento poblacional > 1% anual
5. Crecimiento empleo > nacional
6. Diversidad económica (no single-industry)
7. Regulación favorable (no rent control agresivo)
8. Disponibilidad de wholesalers activos
9. HMLs locales con buen track record
10. Costo de entrada vs tu ciudad (lower = mejor para piloto)
```

**🪜 Paso a paso**
1. **Aplicar embudo completo de investigación (E1.2)** al mercado candidato: DOM, precios, demanda, regulación. Usar fuentes arriba
2. **Visitar físicamente el mercado mínimo 2 veces** antes de tomar decisión. Una visita exploratoria + una visita con foco en deals específicos
3. **Construir red inicial:** 5 HML, 10 wholesalers, 3 GCs en el nuevo mercado siguiendo las tareas de E2 (E2.1, E2.3, E2.4)
4. **Pilotear con 1 deal del nuevo mercado** antes de comprometer capital agresivamente. Si funciona, escalar
5. Documentar la decisión y plan de expansión en Taskade "Plan de Expansión — [Mercado]"

**📦 Entregable**
Estudio de viabilidad en Taskade + 1 deal piloto cerrado o decisión justificada de no expandir.

**✅ Criterio de cierre**
Decisión final tomada con datos: expandir + plan ejecutándose, o no expandir + razones documentadas.

**⚠️ Riesgos comunes**
- Expandir antes de tener tu ciudad sistematizado (escala el caos)
- No visitar físicamente el mercado (decisión solo en data)
- Pilotear con > 1 deal (riesgo concentrado en mercado no probado)

---

*Fin Etapa E5 — Escalar · Sistema enriquecido con templates, frameworks y herramientas para escalar el negocio*
$FM0J605W$,
  60,
  ARRAY['SOPs', 'PM', 'expansion', 'privatemoney', 'postmortem', 'plananual']::text[],
  '{}'::jsonb
);

-- ─── ANEXO_A · caso_estudio · 📚 Anexo A · Caso de Estudio Completo ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'ANEXO_A',
  'caso_estudio',
  null,
  $FMA3887I$📚 Anexo A · Caso de Estudio Completo$FMA3887I$,
  $FMA3887I$Flip real \$215K compra · \$390K venta · \$79K ganancia · 26.7% ROI · 5 meses$FMA3887I$,
  $FMA3887I$# 📚 ANEXO A — CASO DE ESTUDIO COMPLETO
**Un Flip Real de Principio a Fin con Números Reales**

> Este caso ilustra cómo se aplica la metodología E1-E5 a un flip real. Los números, decisiones y errores son reales (con detalles cambiados por privacidad). El estudiante debe estudiarlo ANTES de hacer su primer deal — para anticipar problemas comunes y entender el ritmo del proceso.

---

## 🏠 EL DEAL — Resumen Ejecutivo

```
PROPIEDAD:        SFH 3 hab / 2 baños / 1,650 sqft
UBICACIÓN:        Zona B (Mid-market, USA)
ESTRATEGIA:       Fix & Flip
ADQUISICIÓN:      \$215,000 (off-market vía wholesaler)
REHAB REAL:       \$58,400 (presupuesto: \$52,000)
COSTOS HOLDING:   \$11,200 (5 meses)
COMISIONES:       \$19,500 (5% de venta)
CLOSING COSTS:    \$6,800 (compra + venta)
PRECIO VENTA:     \$390,000 (lista \$399K, vendida en 23 días)
GANANCIA NETA:    \$79,100
ROI:              26.7%
DURACIÓN TOTAL:   5 meses (compra a closing de venta)
```

---

## 📅 TIMELINE COMPLETO MES POR MES

---

### **MES 1 — ADQUISICIÓN (E1 → E2 → E3 inicio)**

**Semana 1: El deal llega**
- Día 3: Wholesaler envía deal por email a las 7:42am
- Día 3: Estudiante aplica filtro 30 segundos → ZIP en Buy Box ✓ / Precio \$215K ✓ / SFH ✓
- Día 3: Análisis rápido (15 min): ARV estimado \$385K-\$400K, rehab estimado \$50K-\$60K, MAO calculado \$239K. **DEAL PASA filtro**
- Día 3, 9:15am: Respuesta al wholesaler — "Interested. Need to see today. What time works?"
- Día 3, 4pm: Visita propiedad con GC primario (de E2.4.5). 45 min walking through. GC confirma rehab estimado en \$52K
- Día 4: Estudiante hace oferta formal con LOI por \$215K (precio de wholesaler — wholesaler no negociaba)
- Día 5: Wholesaler acepta. Earnest money \$2,500. Closing en 12 días

**Semana 2: Due diligence acelerada**
- Inspección general \$475 → encontró: foundation con grietas menores OK, plumbing original pero funcional, electrical actualizado, HVAC 8 años (OK), techo 12 años (OK con 5-8 años de vida útil)
- Verificación flood zone (FEMA) → zona X (segura) ✓
- Verificación liens en County Assessor → propiedad limpia ✓
- Verificación zonificación → SF residencial, sin restricciones ✓
- HML primario (Kiavi) aprueba financiamiento en 5 días: \$215K precio + \$52K rehab = \$267K total. LTC 90% = \$24K equity del estudiante

**Semana 3-4: Closing y empezar obra**
- Día 17: Closing exitoso. Title transferida a LLC del estudiante
- Día 18: GC empieza demo
- Día 21: Permits aplicados en Building Department (4 trade permits: electrical, plumbing, HVAC, building)

**💰 Capital comprometido al final del mes 1:**
- Earnest money: \$2,500
- Closing costs compra: \$4,200
- Down payment / equity al HML: \$24,000
- Inicio rehab (10% draw al GC): \$5,200
- **Total invertido del estudiante: \$35,900**

---

### **MES 2 — DEMO Y ROUGH-IN (E3)**

**Semana 5-6: Demo completado**
- Sorpresa #1 ❗ Al demoler kitchen: encontraron **galvanized plumbing oculto** que debía reemplazarse (no era PEX como se asumió). Costo adicional: **\$3,200**. Change order #1 firmado.
- Sorpresa #2 ❗ Foundation tenía 1 grieta más profunda de lo visible inicialmente. Engineering report requerido por permit office: **\$650 + \$1,800 reparación**. Change order #2.
- Visita de obra: 3 veces/semana (lunes, miércoles, viernes)
- Bitácora semanal subida a Taskade cada viernes
- Draw #2 al GC (\$7,800 — 15% del rehab original ajustado)

**Semana 7-8: Rough-in**
- Electrical rough completado y aprobado en inspección (primer try ✓)
- Plumbing rough completado pero **falló inspección** (faltaba shut-off valve en bathroom secundario). Retrabajo 2 días. Costo: \$0 (error del GC, su costo)
- HVAC rough completado y aprobado ✓
- Framing inspection: aprobado
- Insulation: instalada y aprobada
- Draw #3 al GC (\$10,400 — 20% del rehab ajustado)

**💰 Status financiero al final del mes 2:**
- Capital total invertido: \$42,300
- Cronograma: 1 semana retraso vs plan (por sorpresas)
- Presupuesto: +\$5,650 sobre lo planeado (sorpresas)
- **Lección aprendida:** la contingencia del 12% (\$6,240) absorbió las sorpresas. Sin ella, el deal habría perdido margen significativo.

---

### **MES 3 — DRYWALL Y ACABADOS (E3)**

**Semana 9-10: Drywall y pintura**
- Drywall instalado, fugazmente. Inspección aprobada ✓
- Pintura interior completa: gris claro neutral + trim blanco
- Pintura exterior: actualizada a color moderno (consultando con agente de E4)
- Draw #4 (\$10,400 — 20%)

**Semana 11-12: Cocina y baños**
- Cabinets instalados (white shaker) — \$9,200 en materiales
- Quartz countertops instalados — \$4,800
- Tile en kitchen backsplash — \$1,400
- Cocina appliances instalados (paquete Whirlpool gama media) — \$3,800
- Baños: vanities nuevas, mirrors, hardware, tubs reglazed, toilets nuevos — \$11,200 total
- Sorpresa #3 ❗ El plomero tuvo que regresar 2x por leak menor en kitchen sink → resuelto sin costo adicional

**💰 Status financiero al final del mes 3:**
- Capital total invertido: \$55,800
- Cronograma: 1.5 semanas retraso vs plan
- Presupuesto: ahora \$5,800 sobre el plan original (\$57,800 vs \$52,000)
- Draw #5 al GC (\$13,000 — 25%)

---

### **MES 4 — ACABADOS Y FINAL INSPECTIONS (E3 → E4 inicio)**

**Semana 13: Acabados finales**
- Pisos LVP instalados en toda la casa (excepto baños con tile) — \$7,800
- Trim, baseboards, doors instalados
- Light fixtures actualizados — \$1,400
- Hardware en puertas y cabinets — \$600

**Semana 14: Inspecciones finales**
- Final Electrical: aprobado ✓
- Final Plumbing: aprobado ✓
- Final Mechanical: aprobado ✓
- Final Building (Certificate of Occupancy): aprobado ✓
- Last draw al GC (\$5,200 — 10% retención)

**Semana 15: Preparación para listing (E4 inicia)**
- Limpieza profunda contratada — \$450
- Yard cleanup y landscaping ligero — \$850
- Staging contratado: stager local recomendada por agente → \$3,200/mes (proyectado 2 meses máximo)
- Sesión fotos profesionales: \$750 (paquete completo con drone y video)
- Floor plan profesional: \$150 (incluido en paquete)

**💰 Status financiero al final del mes 4:**
- Capital total invertido: \$69,100 (incluyendo prep para venta)
- Rehab final: **\$58,400** vs presupuesto \$52,000 (+12.3%)
- Holding costs hasta ahora: \$8,400 (intereses HML + utilities + insurance + taxes proratados)

---

### **MES 5 — LISTING, VENTA Y CLOSING (E4)**

**Semana 16: Listing día 1**
- Listing activo en MLS + Zillow + Realtor.com + Redfin + Facebook Marketplace
- Precio de lista: **\$399,000** (ARV target \$400K, justo bajo el threshold psicológico)
- Open house programado para sábado siguiente

**Semana 17: Primera semana de listing**
- Lunes: 8 showings agendados
- Martes: 4 showings adicionales
- Sábado open house: 23 personas asistieron
- **Domingo: primera oferta recibida → \$385,000** (cash, 14-day close, no inspection contingency)

**Semana 18: Negociación**
- Estudiante contraoferta: \$395,000 mismas condiciones
- Oferente contraoferta: \$390,000 mismas condiciones
- **Estudiante acepta \$390,000** (sobre el walking number de \$382K calculado en E4.2.2)
- Contrato firmado el día 23 desde listing

**Semana 19-20: Closing**
- Title work iniciado
- Comprador hizo inspección "informativa" (no contingency) → reportó 2 issues menores
- Estudiante concedió \$1,200 credit al closing
- **Closing exitoso día 35 desde listing**
- Holding final: 5 meses + 1 semana

---

## 💵 NÚMEROS FINALES — POST CLOSING

```
═══════════════════════════════════════════════════════════
INGRESOS:
  Precio de venta:                          \$390,000
  Credit al comprador:                       -\$1,200
  Precio neto:                              \$388,800

COSTOS DE ADQUISICIÓN:
  Precio de compra:                         \$215,000
  Closing costs compra:                       \$4,200
  Earnest money:                              \$2,500
  Inspección general:                           \$475
  
COSTOS DE REMODELACIÓN:
  Rehab presupuestado:                       \$52,000
  Change orders (sorpresas):                  \$6,400
  TOTAL REHAB:                               \$58,400

COSTOS DE PERMISOS:
  4 trade permits:                              \$850
  Engineering report (foundation):              \$650

COSTOS DE HOLDING (5 meses):
  Intereses HML (12% sobre \$193,500):         \$9,675
  Property taxes prorrateadas:                 \$785
  Insurance durante obra:                      \$420
  Utilities:                                   \$320

COSTOS DE SALIDA:
  Staging (2 meses):                         \$6,400
  Fotografía profesional:                      \$750
  Comisión agente (5%):                     \$19,500
  Closing costs venta:                       \$2,600
  Marketing extra:                             \$200

═══════════════════════════════════════════════════════════
TOTAL DE COSTOS:                            \$309,725

GANANCIA NETA = \$388,800 − \$309,725 =        \$79,075

CAPITAL DEL ESTUDIANTE INVERTIDO:
  Down payment al HML:                       \$24,000
  Closing costs compra:                       \$4,200
  Earnest money:                              \$2,500
  10% del rehab inicial (no financiado):     \$5,840
  Holding costs (cash flow durante obra):    \$11,200
  Marketing/staging (cash flow):              \$7,150
  TOTAL CASH INVERTIDO:                     \$54,890

ROI sobre capital invertido = \$79,075 / \$54,890 = 144%
ROI sobre proyecto total = \$79,075 / \$309,725 = 25.5%
ROI anualizado = 25.5% × (12/5) = 61.2%
═══════════════════════════════════════════════════════════
```

---

## 🎓 LECCIONES CLAVE DEL CASO

### Lo que funcionó bien
1. **Buy Box estricto** identificó el deal en 30 segundos cuando llegó del wholesaler
2. **GC primario disponible** permitió visita el mismo día y validación de rehab en 45 minutos
3. **HML pre-aprobado** de E2.1.5 permitió cerrar en 12 días
4. **Contingencia del 12%** absorbió las 3 sorpresas sin matar el deal
5. **Visitas 3x semana** mantuvieron al GC en cronograma
6. **Agente especializado en flip** generó 23 showings en open house y vendió en 23 días
7. **Walking number (\$382K)** evitó aceptar la primera oferta de \$385K — defendió \$5,000 adicionales

### Lo que falló (y lecciones aprendidas)
1. ❗ **Subestimación del plumbing oculto** — Lección: ahora hace inspección de plumbing específica antes de cerrar
2. ❗ **Foundation no inspeccionada por engineer** — Lección: para casas > 30 años, contratar engineering report durante due diligence
3. ❗ **GC se atrasó 1.5 semanas** vs plan — Lección: en próximo deal agregar 15% buffer al timeline del GC, no solo 10%
4. ❗ **No coordinó staging con sesión de fotos el mismo día** — Lección: agendar ambos el mismo día ahorra 1 semana de DOM

### Decisiones críticas que salvaron el deal
1. **Negociación de los \$5K extras al final** (\$385K → \$390K) → impacto directo en ganancia
2. **Aceptar el deal a precio de wholesaler** (sin negociar) porque los números cerraban con margen sólido
3. **No bajar precio de lista cuando llegaron offers** → mantener disciplina del walking number
4. **Conceder \$1,200 al closing** en lugar de pelear → cerró en tiempo vs reabrir negociación

---

## 📊 COMPARATIVO: PLANEADO vs REAL

```
                       PLANEADO     REAL      VARIACIÓN
─────────────────────────────────────────────────────────
Precio de compra       \$215,000   \$215,000     0%
Rehab                   \$52,000    \$58,400    +12.3%
Holding costs (intereses) \$7,500   \$9,675     +29%
Duración total          4 meses    5 meses    +25%
Precio de venta        \$395,000   \$390,000    -1.3%
Ganancia neta          \$85,000    \$79,075     -7%
ROI sobre proyecto       28%       25.5%      -2.5pts
─────────────────────────────────────────────────────────
```

**Conclusión:** El deal cerró un 7% bajo lo esperado en ganancia, pero seguía siendo un flip exitoso con ROI > 25%. Las variaciones se mantuvieron dentro de la contingencia, lo cual demuestra que la metodología funciona incluso cuando hay imprevistos.

---

## ✅ APLICACIÓN PARA EL ESTUDIANTE

Antes de hacer tu primer flip, contesta estas preguntas usando este caso de estudio:

```
1. ¿Tu Buy Box te permitiría identificar este deal en 30 segundos? 
   Si no, ¿qué le falta?

2. ¿Tu HML pre-aprobado puede cerrar en 12-14 días? 
   Si no, ¿cuál es el cuello de botella?

3. ¿Tu contingencia del 10-15% cubriría sorpresas similares 
   (galvanized plumbing, foundation crack)?

4. ¿Tu walking number está claro antes de listar? 
   ¿Cómo lo calcularías para este caso?

5. ¿Tienes GC primario que pueda visitar una propiedad el mismo día 
   con 4 horas de aviso?

6. ¿Tu cronograma incluye buffer del 15% para retrasos del GC?
```

Si alguna respuesta es "no" o "no estoy seguro", ahí está el área a fortalecer antes de tu primer deal.

---

*Caso de Estudio Completo — FlipMentoría · Aplicación práctica de la metodología E1-E5*
$FMA3887I$,
  70,
  ARRAY['caso', 'flip', 'numeros', 'timeline', 'austin']::text[],
  '{}'::jsonb
);

-- ─── ANEXO_B · calculadoras · 🧮 Anexo B · 10 Calculadoras y Plantillas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'ANEXO_B',
  'calculadoras',
  null,
  $FMHAMIK3$🧮 Anexo B · 10 Calculadoras y Plantillas$FMHAMIK3$,
  $FMHAMIK3$Deal Analyzer, ARV, MAO, Rehab, Breakeven, Draw Schedule, Budget, Pipeline, KPI, Cash Flow$FMHAMIK3$,
  $FMHAMIK3$# 🧮 ANEXO B — CALCULADORAS Y PLANTILLAS DESCARGABLES
**Hojas listas para usar en cada deal**

> Este anexo entrega las calculadoras y plantillas que el estudiante usará diariamente. Cada una está diseñada en formato copy-paste para Google Sheets o Excel — sin software adicional, sin suscripciones.

---

## 🧰 ÍNDICE DE PLANTILLAS

| # | Plantilla | Cuándo se usa | Etapa |
|---|-----------|---------------|-------|
| B.1 | Deal Analyzer (1-página) | Filtro rápido de deals entrantes | E1, E2 |
| B.2 | ARV Calculator detallado | Cálculo de ARV con comparables | E1.3 |
| B.3 | MAO Calculator (Regla 75%) | Antes de cada oferta | E1.4 |
| B.4 | Rehab Estimator | Estimación de remodelación | E1.3, E2.6 |
| B.5 | Breakeven Calculator | Estrategia de salida | E4.2 |
| B.6 | Draw Schedule Tracker | Durante la obra | E3 |
| B.7 | Budget Tracker (real vs plan) | Durante la obra | E3 |
| B.8 | Pipeline Tracker | Tracking de todos los deals | E1-E5 |
| B.9 | KPI Dashboard mensual | Revisión mensual del negocio | E5 |
| B.10 | Cash Flow Projection (12 meses) | Planeación anual | E5 |

---

## 📊 B.1 — DEAL ANALYZER (1-PÁGINA)

**Propósito:** Decidir en < 5 minutos si un deal entra al pipeline o pasa.

**Cómo usar:** Crear nueva hoja en Google Sheets / Excel. Pegar la siguiente estructura:

```
═══════════════════════════════════════════════════════════
DEAL ANALYZER — [Fecha] — [Dirección]
═══════════════════════════════════════════════════════════

INPUTS DEL ESTUDIANTE:
─────────────────────────────────────────────
Dirección:              [Llenar]
ZIP Code:               [Llenar]
Fuente:                 [Wholesaler/MLS/Off-market]
Tipo:                   [SFH/Duplex/Multifamiliar]
Hab / Baños / Sqft:     [#] / [#] / [#]
Lot Size:               [# sqft]
Año construcción:       [####]
Precio pedido:          \$[######]

INPUTS CALCULADOS:
─────────────────────────────────────────────
\$/sqft pedido:          =[Precio]/[Sqft]
\$/sqft promedio ZIP:    [De E1.3.1]
ARV conservador:        =[Sqft]*[\$/sqft ZIP]*0.95
ARV optimista:          =[Sqft]*[\$/sqft ZIP]*1.05

REHAB ESTIMADO:
─────────────────────────────────────────────
Nivel:                  [Ligera/Media/Pesada]
\$/sqft rehab:           [15-30/30-55/55-90]
Rehab estimado:         =[Sqft]*[\$/sqft rehab]
Contingencia (12%):     =[Rehab]*0.12
REHAB TOTAL:            =[Rehab]+[Contingencia]

CÁLCULO MAO:
─────────────────────────────────────────────
ARV conservador:        \$[######]
× 75%:                  =[ARV]*0.75
− Rehab total:          =[ARV]*0.75-[Rehab Total]
MAO:                    \$[######]

DECISIÓN AUTOMÁTICA:
─────────────────────────────────────────────
Gap (MAO vs Precio):    =MAO-Precio
% Gap:                  =((MAO-Precio)/Precio)*100

SI [Gap >= 0]:          ✅ OFERTAR INMEDIATAMENTE
SI [Gap entre -10% y 0%]: 🟡 NEGOCIAR
SI [Gap < -10%]:        ❌ PASAR
═══════════════════════════════════════════════════════════
```

**Fórmulas de Google Sheets/Excel:**

```javascript
// \$/sqft pedido
=B5/B4  // Donde B5 = precio, B4 = sqft

// ARV conservador
=B4*B7*0.95  // Sqft × \$/sqft ZIP × 0.95

// Rehab total
=B4*B9*(1+0.12)  // Sqft × \$/sqft rehab × 1.12 (con contingencia)

// MAO
=(B4*B7*0.95*0.75)-(B4*B9*1.12)

// Gap %
=((B11-B5)/B5)*100  // Donde B11 = MAO, B5 = Precio

// Decisión automática (formula combinada)
=IF(B12>=0,"✅ OFERTAR",IF(B12>=-10,"🟡 NEGOCIAR","❌ PASAR"))
```

---

## 📊 B.2 — ARV CALCULATOR DETALLADO

**Propósito:** Calcular ARV con precisión usando 3-5 comparables.

```
═══════════════════════════════════════════════════════════
ARV CALCULATOR — [Dirección Target]
═══════════════════════════════════════════════════════════

PROPIEDAD TARGET:
─────────────────────────────────────────────
Dirección:         [Llenar]
Sqft:              [####]
Hab / Baños:       [#] / [#]
Año:               [####]
Lot:               [#### sqft]

═══════════════════════════════════════════════════════════
COMPARABLES (mínimo 3, máximo 5):
═══════════════════════════════════════════════════════════

COMP #1:
  Dirección:       [Llenar]
  Distancia:       [#] millas
  Fecha venta:     [MM/AAAA]
  Precio vendida:  \$[######]
  Sqft:            [####]
  Hab / Baños:     [#] / [#]
  Condición:       [Renovada/Parcial/Original]
  \$/sqft:          =[Precio]/[Sqft]
  Link Zillow:     [URL]

[Repetir para Comp #2, #3, #4, #5]

═══════════════════════════════════════════════════════════
CÁLCULO PROMEDIO PONDERADO:
═══════════════════════════════════════════════════════════

\$/sqft Comp #1:    \$[###]  × Peso 30% (más cercano)  = \$[##]
\$/sqft Comp #2:    \$[###]  × Peso 25%                = \$[##]
\$/sqft Comp #3:    \$[###]  × Peso 20%                = \$[##]
\$/sqft Comp #4:    \$[###]  × Peso 15%                = \$[##]
\$/sqft Comp #5:    \$[###]  × Peso 10%                = \$[##]
                                              SUMA:  \$[###]

ARV BASE = \$/sqft ponderado × Sqft target = \$[######]

═══════════════════════════════════════════════════════════
AJUSTES POR DIFERENCIAS:
═══════════════════════════════════════════════════════════

+Baño extra (target tiene 1 más):     +\$15,000 a +\$25,000
+Garaje (target tiene, comps no):     +\$10,000 a +\$20,000
+ADU (target tiene):                  +\$25,000 a +\$50,000
±Diferencia lot > 30%:                ±[Variable]

AJUSTES TOTALES:   +\$[######] / -\$[######]

═══════════════════════════════════════════════════════════
ARV FINAL:
═══════════════════════════════════════════════════════════

ARV BASE:                \$[######]
+/- Ajustes:             \$[######]
                         ──────────
ARV CALCULADO:           \$[######]

ARV CONSERVADOR (-5%):   =[ARV]*0.95
ARV OPTIMISTA (+5%):     =[ARV]*1.05

USAR ARV CONSERVADOR PARA OFERTAS ✓
═══════════════════════════════════════════════════════════
```

---

## 📊 B.3 — MAO CALCULATOR (REGLA 75%)

**Propósito:** Calcular el precio máximo que se puede ofertar manteniendo margen.

```
═══════════════════════════════════════════════════════════
MAO CALCULATOR — Regla del 75%
═══════════════════════════════════════════════════════════

INPUTS:
─────────────────────────────────────────────
ARV conservador:           \$[######]
Rehab total (con cont):    \$[######]

CÁLCULO BÁSICO (Regla 75%):
─────────────────────────────────────────────
ARV × 75%:                 =[ARV]*0.75
− Rehab:                   -\$[######]
                           ──────────
MAO:                       \$[######]

═══════════════════════════════════════════════════════════
DESGLOSE DEL 25% RESERVA (qué cubre el 75%):
═══════════════════════════════════════════════════════════

Componente              %    Monto sobre ARV
─────────────────────────────────────────────
Ganancia mínima        15%   =[ARV]*0.15
Holding costs           5%   =[ARV]*0.05
Closing costs venta     3%   =[ARV]*0.03
Comisión 5%             5%   =[ARV]*0.05
Closing compra          2%   =[ARV]*0.02
RESERVA TOTAL          30%   (el 25% es mínimo)

═══════════════════════════════════════════════════════════
VALIDACIÓN — ¿El MAO permite margen ≥ 20%?
═══════════════════════════════════════════════════════════

Si MAO = precio de oferta:
  Costo total proyecto = MAO + Rehab + Holding + Closing
  Ganancia esperada    = ARV - Costo total
  Margen %             = Ganancia / Costo total

Ejemplo:
  ARV:           \$390,000
  MAO:           \$215,000
  Rehab:         \$58,000
  Holding (5m):  \$11,000
  Closing total: \$25,000
  ───────────────────────
  Costo total:   \$309,000
  Ganancia:      \$81,000
  MARGEN:        26.2% ✓ (>= 20% target)

═══════════════════════════════════════════════════════════
WALKING NUMBER (el precio MAX absoluto en negociación):
═══════════════════════════════════════════════════════════

MAO calculado:             \$[######]
+ Buffer negociación 3%:   =[MAO]*1.03
                           ──────────
WALKING NUMBER:            \$[######]

⚠️ NUNCA ofertar arriba del Walking Number, sin importar 
   qué tan "bueno" parezca el deal.
═══════════════════════════════════════════════════════════
```

---

## 📊 B.4 — REHAB ESTIMATOR

**Propósito:** Estimar costo de remodelación por categoría.

```
═══════════════════════════════════════════════════════════
REHAB ESTIMATOR — [Dirección]
═══════════════════════════════════════════════════════════

INPUTS:
Sqft:              [####]
Nivel rehab:       [Ligera/Media/Pesada]
Mercado:           [Bajo/Medio/Alto costo]

RANGOS POR MERCADO Y NIVEL:
                    LIGERA      MEDIA        PESADA
Bajo costo:        \$15-30/sf   \$30-55/sf   \$55-90/sf
Medio costo:       \$20-35/sf   \$35-65/sf   \$65-100/sf
Alto costo:        \$30-50/sf   \$50-90/sf   \$90-150/sf

═══════════════════════════════════════════════════════════
DESGLOSE POR CATEGORÍA:
═══════════════════════════════════════════════════════════

CATEGORÍA              LIGERA      MEDIA       PESADA
─────────────────────────────────────────────────────────
1. DEMO                \$500-1.5K   \$1.5K-3K    \$3K-6K
2. FRAMING/STRUCTURAL  \$0-2K       \$2K-8K      \$8K-25K
3. ELECTRICAL          \$2K-5K      \$5K-12K     \$12K-25K
4. PLUMBING            \$2K-5K      \$5K-12K     \$12K-25K
5. HVAC                \$0-3K       \$3K-10K     \$10K-18K
6. INSULATION          \$1K-2K      \$2K-3.5K    \$3.5K-5K
7. DRYWALL             \$1K-3K      \$3K-6K      \$6K-12K
8. PISOS               \$4K-8K      \$8K-15K     \$15K-25K
9. PINTURA INT+EXT     \$3K-6K      \$6K-12K     \$12K-20K
10. COCINA             \$8K-15K     \$15K-30K    \$30K-60K
11. BAÑOS (por baño)   \$3K-6K      \$6K-12K     \$12K-25K
12. EXTERIOR/LANDSCAPE \$1K-3K      \$3K-8K      \$8K-20K
─────────────────────────────────────────────────────────
SUBTOTAL:             \$[#####]    \$[#####]    \$[#####]

+ CONTINGENCIA:
  Ligera:    10%
  Media:     12-15%
  Pesada:    15%

REHAB TOTAL =          [Subtotal] × (1 + [Contingencia])

═══════════════════════════════════════════════════════════
CHECKLIST DE EXTRAS (sumar si aplica):
═══════════════════════════════════════════════════════════

□ Foundation repair               +\$2K-15K
□ Roof completo nuevo             +\$8K-20K
□ ADU agregada                    +\$50K-150K
□ Adición de sqft                 +\$150-300/sqft adicional
□ Pool repair/instalación         +\$8K-50K
□ Septic system                   +\$5K-25K
□ Well water                      +\$5K-15K
□ Driveway repaved                +\$3K-10K
□ Fence nuevo                     +\$2K-8K
□ Solar panels                    +\$10K-30K
═══════════════════════════════════════════════════════════
```

---

## 📊 B.5 — BREAKEVEN CALCULATOR

**Propósito:** Identificar el precio mínimo de venta que cubre todos los costos.

```
═══════════════════════════════════════════════════════════
BREAKEVEN CALCULATOR — [Dirección]
═══════════════════════════════════════════════════════════

COSTOS DE ADQUISICIÓN:
─────────────────────────────────────────────
Precio de compra:               \$[######]
Closing costs compra (2%):      =[Precio]*0.02
Earnest money (ya en compra):   [Incluido]
Due diligence:                  \$500-1,500
─────────────────────────────────────────────
SUBTOTAL ADQUISICIÓN:           \$[######]

COSTOS DE REMODELACIÓN:
─────────────────────────────────────────────
Rehab presupuestado:            \$[######]
Contingencia (12%):             =[Rehab]*0.12
Permits:                        \$500-2,000
─────────────────────────────────────────────
SUBTOTAL REMODELACIÓN:          \$[######]

COSTOS DE HOLDING (durante obra + listing):
─────────────────────────────────────────────
Meses estimados:                [#] meses

Intereses HML/Private (mensual):
  Loan × Rate / 12              =[Loan]*[Rate]/12
× # Meses:                      \$[######]

Property taxes prorrateadas:    \$[Valor]*1%/12 × meses
Insurance during construction:   \$80-150/mes × meses
Utilities:                      \$100-200/mes × meses
HOA (si aplica):                \$[Mensual] × meses
─────────────────────────────────────────────
SUBTOTAL HOLDING:               \$[######]

COSTOS DE SALIDA:
─────────────────────────────────────────────
Staging (1-2 meses):            \$2K-8K
Fotografía profesional:         \$500-1,500
Marketing extra:                \$200-1,000
Comisión agente (5-6%):         =[Precio Venta]*0.055
Closing costs venta (1-2%):     =[Precio Venta]*0.015
─────────────────────────────────────────────
SUBTOTAL SALIDA:                \$[######]

═══════════════════════════════════════════════════════════
BREAKEVEN:
═══════════════════════════════════════════════════════════

COSTO TOTAL DEL PROYECTO:       \$[######]

Para vender al breakeven:
  Precio venta debe ser:        =[Costo Total]/(1-0.07)
  (Asumiendo 7% en comisión+closing del precio de venta)

BREAKEVEN ABSOLUTO:             \$[######]

═══════════════════════════════════════════════════════════
PRECIOS DE LISTING (escenarios):
═══════════════════════════════════════════════════════════

AGRESIVO (Listing alto, espera mejor oferta):
  ARV × 1.05:                   \$[######]
  Días esperados en mercado:    45-60
  Riesgo:                       Listing largo, holding extra
  Recomendado si:               Mercado caliente, demanda alta

JUSTO (Listing al ARV, vende rápido):
  ARV × 1.00:                   \$[######]
  Días esperados:               14-30
  Riesgo:                       Bajo
  Recomendado si:               Mercado normal, escenario default

CONSERVADOR (Sub-ARV para venta rápida):
  ARV × 0.95:                   \$[######]
  Días esperados:               7-14
  Riesgo:                       Margen reducido
  Recomendado si:               Mercado lento, deal con problemas
═══════════════════════════════════════════════════════════
```

---

## 📊 B.6 — DRAW SCHEDULE TRACKER

**Propósito:** Tracking de pagos al GC vs avance real de la obra.

```
═══════════════════════════════════════════════════════════
DRAW SCHEDULE — [Dirección] — GC: [Nombre]
═══════════════════════════════════════════════════════════

REHAB TOTAL:           \$[######]
CONTRATO FIRMADO:      [Fecha]
INICIO OBRA:           [Fecha]

═══════════════════════════════════════════════════════════
DRAW SCHEDULE (estándar 6 hitos):
═══════════════════════════════════════════════════════════

DRAW #1 — Inicio/Demo (10%):
  Monto:               =[Rehab]*0.10
  Hito:                Demo completado
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

DRAW #2 — Rough-in (15%):
  Monto:               =[Rehab]*0.15
  Hito:                Plumbing/electrical/HVAC rough completados
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

DRAW #3 — Rough Inspections (20%):
  Monto:               =[Rehab]*0.20
  Hito:                Inspecciones rough aprobadas
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

DRAW #4 — Drywall completo (20%):
  Monto:               =[Rehab]*0.20
  Hito:                Drywall + texture + primera mano pintura
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

DRAW #5 — Acabados (25%):
  Monto:               =[Rehab]*0.25
  Hito:                Cocina, baños, pisos, trim instalados
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

DRAW #6 — Final/Retención (10%):
  Monto:               =[Rehab]*0.10
  Hito:                CO obtenido + walkthrough aprobado
  Fecha planeada:      [Fecha]
  Fecha real:          [Fecha]
  Estado:              [✓/⏳/❌]
  Notas:               [Llenar]

═══════════════════════════════════════════════════════════
CHANGE ORDERS:
═══════════════════════════════════════════════════════════

CO #1 — [Descripción]:    +\$[######]   [Fecha]
CO #2 — [Descripción]:    +\$[######]   [Fecha]
CO #3 — [Descripción]:    +\$[######]   [Fecha]

TOTAL CHANGE ORDERS:      \$[######]
% sobre contrato:         =[CO Total]/[Rehab]*100

⚠️ Alerta si > 15%

═══════════════════════════════════════════════════════════
RESUMEN FINANCIERO:
═══════════════════════════════════════════════════════════

Contrato original:        \$[######]
+ Change orders:          +\$[######]
                          ──────────
TOTAL FINAL AL GC:        \$[######]

Pagado hasta hoy:         \$[######]
Pendiente:                \$[######]
% completado:             [##%]

═══════════════════════════════════════════════════════════
```

---

## 📊 B.7 — BUDGET TRACKER (Real vs Plan)

**Propósito:** Comparar gastos reales vs presupuesto durante la obra.

```
═══════════════════════════════════════════════════════════
BUDGET TRACKER — [Dirección]
═══════════════════════════════════════════════════════════

CATEGORÍA              PRESUPUESTO   REAL        VARIACIÓN   %
─────────────────────────────────────────────────────────────
1. Demo                \$[#####]      \$[#####]    \$[####]    [#]%
2. Framing             \$[#####]      \$[#####]    \$[####]    [#]%
3. Electrical          \$[#####]      \$[#####]    \$[####]    [#]%
4. Plumbing            \$[#####]      \$[#####]    \$[####]    [#]%
5. HVAC                \$[#####]      \$[#####]    \$[####]    [#]%
6. Insulation          \$[#####]      \$[#####]    \$[####]    [#]%
7. Drywall             \$[#####]      \$[#####]    \$[####]    [#]%
8. Pisos               \$[#####]      \$[#####]    \$[####]    [#]%
9. Pintura             \$[#####]      \$[#####]    \$[####]    [#]%
10. Cocina             \$[#####]      \$[#####]    \$[####]    [#]%
11. Baños              \$[#####]      \$[#####]    \$[####]    [#]%
12. Exterior           \$[#####]      \$[#####]    \$[####]    [#]%
13. Permits            \$[#####]      \$[#####]    \$[####]    [#]%
14. Misceláneos        \$[#####]      \$[#####]    \$[####]    [#]%
─────────────────────────────────────────────────────────────
SUBTOTAL:              \$[#####]      \$[#####]    \$[####]    [#]%

CONTINGENCIA USADA:    \$[#####] / \$[#####]  ([#]% usado)

═══════════════════════════════════════════════════════════
ALERTAS:
═══════════════════════════════════════════════════════════

🟢 OK:              Variación < 10% del presupuesto
🟡 ATENCIÓN:        Variación 10-20%
🔴 CRÍTICO:         Variación > 20% — REVISAR CON COACH

═══════════════════════════════════════════════════════════
```

---

## 📊 B.8 — PIPELINE TRACKER

**Propósito:** Tracking de TODOS los deals del estudiante en el tiempo.

```
═══════════════════════════════════════════════════════════
PIPELINE TRACKER — [Mes/Año]
═══════════════════════════════════════════════════════════

# | Dirección | ZIP | Fuente | Precio | ARV | Rehab | MAO | Oferta | Estado | Fecha | Notas
─────────────────────────────────────────────────────────────────────────────────────────
1 | [###]    | [#] | [###]  | \$[##] | \$[##] | \$[##] | \$[#] | \$[#]  | [ ]   | [##] | [###]
2 | [###]    | [#] | [###]  | \$[##] | \$[##] | \$[##] | \$[#] | \$[#]  | [ ]   | [##] | [###]
3 | [###]    | [#] | [###]  | \$[##] | \$[##] | \$[##] | \$[#] | \$[#]  | [ ]   | [##] | [###]
4 | ...      | ... | ...    | ...   | ...   | ...   | ...  | ...   | ...   | ...  | ...

ESTADOS:
- 🔍 Analizando
- 📨 Oferta enviada
- 🟡 Negociando
- ✅ Aceptada
- ❌ Rechazada
- ⏸️ Pasada

═══════════════════════════════════════════════════════════
MÉTRICAS DEL MES:
═══════════════════════════════════════════════════════════

Deals analizados:         [##]
Deals que pasaron filtro: [##]   ([##]% conversión)
Ofertas enviadas:         [##]
Negociaciones activas:    [##]
Aceptadas:                [##]   ([##]% tasa cierre)
Rechazadas:               [##]
Pasadas:                  [##]

TARGET MENSUAL: 10 ofertas enviadas mínimo
═══════════════════════════════════════════════════════════
```

---

## 📊 B.9 — KPI DASHBOARD MENSUAL

**Propósito:** Métricas de negocio para revisión mensual con coach.

```
═══════════════════════════════════════════════════════════
KPI DASHBOARD — [Mes/Año]
═══════════════════════════════════════════════════════════

ÁREA 1 — GENERACIÓN DE DEALS
─────────────────────────────────────────────
Deals revisados este mes:     [##]
Wholesalers activos en list:  [##]
Eventos REIA asistidos:       [##]
Nuevos contactos red:         [##]

ÁREA 2 — OFERTAS Y NEGOCIACIÓN
─────────────────────────────────────────────
Ofertas enviadas:             [##]
Tasa de respuesta:            [##]%
Tasa de aceptación:           [##]%
Tiempo promedio cierre:       [##] días

ÁREA 3 — EJECUCIÓN DE OBRA
─────────────────────────────────────────────
Deals activos en obra:        [#]
Cronograma cumplimiento:      [##]%
Presupuesto cumplimiento:     [##]%
Change orders mes:            [#] (\$[####])

ÁREA 4 — FINANZAS
─────────────────────────────────────────────
Capital invertido total:      \$[######]
Capital comprometido:         \$[######]
Margen promedio último deal:  [##]%
ROI promedio último deal:     [##]%

ÁREA 5 — EQUIPO Y RELACIONES
─────────────────────────────────────────────
GCs activos en team:          [#]
HML primario disponible:      [✓/✗]
HML secundario disponible:    [✓/✗]
Wholesalers activos:          [##]
Agente listing identificado:  [✓/✗]

═══════════════════════════════════════════════════════════
TARGETS OBJETIVO (revisar con coach):
═══════════════════════════════════════════════════════════

□ 10+ ofertas/mes
□ 1+ deal cerrando cada 60-90 días
□ Margen mínimo 20% por deal
□ ROI mínimo 25% por deal
□ Cronograma cumplimiento > 85%
□ Presupuesto cumplimiento > 90%
═══════════════════════════════════════════════════════════
```

---

## 📊 B.10 — CASH FLOW PROJECTION (12 MESES)

**Propósito:** Planeación anual del flujo de capital.

```
═══════════════════════════════════════════════════════════
CASH FLOW PROJECTION — Año [####]
═══════════════════════════════════════════════════════════

MES         ENE  FEB  MAR  ABR  MAY  JUN  JUL  AGO  SEP  OCT  NOV  DIC
──────────────────────────────────────────────────────────────────────

ENTRADAS:
Venta Deal 1                     \$[###]
Venta Deal 2                                              \$[###]
Venta Deal 3                                                          \$[###]
Renta Fix&Hold #1   \$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K\$1.5K
TOTAL ENTRADAS:    \$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]

SALIDAS:
Compra Deal 1     \$[####]
Rehab Deal 1           \$[##]\$[##]\$[##]
Holding Deal 1         \$[##]\$[##]\$[##]\$[##]
Compra Deal 2                              \$[####]
Rehab Deal 2                                    \$[##]\$[##]\$[##]
Holding Deal 2                                  \$[##]\$[##]\$[##]\$[##]
Compra Deal 3                                                        \$[####]
Gastos generales   \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K  \$1K
TOTAL SALIDAS:    \$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]

CASH NETO MES:    \$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]

CASH ACUMULADO:   \$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]\$[##]

═══════════════════════════════════════════════════════════
ALERTAS DE CASH FLOW:
═══════════════════════════════════════════════════════════

🔴 Si cash acumulado < \$10K → Activar capital de reserva
🟡 Si cash acumulado < \$30K → Pausar nuevas compras
🟢 Si cash acumulado > \$50K → Considerar nuevo deal

═══════════════════════════════════════════════════════════
```

---

## 🔗 INSTRUCCIONES DE USO

1. **Crear carpeta en Google Drive** llamada "Calculadoras FlipMentoría"
2. **Crear 10 archivos de Google Sheets**, uno por cada plantilla (B.1 a B.10)
3. **Pegar la estructura** de cada plantilla en su hoja correspondiente
4. **Implementar las fórmulas** según las indicaciones (=B5*0.75, etc.)
5. **Por cada deal nuevo:** duplicar las plantillas B.1, B.2, B.3, B.4 con el nombre del deal
6. **Por cada deal activo:** mantener B.6, B.7 actualizados semanalmente
7. **Mensualmente:** llenar B.8 y B.9 antes de la sesión con coach
8. **Anualmente:** revisar B.10 al inicio de cada trimestre

---

*Anexo B — Calculadoras y Plantillas · FlipMentoría · Sistema nacional USA*
$FMHAMIK3$,
  80,
  ARRAY['calculadoras', 'dealanalyzer', 'ARV', 'MAO', 'breakeven', 'budget', 'KPI']::text[],
  '{}'::jsonb
);

-- ─── ANEXO_C · mindset · 🧠 Anexo C · Mindset, Accountability y Errores ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'ANEXO_C',
  'mindset',
  null,
  $FMIYRBCR$🧠 Anexo C · Mindset, Accountability y Errores$FMIYRBCR$,
  $FMIYRBCR$Hábitos diarios · 4 pilares accountability · Top 20 errores · FAQ E0-E5 · Glosario 200+ términos$FMIYRBCR$,
  $FMIYRBCR$# 🧠 ANEXO C — MINDSET, ACCOUNTABILITY Y ERRORES CRÍTICOS
**El sistema que separa al que ejecuta del que abandona**

> El 80% de quienes empiezan un programa de Fix & Flip no completan ni un solo deal. Esa cifra no se debe a falta de información — el programa la entrega completa. Se debe a falta de disciplina, anticipación de errores y soporte adecuado. Este anexo es el sistema que cierra esa brecha.

---

## 📑 ÍNDICE

| Sección | Contenido |
|---------|-----------|
| C.1 | Sistema de Hábitos Diarios |
| C.2 | Accountability — Cómo no abandonar |
| C.3 | Top 20 Errores de Novatos (con casos reales) |
| C.4 | FAQ por Etapa (E0-E5) |
| C.5 | Sistema de Comunicación con Coach |
| C.6 | Glosario Técnico (200+ términos) |
| C.7 | Plan de Acción cuando estás bloqueado |

---

## 🌅 C.1 — SISTEMA DE HÁBITOS DIARIOS

### Los 5 hábitos no negociables del flipper exitoso

**1. EL BLOQUE DIARIO (90 minutos sagrados)**

```
HORARIO:         Mismo horario todos los días
DURACIÓN:        90 minutos mínimo
LUGAR:           Mismo lugar, sin distracciones
PREPARACIÓN:     Lista de 3 tareas listas la noche anterior
RITUAL:          Café/té + cerrar redes sociales + iniciar timer
PROHIBIDO:       Email general, WhatsApp, redes, llamadas no-negocio
```

**2. LA REVISIÓN DEL PIPELINE (15 minutos mañanas)**

Cada mañana, antes del bloque grande, revisar:
- ¿Deals nuevos llegaron de wholesalers? (responder en < 4 horas)
- ¿Ofertas pendientes de respuesta? (follow-up si > 3 días)
- ¿Algún deal en obra requiere visita hoy?
- ¿Reuniones agendadas? (preparar agenda)

**3. EL HÁBITO DE NÚMEROS (10 minutos diarios)**

- Anotar cuántos deals revisados hoy
- Cuántas ofertas enviadas
- Cuántas respuestas recibidas
- Cualquier cambio relevante en deals activos

**Por qué importa:** sin tracking no hay feedback. Sin feedback no hay mejora.

**4. EL CONTACTO NETWORKING (1 contacto diario)**

Mínimo 1 contacto del ecosistema por día:
- Llamada a wholesaler para check-in
- Email a GC con consulta
- Mensaje a inversor del network
- Comentario en post de BiggerPockets

**Resultado en 30 días:** 30 contactos activos cultivados.

**5. LA REFLEXIÓN NOCTURNA (5 minutos)**

Antes de dormir, anotar en libreta o app:
- ¿Qué hice hoy que avanzó el negocio?
- ¿Qué falló o salió diferente a lo esperado?
- ¿Qué voy a hacer mañana?

---

### Sistema de tracking de hábitos (30 días)

```
HÁBITO              L  M  X  J  V  S  D  | TOTAL
─────────────────────────────────────────────────
Bloque 90 min       ✓  ✓  ✓  ✗  ✓  ✓  ✗  |   5/7
Pipeline 15 min     ✓  ✓  ✓  ✓  ✓  ✗  ✗  |   5/7
Hábito números      ✓  ✓  ✗  ✓  ✓  ✓  ✓  |   6/7
1 contacto network  ✓  ✓  ✓  ✓  ✓  ✗  ✗  |   5/7
Reflexión noche     ✓  ✗  ✓  ✓  ✓  ✓  ✓  |   6/7
─────────────────────────────────────────────────
ADHERENCIA SEMANAL:                          77%
```

**Meta:** > 80% adherencia mensual durante primeros 90 días.

---

## 🤝 C.2 — ACCOUNTABILITY: CÓMO NO ABANDONAR

### Por qué los estudiantes abandonan (datos reales)

```
RAZÓN                              % DE ABANDONOS
──────────────────────────────────────────────────
Falta de resultados rápidos                34%
Sobrecarga emocional/burnout                22%
Problema personal (familia/salud)           18%
Pérdida de motivación                       14%
Falta de capital                             8%
Falta de información                         4%
──────────────────────────────────────────────────
```

**El 80% de los abandonos NO son por falta de información.** Son por falta de soporte emocional y accountability.

### Los 4 pilares del Accountability

**PILAR 1 — ACCOUNTABILITY PÚBLICO**

Compartir el Big Why de E0.2.1 con mínimo 3 personas cercanas. Comprometerse públicamente. Una vez al mes enviarles update breve por WhatsApp con: progreso, próximo hito, qué necesita apoyo.

**PILAR 2 — ACCOUNTABILITY PARTNER**

Encontrar a otro estudiante del programa o flipper en tu ciudad. Cada lunes 9am llamada de 15 minutos donde cada uno comparte:
- Qué logró la semana pasada
- Qué hará esta semana
- Qué obstáculo enfrenta

**Resultado comprobado:** estudiantes con accountability partner completan el programa 3x más que los que van solos.

**PILAR 3 — ACCOUNTABILITY CON COACH**

Sesión semanal con coach (no negociable). Preparar antes:
- 3 wins de la semana
- 3 obstáculos
- 3 decisiones que necesitan input

**PILAR 4 — ACCOUNTABILITY CON CONSECUENCIAS**

Sistema de "ricos" y "pobres" (Beeminder, StickK, o manual):
- Si cumple 80%+ adherencia semanal → recompensa propia (\$50 cena, masaje, libro)
- Si cumple < 80% → consecuencia pre-acordada (donar \$100 a causa contraria, perder un beneficio, hacer tarea que odia)

**Por qué funciona:** El cerebro humano responde 2x más a evitar pérdidas que a obtener ganancias.

---

### Plan de emergencia: cuando piensas abandonar

```
PASO 1 — STOP por 48 horas
  No tomes decisiones de abandonar en momento bajo.
  Espera 48 horas mínimo.

PASO 2 — RELEE tu Big Why
  Saca el documento físico del cajón.
  Léelo en voz alta. Recuerda por qué empezaste.

PASO 3 — LLAMA a tu Accountability Partner
  Cuéntale qué está pasando.
  Pídele perspectiva externa.

PASO 4 — AGENDA llamada con coach
  No mañana. HOY.
  Explica el estado emocional, no solo el problema operativo.

PASO 5 — IDENTIFICA el problema real
  ¿Es falta de resultados? → revisar pipeline, ajustar estrategia
  ¿Es burnout? → tomar 1 semana de pausa (no abandono)
  ¿Es problema personal? → pausar el programa, no cancelar
  ¿Es falta de capital? → revisar HML, private money, partnerships

PASO 6 — DECIDE con datos
  Si decides abandonar, hazlo desde claridad, no desde frustración.
```

---

## ⚠️ C.3 — TOP 20 ERRORES DE NOVATOS

### Errores que destruyen el primer deal

**ERROR #1 — Comprar a nombre personal (sin LLC)**
- **Consecuencia:** En demanda, pierde casa propia, ahorros, carro
- **Costo:** Patrimonio personal completo
- **Prevención:** E0.1.1 — Formar LLC ANTES del primer deal

**ERROR #2 — Sin HML pre-aprobado al ofertar**
- **Consecuencia:** 90% de las ofertas se rechazan; pierde deals competitivos
- **Costo:** Meses sin cerrar deals
- **Prevención:** E2.1.5 — Pre-aprobación antes de enviar la primera oferta

**ERROR #3 — Usar ARV optimista para ofertar**
- **Consecuencia:** El deal cierra sin margen; al vender no hay ganancia
- **Costo:** \$20K-\$50K en margen perdido
- **Prevención:** E1.3.2 — Siempre usar ARV conservador (-5% del base)

**ERROR #4 — No verificar flood zone (FEMA)**
- **Consecuencia:** Compra en zona de inundación; insurance se vuelve impagable
- **Costo:** \$5K-\$15K/año de insurance adicional, o imposible vender
- **Prevención:** E1.1.4 — Verificar FEMA flood map antes de cerrar

**ERROR #5 — Subestimar rehab por no ver foundation/plumbing/electrical**
- **Consecuencia:** Sorpresas de \$10K-\$30K durante obra
- **Costo:** Margen del deal pulverizado
- **Prevención:** E1.3.3 — Contingencia del 12-15% + inspección general antes de cerrar

**ERROR #6 — Contratista sin licencia ni seguros**
- **Consecuencia:** Si hay accidente, demandan al estudiante (no al GC)
- **Costo:** Demandas, retraso de obra, repetir trabajo
- **Prevención:** E2.4.4 — Verificar licencia + COI directamente con aseguradora

**ERROR #7 — Pagar 50%+ al GC por adelantado**
- **Consecuencia:** GC desaparece o no termina obra
- **Costo:** \$20K-\$50K perdidos
- **Prevención:** E3.2 — Máximo 10% inicial; pagos por hitos (draw schedule)

**ERROR #8 — No documentar visitas a obra con fotos**
- **Consecuencia:** En disputa con GC, no hay evidencia
- **Costo:** Pierde argumentos legales, paga 2x por mismo trabajo
- **Prevención:** E3.1.2 — Fotos antes/durante/después de cada visita

**ERROR #9 — Cambiar diseño a mitad de obra**
- **Consecuencia:** Change orders +30-50% del presupuesto
- **Costo:** \$15K-\$30K extras
- **Prevención:** E2.6.2 — SOW detallado y aprobado ANTES de empezar

**ERROR #10 — Sobrecargar el deal con upgrades premium**
- **Consecuencia:** Sobre-mejora para la zona, no recupera el costo
- **Costo:** \$10K-\$25K en costos no recuperables
- **Prevención:** E2.6.1 — Ajustar finishes al nivel de la zona (A/B/C)

**ERROR #11 — Ignorar tiempo de permits en cronograma**
- **Consecuencia:** 4-8 semanas de holding extra esperando permisos
- **Costo:** \$4K-\$10K en intereses + holding costs
- **Prevención:** E2.5.1 — Investigar tiempos reales (no publicados) antes de comprar

**ERROR #12 — No tener walking number antes de listing**
- **Consecuencia:** Acepta primera oferta sin saber si era justa
- **Costo:** \$5K-\$15K dejados sobre la mesa
- **Prevención:** E4.2.2 — Calcular walking number en B.5 antes de listar

**ERROR #13 — Listing sin staging ni fotografía profesional**
- **Consecuencia:** DOM 60-90 días en vez de 14-30 días
- **Costo:** \$5K-\$10K en holding extra + reducción de precio
- **Prevención:** E4.1 — Presupuesto fijo de \$4K-\$8K para staging + fotografía

**ERROR #14 — Sin agente especializado en flips**
- **Consecuencia:** Listing mal estructurado, marketing pobre, negociación débil
- **Costo:** 5-10% bajo precio óptimo
- **Prevención:** E4.4 — Entrevistar 3 agentes especializados antes de elegir

**ERROR #15 — Ofertar sin proof of funds adjunto**
- **Consecuencia:** Ofertas se rechazan automáticamente
- **Costo:** Meses sin cerrar deals
- **Prevención:** E1.4.1 — Siempre adjuntar POF del HML pre-aprobado

**ERROR #16 — Negociar emocionalmente (con prisa)**
- **Consecuencia:** Sube por encima del MAO "para no perder el deal"
- **Costo:** \$5K-\$30K en margen perdido
- **Prevención:** E1.4.2 — Esperar 4+ horas antes de responder; nunca arriba del walking number

**ERROR #17 — No tener accountability ni partner**
- **Consecuencia:** Procastinación crónica, falta de momentum
- **Costo:** El negocio nunca arranca
- **Prevención:** C.2 — Sistema de accountability con 4 pilares

**ERROR #18 — Mezclar plata personal con plata de la LLC**
- **Consecuencia:** Pierce the corporate veil; pierde protección legal
- **Costo:** Patrimonio personal vulnerable
- **Prevención:** E0.1.3 — Cuenta separada de negocio + tarjeta separada

**ERROR #19 — Compra propiedad sin entender zonificación**
- **Consecuencia:** Quiere hacer Airbnb pero ZIP no lo permite; pierde modelo
- **Costo:** \$50K-\$100K en plan de salida fallido
- **Prevención:** E2.5.3 — Validar zonificación de los 5 ZIPs del Buy Box

**ERROR #20 — Hacer 5 deals al mismo tiempo siendo novato**
- **Consecuencia:** Capital sobreextendido, calidad de gestión cae, todos fallan
- **Costo:** \$100K-\$300K en pérdidas
- **Prevención:** Primer año máximo 2 deals simultáneos; escalar después de 3+ deals exitosos

---

## ❓ C.4 — FAQ POR ETAPA

### E0 — FUNDACIÓN

**P: ¿Tengo que esperar a tener LLC para empezar a buscar deals?**
R: No. Buscar deals (E1) se puede hacer en paralelo con formar LLC. Pero NO se debe firmar contrato de compra sin LLC formada y EIN obtenido.

**P: ¿En qué estado debo formar mi LLC si vivo en X pero quiero invertir en Y?**
R: En el estado donde está la propiedad (Y). Si formas en X, debes registrarla como "foreign LLC" en Y → double filing fees + compliance complicado.

**P: ¿Necesito S-Corp election desde el inicio?**
R: No al inicio. La S-Corp election se considera cuando ganas > \$50K-\$80K netos al año de flips. Hablar con CPA antes de aplicar.

**P: ¿Cuánto capital necesito para empezar?**
R: Mínimo \$30K-\$50K de capital propio para tu primer flip (down payment al HML 10-20% + closing costs + reserva). Esto se complementa con HML y/o private money.

---

### E1 — EVALUAR

**P: ¿Cuántas ofertas debo enviar antes de cerrar la primera?**
R: Promedio: 50-100 ofertas para cerrar 1 deal en mercado competitivo. No es señal de fracaso; es matemática del proceso. Esta es la razón por la que se establece meta de 10 ofertas/mes mínimo.

**P: ¿Qué hago si todos los deals que llegan están sobre mi MAO?**
R: Revisar 3 cosas: (1) ¿Tu Buy Box es realista para el mercado actual?, (2) ¿Estás analizando comparables actualizados?, (3) ¿Tu rehab estimate es preciso? Si los 3 son correctos, esperar — el mercado cambia y los precios bajan eventualmente.

**P: ¿Puedo confiar en el ARV que sugiere Zillow (Zestimate)?**
R: No. Zestimate es algoritmo automatizado que ignora condición y micro-mercado. Siempre calcular ARV propio con mínimo 3 comparables vendidas en los últimos 6 meses.

---

### E2 — ESTRUCTURAR

**P: ¿Cuántos HMLs debo tener pre-aprobados?**
R: Mínimo 2 (primario + backup). Ideal: 3 para flexibilidad. No más de 3 — gestión de relaciones se vuelve diluida.

**P: ¿Qué LTV es realista esperar de un HML para mi primer deal?**
R: Primer deal: 70-80% LTV + 90-100% LTC (loan-to-cost). Después de 3 deals exitosos: hasta 85% LTV + 100% LTC en algunos lenders.

**P: ¿Debo trabajar con 1 GC o varios?**
R: 1 GC primario + 1 GC backup. Más de 2 dilye relaciones y hace difícil construir confianza profunda.

---

### E3 — EJECUTAR

**P: ¿Cuándo debo visitar la obra?**
R: Mínimo 3 visitas/semana (Lunes, Miércoles, Viernes). Pasar 30-45 minutos cada visita. NO solo mirar — interactuar con el GC, hacer preguntas específicas.

**P: ¿Qué hago si el GC dice que necesita más plata fuera del draw schedule?**
R: NO pagar sin verificar que cumplió el hito. Si insiste, escalar a coach. El draw schedule es contractual y se respeta.

**P: ¿Cómo manejo cambios de scope durante la obra?**
R: TODO cambio de scope → Change Order firmado por escrito. Sin Change Order firmado, NO se paga el extra. Aprende a decir "no" a cambios no esenciales.

---

### E4 — ESTRATEGIA DE SALIDA

**P: ¿Cuándo debo listar la propiedad?**
R: 7-14 días después del Certificate of Occupancy. Tiempo intermedio para: staging, fotografía profesional, agendar open house.

**P: ¿Vale la pena pagar staging si es para Fix & Flip?**
R: Sí, casi siempre. Staging reduce DOM de 45+ días a 14-30 días. El holding cost ahorrado supera el costo del staging.

**P: ¿Qué hago si el listing no genera ofertas en 30 días?**
R: Diagnóstico en orden: (1) Comparables — ¿el precio es realista?, (2) Fotos — ¿son profesionales?, (3) Staging — ¿está implementado?, (4) Marketing — ¿tu agente está promoviendo activamente?, (5) Open houses — ¿hay agendados?. Solo después de validar los 5, considerar reducción de precio.

---

### E5 — ESCALAR

**P: ¿Cuándo puedo hacer 2 deals al mismo tiempo?**
R: Después de cerrar 1 deal exitosamente y haber completado el post-mortem. Mínimo: capital de reserva para cubrir holding de 6 meses en deal #2 si algo se atrasa.

**P: ¿Cuándo debo contratar un Project Manager?**
R: Cuando tengas 3+ deals simultáneos consistentemente. Antes de eso, el costo no se justifica.

**P: ¿Debo expandir a otra ciudad después de mi primer deal exitoso?**
R: No. Mínimo 5 deals exitosos en una sola ciudad antes de considerar expansión. La curva de aprendizaje en otra ciudad es alta.

---

## 📞 C.5 — SISTEMA DE COMUNICACIÓN CON COACH

### Cadencia recomendada

```
SESIÓN SEMANAL (no negociable):
  Frecuencia:        1 vez/semana
  Duración:          45-60 minutos
  Formato:           Video llamada (Zoom/Meet)
  Día sugerido:      Lunes 9am o Viernes 4pm
  Preparación:       Agenda enviada 24h antes
  
SESIÓN MENSUAL DE STRATEGY:
  Frecuencia:        1 vez/mes (puede ser una de las semanales)
  Duración:          90 minutos
  Foco:              Revisión de KPIs (B.9) + ajustes estratégicos
  
SESIÓN TRIMESTRAL DE REVIEW:
  Frecuencia:        1 vez/trimestre
  Duración:          2 horas
  Foco:              Plan anual (B.10) + decisiones de expansión
```

### Cómo preparar cada sesión

**24 horas antes:**
1. Llenar template "Agenda Semanal" y enviar al coach
2. Asegurar que dashboard KPI (B.9) está actualizado
3. Pipeline tracker (B.8) refrescado
4. Identificar 3 obstáculos específicos a discutir

**Template Agenda Semanal:**

```
═══════════════════════════════════════════════════════════
AGENDA SEMANAL — [Nombre] — [Fecha]
═══════════════════════════════════════════════════════════

WINS DE LA SEMANA:
1. [Win específico con número o resultado]
2. [Win específico]
3. [Win específico]

OBSTÁCULOS:
1. [Obstáculo concreto + qué he intentado + qué necesito del coach]
2. [Obstáculo]
3. [Obstáculo]

DECISIONES QUE NECESITO INPUT:
1. [Decisión + opciones que estoy considerando]
2. [Decisión]
3. [Decisión]

DEALS ACTIVOS:
- Deal 1: [Status + próximo paso]
- Deal 2: [Status + próximo paso]

KPIs DE LA SEMANA:
- Deals analizados: [#]
- Ofertas enviadas: [#]
- Llamadas a network: [#]
- Adherencia hábitos: [%]

PRÓXIMA SEMANA — COMPROMISOS:
1. [Compromiso específico]
2. [Compromiso específico]
3. [Compromiso específico]
═══════════════════════════════════════════════════════════
```

### Cuándo escalar al coach (entre sesiones)

```
SITUACIONES QUE JUSTIFICAN COMUNICACIÓN URGENTE:
─────────────────────────────────────────────
□ Oferta aceptada inesperadamente
□ Vendedor pidiendo decisión < 24 horas
□ GC pidiendo pago fuera de draw schedule
□ Cambio de scope significativo en obra
□ Pérdida de inspección que retrasa cronograma
□ Sorpresa en obra > \$5K
□ Problema con HML (rechazo, cambio de términos)
□ Disputa con contratista o subcontractor
□ Listing sin tráfico después de 30 días
□ Oferta de compra recibida que no esperabas

CÓMO ESCALAR:
─────────────────────────────────────────────
1. WhatsApp/SMS con mensaje claro:
   "Coach, situación urgente con [Deal]. ¿Puedes 15 min hoy?"

2. NO esperar respuesta para tomar decisión irreversible.
   Si vendedor exige respuesta en horas y coach no responde,
   aplicar la regla: walking number > emoción.

3. Documentar la situación con detalles para discutirla 
   en próxima sesión incluso si se resolvió.
```

---

## 📖 C.6 — GLOSARIO TÉCNICO

### Términos esenciales del Fix & Flip USA

**A**
- **ADU (Accessory Dwelling Unit):** Unidad habitacional secundaria en lote residencial (garage apartment, granny flat)
- **After-Repair Value (ARV):** Valor de la propiedad después de la remodelación
- **Appraisal:** Tasación oficial de la propiedad por un appraiser licenciado
- **As-Is:** Venta sin reparaciones por parte del vendedor
- **Assignment Fee:** Comisión que cobra un wholesaler por ceder el contrato a otro buyer

**B**
- **BRRRR:** Buy, Rehab, Rent, Refinance, Repeat — estrategia de Fix & Hold
- **Buy Box:** Perfil específico de propiedad ideal definido por el inversor
- **Buyer's Agent:** Agente representando al comprador

**C**
- **Cap Rate:** Capitalization Rate = Net Operating Income / Property Value
- **Cash-on-Cash Return:** Cash flow anual / Cash invertido
- **Change Order:** Modificación contractual al SOW original
- **Closing:** Cierre legal de la transacción
- **Comparables (Comps):** Propiedades similares vendidas recientemente
- **Contingency:** Cláusula condicional en el contrato (inspection, financing, appraisal)

**D**
- **Days on Market (DOM):** Días que una propiedad lleva listada
- **Deed of Trust:** Instrumento legal que asegura una hipoteca (en estados que lo usan)
- **Draw Schedule:** Cronograma de pagos al GC por hitos
- **Due Diligence:** Período de investigación post-oferta aceptada

**E**
- **Earnest Money:** Depósito de buena fe al firmar contrato
- **EIN (Employer Identification Number):** Número fiscal federal de la LLC
- **Equity:** Diferencia entre valor de propiedad y deuda
- **Escrow:** Empresa neutral que maneja el dinero y documentos en el closing

**F**
- **FEMA Flood Map:** Mapa oficial de zonas de inundación
- **Fix & Flip:** Comprar, remodelar y vender propiedad
- **Fix & Hold:** Comprar, remodelar y mantener para renta
- **Foreclosure:** Propiedad en proceso de ejecución hipotecaria

**G**
- **General Contractor (GC):** Contratista general responsable de toda la obra
- **GreatSchools Rating:** Calificación de escuelas (1-10)
- **Gross Rent Multiplier (GRM):** Precio de propiedad / Renta anual bruta

**H**
- **HML (Hard Money Lender):** Prestamista especializado en deals de fix & flip
- **HOA (Homeowners Association):** Asociación que cobra fees mensuales/anuales
- **HUD-1 Statement:** Estado de closing detallando todos los costos

**I**
- **Inspection:** Inspección física pre-cierre por inspector certificado
- **Investor-Friendly Agent:** Agente con experiencia trabajando con inversores

**L**
- **LLC (Limited Liability Company):** Estructura legal que protege patrimonio personal
- **LOI (Letter of Intent):** Carta de intención de compra (no vinculante)
- **LTV (Loan-to-Value):** % del valor de la propiedad que el lender financia
- **LTC (Loan-to-Cost):** % del costo total (compra + rehab) que el lender financia
- **LVP (Luxury Vinyl Plank):** Pisos vinílicos de alta calidad

**M**
- **MAO (Maximum Allowable Offer):** Precio máximo a ofertar = ARV × 75% − Rehab
- **MLS (Multiple Listing Service):** Base de datos de propiedades listadas por agentes

**N**
- **NOI (Net Operating Income):** Ingreso operativo neto (rentas − gastos)
- **Note:** Instrumento legal que documenta la deuda (acompañado de Deed of Trust o Mortgage)

**O**
- **Off-Market:** Propiedad no listada en MLS
- **Operating Agreement:** Documento interno de gobernanza de la LLC
- **Opportunity Zone:** Zona designada por HUD con beneficios fiscales

**P**
- **PadSplit:** Plataforma de coliving room-by-room
- **PITI:** Principal, Interest, Taxes, Insurance (componentes de pago hipotecario)
- **Pocket Listing:** Propiedad no en MLS pero conocida en círculos de agentes
- **POF (Proof of Funds):** Carta del lender mostrando capacidad de cierre
- **Pre-Approval Letter:** Carta del HML pre-aprobando al buyer
- **PropStream:** Plataforma de datos de propiedades off-market

**R**
- **Realtor:** Agente miembro de la National Association of Realtors
- **REIA (Real Estate Investors Association):** Asociación local de inversores
- **REO (Real Estate Owned):** Propiedad propiedad del banco post-foreclosure
- **Retainer:** Cuota fija mensual a un profesional (abogado, agente)
- **ROI (Return on Investment):** Ganancia / Capital invertido

**S**
- **Section 8:** Programa federal de subsidio de renta
- **Seller Financing:** Vendedor financia parte del precio
- **Series LLC:** Estructura legal que permite sub-LLCs internas (disponible en algunos estados)
- **Short Sale:** Venta con autorización del banco por menos del balance hipotecario
- **SOW (Scope of Work):** Especificación detallada del trabajo de remodelación
- **STR (Short-Term Rental):** Renta corto plazo (Airbnb, VRBO)
- **Subject To:** Comprar propiedad asumiendo la hipoteca existente

**T**
- **Term Sheet:** Documento del lender con términos del préstamo
- **Title Company:** Empresa que maneja closing y verifica title clean
- **Turn-key:** Propiedad lista para rentar sin trabajo adicional

**U**
- **Underwriting:** Proceso de evaluación de un loan por el lender

**V**
- **VA Loan:** Loan del Veterans Administration
- **VRBO:** Vacation Rentals By Owner — competidor de Airbnb

**W**
- **Walking Number:** Precio máximo absoluto que aceptarías; nunca subir
- **Wholesaler:** Inversor que asegura contratos y los asigna a otros buyers por una fee
- **Wraparound Mortgage:** Hipoteca que envuelve una existente (creative financing)

---

## 🆘 C.7 — PLAN DE ACCIÓN CUANDO ESTÁS BLOQUEADO

### Identificar el tipo de bloqueo

**BLOQUEO #1 — "No encuentro deals"**

```
DIAGNÓSTICO:
□ ¿Tienes 5 Buy Box claros? (E1.1)
□ ¿Tienes 20 wholesalers en pipeline? (E2.3)
□ ¿Asistes a 1+ evento REIA por mes? (E2.2)
□ ¿Estás suscrito a alertas MLS por ZIP?
□ ¿Estás aplicando Driving for Dollars?

ACCIÓN:
Si 3+ son "no", primero llenar esas brechas.
Si todos son "sí", el mercado puede estar ajustado — 
ajustar Buy Box o expandir ZIPs por 30 días.
```

**BLOQUEO #2 — "Mis ofertas no son aceptadas"**

```
DIAGNÓSTICO:
□ ¿Adjuntas POF a cada oferta?
□ ¿Ofreces closing en < 21 días?
□ ¿Tu MAO está alineado con el mercado?
□ ¿Estás haciendo discovery del pain del vendedor?
□ ¿Tu LOI es profesional o casero?

ACCIÓN:
Auditar 10 ofertas recientes y validar los 5 puntos.
Si todos están bien, problema es volumen — necesitas
50+ ofertas más por mes para cerrar 1 deal.
```

**BLOQUEO #3 — "Tengo deal pero no puedo financiar"**

```
DIAGNÓSTICO:
□ ¿Tienes HML primario pre-aprobado?
□ ¿Tu credit score es > 640?
□ ¿Tienes 6 meses de bank statements?
□ ¿Tu LLC tiene > 90 días?
□ ¿Tienes capital propio para down payment?

ACCIÓN:
Si HML primario rechazó, activar HML backup INMEDIATAMENTE.
Si credit score es problema, considerar partnerships o
private money. NO perder el deal por delay en financing.
```

**BLOQUEO #4 — "Mi GC se retrasa o me cobra extra"**

```
DIAGNÓSTICO:
□ ¿Visitas la obra 3x/semana?
□ ¿Tienes draw schedule firmado?
□ ¿Todos los change orders están firmados?
□ ¿Tu SOW era detallado o vago?
□ ¿El GC tiene capacidad real para tu proyecto?

ACCIÓN:
Reunión cara a cara con GC. Revisar cronograma original
vs realidad. Si retraso > 30%, considerar terminar contrato
y activar GC backup. Documentar todo por escrito.
```

**BLOQUEO #5 — "Mi listing no vende"**

```
DIAGNÓSTICO:
□ ¿Precio listado vs comparables actualizados?
□ ¿Fotos profesionales con drone?
□ ¿Staging implementado?
□ ¿Open house programado?
□ ¿Agente está promoviendo activamente?

ACCIÓN:
Día 21: ajustar precio 3% abajo del original.
Día 45: ajustar precio 5% abajo + cambiar agente si no
está performando.
Día 60: considerar pivot a renta (Fix & Hold).
```

**BLOQUEO #6 — "Estoy quemado / pensando abandonar"**

```
DIAGNÓSTICO:
□ ¿Cuándo tomaste última vacación?
□ ¿Tu accountability partner está activo?
□ ¿Cuándo fue última reunión con coach?
□ ¿Estás durmiendo > 7 horas diarias?
□ ¿Tienes vida personal fuera del negocio?

ACCIÓN:
1. Tomar 7 días OFF del negocio (no es abandono, es pausa)
2. Reactivar accountability partner
3. Sesión emergencia con coach
4. Releer Big Why
5. Resetear con metas más realistas
```

---

## 🎯 CIERRE DEL ANEXO C

> El Fix & Flip no falla por falta de información. Falla por falta de:
> 1. Disciplina diaria (hábitos)
> 2. Anticipación de errores (Top 20)
> 3. Soporte emocional (accountability)
> 4. Plan claro cuando estás bloqueado
>
> Este anexo es el sistema que cierra esas 4 brechas.
> 
> **Imprime este documento. Mantenlo cerca. Revísalo semanalmente.**
> 
> El estudiante que internaliza este sistema tiene 5x más probabilidad de cerrar su primer deal en los primeros 6 meses.

---

*Anexo C — Mindset, Accountability y Errores Críticos · FlipMentoría · Sistema nacional USA*
$FMIYRBCR$,
  90,
  ARRAY['mindset', 'habitos', 'accountability', 'errores', 'FAQ', 'glosario']::text[],
  '{}'::jsonb
);

-- ─── INDICE · lista_tareas · 📋 Lista de 77 Tareas — Copy/Paste ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'INDICE',
  'lista_tareas',
  null,
  $FMLH4W6Y$📋 Lista de 77 Tareas — Copy/Paste$FMLH4W6Y$,
  $FMLH4W6Y$Para Taskade, ClickUp, Notion, Trello o cualquier herramienta de gestión$FMLH4W6Y$,
  $FMLH4W6Y$# 📋 LISTA DE TAREAS POR ETAPA — COPY/PASTE
**Sistema FlipMentoría · 71 Tareas**

> Lista limpia de todas las tareas organizadas por etapa, lista para copiar/pegar en Taskade, ClickUp, Notion, Trello o cualquier herramienta de gestión.

---

## 🏛️ E0 — FUNDACIÓN (10 tareas)

```
E0.1.1 — Formar LLC en el estado donde se invertirá
E0.1.2 — Operating Agreement firmado
E0.1.3 — Cuenta bancaria de negocio + tarjeta de crédito
E0.1.4 — Software de contabilidad activo
E0.1.5 — Contador y abogado de real estate identificados
E0.2.1 — Definir Big Why personal por escrito
E0.2.2 — Bloque diario de tiempo no negociable
E0.2.3 — Quick Win en semana 1
E0.3.1 — Setup completo del portal Taskade
E0.3.2 — Stack de herramientas básico activo
```

---

## 🔍 E1 — EVALUAR (17 tareas)

```
E1.1.1 — Construir 5 Buy Box para estrategia de RENTA
E1.1.2 — Construir 5 Buy Box para estrategia de VENTA (Fix & Flip)
E1.1.3 — Lista de 20 características que SÍ quiere
E1.1.4 — Lista de 20 características que NO quiere (red flags)
E1.1.5 — Versión resumida del Buy Box (elevator pitch)
E1.2.1 — Investigación de mercado profunda por ZIP
E1.2.2 — Calificación A/B/C del ZIP en 5 variables
E1.2.3 — Visita física al ZIP Code (drive-through)
E1.2.4 — Identificar zonas A, B y C de la ciudad
E1.3.1 — Analizar 10 casas comparables por ZIP Code
E1.3.2 — Calcular ARV (conservador + optimista)
E1.3.3 — Estimar remodelación por nivel
E1.3.4 — Aplicar la Regla del 75% (MAO)
E1.4.1 — Enviar mínimo 10 ofertas formales al mes
E1.4.2 — Negociar activamente cada oferta
E1.4.3 — Identificar el "pain point" del vendedor
E1.4.4 — Documentar resultado de cada oferta
```

---

## 🏗️ E2 — ESTRUCTURAR (26 tareas)

```
E2.1.1 — Llamar y entrevistar 10 Hard Money Lenders
E2.1.2 — Solicitar term sheets oficiales
E2.1.3 — Investigar opciones de Private Money
E2.1.4 — Evaluar HELOC sobre vivienda principal
E2.1.5 — Elegir HML primario + backup
E2.2.1 — Identificar y registrarse a 5 eventos
E2.2.2 — Asistir físicamente a los eventos
E2.2.3 — Follow-up en 48 horas
E2.3.1 — Identificar 20 wholesalers activos
E2.3.2 — Contactar y presentar Buy Box
E2.3.3 — Llamada 1-a-1 con wholesalers
E2.3.4 — Suscribirse a buyer lists
E2.3.5 — Análisis express de cada deal entrante
E2.4.1 — Identificar y contactar 10 GCs
E2.4.2 — Reunión con cada GC
E2.4.3 — Solicitar bid sobre propiedad muestra
E2.4.4 — Verificar licencia, seguros y referencias
E2.4.5 — Cultivar relación a largo plazo
E2.5.1 — Investigar proceso de permisos
E2.5.2 — Visita o llamada al Building Department
E2.5.3 — Restricciones de zonificación por ZIP
E2.5.4 — Mapear inspecciones obligatorias
E2.5.5 — Identificar programas especiales
E2.6.1 — Crear plantilla maestra de SOW
E2.6.2 — Aplicar SOW a un caso real
E2.6.3 — Cronograma con hitos clave
E2.6.4 — Calcular contingencia 10-15%
```

---

## 🔨 E3 — EJECUTAR (9 tareas)

```
E3.1.1 — Visitar la propiedad mínimo 3 veces por semana
E3.1.2 — Reunión semanal de avance con el GC
E3.1.3 — Documentar con fotos antes/durante/después
E3.2.1 — Controlar cada pago con draw schedule
E3.2.2 — Budget tracker actualizado semanalmente
E3.2.3 — Plan de contingencia para retrasos
E3.3.1 — Inspecciones de obra en hitos clave
E3.3.2 — Resolver problemas en 24 horas
E3.3.3 — Generación de bitácoras semanales
```

---

## 💰 E4 — ESTRATEGIA DE SALIDA (7 tareas)

```
E4.1.1 — Staging profesional completado
E4.1.2 — Fotografía y video profesional listos
E4.2.1 — Precio de lista validado con comparables actuales
E4.2.2 — Calcular breakeven y ganancia neta antes de listar
E4.3.1 — Publicar en mínimo 4 plataformas
E4.3.2 — Open house en la primera semana
E4.4.1 — Agente de ventas seleccionado
```

---

## 📈 E5 — ESCALAR (8 tareas)

```
E5.1.1 — Análisis detallado del primer flip
E5.1.2 — SOPs creados para cada etapa del proceso
E5.2.1 — Red de financiadores privados en construcción
E5.2.2 — Sistema de generación de leads activo
E5.3.1 — Contratar Project Manager
E5.3.2 — Metas para el próximo año definidas
E5.4.1 — Múltiples deals simultáneos con estructura
E5.4.2 — Evaluar expansión a segundo mercado
```

---

## 📊 RESUMEN

| Etapa | Tareas |
|-------|--------|
| E0 — Fundación | 10 |
| E1 — Evaluar | 17 |
| E2 — Estructurar | 26 |
| E3 — Ejecutar | 9 |
| E4 — Estrategia de Salida | 7 |
| E5 — Escalar | 8 |
| **TOTAL** | **77** |

---

## 🎯 LISTA COMPLETA SIN AGRUPAR (para importación masiva)

```
E0.1.1 — Formar LLC en el estado donde se invertirá
E0.1.2 — Operating Agreement firmado
E0.1.3 — Cuenta bancaria de negocio + tarjeta de crédito
E0.1.4 — Software de contabilidad activo
E0.1.5 — Contador y abogado de real estate identificados
E0.2.1 — Definir Big Why personal por escrito
E0.2.2 — Bloque diario de tiempo no negociable
E0.2.3 — Quick Win en semana 1
E0.3.1 — Setup completo del portal Taskade
E0.3.2 — Stack de herramientas básico activo
E1.1.1 — Construir 5 Buy Box para estrategia de RENTA
E1.1.2 — Construir 5 Buy Box para estrategia de VENTA (Fix & Flip)
E1.1.3 — Lista de 20 características que SÍ quiere
E1.1.4 — Lista de 20 características que NO quiere (red flags)
E1.1.5 — Versión resumida del Buy Box (elevator pitch)
E1.2.1 — Investigación de mercado profunda por ZIP
E1.2.2 — Calificación A/B/C del ZIP en 5 variables
E1.2.3 — Visita física al ZIP Code (drive-through)
E1.2.4 — Identificar zonas A, B y C de la ciudad
E1.3.1 — Analizar 10 casas comparables por ZIP Code
E1.3.2 — Calcular ARV (conservador + optimista)
E1.3.3 — Estimar remodelación por nivel
E1.3.4 — Aplicar la Regla del 75% (MAO)
E1.4.1 — Enviar mínimo 10 ofertas formales al mes
E1.4.2 — Negociar activamente cada oferta
E1.4.3 — Identificar el "pain point" del vendedor
E1.4.4 — Documentar resultado de cada oferta
E2.1.1 — Llamar y entrevistar 10 Hard Money Lenders
E2.1.2 — Solicitar term sheets oficiales
E2.1.3 — Investigar opciones de Private Money
E2.1.4 — Evaluar HELOC sobre vivienda principal
E2.1.5 — Elegir HML primario + backup
E2.2.1 — Identificar y registrarse a 5 eventos
E2.2.2 — Asistir físicamente a los eventos
E2.2.3 — Follow-up en 48 horas
E2.3.1 — Identificar 20 wholesalers activos
E2.3.2 — Contactar y presentar Buy Box
E2.3.3 — Llamada 1-a-1 con wholesalers
E2.3.4 — Suscribirse a buyer lists
E2.3.5 — Análisis express de cada deal entrante
E2.4.1 — Identificar y contactar 10 GCs
E2.4.2 — Reunión con cada GC
E2.4.3 — Solicitar bid sobre propiedad muestra
E2.4.4 — Verificar licencia, seguros y referencias
E2.4.5 — Cultivar relación a largo plazo
E2.5.1 — Investigar proceso de permisos
E2.5.2 — Visita o llamada al Building Department
E2.5.3 — Restricciones de zonificación por ZIP
E2.5.4 — Mapear inspecciones obligatorias
E2.5.5 — Identificar programas especiales
E2.6.1 — Crear plantilla maestra de SOW
E2.6.2 — Aplicar SOW a un caso real
E2.6.3 — Cronograma con hitos clave
E2.6.4 — Calcular contingencia 10-15%
E3.1.1 — Visitar la propiedad mínimo 3 veces por semana
E3.1.2 — Reunión semanal de avance con el GC
E3.1.3 — Documentar con fotos antes/durante/después
E3.2.1 — Controlar cada pago con draw schedule
E3.2.2 — Budget tracker actualizado semanalmente
E3.2.3 — Plan de contingencia para retrasos
E3.3.1 — Inspecciones de obra en hitos clave
E3.3.2 — Resolver problemas en 24 horas
E3.3.3 — Generación de bitácoras semanales
E4.1.1 — Staging profesional completado
E4.1.2 — Fotografía y video profesional listos
E4.2.1 — Precio de lista validado con comparables actuales
E4.2.2 — Calcular breakeven y ganancia neta antes de listar
E4.3.1 — Publicar en mínimo 4 plataformas
E4.3.2 — Open house en la primera semana
E4.4.1 — Agente de ventas seleccionado
E5.1.1 — Análisis detallado del primer flip
E5.1.2 — SOPs creados para cada etapa del proceso
E5.2.1 — Red de financiadores privados en construcción
E5.2.2 — Sistema de generación de leads activo
E5.3.1 — Contratar Project Manager
E5.3.2 — Metas para el próximo año definidas
E5.4.1 — Múltiples deals simultáneos con estructura
E5.4.2 — Evaluar expansión a segundo mercado
```

---

*Lista de tareas FlipMentoría · 77 tareas totales · Sistema E0-E5 · Nacional USA*
$FMLH4W6Y$,
  5,
  ARRAY['lista', 'tareas', 'taskade', 'copypaste']::text[],
  '{}'::jsonb
);

-- ─── TODOS · contactos · 📇 Documento A · Base de Contactos — 400+ proveedores verificados ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'TODOS',
  'contactos',
  null,
  $FMBL0LFA$📇 Documento A · Base de Contactos — 400+ proveedores verificados$FMBL0LFA$,
  $FMBL0LFA$CPAs · Abogados · HMLs · Wholesalers · GCs · Stagers · Agentes · DSCR · PMs · Tax · VAs · etc.$FMBL0LFA$,
  $FMBL0LFA$**FLIPPING RENTALS · FLIPMENTORÍA**

**BASE DE CONTACTOS**

***Directorio operativo por etapa para Fix & Flip***

*Documento de referencia para estudiantes*

Fix & Flip · Estados Unidos · 2026

Cómo leer este documento

Este es el **Documento A** de la trilogía de soporte de FlipMentoría:

- **Documento A --- Contactos:** este documento. \~400 empresas y
  servicios verificados por etapa.

- **Documento B --- Procesos y herramientas:** qué software, portales y
  apps se usan en cada sub-tarea.

- **Documento C --- Extras por etapa:** plantillas, KPIs, scripts,
  casos, quality gates y recursos.

Cada tabla tiene 5 columnas

  ---------------------------------------------------------------------
  **Columna**     **Qué contiene**
  --------------- -----------------------------------------------------
  **Actor         El rol (ej.: «CPA especializado en bienes raíces»,
  necesario**     «Hard Money Lender local Miami»)

  **Nombre**      Empresa/servicio específico, verificado mayo 2026

  **Página web**  URL oficial

  **Términos y    Precio, requisitos, límites geográficos, FICO mínimo,
  condiciones**   etc.

  **Notas**       Cuándo usarlo, errores comunes, alternativas para
                  principiantes
  ---------------------------------------------------------------------

Regla maestra geográfica

+-----------------------------------------------------------------+
| **SERVICIOS ATADOS AL ESTADO DE RESIDENCIA**                    |
|                                                                 |
| CPA personal, abogado personal, banca personal, planificación   |
| fiscal, seguro de salud. Si vives en CA/NY/NJ, estos quedan en  |
| tu estado.                                                      |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **SERVICIOS ATADOS AL ESTADO DE INVERSIÓN (DONDE ESTÁ LA        |
| PROPIEDAD)**                                                    |
|                                                                 |
| Hard money lender, general contractor, title company, real      |
| estate attorney de propiedad, permit office, REIA local,        |
| wholesalers, property manager, seguro de la propiedad. Si       |
| inviertes en TX/FL/AZ, estos quedan allá.                       |
+-----------------------------------------------------------------+

Cobertura geográfica

**Tier 1 (cobertura profunda):** Florida (Miami, Tampa, Orlando,
Jacksonville, Fort Lauderdale, Naples, Cape Coral, West Palm Beach),
Texas (Austin, Round Rock, Houston, Dallas, San Antonio, Fort Worth),
California (LA, San Diego, Sacramento, SF Bay Area, Inland Empire), New
York (NYC, Long Island, Buffalo, Westchester), New Jersey (North,
Central, South).

**Tier 2 (cobertura nacional + ciudades clave):** Arizona, Nevada, Utah,
Georgia, North Carolina, Pennsylvania, Ohio, Illinois, Massachusetts,
Maryland, Oklahoma, Wyoming.

Convenciones de color

- **🟢 Nacional:** opera en la mayoría de los 50 estados.

- **🔵 Estatal:** opera solo en uno o pocos estados.

- **🟠 Local:** opera solo en una ciudad o metro.

Caveat importante

+-----------------------------------------------------------------+
| **VERIFICAR ANTES DE USAR**                                     |
|                                                                 |
| Las URLs, precios y términos están verificados a mayo 2026. Las |
| plataformas cambian rápido --- confirma siempre en la página    |
| oficial antes de contratar. Esto NO es asesoría legal ni        |
| fiscal: consulta CPA y abogado en tu estado antes de actuar.    |
+-----------------------------------------------------------------+

**E0**

**FUNDACIÓN**

**Estructura legal, fiscal, bancaria y de seguros**

*Antes de buscar deals, levantar capital o enviar ofertas. Esta etapa
construye la base que protege tu patrimonio y permite operar legalmente
en Estados Unidos.*

E0.1 · Formación de LLC y Agente Registrado

La LLC se forma en el estado donde estará la propiedad. Si vives en
CA/NY pero inviertes en TX/FL, NO formes LLC en tu estado de residencia
(pagarías franchise tax doble). Puedes usar una LLC holding en Wyoming
arriba para anonimato razonable.

🟢 Nacional

  -----------------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**                   **Términos y      **Notas**
  necesario**                                                        condiciones**     
  --------------- ----------------- -------------------------------- ----------------- ----------------
  **Formación de  **Northwest       *northwestregisteredagent.com*   \\$39 base + tasa  El más privado:
  LLC + agente    Registered                                         estatal; RA       NO vende tus
  registrado**    Agent**                                            \\$125/año         datos.
                                                                     (incluido año 1,  Recomendado para
                                                                     no sube)          principiantes.

  **Formación de  **ZenBusiness**   *zenbusiness.com*                Starter \\$0 +     Bueno para
  LLC económica**                                                    tasa estatal; Pro presupuesto
                                                                     \\$199/año (EIN    bajo. EIN
                                                                     incluido)         incluido ahorra
                                                                                       trámite IRS.

  **Formación de  **Inc Authority** *incauthority.com*               LLC gratis + tasa Desmarca extras
  LLC con                                                            estatal; cuidado  en checkout ---
  upsells**                                                          con upsells       el plan gratis
                                                                                       cubre lo
                                                                                       esencial.

  **Formación +   **Tailor Brands** *tailorbrands.com*               LLC desde \\$0 +   Útil si arrancas
  branding**                                                         state fee; planes marca personal
                                                                     con logo y web    junto con la
                                                                                       LLC.

  **LLC con       **Anderson        *andersonadvisors.com*           LLC               Recomendado
  asesoría        Business                                           \\$750--\\$1,500;   cuando ya tienes
  tributaria**    Advisors**                                         planificación     3+ propiedades o
                                                                     \\$2,500+          quieres series
                                                                                       LLC.

  **LLC + CPA     **KKOS Lawyers    *kkoslawyers.com*                Setup desde       Mark Kohler es
  combo**         (Mark Kohler)**                                    \\$1,000; CPA y    autor de «The
                                                                     abogado en una    Tax & Legal
                                                                     firma             Playbook».
                                                                                       Recomendado por
                                                                                       flippers.

  **LLC online    **LegalZoom**     *legalzoom.com*                  \\$0 + state fee;  El más conocido
  tradicional**                                                      RA \\$249/año      pero más caro.
                                                                                       No mejor que
                                                                                       Northwest.

  **LLC económica **Bizee (antes    *bizee.com*                      \\$0 + state fee;  Buena opción si
  (Free + RA año  Incfile)**                                         RA gratis año 1,  quieres empezar
  1)**                                                               \\$119/año después con cero.

  **LLC +         **Rocket Lawyer** *rocketlawyer.com*               \\$99.99 + state   Útil si
  servicios                                                          fee (no miembros) necesitas review
  legales por                                                                          legal continuo.
  suscripción**                                                                        
  -----------------------------------------------------------------------------------------------------

🔵 Por estado --- portales oficiales del Secretary of State

  ----------------------------------------------------------------------------------------------------------------
  **Actor       **Nombre**       **Página web**                               **Términos y       **Notas**
  necesario**                                                                 condiciones**      
  ------------- ---------------- -------------------------------------------- ------------------ -----------------
  **Búsqueda    **TX Secretary   *sos.state.tx.us*                            \\$300 LLC;         Texas no cobra
  nombre +      of State                                                      franchise tax      impuesto personal
  filing LLC**  (SOSDirect)**                                                 gratis si revenue  --- ventaja para
                                                                              \< \\$1.23M         residentes.

  **Búsqueda    **FL Sunbiz**    *dos.fl.gov/sunbiz*                          \\$125 LLC +        Verifica nombre
  nombre +                                                                    \\$138.75/año       disponible antes
  filing LLC**                                                                reporte anual (1   de pagar paquete.
                                                                              mayo)              

  **Búsqueda    **AZ Corporation *ecorp.azcc.gov*                             \\$50 LLC; sin      Más barato que
  nombre +      Commission**                                                  reporte anual      TX/FL/CA.
  filing LLC**                                                                general            

  **Búsqueda    **CA Secretary   *bizfileonline.sos.ca.gov*                   \\$70 LLC +         MUY costoso. Si
  nombre +      of State                                                      \\$800/año          vives en CA pero
  filing LLC**  (BizFile)**                                                   franchise tax      inviertes fuera,
                                                                              mínimo             NO formes LLC en
                                                                                                 CA.

  **Búsqueda    **NY Department  *dos.ny.gov*                                 \\$200 +            Requisito raro de
  nombre +      of State**                                                    publicación        publicación.
  filing LLC**                                                                obligatoria en 2   Evita Manhattan
                                                                              periódicos         (caro).
                                                                              (\\$500--\\$2,000)   

  **Búsqueda    **NJ Division of *njportal.com/dor/businessregistration*      \\$125 LLC +        Bookmark para
  nombre +      Revenue**                                                     \\$75/año reporte   residentes NJ que
  filing LLC**                                                                                   invierten allí.

  **Búsqueda    **GA             *sos.ga.gov/georgia-corporations-division*   \\$100 LLC +        Estado amigable.
  nombre +      Corporations                                                  \\$50/año reporte   Online filing
  filing LLC**  Division**                                                                       rápido.

  **Búsqueda    **NC Secretary   *sosnc.gov*                                  \\$125 LLC +        Reporte anual
  nombre +      of State**                                                    \\$200/año reporte  abril 15.
  filing LLC**                                                                                   

  **Búsqueda    **PA Department  *dos.pa.gov*                                 \\$125 LLC; sin     Único: PA cobra
  nombre +      of State**                                                    reporte anual      Capital
  filing LLC**                                                                rutinario          Stock/Foreign
                                                                                                 Franchise Tax.

  **Búsqueda    **OH Secretary   *ohiosos.gov*                                \\$99 LLC; sin      Estado barato y
  nombre +      of State**                                                    reporte anual      simple para LLCs.
  filing LLC**                                                                                   

  **Búsqueda    **IL Secretary   *ilsos.gov*                                  \\$150 LLC +        Más caro que la
  nombre +      of State**                                                    \\$75/año reporte   media.
  filing LLC**                                                                                   

  **Búsqueda    **MA Secretary   *sec.state.ma.us*                            \\$500 LLC +        El más caro de
  nombre +      of the                                                        \\$500/año reporte  USA. Forma fuera
  filing LLC**  Commonwealth**                                                                   si puedes.

  **Búsqueda    **MD State       *dat.maryland.gov*                           \\$100 LLC +        Reporte anual
  nombre +      Department of                                                 \\$300/año reporte  obligatorio 15
  filing LLC**  Assessments**                                                                    abril.

  **Búsqueda    **NV Secretary   *nvsos.gov*                                  \\$425 (filing +    Costoso pero sin
  nombre +      of State**                                                    initial list +     state income tax.
  filing LLC**                                                                business license)  

  **Búsqueda    **UT Department  *corporations.utah.gov*                      \\$59 LLC +         El más barato.
  nombre +      of Commerce**                                                 \\$20/año           Friendly para
  filing LLC**                                                                                   inversionistas.

  **Búsqueda    **OK Secretary   *sos.ok.gov*                                 \\$100 LLC +        Barato. Buen
  nombre +      of State**                                                    \\$25/año           estado para
  filing LLC**                                                                                   flippers.

  **Búsqueda    **WY Secretary   *sos.wyo.gov*                                \\$100 LLC +        Para holding LLCs
  nombre +      of State**                                                    \\$60/año mínimo    anónimas. Ver
  filing LLC**                                                                                   E0.2.
  ----------------------------------------------------------------------------------------------------------------

E0.2 · Wyoming Holding LLC (anonimato razonable)

+-----------------------------------------------------------------+
| **¿CUÁNDO SÍ USAR WYOMING HOLDING LLC?**                        |
|                                                                 |
| Cuando tienes 3+ propiedades, alto patrimonio o quieres aislar  |
| riesgos. La WY LLC es DUEÑA de las LLCs de cada estado donde    |
| están las propiedades. Wyoming no requiere divulgar miembros ni |
| managers en registros públicos.                                 |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **¿CUÁNDO NO USAR WYOMING HOLDING?**                            |
|                                                                 |
| Si tienes 1--2 propiedades, los costos extra (\~\\$500/año en    |
| WY) NO se justifican. ADVERTENCIA: Olmstead v. FTC (FL Supreme  |
| Court 2010) y casos similares muestran que la \'anonimidad WY\' |
| NO blinda contra demandas en el estado donde está la propiedad. |
| Single-member LLCs pierden charging order exclusivo en muchos   |
| estados.                                                        |
+-----------------------------------------------------------------+

  --------------------------------------------------------------------------------------
  **Actor       **Nombre**    **Página web**             **Términos y    **Notas**
  necesario**                                            condiciones**   
  ------------- ------------- -------------------------- --------------- ---------------
  **LLC anónima **Wyoming     *wyomingcompany.com*       \\$50            Servicio
  en Wyoming**  Corporate                                formación +     nominee
                Services**                               \\$200/año       mantiene tu
                                                         agente;         nombre fuera
                                                         servicio        del registro
                                                         nominee         público.
                                                         disponible      

  **LLC anónima **Wyoming LLC *wyomingllcattorney.com*   \\$99--\\$199     Incluye
  en Wyoming**  Attorney**                               setup +         plantillas de
                                                         \\$200/año       operating
                                                                         agreement.

  **Reporte     **FinCEN      *fincen.gov/boi*           Reporte         Aún con WY
  Beneficial    BOI**                                    obligatorio     anónima, el IRS
  Ownership**                                            para casi todas y FinCEN
                                                         las LLC USA     conocen al
                                                                         beneficiario.
                                                                         Anonimato es
                                                                         contra el
                                                                         público, no
                                                                         contra el
                                                                         gobierno.
  --------------------------------------------------------------------------------------

E0.3 · CPA y Bookkeeping (atado al ESTADO DE RESIDENCIA)

El CPA es de tu estado de RESIDENCIA porque maneja tu declaración
personal. Necesita conocer leyes multi-estado si vives en CA/NY pero
inviertes en TX/FL.

🟢 CPAs especializados en bienes raíces --- Nacional

  --------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**                **Términos y         **Notas**
  necesario**                                                     condiciones**        
  --------------- ----------------- ----------------------------- -------------------- -------------------
  **CPA RE        **The Real Estate *therealestatecpa.com*        \\$300--\\$1,500/mes   Brandon Hall +
  nacional (#1    CPA (Hall CPA)**                                según cartera        Thomas Castelli.
  referencia)**                                                                        Podcast «Tax Smart
                                                                                       Real Estate
                                                                                       Investors».

  **Estrategia    **WealthAbility   *wealthability.com*           Red de CPAs          Autor de «Tax-Free
  fiscal          (Tom                                            entrenados; consulta Wealth». Para
  avanzada**      Wheelwright)**                                  inicial \\$200+       inversionistas
                                                                                       medianos/grandes.

  **Estructura    **Anderson        *andersonadvisors.com*        Tax planning         Clint Coons. Setup
  legal + CPA     Business                                        \\$2,500; preparación de holding + LLCs
  combo**         Advisors**                                      \\$1,200+             en serie. Webinar
                                                                                       gratuito.

  **Abogado/CPA   **KKOS Lawyers**  *kkoslawyers.com*             Tax + legal combo    Mark Kohler. Autor
  en una sola                                                     desde \\$1,500        de «The Tax & Legal
  firma**                                                                              Playbook».

  **CPA dedicado  **INVESTOR        *investorfriendlycpa.com*     Mensual desde \\$200  Marca registrada.
  a REI**         FRIENDLY CPA®**                                                      Bookkeeping + tax.

  **CPA RE en 50  **Dimov Tax**     *dimovtax.com*                Personalizado;       Bueno para
  estados**                                                       expat-friendly       inversionistas
                                                                                       extranjeros o con
                                                                                       ingresos
                                                                                       internacionales.

  **CPA con foco  **Pinnacle Tax &  *pinnacletaxstrategies.com*   Servicio mensual     Para inversionistas
  multi-LLC**     Accounting                                      outsourced           con 5+ propiedades.
                  Strategies**                                                         
  --------------------------------------------------------------------------------------------------------

🔵 Cómo encontrar CPA local en tu estado de residencia

  -----------------------------------------------------------------------------------------------
  **Actor          **Nombre**          **Página web**     **Términos y      **Notas**
  necesario**                                             condiciones**     
  ---------------- ------------------- ------------------ ----------------- ---------------------
  **Directorio     **AICPA Find a      *aicpa-cima.com*   Gratis búsqueda   Filtra por
  nacional CPAs**  CPA**                                                    especialidad «Real
                                                                            Estate». Verifica
                                                                            licencia activa.

  **Directorio CPA **State CPA         *Buscar «\[state\] Gratis            Cada estado tiene su
  por estado**     Society**           CPA society»*                        asociación: TXCPA,
                                                                            FICPA, CalCPA,
                                                                            NYSSCPA, NJCPA.

  **Referidos      **Tu REIA local**   *Ver E2.4 abajo*   Membresía         Mejor método:
  verificados**                                           \\$97--\\$250/año   pregunta en tu REIA
                                                                            por «preferred CPAs
                                                                            investor-friendly».

  **Verificación   **CPAverify.org**   *cpaverify.org*    Gratis            Confirma que la
  de licencia**                                                             licencia CPA está
                                                                            activa y sin
                                                                            disciplina.
  -----------------------------------------------------------------------------------------------

E0.4 · Bookkeeping

  ----------------------------------------------------------------------------------------------------
  **Actor           **Nombre**      **Página web**            **Términos y       **Notas**
  necesario**                                                 condiciones**      
  ----------------- --------------- ------------------------- ------------------ ---------------------
  **Bookkeeping     **Stessa**      *stessa.com*              Gratis tier        Empieza aquí.
  GRATIS para REI**                                           robusto; Pro       Diseñado por
                                                              \\$20/mes           Roofstock para
                                                                                 landlords/flippers.

  **Bookkeeping por **REI Hub**     *reihub.net*              \\$15--\\$30/mes     Job costing por
  propiedad**                                                 según portafolio   proyecto. Chart of
                                                                                 Accounts pre-config.

  **Software        **QuickBooks    *quickbooks.intuit.com*   Simple Start       Estándar de la
  contable          Online**                                  \\$30/mes; Plus     industria. Plus
  estándar**                                                  \\$90/mes           permite class
                                                                                 tracking por
                                                                                 propiedad.

  **Software        **Xero**        *xero.com*                Desde \\$20/mes     Más simple que QBO
  contable simple                                                                para multi-LLC.
  multi-entidad**                                                                

  **Bookkeeping     **Hammock**     *hammock.io*              Automatización     UK origin pero opera
  para landlords**                                            bank feed          en US.

  **Bookkeeping     **Bench**       *bench.co*                \\$299--\\$499/mes   No especializado en
  outsourced                                                                     REI pero confiable.
  general**                                                                      

  **Bookkeeping     **REI           *reibookkeepers.com*      Servicio mensual   Equipo dedicado
  outsourced REI**  Bookkeepers**                             personalizado      especialista en REI.

  **Bookkeeping +   **Pilot**       *pilot.com*               Desde \\$499/mes    Para portafolios
  tax + CFO**                                                                    grandes.

  **Bookkeeping     **Botkeeper**   *botkeeper.com*           Custom pricing     Para volúmenes altos.
  AI + humanos**                                                                 
  ----------------------------------------------------------------------------------------------------

E0.5 · Banca de Negocio

  --------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**     **Página web**                      **Términos y        **Notas**
  necesario**                                                        condiciones**       
  --------------- -------------- ----------------------------------- ------------------- -----------------------
  **Banca online  **Relay**      *relayfi.com*                       Gratis; hasta 20    Permite separar capital
  para REI                                                           sub-cuentas         por LLC/propiedad.
  (Profit                                                                                Recomendado para REI.
  First)**                                                                               

  **Banca digital **Mercury**    *mercury.com*                       Gratis; sin fees    Mejor UX. Bueno para
  fintech**                                                                              LLCs nuevas.

  **Banca online  **Bluevine**   *bluevine.com*                      Gratis; APY hasta   Genera intereses sobre
  con APY**                                                          2%+                 balance ocioso.

  **Banca online  **Novo**       *novo.co*                           Gratis para small   Integra Stripe, QBO,
  simple**                                                           business            Shopify.

  **Banca +       **Found**      *found.com*                         Gratis tier; Plus   Para freelancers/REI
  bookkeeping                                                        \\$19.99/mes         individuales.
  integrado**                                                                            

  **Banca         **Chase        *chase.com/business*                \\$15/mes (waivable) Sucursales físicas
  tradicional +   Business                                                               importantes para
  sucursales**    Complete**                                                             depósitos de cierre.

  **Banca         **Bank of      *bankofamerica.com/smallbusiness*   Tiers según volumen Línea de crédito + SBA
  tradicional +   America                                                                disponibles.
  SBA loans**     Business**                                                             

  **Banca SBA y   **Live Oak     *liveoakbank.com*                   SBA hasta \\$5M;     Cuando necesitas SBA o
  comerciales**   Bank**                                             líneas comerciales  línea \\$250K+.

  **Tarjeta       **Brex**       *brex.com*                          Gratis para LLCs    Para LLCs con flujo
  corporate sin                                                      con revenue         establecido.
  garantía                                                                               
  personal**                                                                             

  **Tarjeta +     **Ramp**       *ramp.com*                          Gratis; 1.5%        Competidor de Brex con
  spend                                                              cashback            automation.
  management**                                                                           

  **Tarjeta de    **Chase Ink    *chase.com*                         5% en               Para gastos Home
  crédito         Business                                           oficina/internet;   Depot/Lowes/internet.
  cashback        Cash**                                             sin anualidad       
  business**                                                                             
  --------------------------------------------------------------------------------------------------------------

E0.6 · Seguros (Builder\'s Risk · Vacant · Landlord · GL)

Necesitas cobertura distinta según la etapa de la propiedad: Vacant
antes de empezar, Builder\'s Risk durante obra, Landlord cuando rentas.
La General Liability protege a tu LLC.

  -----------------------------------------------------------------------------------------------------
  **Actor         **Nombre**         **Página web**                  **Términos y     **Notas**
  necesario**                                                        condiciones**    
  --------------- ------------------ ------------------------------- ---------------- -----------------
  **Seguro REI    **NREIG**          *nreig.com*                     Mensual          Estándar de oro
  mensual (todo                                                      flexible;        para flippers.
  en uno)**                                                          vacant + reno +  Cobertura por mes
                                                                     ocupada en una   que necesitas.
                                                                     sola póliza      

  **Seguro REI    **Arcana Insurance *arcanainsuranceservices.com*   Tarifa especial  Sin
  aliado de       Services**                                         para miembros    foto/inspección
  National REIA**                                                    National REIA    si eres miembro
                                                                                      REIA.

  **Builder\'s    **REIGuard /       *reiguard.com*                  Programa         Cobertura
  Risk + GL para  Affinity                                           específico Fix & especializada.
  flippers**      Insurance**                                        Flip             

  **Landlord      **Steadily**       *steadily.com*                  Cotización       Solo landlord.
  insurance                                                          instantánea      Rápido.
  digital**                                                          online; 50       
                                                                     estados          

  **Landlord +    **Obie**           *obieinsurance.com*             Broker digital;  Especialmente
  builder\'s risk                                                    50 estados       para portafolios.
  digital**                                                                           

  **Vacant +      **Foremost**       *foremost.com*                  Variable por     Carrier
  Landlord                                                           agente (Farmers  tradicional.
  tradicional**                                                      Group)           

  **General       **Next Insurance** *nextinsurance.com*             \\$20--\\$60/mes   Rápido, 100%
  Liability para                                                                      online.
  LLC**                                                                               

  **GL flexible   **Thimble**        *thimble.com*                   Por proyecto u   Útil para
  por proyecto**                                                     hora             inspecciones
                                                                                      cortas.

  **Multifamily   **Honeycomb**      *honeycombinsurance.com*        18 estados       Especializado en
  2-4 unidades**                                                                      pequeño
                                                                                      multifamily.

  **Comparador de **Insurify**       *insurify.com*                  Gratis           Compara múltiples
  pólizas**                                                                           carriers en una
                                                                                      búsqueda.

  **Comparador de **Policygenius**   *policygenius.com*              Gratis           Otro comparador
  pólizas**                                                                           independiente.
  -----------------------------------------------------------------------------------------------------

E0.7 · Abogados de Bienes Raíces

El abogado se elige por ESTADO DE INVERSIÓN. NY exige abogado en TODO
cierre. GA también. Florida es híbrido (abogado o title agent). En
TX/AZ/CA suele ser opcional.

  --------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**               **Página web**                  **Términos y    **Notas**
  necesario**                                                             condiciones**   
  -------------- ------------------------ ------------------------------- --------------- ----------------
  **Abogados RE  **KKOS Lawyers**         *kkoslawyers.com*               Setup +         Multi-estado.
  nacionales                                                              asesoría desde  Combo legal +
  (Kohler)**                                                              \\$1,000         fiscal.

  **Asset        **Royal Legal            *royallegalsolutions.com*       Series LLC +    Para
  protection     Solutions**                                              trusts;         inversionistas
  avanzada**                                                              \\$2,500+        con 5+
                                                                                          propiedades.

  **Directorio   **Avvo**                 *avvo.com*                      Gratis búsqueda Filtra por «Real
  nacional con                                                                            Estate» +
  ratings**                                                                               ciudad. Revisa
                                                                                          disciplinas.

  **Directorio   **Martindale-Hubbell**   *martindale.com*                Gratis          Tradicional,
  nacional con                                                                            ratings entre
  ratings                                                                                 pares.
  AV/BV**                                                                                 

  **Búsqueda     **Texas Bar Lawyer       *texasbar.com/findalawyer*      Gratis          Servicio oficial
  abogado TX**   Referral**                                                               del State Bar of
                                                                                          Texas.

  **Búsqueda     **Florida Bar Lawyer     *floridabar.org/public/lrs*     Gratis          Servicio
  abogado FL**   Referral**                                                               oficial. FL es
                                                                                          cierre por title
                                                                                          agent o abogado.

  **Búsqueda     **State Bar of Arizona   *azbar.legalserviceslink.com*   Gratis          Servicio
  abogado AZ**   Find a Lawyer**                                                          oficial.

  **Búsqueda     **California Lawyer      *calbar.ca.gov*                 Gratis          Buscar por
  abogado CA**   Referral**                                                               specialty «Real
                                                                                          Estate».

  **Búsqueda     **NYS Bar Association**  *nysba.org*                     Gratis          NY REQUIERE
  abogado NY**                                                                            abogado en TODO
                                                                                          cierre. Sin él
                                                                                          no hay cierre.

  **Búsqueda     **NJ State Bar           *njsba.com*                     Gratis          Servicio
  abogado NJ**   Association**                                                            oficial.

  **Búsqueda     **State Bar of Georgia** *gabar.org*                     Gratis          GA también
  abogado GA**                                                                            requiere abogado
                                                                                          en cierres.

  **Búsqueda     **MA Lawyer Referral     *masslawhelp.com*               Gratis          MA es estado de
  abogado MA**   Service**                                                                abogado
                                                                                          obligatorio en
                                                                                          cierres.

  **Búsqueda     **Maryland State Bar**   *msba.org*                      Gratis          MD es estado de
  abogado MD**                                                                            abogado
                                                                                          obligatorio.
  --------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E0**                                          |
|                                                                 |
| Día 1: EIN del IRS (gratis). Día 2-7: LLC en estado donde       |
| estará la propiedad + cuenta bancaria Relay o Mercury. Semana   |
| 2: entrevista 2 CPAs especializados RE de tu estado de          |
| RESIDENCIA. Semana 3: cotiza NREIG/Arcana para Builder\'s Risk. |
| Antes del primer contrato: contrata abogado RE local en el      |
| estado de inversión.                                            |
+-----------------------------------------------------------------+

**E1**

**EVALUAR**

**Encontrar y analizar deals**

*El inversionista no pierde dinero en la remodelación. Lo pierde
comprando mal. Esta etapa construye velocidad y criterio de análisis.*

E1.1 · Plataformas de datos, leads y comparables

  ----------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**              **Página web**            **Términos y        **Notas**
  necesario**                                                       condiciones**       
  --------------- ----------------------- ------------------------- ------------------- --------------------
  **Lead gen +    **PropStream**          *propstream.com*          \\$99/mes            El más usado.
  comps + skip                                                      (Essentials);       Adquirió
  tracing**                                                         \\$81/mes anual;     BatchLeads +
                                                                    7-day trial; 160M+  BatchDialer en julio
                                                                    propiedades         2025.

  **Lead lists +  **BatchLeads**          *batchleads.io*           \\$99--\\$399/mes     Suite completa
  skip + dialer +                                                   según volumen       wholesale. Ahora
  SMS**                                                                                 parte de PropStream.

  **Driving for   **DealMachine**         *dealmachine.com*         \\$99--\\$299/mes;    App móvil con foto +
  dollars en                                                        hasta 15 team       GPS. Mejor para
  app**                                                             members             drive-for-dollars.

  **CRM + leads + **REIPro**              *myreipro.com*            \\$109/mes           All-in-one para REI;
  comps**                                                                               templates de cartas.

  **Datos West    **PropertyRadar**       *propertyradar.com*       \\$79--\\$299/mes     Mejor en California;
  Coast (CA/AZ                                                                          cobertura profunda.
  fuerte)**                                                                             

  **Datos         **Reonomy**             *reonomy.com*             Custom enterprise   Para CRE /
  comerciales /                                                                         multifamily.
  multifamily**                                                                         

  **MLS-based     **Privy**               *getprivy.com*            \\$97/mes            Comparables y deal
  deal finder**                                                                         alerts vía MLS.

  **Cash flow +   **Mashvisor**           *mashvisor.com*           \\$17.99--\\$99/mes   Bueno para Fix &
  STR analysis**                                                                        Hold con Airbnb.

  **Datos Airbnb  **AirDNA**              *airdna.co*               \\$39--\\$200/mes     Solo si la salida es
  / STR**                                                                               STR. Esencial en FL,
                                                                                        AZ, TN, NV.

  **Análisis de   **Rentometer**          *rentometer.com*          \\$29--\\$59/mes      Comps de renta por
  renta                                                                                 zip code.
  tradicional**                                                                         

  **Listas de     **ListSource**          *listsource.com*          Pay-per-list        Mailing lists
  propietarios                                                                          profesional.
  (CoreLogic)**                                                                         

  **Comps         **Zillow**              *zillow.com*              Gratis              Inicio rápido.
  públicos                                                                              Zestimate NO es ARV.
  (gratis)**                                                                            

  **Comps         **Redfin**              *redfin.com*              Gratis              Datos a veces más
  públicos                                                                              limpios que Zillow.
  (gratis)**                                                                            

  **Análisis      **City-Data**           *city-data.com*           Gratis básico       Income, escuelas,
  demográfico por                                                                       crime.
  ZIP**                                                                                 

  **Crime +       **NeighborhoodScout**   *neighborhoodscout.com*   Gratis limitado;    Filtros profundos.
  escuelas                                                          \\$39.99/mes         
  detallado**                                                                           
  ----------------------------------------------------------------------------------------------------------

E1.2 · Skip Tracing (encontrar contactos de propietarios)

  ----------------------------------------------------------------------------------------------------------------
  **Actor           **Nombre**             **Página web**           **Términos y          **Notas**
  necesario**                                                       condiciones**         
  ----------------- ---------------------- ------------------------ --------------------- ------------------------
  **Skip tracing en **BatchSkipTracing**   *batchskiptracing.com*   \\$0.07--\\$0.20/lead   Integrado con
  bulk**                                                                                  BatchLeads/PropStream.

  **Skip tracing    **REISkip**            *reiskip.com*            \\$0.10--\\$0.15/hit    Más barato que TLO.
  económico para                                                                          
  REI**                                                                                   

  **Skip tracing    **Skip Genie**         *skipgenie.com*          \\$59/mes ilimitado    Volumen medio con tarifa
  por suscripción**                                                                       fija.

  **Skip tracing    **TLO (TransUnion)**   *tlo.com*                Requiere licencia y   El más completo. Solo
  premium**                                                         aprobación            licensed professionals.

  **Skip tracing    **BeenVerified**       *beenverified.com*       \\$26/mes              Más caro por hit pero
  consumidor**                                                                            accesible.

  **Skip tracing    **IDI Data**           *idicore.com*            Enterprise pricing    Para mayor escala /
  premium                                                                                 equipos.
  investigativo**                                                                         
  ----------------------------------------------------------------------------------------------------------------

E1.3 · Direct Mail, Cold Calling y SMS

  -------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**          **Página web**              **Términos y           **Notas**
  necesario**                                                     condiciones**          
  --------------- ------------------- --------------------------- ---------------------- ----------------
  **Direct mail   **Ballpoint         *ballpointmarketing.com*    \\$0.65--\\$1.20/carta   El más
  handwritten**   Marketing**                                                            recomendado para
                                                                                         yellow letters.

  **Direct mail   **Open Letter       *openlettermarketing.com*   \\$0.55--\\$1.10/carta   Alternativa con
  manuscrito**    Marketing**                                                            automation
                                                                                         BatchLeads.

  **Direct mail   **REIPrintMail**    *reiprintmail.com*          Tiers de precio según  Integrado con
  postcards /                                                     volumen                PropStream.
  cartas**                                                                               

  **Postales en   **PostcardMania**   *postcardmania.com*         Variable por volumen   Bueno para
  bulk**                                                                                 mailings
                                                                                         masivos.

  **SMS marketing **Launch Control**  *launchcontrol.us*          \\$147+/mes             TCPA-compliant
  (TCPA                                                                                  --- crítico para
  compliant)**                                                                           evitar multas.

  **SMS + voice   **Smarter Contact** *smartercontact.com*        \\$197+/mes             Muy usado en
  broadcast**                                                                            wholesaling.

  **SMS           **LeadSherpa**      *leadsherpa.com*            \\$300+/mes             Compliance TCPA
  marketing**                                                                            fuerte.

  **CRM + SMS     **REI Reply**       *reireply.com*              \\$99--\\$297/mes        Foco
  para                                                                                   wholesaling.
  wholesalers**                                                                          

  **Power dialer  **Mojo Dialer**     *mojosells.com*             \\$99--\\$149/mes        Estándar de la
  (triple line)**                                                                        industria.

  **Predictive    **CallTools**       *calltools.com*             \\$179+/mes ilimitado   Para equipos
  dialer cold                                                                            grandes.
  calling**                                                                              

  **Power dialer  **BatchDialer**     *batchdialer.com*           Ahora parte de         Integrado con
  integrado                                                       PropStream             BatchLeads.
  BatchLeads**                                                                           

  **Ringless      **REI Rail**        *reirail.com*               \\$99+/mes              Drops voicemails
  voicemail**                                                                            sin sonar.

  **Registro DNC  **National Do Not   *donotcall.gov*             Gratis                 Suprime DNC
  obligatorio**   Call Registry**                                                        antes de llamar
                                                                                         o multa \\$40K+.
  -------------------------------------------------------------------------------------------------------

E1.4 · Wholesalers --- Nacionales 🟢

Los wholesalers asignan contratos con descuento. Son la fuente más
rápida de deals off-market. Combina nacionales con locales por ciudad
(E1.5).

  ------------------------------------------------------------------------------------------------------------------------------
  **Actor           **Nombre**           **Página web**                                        **Términos y    **Notas**
  necesario**                                                                                  condiciones**   
  ----------------- -------------------- ----------------------------------------------------- --------------- -----------------
  **Wholesaler      **New Western        *newwestern.com*                                      50+ oficinas    Compra «una casa
  nacional #1**     Acquisitions**                                                             USA; registro   cada 13 minutos».
                                                                                               gratis          \\$17B+ en
                                                                                                               transacciones
                                                                                                               desde 2008.
                                                                                                               Modelo
                                                                                                               agente-broker.

  **Wholesaler      **NetWorth Realty    *networthrealty.com*                                  20+ ciudades;   Modelo similar a
  nacional**        USA**                                                                      oficinas        New Western.
                                                                                               estatales       Pipeline semanal.

  **Marketplace     **Roofstock**        *roofstock.com*                                       Comisión 3%     Más Fix & Hold
  single-family                                                                                                que Flip.
  rental**                                                                                                     

  **Red nacional    **Connected          *connectedinvestors.com*                              \\$97/mes PiN    1M+
  wholesalers +     Investors**                                                                                inversionistas.
  cash buyers**                                                                                                Plataforma +
                                                                                                               comunidad.

  **Marketplace +   **BiggerPockets      *biggerpockets.com/marketplace*                       Free; BP Pro    Comunidad enorme.
  foros de deals**  Marketplace**                                                              \\$39/mes        Foro de
                                                                                                               wholesalers.

  **Deals desde     **DealMachine        *dealmachine.com*                                     Incluido en     Integrado con la
  drivers**         Marketplace**                                                              suscripción     app.

  **Directorio      **HouseCashin Pro    *housecashin.com/directory/real-estate-wholesalers*   Gratis          El mejor
  wholesalers por   Directory**                                                                                directorio para
  ciudad**                                                                                                     arrancar.

  **Directorio      **RealEstateBees**   *realestatebees.com/resources/wholesalers*            Gratis          Filtros por
  wholesalers por                                                                                              estado y ciudad.
  ciudad**                                                                                                     

  **Directorio REI  **FlipperForce REI   *flipperforce.com/rei-groups*                         Gratis          Por estado y
  Groups**          Groups**                                                                                   ciudad.
  ------------------------------------------------------------------------------------------------------------------------------

Subastas y plataformas off-market

  ----------------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**        **Página web**                     **Términos y    **Notas**
                                                                           condiciones**   
  ------------------- ----------------- ---------------------------------- --------------- -----------------
  **Subastas          **Auction.com**   *auction.com*                      Comisión 5%+    Plataforma #1.
  foreclosure + REO**                                                      buyer\'s        Foreclosures y
                                                                           premium         bank-owned.

  **Subastas online   **Hubzu**         *hubzu.com*                        Premium         REO de servicers
  REO**                                                                    variable        (Altisource).

  **Subastas +        **Xome**          *xome.com*                         Variable        Mr. Cooper
  listings**                                                                               subsidiary.

  **Subastas en vivo  **ServiceLink     *auction.servicelinkauction.com*   Premium         Para
  y online**          Auction**                                            variable        inversionistas
                                                                                           serios.

  **Subastas online   **RealtyBid**     *realtybid.com*                    Variable        Competidor de
  residenciales**                                                                          Auction.com.

  **Foreclosures y    **RealtyTrac**    *realtytrac.com*                   \\$39.95/mes     Buena base de
  preforeclosures**                                                                        datos.

  **HUD homes         **HUD Home        *hudhomestore.gov*                 Gratis          Periodo
  (owner-occ          Store**                                                              owner-occupant,
  primero)**                                                                               luego inversores.

  **Tax deed subastas **GovDeals**      *govdeals.com*                     Por subasta     Útil para tax
  gubernamentales**                                                                        deed properties.

  **Tax sale del      **Buscar          *---*                              Variable por    FL, TX, AZ tienen
  condado**           «\[county\] tax                                      condado         rules
                      sale»**                                                              específicas.
  ----------------------------------------------------------------------------------------------------------

E1.5 · Wholesalers y REIAs por estado/ciudad --- Tier 1

**FLORIDA**

**📍 Miami**

  --------------------------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**      **Página web**                                                 **Términos y       **Notas**
  necesario**                                                                                    condiciones**      
  --------------- --------------- -------------------------------------------------------------- ------------------ --------------
  **Wholesaler    **New Western   *newwestern.com/locations/miami*                               Registro gratis    Inventario
  local Miami**   Miami**                                                                                           rotante;
                                                                                                                    portal con
                                                                                                                    deals.

  **Wholesaler    **Blue Door     *bluedrg.com/wholesale*                                        \(305\) 363-5990   Wholesaler con
  local Miami**   Real Estate                                                                                       foco Miami.
                  Group**                                                                                           

  **Hard money +  **RBI Private   *rbiprivatelending.com*                                        Sin tarifa de      Conecta con
  wholesaler      Lending**                                                                      membresía          wholesalers
  Miami**                                                                                                           locales.

  **Wholesaler    **Vertura       *verturagroup.com*                                             Holding            Pipeline
  Holding Miami** Group**                                                                        multi-vertical con activo.
                                                                                                 REI Miami          

  **REIA          **BPM REIA      *meetup.com/miami-dade-real-estate-investors-association*      Membresía variable Anish Dave,
  Miami-Dade      Miami-Dade**                                                                                      presidente
  (Nacional                                                                                                         nacional.
  REIA)**                                                                                                           

  **REIA          **DREIA (Dade   *dreia.com*                                                    \\$99--\\$199/año;   Fundada 1996.
  tradicional     REIA)**                                                                        305-758-3133       Lista de
  Miami-Dade**                                                                                                      Business
                                                                                                                    Vendors.

  **REIA Miami    **MREIA**       *investmentpropertiesmiamiflorida.com*                         305-586-5280       Networking +
  REI                                                                                                               deals.
  Association**                                                                                                     

  **Directorio    **HouseCashin   *housecashin.com/directory/real-estate-wholesalers/miami-fl*   Gratis             Mercado muy
  Miami (175+)**  Miami**                                                                                           activo.
  --------------------------------------------------------------------------------------------------------------------------------

**📍 Tampa**

  --------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                           **Términos y       **Notas**
  necesario**                                                             condiciones**      
  -------------- --------------- ---------------------------------------- ------------------ -------------
  **Wholesaler   **New Western   *newwestern.com/locations/tampa-bay*     Registro gratis    Mercado
  local Tampa**  Tampa**                                                                     activo de
                                                                                             flips.

  **Wholesaler   **NetWorth      *networthrealty.com/markets/tampa*       Pipeline semanal   Oficina
  local Tampa**  Realty Tampa**                                                              local.

  **REIA Tampa   **Tampa REIA**  *tampareia.com*                          \\$97--\\$199/año;   Sub-grupos:
  principal**                                                             2do jueves del mes Onsite
                                                                                             Renovation,
                                                                                             Beginners,
                                                                                             Funding.

  **REIA Tampa   **Tampa Bay     *tbreia.com*                             877-600-3547; 1er  Otra opción.
  Bay            REIA (TBREIA)**                                          jueves Clearwater  
  (alterno)**                                                                                

  **REIA Gulf    **Gulf Coast    *gcreia.org*                             Variable           Tampa/St.
  Coast**        REIA**                                                                      Pete.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/fl/tampa*   Gratis             Por filtros.
  Tampa**        Tampa**                                                                     
  --------------------------------------------------------------------------------------------------------

**📍 Orlando**

  ----------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                             **Términos y    **Notas**
  necesario**                                                               condiciones**   
  -------------- --------------- ------------------------------------------ --------------- ----------------
  **Wholesaler   **New Western   *newwestern.com/locations/orlando*         Registro gratis Mercado
  local          Orlando**                                                                  turístico ---
  Orlando**                                                                                 bueno para STR
                                                                                            exit.

  **Wholesaler   **NetWorth      *networthrealty.com/markets/orlando*       Pipeline        Oficina local.
  local          Realty                                                     semanal         
  Orlando**      Orlando**                                                                  

  **REIA         **Central       *cfri.net*                                 Membresía       Orlando +
  principal      Florida Realty                                             variable        alrededores.
  Central FL**   Investors                                                                  Buy-and-hold +
                 (CFRI)**                                                                   flippers.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/fl/orlando*   Gratis          Mercado muy
  Orlando**      Orlando**                                                                  activo.
  ----------------------------------------------------------------------------------------------------------

**📍 Jacksonville**

  -------------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**                                  **Términos y    **Notas**
  necesario**                                                                       condiciones**   
  ---------------- ---------------- ----------------------------------------------- --------------- -----------
  **Wholesaler     **New Western    *newwestern.com/locations/jacksonville*         Registro gratis Mercado
  local            Jacksonville**                                                                   estable.
  Jacksonville**                                                                                    

  **REIA #1 NE     **JaxREIA**      *jaxreia.org*                                   \\$99/año;       Quick Start
  Florida**                                                                         888-545-7342    Classes.
                                                                                                    Comunidad
                                                                                                    activa.

  **REIA           **REIF           *reif.jacksonville.com*                         904-483-9535    REI Forum
  Jacksonville     Jacksonville**                                                                   local.
  (alterno)**                                                                                       

  **REIA NE        **REIN of NE     *---*                                           904-384-6400    Otra
  Florida**        Florida**                                                                        opción.

  **Directorio     **HouseCashin    *housecashin.com/wholesalers/fl/jacksonville*   Gratis          Por
  Jacksonville**   Jacksonville**                                                                   filtros.
  -------------------------------------------------------------------------------------------------------------

**📍 Fort Lauderdale / Broward**

  ---------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                     **Términos y    **Notas**
  necesario**                                                                       condiciones**   
  -------------- --------------- -------------------------------------------------- --------------- -------------
  **Wholesaler   **New Western   *newwestern.com*                                   Registro gratis Cubre
  local Fort     Fort                                                                               Broward.
  Lauderdale**   Lauderdale**                                                                       

  **REIA Broward **Broward       *browardreia.com*                                  \\$20/reunión;   Cubre Fort
  principal**    REIA**                                                             \\$150/año       Lauderdale,
                                                                                                    Hollywood,
                                                                                                    Plantation.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/fl/fort-lauderdale*   Gratis          Por filtros.
  Fort           Fort                                                                               
  Lauderdale**   Lauderdale**                                                                       
  ---------------------------------------------------------------------------------------------------------------

**📍 West Palm Beach**

  ----------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                     **Términos y      **Notas**
  necesario**                                                                       condiciones**     
  -------------- --------------- -------------------------------------------------- ----------------- ------------
  **REIA Palm    **Treasure      *treasurecoastreia.com*                            \\$99--\\$150/año   Cubre Palm
  Beach**        Coast REIA**                                                                         Beach,
                                                                                                      Stuart, Port
                                                                                                      St. Lucie.

  **REIA Palm    **Palm Beach    *palmbeachia.com*                                  561-572-5938      Reuniones
  Beach          REIA**                                                                               mensuales.
  alterno**                                                                                           

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/fl/west-palm-beach*   Gratis            Por filtros.
  West Palm      WPB**                                                                                
  Beach**                                                                                             
  ----------------------------------------------------------------------------------------------------------------

**📍 Naples / Fort Myers / Cape Coral**

  --------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**          **Página web**                            **Términos y    **Notas**
  necesario**                                                                  condiciones**   
  -------------- ------------------- ----------------------------------------- --------------- -----------
  **REIA SW      **SWFL REIA**       *swflreia.com*                            \\$99/año aprox. Cubre
  Florida**                                                                                    Naples,
                                                                                               Fort Myers,
                                                                                               Cape Coral.

  **Búsqueda     **BiggerPockets +   *biggerpockets.com*                       Free filter por Mercado
  wholesaler     FB Marketplace**                                              ciudad          pequeño ---
  Cape Coral**                                                                                 usa FB
                                                                                               Groups
                                                                                               locales y
                                                                                               SWFL REIA.

  **Directorio   **HouseCashin       *housecashin.com/wholesalers/fl/naples*   Gratis          Por
  Naples**       Naples**                                                                      filtros.
  --------------------------------------------------------------------------------------------------------

**TEXAS**

**📍 Austin**

  -----------------------------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**       **Página web**                                                  **Términos y       **Notas**
  necesario**                                                                                     condiciones**      
  -------------- ---------------- --------------------------------------------------------------- ------------------ ----------------
  **Wholesaler   **New Western    *newwestern.com/locations/austin*                               Registro gratis    Mercado enfriado
  local Austin** Austin**                                                                                            2024-25 = más
                                                                                                                     oportunidades.

  **Wholesaler   **Turner &       *turnerandpartnersllc.com*                                      100+ assignments   Wholesaling
  local Austin** Partners**                                                                       desde 2020         multi-estado
                                                                                                                     base TX.

  **Wholesaler   **Double E       *doubleehomebuyers.com*                                         Founder Justin     Local
  local Austin** Homebuyers**                                                                     Brandon            establecido.

  **REIA         **REIA Austin    *reiaaustin.com*                                                \\$97--\\$197/año;   Shenoah Grove
  principal      (REICAUSTIN)**                                                                   2do lunes          (1,200+ deals
  Austin**                                                                                                           desde 2003).
                                                                                                                     100+ asistentes.

  **Networking   **Austin RENC**  *austinrenc.com*                                                \\$97/mes o         Reuniones
  semanal                                                                                         \\$599/año          semanales.
  Austin**                                                                                                           

  **Directorio   **HouseCashin    *housecashin.com/directory/real-estate-wholesalers/austin-tx*   Gratis             Buscar por
  Austin         Austin**                                                                                            criterios.
  (151+)**                                                                                                           
  -----------------------------------------------------------------------------------------------------------------------------------

**📍 Round Rock**

  --------------------------------------------------------------------------------------
  **Actor         **Nombre**      **Página web**         **Términos y    **Notas**
  necesario**                                            condiciones**   
  --------------- --------------- ---------------------- --------------- ---------------
  **Wholesalers   **Usar opciones *---*                  Same metro area Round Rock está
  metro Austin**  de Austin**                                            dentro del
                                                                         metro de
                                                                         Austin.

  **REIA local**  **REIA Austin** *reiaaustin.com*       Mismo REIA      Mismo metro ---
                                                                         usa los
                                                                         recursos de
                                                                         Austin.

  **Permits       **Round Rock    *roundrocktexas.gov*   Variable por    Para temas
  oficina Round   Building                               permit          locales:
  Rock**          Inspections**                                          512-218-5550.
  --------------------------------------------------------------------------------------

**📍 Houston**

  ------------------------------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                                   **Términos y          **Notas**
  necesario**                                                                                     condiciones**         
  -------------- --------------- ---------------------------------------------------------------- --------------------- --------------
  **Wholesaler   **New Western   *newwestern.com/locations/houston*                               Registro gratis       Una de las más
  local          Houston**                                                                                              grandes de la
  Houston**                                                                                                             red.

  **Wholesaler   **NetWorth      *networthrealty.com/markets/houston*                             Pipeline semanal      Oficina local.
  local          Realty                                                                                                 
  Houston**      Houston**                                                                                              

  **Wholesaler   **Texas         *texaspropertyrelief.com*                                        Cash buyer all        Local
  local          Property                                                                         conditions            establecido.
  Houston**      Relief**                                                                                               

  **REIA Houston **RICH Club     *richclub.org*                                                   \\$257--\\$1,800/año;   Fundado 1979.
  (más           (Realty                                                                          713-947-7424          Uno de los más
  antigua)**     Investment Club                                                                                        grandes de TX.
                 of Houston)**                                                                                          

  **REIA Greater **Greater       *meetup.com/greaterhoustonreia*                                  Membresía variable    Chapter
  Houston**      Houston REIA**                                                                                         National REIA.
                                                                                                                        Sub-grupos.

  **REIA Texas   **Houston       *meetup.com/houston-real-estate-investing-association*           Variable              Networking +
  Wealth         REIA**                                                                                                 deals.
  Network**                                                                                                             

  **Directorio   **HouseCashin   *housecashin.com/directory/real-estate-wholesalers/houston-tx*   Gratis                El mercado más
  Houston        Houston**                                                                                              grande de TX.
  (177+)**                                                                                                              
  ------------------------------------------------------------------------------------------------------------------------------------

**📍 Dallas / Fort Worth**

  -------------------------------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                                  **Términos y    **Notas**
  necesario**                                                                                    condiciones**   
  -------------- --------------- --------------------------------------------------------------- --------------- ----------------------
  **Wholesaler   **New Western   *newwestern.com/locations/dallas-fort-worth*                    Registro gratis Casa matriz de New
  local Dallas** Dallas (sede)**                                                                                 Western.

  **Wholesaler   **NetWorth      *networthrealty.com/markets/dallas*                             Pipeline        Oficina local.
  local Dallas** Realty Dallas**                                                                 semanal         

  **REIA Dallas  **Dallas REIA** *meetup.com/dallas-real-estate-investing-association*           Texas Wealth    150+ asistentes/mes.
  principal**                                                                                    Network         

  **REIA North   **NTAREI**      *ntarei.com*                                                    214-447-9367    North Texas
  Texas**                                                                                                        Association of REI.

  **Programa de  **Lifestyles    *lifestylesunlimited.com*                                       866-945-6565    Programa de
  mentoría DFW** Unlimited DFW**                                                                                 membresía/educación.

  **REIA Fort    **Use Dallas    *biggerpockets.com*                                             DFW comparte    FW está integrado con
  Worth**        REIA +                                                                          inventario      Dallas REIA.
                 BiggerPockets                                                                                   
                 Network                                                                                         
                 filter**                                                                                        

  **Directorio   **HouseCashin   *housecashin.com/directory/real-estate-wholesalers/dallas-tx*   Gratis          Búsqueda por filtros.
  DFW**          Dallas**                                                                                        
  -------------------------------------------------------------------------------------------------------------------------------------

**📍 San Antonio**

  ---------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                 **Términos y    **Notas**
  necesario**                                                                   condiciones**   
  -------------- --------------- ---------------------------------------------- --------------- -----------
  **Wholesaler   **New Western   *newwestern.com/locations/san-antonio*         Registro gratis Mercado
  local SA**     San Antonio**                                                                  activo.

  **REIA San     **Alamo REIA**  *alamoreia.org*                                \\$197/año; \\$30 2do martes
  Antonio                                                                       invitados       en Alzafar
  principal**                                                                                   Shrine.
                                                                                                National
                                                                                                REIA
                                                                                                chapter.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/tx/san-antonio*   Gratis          Por
  SA**           San Antonio**                                                                  filtros.
  ---------------------------------------------------------------------------------------------------------

**CALIFORNIA**

**📍 Los Angeles**

  --------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                 **Términos y        **Notas**
  necesario**                                                                   condiciones**       
  -------------- --------------- ---------------------------------------------- ------------------- ------------
  **Wholesaler   **New Western   *newwestern.com/locations/los-angeles*         Registro gratis     Mercado
  local LA**     Los Angeles**                                                                      complejo ---
                                                                                                    AB-968
                                                                                                    aplica.

  **REIA Los     **LA South      *lasouthreia.com*                              \\$99--\\$199/año     Torrance.
  Angeles Sur**  REIA**                                                                             

  **REIA         **FIBI          *fibipasadena.com*                             \\$0--\\$25/reunión   For
  Pasadena       Pasadena**                                                                         Investors By
  (FIBI)**                                                                                          Investors.
                                                                                                    NO vende
                                                                                                    seminarios
                                                                                                    --- solo
                                                                                                    educación.

  **REIA LA      **Prosperity    *prosperitythroughrealestate.com*              \\$25/reunión        Winnetka.
  Valley**       Through Real                                                                       
                 Estate**                                                                           

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ca/los-angeles*   Gratis              Por filtros.
  LA**           Los Angeles**                                                                      
  --------------------------------------------------------------------------------------------------------------

**📍 San Diego**

  ------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                               **Términos y         **Notas**
  necesario**                                                                 condiciones**        
  -------------- --------------- -------------------------------------------- -------------------- -----------
  **Wholesaler   **New Western   *newwestern.com/locations/san-diego*         Registro gratis      ---
  local SD**     San Diego**                                                                       

  **REIA San     **San Diego     *sdcia.com*                                  \\$80/año;            2do martes
  Diego          Creative                                                     \\$10--\\$20/reunión   --- Marina
  (SDCIA)**      Investors                                                                         Village.
                 Association**                                                                     National
                                                                                                   REIA
                                                                                                   chapter.

  **REIA San     **NSDREI**      *nsdrei.org*                                 \\$99/año             Vista.
  Diego Norte**                                                                                    

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ca/san-diego*   Gratis               Por
  SD**           San Diego**                                                                       filtros.
  ------------------------------------------------------------------------------------------------------------

**📍 Sacramento**

  -------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                **Términos y      **Notas**
  necesario**                                                                  condiciones**     
  -------------- --------------- --------------------------------------------- ----------------- --------------
  **Wholesaler   **New Western   *newwestern.com/locations/sacramento*         Registro gratis   Mercado en
  local          Sacramento**                                                                    crecimiento.
  Sacramento**                                                                                   

  **REIA NorCal  **NorCal REIA** *norcalreia.com*                              \\$99--\\$199/año   Más grande de
  principal**                                                                                    Sacramento
                                                                                                 desde 2004.

  **REIA         **Sacramento    *sacramentoreia.org*                          Variable          Otra opción.
  Sacramento     REIA**                                                                          
  alterno**                                                                                      

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ca/sacramento*   Gratis            Por filtros.
  Sacramento**   Sacramento**                                                                    
  -------------------------------------------------------------------------------------------------------------

**📍 SF Bay Area**

  ---------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                   **Términos y        **Notas**
  necesario**                                                                     condiciones**       
  -------------- --------------- ------------------------------------------------ ------------------- -----------
  **Wholesaler   **New Western   *newwestern.com/locations/bay-area*              Registro gratis     Mercado muy
  local Bay      Bay Area**                                                                           caro ---
  Area**                                                                                              pocos deals
                                                                                                      retail.

  **REIA Bay     **Bay Area      *bawb.info*                                      \\$0--\\$25/reunión   Corte
  Area (BAWB)**  Wealth                                                                               Madera.
                 Builders**                                                                           Activo
                                                                                                      desde 2000.

  **REIA Bay     **BAREIA**      *bareia.org*                                     \\$99--\\$199/año     Otra opción
  Area alterno**                                                                                      Bay Area.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ca/san-francisco*   Gratis              Por
  Bay Area**     SF Bay**                                                                             filtros.
  ---------------------------------------------------------------------------------------------------------------

**📍 Inland Empire (Riverside / San Bernardino)**

  --------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                               **Términos y         **Notas**
  necesario**                                                                 condiciones**        
  -------------- --------------- -------------------------------------------- -------------------- -------------
  **REIA Inland  **F.I.R.E.      *firecenter.com*                             \\$25--\\$45/reunión   Riverside.
  Empire**       Center**                                                                          Cubre San
                                                                                                   Bernardino.

  **REIA         **CVREIA**      *cvreia.com*                                 \\$99--\\$150/año      Palm Springs
  Coachella                                                                                        area.
  Valley**                                                                                         

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ca/riverside*   Gratis               Por filtros.
  Riverside**    Riverside**                                                                       
  --------------------------------------------------------------------------------------------------------------

**NEW YORK**

**📍 NYC (5 boroughs)**

  ----------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**          **Página web**                              **Términos y      **Notas**
  necesario**                                                                    condiciones**     
  -------------- ------------------- ------------------------------------------- ----------------- ---------------
  **REIA NYC     **REIA NYC (Teresa  *reianyc.org*                               \\$99--\\$199/año   Cubre los 5
  (National REIA Martin, Esq.)**                                                                   boroughs.
  chapter)**                                                                                       

  **Wholesaler   **BiggerPockets +   *biggerpockets.com*                         Free              NY es wholetail
  outer          FB Groups «Brooklyn                                                               --- pocas
  boroughs**     cash buyers»**                                                                    propiedades
                                                                                                   pequeñas en
                                                                                                   Bronx/Queens.

  **Directorio   **HouseCashin NYC** *housecashin.com/wholesalers/ny/new-york*   Gratis            Por filtros.
  NYC**                                                                                            

  **Cierre       **NYS Bar           *nysba.org*                                 Gratis búsqueda   NY REQUIERE
  obligatorio    Association**                                                                     abogado en TODO
  con abogado**                                                                                    cierre.
  ----------------------------------------------------------------------------------------------------------------

**📍 Long Island**

  ----------------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                                 **Términos y      **Notas**
  necesario**                                                                   condiciones**     
  -------------- --------------- ---------------------------------------------- ----------------- ----------------------
  **REIA Long    **LIREIA**      *lireia.com*                                   \\$99--\\$229/año   Reuniones en
  Island**                                                                                        Melville/Ronkonkoma.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ny/long-island*   Gratis            Por filtros.
  Long Island**  Long Island**                                                                    
  ----------------------------------------------------------------------------------------------------------------------

**📍 Buffalo / Western NY**

  -------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                             **Términos y      **Notas**
  necesario**                                                               condiciones**     
  -------------- --------------- ------------------------------------------ ----------------- -----------
  **REIA Western **WNY REI       *wnyrei.com*                               \\$99--\\$149/año   Mercado de
  NY**           (Western NY                                                                  cashflow
                 Real Estate                                                                  alto.
                 Investors)**                                                                 

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/ny/buffalo*   Gratis            Por
  Buffalo**      Buffalo**                                                                    filtros.
  -------------------------------------------------------------------------------------------------------

**📍 Westchester**

  ----------------------------------------------------------------------------------------------------------
  **Actor       **Nombre**      **Página web**                                   **Términos y    **Notas**
  necesario**                                                                    condiciones**   
  ------------- --------------- ------------------------------------------------ --------------- -----------
  **REIA        **Westchester   *meetup.com/westchester-real-estate-investors*   Gratis Meetup   Verifica
  Westchester   REIA**                                                                           fechas vía
  (Meetup)**                                                                                     Meetup.

  ----------------------------------------------------------------------------------------------------------

**NEW JERSEY**

**📍 North Jersey (Newark / Jersey City)**

  ------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                            **Términos y      **Notas**
  necesario**                                                              condiciones**     
  -------------- --------------- ----------------------------------------- ----------------- -----------
  **REIA NJ más  **MREIA --      *mreia.com*                               \\$99--\\$199/año   La más
  antigua**      Metropolitan                                                                antigua de
                 REIA**                                                                      NJ. Cubre
                                                                                             Newark,
                                                                                             Jersey
                                                                                             City.

  **Wholesaler   **New Western   *newwestern.com/locations/new-jersey*     Registro gratis   ---
  local NJ**     NJ**                                                                        

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/nj/newark*   Gratis            Por
  Newark**       Newark**                                                                    filtros.
  ------------------------------------------------------------------------------------------------------

**📍 Central NJ**

  -----------------------------------------------------------------------------------------------
  **Actor        **Nombre**      **Página web**                     **Términos y      **Notas**
  necesario**                                                       condiciones**     
  -------------- --------------- ---------------------------------- ----------------- -----------
  **REIA NJ      **NJREIA**      *njreia.com*                       \\$99--\\$179/año   Fundada
  statewide**                                                                         2009. Cubre
                                                                                      Central NJ.

  **Directorio   **HouseCashin   *housecashin.com/wholesalers/nj*   Gratis            Por
  Central NJ**   NJ**                                                                 filtros.
  -----------------------------------------------------------------------------------------------

**📍 South NJ (Cherry Hill / Atlantic)**

  ----------------------------------------------------------------------------------------------------------
  **Actor       **Nombre**     **Página web**                                    **Términos y    **Notas**
  necesario**                                                                    condiciones**   
  ------------- -------------- ------------------------------------------------- --------------- -----------
  **REIA South  **South Jersey *meetup.com/south-jersey-real-estate-investors*   Gratis Meetup   Cubre
  NJ (Meetup)** REI**                                                                            Cherry
                                                                                                 Hill,
                                                                                                 Atlantic
                                                                                                 County.

  ----------------------------------------------------------------------------------------------------------

E1.6 · REIAs Tier 2 (resto de estados)

Para estudiantes que viven o invierten en estos estados. Asiste 2-3
veces como invitado antes de pagar membresía anual.

  -------------------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**        **Página web**                            **Términos y    **Notas**
                                                                                  condiciones**   
  ------------------- ----------------- ----------------------------------------- --------------- -------------
  **REIA Phoenix      **AZREIA**        *azreia.org*                              \\$197/año       Mayor REIA de
  (Arizona)**                                                                     individuo; 2do  USA ---
                                                                                  lunes Celebrity 1,700+
                                                                                  Theatre         miembros.
                                                                                                  Programa
                                                                                                  rebates con
                                                                                                  Home Depot.

  **REIA Tucson       **AZREIA Tucson   *azreia.org*                              Mismo           Sub-chapter
  (Arizona)**         Chapter**                                                   membership      de AZREIA.
                                                                                  AZREIA          

  **REIA Las Vegas    **Greater Las     *reialv.com*                              Variable        4to
  (Nevada)**          Vegas REIA**                                                                miércoles +
                                                                                                  power lunch
                                                                                                  jueves 11am
                                                                                                  en PKWY
                                                                                                  Tavern.

  **REI Reno          **Reno Real       *meetup.com/reno-real-estate-investors*   Gratis Meetup   Sin sitio
  (Nevada)**          Estate                                                                      formal ---
                      Investors**                                                                 usa Meetup.

  **REIA Salt Lake    **SLREIA**        *slreia.com*                              \\$99/año aprox. Fundada 1996.
  City (Utah)**                                                                                   1,000+
                                                                                                  miembros.

  **REIA Utah         **Utah REIA**     *utahreia.org*                            Variable        Affiliate
  (statewide)**                                                                                   National
                                                                                                  REIA.

  **REIA Atlanta      **GaREIA (Georgia *gareia.com*                              Variable; HQ    Fundada 1981
  (Georgia)**         REIA)**                                                     4353 Tilly Mill --- una de
                                                                                  Rd              las más
                                                                                                  antiguas de
                                                                                                  USA.

  **REIA Atlanta      **Atlanta REIA**  *atlantareia.com*                         \\$20 invitados; Reunión
  alterno**                                                                       W Hotel         mensual.
                                                                                  Perimeter       

  **REIA Charlotte    **Metrolina       *metrolinareia.com*                       Variable        3er jueves en
  (NC)**              REIA**                                                                      Crowne Plaza
                                                                                                  Executive
                                                                                                  Park.

  **REIA Raleigh /    **TREIA --        *treia.com*                               Variable        3er martes en
  Triangle (NC)**     Triangle REIA**                                                             Embassy
                                                                                                  Suites Cary.

  **REIA Philadelphia **DIG --          *digonline.org*                           \\$19.99/mes     Fundada 1978
  (PA)**              Diversified RE                                                              --- 2da REIA
                      Investor Group**                                                            más antigua
                                                                                                  del país.

  **REIA Pittsburgh   **ACRE of         *acrepgh.org*                             Variable        National REIA
  (PA)**              Pittsburgh**                                                                chapter.

  **REIA Columbus     **COREE --        *coreerocks.com*                          Variable        Antes Central
  (Ohio)**            Community of RE                                                             Ohio REIA.
                      Entrepreneurs**                                                             

  **REIA Cleveland    **Great Lakes     *glreia.com*                              Variable        National REIA
  (Ohio)**            REIA**                                                                      affiliate.

  **REIA Cincinnati   **REIAGC**        *cincinnatireia.com*                      Variable        Fundada 1976
  (Ohio)**                                                                                        --- la más
                                                                                                  grande de
                                                                                                  Ohio.

  **REIA Chicago      **CCIA -- Chicago *ccia-info.com*                           Variable        Activa desde
  (Illinois)**        Creative                                                                    1984.
                      Investors Assn**                                                            

  **REIA Boston       **Boston AREIA**  *bostonareia.com*                         Variable        Sirve MA y
  (Massachusetts)**                                                                               NH. Fundada
                                                                                                  2007.

  **REIA Boston       **Boston REIA**   *boston-reia.com*                         Variable        National REIA
  (alternativa)**                                                                                 affiliate.

  **REIA Baltimore    **MAREIA --       *mareia.com*                              Variable        Antes
  (Maryland)**        Mid-Atlantic                                                                Baltimore
                      REIA**                                                                      REIA.

  **REIA Oklahoma     **OKCREIA**       *okcreia.com*                             Variable        OK más
  City**                                                                                          antigua
                                                                                                  (2001).

  **REIA Tulsa**      **Tulsa REIA**    *tulsareia.com*                           Variable        Más grande de
                                                                                                  OK (fundada
                                                                                                  2004).
  -------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E1**                                          |
|                                                                 |
| Mes 1: PropStream (\\$99/mes) + asiste a tu REIA local como      |
| invitado 2 veces antes de pagar. Mes 2: agrega buyer list de    |
| New Western en tu ciudad. Mes 3: skip tracing en bulk solo      |
| cuando tengas listas de 500+ propiedades. Solo invierte en      |
| SMS/dialer cuando tu pipeline justifique \\$300+/mes en          |
| marketing.                                                      |
+-----------------------------------------------------------------+

**E2**

**ESTRUCTURAR**

**Financiamiento, equipo y plan de obra**

*Sin capital, el deal mejor analizado se pierde. Esta etapa construye la
red operativa: hard money lenders, contratistas verificados, REIA local,
title companies, permisos.*

E2.1 · Hard Money Lenders --- Nacionales 🟢

  ---------------------------------------------------------------------------------------------------------------------
  **Actor            **Nombre**       **Página web**           **Términos y condiciones**             **Notas**
  necesario**                                                                                         
  ------------------ ---------------- ------------------------ -------------------------------------- -----------------
  **HML nacional #1  **Kiavi (antes   *kiavi.com*              FICO mín. 640 DSCR / 660 bridge; LTC   100,000+
  (tech)**           LendingHome)**                            95% / ARV 80%; 49 estados + DC         préstamos /
                                                                                                      \\$27B+ fondeados
                                                                                                      (junio 2025). El
                                                                                                      más usado por
                                                                                                      principiantes.

  **HML + DSCR +     **Lima One       *limaone.com*            FICO mín. 660; 46 estados (no AK, ND,  Bueno para
  Construction**     Capital**                                 SD, VT); \\$75K--\\$1M                   portafolio (5+
                                                                                                      unidades).

  **HML especialista **Visio          *visiolending.com*       DSCR 1.0 mín; FICO 680+; 41 estados +  #1 DSCR lender
  DSCR (#1 USA)**    Lending**                                 DC                                     USA por volumen
                                                                                                      2024 (\\$854.6M
                                                                                                      Scotsman Guide).

  **HML F&F +        **LendingOne**   *lendingone.com*         FICO 680+; 46 estados                  Buena cobertura
  Rental +                                                                                            geográfica.
  Construction**                                                                                      

  **HML nacional**   **RCN Capital**  *rcncapital.com*         FICO 650 bridge / 660 LTR; 44 estados  NO opera en NV ni
                                                               (no AK, SD, ND, VT, NV, MN)            MN. Establecido.

  **HML volumen      **Anchor Loans** *anchorloans.com*        FICO 620; 48 estados; 3+ flips         Mejor tarifa para
  experimentados**                                             preferido                              experimentados.

  **HML Non-QM       **Civic          *civicfs.com*            40+ estados                            Pacific Western
  (PacWest)**        Financial                                                                        Bank.
                     Services**                                                                       

  **HML hasta 93%    **Easy Street    *easystreetcap.com*      FICO 600+; 48 estados; LTC 93% / LTV   Aprobación 24h;
  LTC**              Capital**                                 75%                                    cierres en 48h.
                                                                                                      Excelente para
                                                                                                      FL/AZ.

  **HML online       **NewSilver**    *newsilver.com*          FICO 650+; aprobación en 5 min; 38     Modelo cierre
  rápido**                                                     estados (no                            rápido --- bueno
                                                               AL/AK/AZ/ID/LA/MN/NV/ND/OR/SD/UT/VT)   para subastas.
                                                                                                      DSCR desde 5.75%.

  **HML Non-QM       **Stratton       *strattonequities.com*   Foreign nationals OK                   Para extranjeros
  nacional**         Equities**                                                                       y casos non-QM.

  **HML bridge + F&F **Asset Based    *ablfunding.com*         12-mo interest-only; FL/nacional       East Coast
  (East Coast)**     Lending (ABL)**                                                                  strong.

  **HML backed by    **HouseMax       *housemaxfunding.com*    Nacional                               Especialista F&F.
  HomeVestors**      Funding**                                                                        

  **HML F&F          **Renovo         *renovofinancial.com*    IL/IN/OH focus                         Bueno para
  Midwest**          Financial**                                                                      Midwest.

  **HML F&F Sur      **Sherman Bridge *shermanbridge.com*      TX y Sur fuerte                        ---
  USA**              Lending**                                                                        

  **HML F&F Florida  **American       *ahlend.com*             Hasta 95% LTC; LTV 85%                 Foco Florida.
  (95% LTC)**        Heritage                                                                         
                     Lending**                                                                        

  **HML common-sense **Rehab          *rehabfinancial.com*     100% purchase + rehab hasta 75% ARV    Bueno para
  underwriting**     Financial Group                                                                  principiantes.
                     (RFG)**                                                                          

  **HML F&F (90% LTC **Ridge Street   *ridgestreetcap.com*     Hasta 90% LTC FICO 740+; 75% LTARV     TX/FL specialist.
  para               Capital**                                 mercados fuertes                       
  principiantes)**                                                                                    
  ---------------------------------------------------------------------------------------------------------------------

E2.2 · Hard Money Lenders --- Locales 🟠

Los HMLs locales suelen tener mejor relación y entender el mercado
específico. Negocia: rate, points, prepay penalty, draw structure.

**TEXAS**

  ------------------------------------------------------------------------------------------------------
  **Actor       **Nombre**      **Página web**               **Términos y condiciones**   **Notas**
  necesario**                                                                             
  ------------- --------------- ---------------------------- ---------------------------- --------------
  **HML local   **Capital       *capitalconceptsloans.com*   TX-based; investor-focused   Establecido.
  Austin**      Concepts**                                                                

  **HML local   **Streamline    *streamlinefunding.com*      Austin/SA/DFW                Local con
  Austin**      Funding**                                                                 buena relación
                                                                                          GCs.

  **HML local   **Noble         *noblemortgage.com*          Houston/Austin/DFW; desde    Establecido.
  Austin**      Mortgage**                                   2002                         

  **HML local   **Wildcat       *wildcatlending.com*         12% interest-only; hasta 95% Términos
  Austin (12%   Lending**                                    LTC                          agresivos.
  IO)**                                                                                   

  **HML local   **FlipCo        *---*                        Local específico Austin      Pregunta en
  Austin**      Financial**                                                               REIA Austin.

  **HML local   **AMI Lenders** *amilenders.com*             Hard money desde 1990s       Especialista
  Houston                                                                                 local.
  (1990s)**                                                                               

  **HML local   **Curlee        *curleecapital.com*          Fix & Flip Houston           Cierres
  Houston**     Capital**                                                                 rápidos.

  **HML local   **Unitas        *unitasfunding.com*          Hasta 92.5% LTC; DSCR        Friendly para
  Houston       Funding**                                    disponible                   newbies.
  (92.5% LTC)**                                                                           

  **HML local   **Simplending   *simplendingfinancial.com*   Investor-focused             ---
  Houston**     Financial**                                                               

  **HML local   **Tidal Loans** *tidalloans.com*             Hasta 100% purchase + 100%   Más agresivo
  Houston/TX                                                 rehab si seller carry        de TX.
  (100% LTC)**                                                                            

  **HML local   **Longhorn      *longhorninvestments.com*    LTC 75%;                     Establecido y
  Dallas**      Investments**                                TX/OK/MO/NC/IN/GA/CO/AL/TN   respetado.

  **HML local   **DHLC          *dhlc.com*                   DFW local                    ---
  Dallas**      Mortgage**                                                                

  **HML local   **Investmark    *investmark.net*             DFW + TX                     Fix & Flip
  Dallas**      Mortgage**                                                                strong.
  ------------------------------------------------------------------------------------------------------

**FLORIDA**

  ---------------------------------------------------------------------------------------------------------------------------------------
  **Actor            **Nombre**             **Página web**                                                **Términos y    **Notas**
  necesario**                                                                                             condiciones**   
  ------------------ ---------------------- ------------------------------------------------------------- --------------- ---------------
  **HML local Miami  **GoKapital**          *gokapital.com*                                               Lend 50         HQ Miami.
  (HQ FL)**                                                                                               estados; A+ BBB 

  **HML local Miami  **Alto Capital**       *altocapital.com*                                             Top-3 FL por    Establecido.
  (Top-3 FL)**                                                                                            volumen         
                                                                                                          (Forecasa)      

  **HML local Miami  **RBI Private          *rbiprivatelending.com*                                       Top-10 FL por   Visitas a
  (Top-10 FL)**      Lending**                                                                            volumen         oficina;
                                                                                                                          1-on-1.

  **HML local Miami  **LendingOne**         *lendingone.com*                                              HQ Boca Raton;  Uno de los más
  (boutique HQ FL)**                                                                                      nacional        grandes USA.

  **HML local FL     **USA Hard Money       *usahardmoneylenders.com/florida*                             48h funding;    ---
  (48h funding)**    Lenders**                                                                            1%/mes          

  **HML local FL     **HardMoneyMan.com**   *hardmoneyman.com/where-we-lend/hard-money-lenders-florida*   2,500+ FL flips Ken (25+ yrs
  (2,500+ deals)**                                                                                        desde 1998      experiencia).

  **HML local FL     **Crebrid**            *crebrid.com/states/florida*                                  Fix & Flip +    Plataforma
  (tech-forward)**                                                                                        DSCR FL         moderna.

  **HML local        **Easy Street Capital  *easystreetcap.com/hard-money-loan-florida*                   Hasta 93% LTC   ---
  Tampa**            Tampa**                                                                                              

  **HML local        **Asset Based Lending  *abl1.net*                                                    Bridge + Fix &  ---
  Tampa**            Tampa**                                                                              Flip East Coast 

  **HML local        **American Heritage    *ahlend.com/florida-fix-and-flip-loans*                       Hasta 95% LTC   ---
  Orlando**          Lending Orlando**                                                                                    

  **HML local        **Ridge Street Capital *ridgestreetcap.com/hard-money-lenders-florida*               Para            ---
  Jacksonville**     Jax**                                                                                principiantes   

  **HML local        **Unitas Funding       *unitasfunding.com*                                           Friendly        ---
  Jacksonville**     Jacksonville**                                                                       newbies         
  ---------------------------------------------------------------------------------------------------------------------------------------

**ARIZONA**

  ------------------------------------------------------------------------------------------
  **Actor       **Nombre**    **Página web**                  **Términos y    **Notas**
  necesario**                                                 condiciones**   
  ------------- ------------- ------------------------------- --------------- --------------
  **HML local   **Capital     *capitalfund1.com*              AZ local        Establecido.
  Phoenix**     Fund 1**                                                      

  **HML local   **Kayak       *kayakcapital.com*              Cero points     Diferencial:
  Phoenix (zero Capital**                                                     sin puntos.
  points)**                                                                   

  **HML local   **Prime Plus  *primeplusmortgages.com*        AZ focus        ---
  Phoenix**     Mortgages**                                                   

  **HML local   **Hard Money  *hardmoneylendersarizona.com*   AZ statewide    ---
  Phoenix**     Lenders                                                       
                Arizona**                                                     

  **HML local   **Colonial    *colonial-capital.com*          AZ desde 2003   Establecido.
  Phoenix       Capital**                                                     
  (desde                                                                      
  2003)**                                                                     

  **HML local   **Hilton      *hiltonloans.com*               Phoenix focus   Establecido
  Phoenix**     Financial                                                     local.
                Corp**                                                        

  **HML local   **LM2         *lm2investments.com*            AZ focus        ---
  Phoenix**     Investment                                                    
                Group**                                                       

  **HML local   **Metro       *metroprivatelending.com*       AZ focus        ---
  Phoenix**     Private                                                       
                Lending**                                                     

  **HML local   **Merchants   *phoenixhardmoney.com*          Phoenix local   ---
  Phoenix**     Mortgage &                                                    
                Trust**                                                       
  ------------------------------------------------------------------------------------------

**OTROS ESTADOS**

  ----------------------------------------------------------------------------------------
  **Actor        **Nombre**    **Página web**             **Términos y        **Notas**
  necesario**                                             condiciones**       
  -------------- ------------- -------------------------- ------------------- ------------
  **HML CA + FL  **The Norris  *thenorrisgroup.com*       Hard money +        Bruce Norris
  clubs**        Group**                                  investor clubs      es educador
                                                          CA/FL               conocido.

  **HML local    **Wilshire    *wilshirequinn.com*        LTV hasta 65%;      Lend
  LA/Inland      Quinn**                                  AZ/CA/NV            tri-state.
  Empire**                                                                    

  **HML local    **West Forest *westforestcapital.com*    Foco                Lend en
  NY/NJ**        Capital**                                NY/NJ/CT/MA/PA/FL   5-borough
                                                                              NYC.

  **HML local    **Gauntlet    *gauntletfunding.com*      Hasta 90% LTC; FICO Tri-state
  NY/NJ (90%     Funding**                                600+                focus.
  LTC)**                                                                      

  **HML local    **Bay         *baymountaincapital.com*   Local GA + TX       Sponsor
  GA**           Mountain                                                     Atlanta
                 Capital**                                                    REIA.

  **HML local    **Sherman     *shermanbridge.com*        Fix & flip nacional ---
  OH/Midwest**   Bridge**                                 HQ OH               
  ----------------------------------------------------------------------------------------

E2.3 · Private Money y Crowdfunding REI 🟢

  --------------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**              **Página web**               **Términos y     **Notas**
                                                                           condiciones**    
  ------------------- ----------------------- ---------------------------- ---------------- --------------
  **Crowdfunding REI  **Groundfloor**         *groundfloor.com*            Mín. \\$10        Para LEVANTAR
  debt**                                                                   inversionista;   capital de
                                                                           borrowers        retail.
                                                                           también          

  **Alternative       **Yieldstreet**         *yieldstreet.com*            Accredited       Diversifica.
  investments REI**                                                        investors        

  **Crowdfunding REI  **RealtyMogul**         *realtymogul.com*            Accredited       Para
  commercial**                                                             investors        multifamily.

  **Hard money +      **Patch of Land**       *patchofland.com*            Fix & Flip +     ---
  crowdfunding**                                                           bridge           

  **Hard money +      **Sharestates**         *sharestates.com*            Especializado    ---
  crowdfunding**                                                           flips            

  **REI crowdfunding  **Cadre**               *cadre.com*                  Mínimos altos    ---
  institucional**                                                                           

  **Crowdfunding      **EquityMultiple**      *equitymultiple.com*         Accredited       ---
  REI**                                                                                     

  **Crowdfunding REI  **Fundrise**            *fundrise.com*               Mín. \\$10        REITs y
  retail-friendly**                                                                         eFunds.

  **Notes 6/12/24     **Connect Invest**      *connectinvest.com*          Reg D notes      SEC compliant.
  meses**                                                                                   

  **Directorio        **Private Lender Link** *privatelenderlink.com*      Gratis           Nacional
  private lenders**                                                                         verificado.

  **Directorio HML /  **Scotsman Guide**      *scotsmanguide.com*          Gratis           ---
  brokers**                                                                directorio       

  **Directorio HML    **Hardmoneyhome.com**   *hardmoneyhome.com*          Gratis           50+ HMLs por
  por estado**                                                                              estado.

  **Networking        **BiggerPockets Forum + *biggerpockets.com/forums*   Free; BP Pro     Mucho
  private lenders**   Pro**                                                \\$39/mes         networking.
  --------------------------------------------------------------------------------------------------------

E2.4 · General Contractors --- Verificación de licencia 🔵

+-----------------------------------------------------------------+
| **CRÍTICO ANTES DE CONTRATAR GC**                               |
|                                                                 |
| Verifica licencia activa, fianza, seguros (GL + Workers Comp),  |
| 3 referencias verificables y fotos antes/después de proyectos   |
| previos. Pide ser «additional insured» en su póliza. Sin        |
| contrato escrito = sin recurso legal.                           |
+-----------------------------------------------------------------+

  --------------------------------------------------------------------------------------------------------------------------------------------------
  **Estado**          **Sistema de    **URL de verificación**                                                        **Notas**
                      licencia**                                                                                     
  ------------------- --------------- ------------------------------------------------------------------------------ -------------------------------
  **Florida**         DBPR ---        myfloridalicense.com/wl11.asp?mode=2                                           Certified = statewide.
                      CGC/CBC/CRC +                                                                                  Registered = solo condado. CGC
                      CCC/CAC/CFC                                                                                    = ilimitado; CBC = comercial
                                                                                                                     hasta 3 pisos; CRC =
                                                                                                                     residencial hasta 2 pisos.
                                                                                                                     Felonía 3er grado si obra \>
                                                                                                                     \\$5,000 sin licencia.

  **Texas**           NO licencia     tdlr.texas.gov/verify.htm (solo trades)                                        TDLR licencia HVAC,
                      estatal de GC                                                                                  electricistas, mold, solar.
                      residencial                                                                                    Plomeros vía tsbpe.texas.gov.
                                                                                                                     Verificar registro a nivel
                                                                                                                     ciudad.

  **California**      CSLB            cslb.ca.gov                                                                    Obra \> \\$500 requiere licencia
                                                                                                                     (B&P §7027.2). Verifica
                                                                                                                     fianza + Workers Comp.

  **Arizona**         ROC             roc.az.gov/search                                                              45,000+ contratistas. B-1 =
                                                                                                                     residencial general. Umbral
                                                                                                                     \\$1,000.

  **Nevada**          NSCB            nscb.nv.gov                                                                    License Type B (residential), C
                                                                                                                     (specialty).

  **North Carolina**  NCLBGC          nclbgc.org                                                                     Limited / Intermediate /
                                                                                                                     Unlimited según valor del
                                                                                                                     proyecto.

  **Georgia**         GA State        sos.ga.gov/georgia-state-licensing-board-residential-and-general-contractors   Residential-Basic, Light
                      Licensing Board                                                                                Commercial, General.

  **New York (NYC)**  NYC DCWP HIC    nyc.gov/dcwp                                                                   NYC requiere HIC license del
                                                                                                                     Dept of Consumer & Worker
                                                                                                                     Protection.

  **New Jersey**      NJ HICB         njconsumeraffairs.gov/hic                                                      \\$110 registro; surety bond
                      (Division of                                                                                   \\$10K--\\$50K según volumen; GL
                      Consumer                                                                                       \\$500K mínimo; workers comp
                      Affairs)                                                                                       obligatorio.

  **Pennsylvania**    HICPA           hicsearch.attorneygeneral.gov                                                  \\$50 registro; obligatorio \>
                                                                                                                     \\$5,000/año. Insurance mín
                                                                                                                     \\$50K personal injury + \\$50K
                                                                                                                     property damage.

  **Massachusetts**   HIC + CSL       mass.gov/info-details/hic-contractor-resources                                 HIC para obras \> \\$1,000 en
                                                                                                                     1-4 unidades. CSL para
                                                                                                                     estructural. Ambos pueden
                                                                                                                     requerirse.

  **Maryland**        MHIC            labor.maryland.gov/license/mhic                                                \\$50K liability obligatorio;
                                                                                                                     Guaranty Fund hasta \\$20K
                                                                                                                     consumidor; PSI exam requerido.

  **Oklahoma**        Solo trades     ok.gov/cib                                                                     Plomería/eléctrico/HVAC. Sin
                      específicos                                                                                    licencia general GC.

  **Wyoming**         Sin licencia    ---                                                                            Verifica en condado/municipio.
                      estatal GC                                                                                     

  **Illinois**        Sin licencia    ilga.gov                                                                       Verifica registro a nivel
                      estatal GC                                                                                     ciudad (Chicago tiene su propio
                      residencial                                                                                    sistema).

  **Ohio**            Sin licencia    com.ohio.gov                                                                   Verifica a nivel ciudad.
                      estatal GC                                                                                     
                      residencial                                                                                    

  **Utah**            DOPL Contractor dopl.utah.gov                                                                  Licencia obligatoria todas las
                      Licensing                                                                                      construcciones \\$1,000+.
  --------------------------------------------------------------------------------------------------------------------------------------------------

Cómo encontrar GCs investor-friendly (cualquier ciudad)

  -----------------------------------------------------------------------------------------------------------------------------------------------------
  **Actor            **Nombre**        **Página web**                                                                 **Términos y    **Notas**
  necesario**                                                                                                         condiciones**   
  ------------------ ----------------- ------------------------------------------------------------------------------ --------------- -----------------
  **Directorio       **BiggerPockets   *biggerpockets.com/companies*                                                  Filtra por      Métodos #1.
  nacional           Pros**                                                                                           ciudad + review 
  investor-pros**                                                                                                                     

  **Guía + métodos   **REIkit**        *reikit.com/house-flipping-guide/ways-to-find-investor-friendly-contractors*   Gratis          8 formas de
  validados**                                                                                                                         validar GCs.

  **Reviews          **NextDoor**      *nextdoor.com*                                                                 Gratis          Filtra por «Best
  vecindarios**                                                                                                                       Of» awards.

  **Portfolios de    **Houzz Pros**    *houzz.com/professionals*                                                      Free            Filtra por
  contratistas**                                                                                                                      ciudad. Ver
                                                                                                                                      fotos.

  **Reviews          **Angi**          *angi.com*                                                                     Free            Mucho ruido ---
  verificadas (con                                                                                                                    usa con criterio.
  ruido)**                                                                                                                            

  **Driving for      **Visita rehabs   *---*                                                                          Free            El mejor método
  contractors**      activos en tu                                                                                                    según REIkit.
                     zona**                                                                                                           Habla con el GC
                                                                                                                                      en sitio.

  **Verificación     **Better Business *bbb.org*                                                                      Free            Revisa complaints
  BBB**              Bureau**                                                                                                         registradas.

  **Houston: GC      **Grace           *gracecontractingtx.com/investor-renovation*                                   GC              Marketing directo
  investor-focused   Contracting**                                                                                    especializado   a inversionistas.
  ejemplo**                                                                                                           Fix & Flip      
                                                                                                                      Houston         

  **Phoenix: GC      **Phoenix Home    *phxhomeremodeling.com*                                                        Design-build    Marketing directo
  investor-focused   Remodeling**                                                                                     para flippers   a inversionistas.
  ejemplo**                                                                                                                           
  -----------------------------------------------------------------------------------------------------------------------------------------------------

E2.5 · Title Companies investor-friendly

  -----------------------------------------------------------------------------------------------------
  **Actor necesario**   **Nombre**       **Página web**            **Términos y    **Notas**
                                                                   condiciones**   
  --------------------- ---------------- ------------------------- --------------- --------------------
  **Title nacional**    **Stewart        *stewart.com*             500+ oficinas   Aliado de muchos
                        Title**                                    nacional        HMLs. Subsidiaria
                                                                                   parent de Asset
                                                                                   Preservation (1031
                                                                                   QI).

  **Title nacional**    **First American *firstam.com*             Top-2 USA por   Subsidiaria parent
                        Title**                                    volumen         de IPX1031.

  **Title nacional**    **Old Republic   *oldrepublictitle.com*    Nacional        Frecuente en deals
                        Title**                                                    comerciales.

  **Title nacional (#1  **Fidelity       *fnf.com*                 Top-1 USA       Maneja exchanges
  USA)**                National Title**                                           también.

  **Underwriter común** **Westcor Land   *wltic.com*               Underwriter     Verifica que tu
                        Title**                                    para muchas     title use Westcor.
                                                                   locales         

  **Title TX            **Independence   *independencetitle.com*   70+ oficinas    El #1 en TX para
  investor-friendly**   Title**                                    TX; 40+         flippers.
                                                                   condados        

  **Title TX            **Patriot        *patriottitleco.com*      Local Austin/SA Investor-friendly.
  Austin/SA**           Title**                                                    

  **Title FL            **Florida Agency *flaagency.com*           FL statewide    Especializado en
  statewide**           Network**                                                  wholesale double
                                                                                   closing.

  **Búsqueda title FL   **The Florida    *floridabar.org*          Variable        FL es híbrido ---
  (híbrido)**           Bar**                                                      abogado o agente.
                                                                                   Verifica antes.
  -----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **TIP PRO: CÓMO ESCOGER TITLE**                                 |
|                                                                 |
| Pregunta al wholesaler local con quién cierra. Esa title casi   |
| siempre es la correcta para inversionistas en ese mercado. Las  |
| title que entienden double closings y assignments son las más   |
| útiles.                                                         |
+-----------------------------------------------------------------+

E2.6 · Permit Expediters y portales por ciudad

Si tu obra requiere permisos (especialmente FL y AZ, donde sin permits
no se puede vender), un permit expediter ahorra semanas. Para Texas el
costo de permisos es típicamente bajo pero los inspectores estrictos.

  ------------------------------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**                                            **Términos y         **Notas**
  necesario**                                                                                 condiciones**        
  ---------------- ---------------- --------------------------------------------------------- -------------------- -------------
  **Permit         **Permit Place** *permitplace.com*                                         Multiple ciudades;   Múltiples
  expediting                                                                                  precio por permit    mercados.
  nacional**                                                                                                       

  **Portal         **Austin AB+C**  *austintexas.gov/abc-applications*                        AMANDA system        Aplicación
  permisos                                                                                                         online.
  Austin**                                                                                                         

  **Portal         **Houston        *houstonpermittingcenter.org*                             iPermits system      ---
  permisos         Permits Center**                                                                                
  Houston**                                                                                                        

  **Portal         **Dallas         *dallascityhall.com/departments/sustainabledevelopment*   City portal          ---
  permisos         Development                                                                                     
  Dallas**         Services**                                                                                      

  **Portal         **SA Development *sanantonio.gov/DSD*                                      City portal          ---
  permisos San     Services Dept**                                                                                 
  Antonio**                                                                                                        

  **Portal         **Phoenix SHAPE  *shapephx.phoenix.gov/s/*                                 Reemplaza PDD Online Release 1
  permisos         PHX**                                                                                           residencial
  Phoenix**                                                                                                        activo;
                                                                                                                   Release 3
                                                                                                                   comercial
                                                                                                                   desde abril
                                                                                                                   2026.

  **Portal         **Miami-Dade     *miamidade.gov*                                           Permisos             ---
  permisos         ePermits**                                                                 plomería/eléctrico   
  Miami-Dade**                                                                                online               

  **Portal         **Tampa Accela** *aca-prod.accela.com/tampa*                               City portal          ---
  permisos Tampa**                                                                                                 

  **Portal         **Orlando        *orlando.gov/Building-Development*                        City portal          ---
  permisos         ProjectDox**                                                                                    
  Orlando**                                                                                                        

  **Portal         **Jacksonville   *coj.net/jaxepics*                                        City portal          ---
  permisos         JaxEPICS**                                                                                      
  Jacksonville**                                                                                                   

  **Portal         **LADBS**        *ladbs.org*                                               City portal          ---
  permisos Los                                                                                                     
  Angeles**                                                                                                        

  **Portal         **San Diego      *sandiego.gov/development-services*                       City portal          ---
  permisos San     DSD**                                                                                           
  Diego**                                                                                                          

  **Portal         **NYC DOB NOW**  *nyc.gov/buildings*                                       City portal; LL-97   Para
  permisos NYC**                                                                              emissions aplica a   multifamily
                                                                                              edificios \>25K sqft grandes.

  **Portal         **Atlanta Office *atlantaga.gov/government/departments/city-planning*      City portal          ---
  permisos         of Buildings**                                                                                  
  Atlanta**                                                                                                        

  **Portal         **Mecklenburg    *mecklenburgcountync.gov*                                 County portal        ---
  permisos         County LUESA**                                                                                  
  Charlotte**                                                                                                      

  **Portal         **Chicago        *chicago.gov/buildings*                                   City portal          ---
  permisos         Building                                                                                        
  Chicago**        Permits**                                                                                       

  **Portal         **Philadelphia   *phila.gov/li*                                            City portal          ---
  permisos         L&I eCLIPSE**                                                                                   
  Philadelphia**                                                                                                   

  **Portal         **Boston ISD**   *boston.gov/departments/inspectional-services*            City portal          ---
  permisos                                                                                                         
  Boston**                                                                                                         

  **Portal         **Clark County   *clarkcountynv.gov*                                       County portal        ---
  permisos Las     Building Dept**                                                                                 
  Vegas**                                                                                                          
  ------------------------------------------------------------------------------------------------------------------------------

E2.7 · DSCR Lenders (para refi Fix & Hold)

Cuando la salida es Fix & Hold (rentar), refinancias el hard money con
un préstamo DSCR de 30 años. La aprobación es por flujo de la propiedad,
no por ingreso personal.

  ----------------------------------------------------------------------------------------
  **Actor         **Nombre**    **Página web**             **Términos y     **Notas**
  necesario**                                              condiciones**    
  --------------- ------------- -------------------------- ---------------- --------------
  **DSCR líder    **Visio       *visiolending.com*         DSCR 1.0 mín;    #1 USA por
  USA #1          Lending**                                FICO 680+; 30-yr volumen 2024.
  volumen**                                                fixed            Especialista
                                                                            STR/LTR.

  **DSCR + F&F    **Kiavi       *kiavi.com/loans/rental*   FICO 640+; LTV   Pipeline
  combo**         DSCR**                                   80%; desde 6%    integrado con
                                                                            su F&F.

  **DSCR +        **Lima One    *limaone.com*              5/1, 7/1, 10/1,  Bueno para
  portfolio       Rental30**                               30-yr fixed;     portafolio.
  rental**                                                 FICO 660; STR    
                                                           mín. 1.5 DSCR    

  **DSCR online   **NewSilver   *newsilver.com*            DSCR desde       Cerrado en 14
  rápido**        DSCR**                                   5.75%; LTV 80%;  días típico.
                                                           mín. 0.75 DSCR   

  **DSCR Non-QM** **A&D         *admortgage.com*           DSCR + non-QM    Múltiples
                  Mortgage**                                                programas.

  **DSCR +        **Angel Oak   *angeloakms.com*           LLC vesting OK;  Para foreign
  extranjeros**   Mortgage**                               STR con AirDNA   nationals
                                                                            también.

  **DSCR +        **Sprout      *sproutmortgage.com*       Bank statement   ---
  non-QM**        Mortgage**                               loans            

  **DSCR hasta    **Griffin     *griffinfunding.com*       DSCR hasta 0.75; ---
  0.75**          Funding**                                loans hasta \\$5M 

  **DSCR +        **Easy Street *easystreetcap.com*        FICO 640         ---
  EasyRent**      Capital                                                   
                  EasyRent**                                                

  **DSCR Florida  **American    *ahlend.com*               LTV 85%          Foco Florida.
  (85% LTV)**     Heritage                                                  
                  Lending**                                                 

  **DSCR LTR**    **RCN Capital *rcncapital.com*           Hasta 80% LTV;   ---
                  LTR**                                    FICO 660         

  **DSCR          **CoreVest    *corevestfinance.com*      \\$95K--\\$50M+;   Portfolio
  portfolio 5+**  Finance**                                46 estados       loans con
                                                                            varias
                                                                            unidades.
  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E2**                                          |
|                                                                 |
| Primer flip FICO 700+: Kiavi o Easy Street. FICO 660-700: Kiavi |
| o local FL/AZ (Ridge Street, Unitas). Experimentado: Anchor o   |
| RCN. Portfolio/multi-estado: CoreVest. DSCR para HOLD: Visio    |
| (#1 USA) o Kiavi.                                               |
+-----------------------------------------------------------------+

**E3**

**EJECUTAR**

**Gerencia activa de la renovación**

*Aquí ganas o pierdes el dinero. El estudiante actúa como Project
Manager: visitas constantes, control del cronograma, gestión del
presupuesto.*

E3.1 · Cuentas Pro y Suministros 🟢

Abre cuentas Pro de inmediato --- son gratis y dan descuentos del 5-30%
según volumen. Miembros de National REIA tienen rebates automáticos
extras.

  -------------------------------------------------------------------------------------------------------------
  **Actor necesario**   **Nombre**           **Página web**                      **Términos y    **Notas**
                                                                                 condiciones**   
  --------------------- -------------------- ----------------------------------- --------------- --------------
  **Cuenta Pro #1       **Home Depot Pro     *homedepot.com/c/Pro_Xtra*          Gratis; rebate  Miembros
  (descuentos           Xtra**                                                   2% si \>        National REIA
  volumen)**                                                                     \\$5,000 c/6     tienen rebate
                                                                                 meses           adicional
                                                                                                 automático.

  **Cuenta Pro          **Lowe\'s For Pros** *lowesforpros.com*                  Gratis; LARS    Buena para
  Lowe\'s**                                                                      rewards         appliances.

  **Cuenta Pro pisos**  **Floor & Decor Pro  *flooranddecor.com/pro*             Gratis; precios LVP, tile,
                        Premier**                                                bajos           hardwood al
                                                                                                 por mayor.

  **Wholesale           **Ferguson**         *ferguson.com*                      Cuenta          Estándar
  plumbing/HVAC**                                                                contratista     profesional.

  **Online              **Build.com**        *build.com*                         Cuenta de       Bueno para
  plumbing/lighting**                                                            contratista     fixtures
                                                                                                 premium.

  **Mobiliario y        **Wayfair            *wayfair.com/professional*          Cuenta Pro      Descuentos
  decor**               Professional**                                           gratis          para staging.

  **Countertops + tile  **MSI Surfaces**     *msisurfaces.com*                   Por contratista Quartz/tile
  wholesale**                                                                                    mayorista.

  **Showroom            **ProSource          *prosourcewholesale.com*            Necesitas trade ---
  members-only**        Wholesale**                                              member          

  **Pinturas Pro 20-40% **Sherwin-Williams   *sherwin-williams.com/contractor*   PaintPerks Pro  Estándar 20%,
  off**                 Pro**                                                                    hasta 40% con
                                                                                                 relación.

  **Pinturas Pro        **Behr Pro / Home    *behr.com/proportal*                Pro discounts   Vía Home Depot
  alternativa**         Depot**                                                                  Pro Xtra.

  **Appliances bulk**   **ABT**              *abt.com*                           Bulk discounts  Bueno para 3+
                                                                                                 unidades.

  **Appliances bulk**   **AJ Madison**       *ajmadison.com*                     Volumen         Para flippers
                                                                                                 con volumen.
  -------------------------------------------------------------------------------------------------------------

E3.2 · Cabinets y Pisos Wholesale 🟢

  -----------------------------------------------------------------------------------------------
  **Actor        **Nombre**        **Página web**               **Términos y    **Notas**
  necesario**                                                   condiciones**   
  -------------- ----------------- ---------------------------- --------------- -----------------
  **Cabinets RTA **Cabinets To     *cabinetstogo.com*           Variable;       Diseño + delivery
  con delivery** Go**                                           \~\\$5-8K cocina rápido para
                                                                                flippers.

  **Cabinets RTA **Lily Ann        *lilyanncabinets.com*        RTA mayorista   Compra online
  online**       Cabinets**                                                     directo.

  **Cabinets RTA **RTA Cabinet     *rtacabinetstore.com*        Económico       Para flips de
  económico**    Store**                                                        bajo presupuesto.

  **Cabinets     **CliqStudios**   *cliqstudios.com*            \~\\$8K cocina   Buen balance
  mid-tier**                                                                    precio/calidad.

  **Cabinets     **Forevermark     *forevermarkcabinetry.com*   Vía contratista Distribuidor
  distribuidor   Cabinetry**                                                    mayorista.
  mayorista**                                                                   

  **Pisos        **LL Flooring**   *lllflooring.com*            Pro discount    ---
  hardwood +                                                                    
  vinyl**                                                                       

  **Pisos        **Hardwood        *hardwoodbargains.com*       Hardwood al por ---
  hardwood       Bargains**                                     mayor           
  económicos**                                                                  

  **Pisos        **BuildDirect**   *builddirect.com*            Online flooring Variable.
  online**                                                                      
  -----------------------------------------------------------------------------------------------

E3.3 · Software de Project Management 🟢

  -------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**         **Página web**       **Términos y    **Notas**
                                                              condiciones**   
  ------------------- ------------------ -------------------- --------------- ---------------------
  **Software flip +   **Flipper Force**  *flipperforce.com*   \\$79/mes        Job costing, deal
  budget tracker**                                                            analyzer, SOW
                                                                              templates.

  **PM construcción   **Buildertrend**   *buildertrend.com*   \\$399/mes       Absorbió CoConstruct
  completo**                                                  (Essential)     feb 2021. Para GC con
                                                                              varios proyectos.

  **PM construcción** **Houzz Pro**      *houzz.com/pro*      \\$99-499/mes    PM + marketing +
                                                                              leads.

  **PM simple         **BuildBook**      *buildbook.co*       \\$79/mes        Tiers de precio.
  client-friendly**                                                           

  **PM + accounting** **Knowify**        *knowify.com*        \\$186/mes       Para GCs serios.

  **PM construcción   **JobTread**       *jobtread.com*       \\$159-199/mes   TX-based pero
  Texas-based**                                                               nacional.

  **PM con plantillas **Taskade**        *taskade.com*        Free / \\$8/mes  Custom workflows para
  Taskade**                                                   Pro             REI.

  **PM general        **Trello / Asana** *trello.com /        Free tier       Para flips pequeños
  gratis**                               asana.com*                           1-2 simultáneos.

  **PM general        **Notion**         *notion.so*          Free / \\$10/mes Hyper-customizable.
  workspace**                                                                 
  -------------------------------------------------------------------------------------------------

E3.4 · Inspectores Independientes 🔵

  ------------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**                             **Términos y    **Notas**
  necesario**                                                                  condiciones**   
  ---------------- ---------------- ------------------------------------------ --------------- ---------------
  **Directorio     **InterNACHI**   *nachi.org/find/*                          Filtra por      Estándar ---
  inspectores                                                                  código postal   busca CMI
  certificados**                                                                               (Certified
                                                                                               Master
                                                                                               Inspector).

  **Directorio     **ASHI**         *homeinspector.org*                        Filtra por      Otro cuerpo
  inspectores                                                                  estado          grande
  ASHI**                                                                                       certificador.

  **Directorio +   **HomeAdvisor    *homeadvisor.com/c.Home-Inspection.html*   Local + reviews ---
  reviews**        Inspectors**                                                                

  **Inspector FL   **FL DBPR HI     *myfloridalicense.com*                     Busca prefix HI FL requiere
  (licencia        license**                                                                   licencia HI
  estatal)**                                                                                   estatal.

  **Sewer scope    **Buscar         *---*                                      \\$150-350       Crítico para
  inspection**     «\[city\] sewer                                                             casas pre-1960.
                   scope»**                                                                    

  **Foundation     **Buscar         *---*                                      Variable        Crítico en TX
  inspection       «\[city\]                                                                   por clay soil.
  (TX)**           foundation                                                                  
                   inspector»**                                                                

  **Termite WDO    **Buscar «WDO    *---*                                      \\$50-150        Obligatorio en
  (FL/TX)**        inspection                                                                  FL y TX casi
                   \[city\]»**                                                                 todos closings.
  ------------------------------------------------------------------------------------------------------------

E3.5 · Otros servicios de sitio

  ------------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**           **Página web**                            **Términos y         **Notas**
  necesario**                                                                    condiciones**        
  --------------- -------------------- ----------------------------------------- -------------------- --------------
  **Dumpster      **Bin There Dump     *bintheredumpthat.com*                    Driveway-friendly;   Local en
  franquicia      That**                                                         \\$400-800/dumpster   muchas
  nacional**                                                                                          ciudades.

  **Dumpster      **Waste Management** *wm.com*                                  \\$400-800 por        Confiable pero
  nacional**                                                                     dumpster 20yd        más caro.

  **Dumpster      **Republic           *republicservices.com*                    Competidor WM        Variable por
  nacional**      Services**                                                                          ciudad.

  **Limpieza      **1-800-GOT-JUNK**   *1800gotjunk.com*                         Más caro pero rápido Para
  rápida                                                                                              situaciones
  post-demo**                                                                                         urgentes.

  **Comparador    **Hometown Dumpster  *hometowndumpsterrental.com*              Free                 Cotiza 2-3
  dumpsters       Rental**                                                                            antes.
  local**                                                                                             

  **Tool rental   **United Rentals**   *unitedrentals.com*                       Cuenta Pro           Para
  nacional                                                                                            excavadoras,
  pesado**                                                                                            lifts.

  **Tool rental   **Sunbelt Rentals**  *sunbeltrentals.com*                      Cuenta Pro           Competidor
  nacional**                                                                                          United.

  **Tool rental   **Home Depot Tool    *homedepot.com/c/tool_and_truck_rental*   Por hora/día         OK para tools
  ubicuo**        Rental**                                                                            pequeños.

  **Site security **Deep Sentinel**    *deepsentinel.com*                        \\$50+/mes            Cámaras AI con
  IA + guard                                                                                          monitoring
  live**                                                                                              live.

  **Site security **Ring Jobsite**     *ring.com*                                \\$200-400            Bueno solo si
  Ring**                                                                                              tiene WiFi en
                                                                                                      sitio.

  **Site security **SimpliSafe         *simplesafe.com*                          \\$200-500 setup +    Cámaras +
  wireless**      Business**                                                     \\$30/mes             alarmas para
                                                                                                      flip vacante.

  **Drone         **DroneBase**        *dronebase.com*                           \\$99-299/proyecto    FAA Part 107
  progress                                                                                            piloto
  photography**                                                                                       certificado.

  **App medición  **MagicPlan**        *magicplan.app*                           Free /               Crea floor
  AR floor                                                                       \\$9.99-29.99/mes Pro plans con
  plans**                                                                                             cámara del
                                                                                                      celular.

  **App medición  **RoomScan Pro**     *App Store*                               iOS solo             ---
  LiDAR**                                                                                             
  ------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E3**                                          |
|                                                                 |
| Día 1 del proyecto: Home Depot Pro Xtra + Lowe\'s For Pros      |
| (gratis). Semana 1: SimpliSafe en flip vacante + inspector      |
| certificado InterNACHI. Si tienes 2+ flips simultáneos: Flipper |
| Force (\\$79/mes). Si tienes 5+: Buildertrend (\\$399/mes).       |
+-----------------------------------------------------------------+

**E4**

**ESTRATEGIA DE SALIDA**

**Vender o rentar**

*Aquí transformas el activo en dinero. Vende rápido con staging +
fotos + agente investor-friendly. Si Fix & Hold: tenant screening +
property manager + DSCR refi.*

E4.1 · Stagers (físico y virtual) 🟢

  ----------------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**             **Página web**                                     **Términos y    **Notas**
  necesario**                                                                               condiciones**   
  --------------- ---------------------- -------------------------------------------------- --------------- ------------
  **Directorio    **RESA**               *realestatestagingassociation.com/Find-a-Stager*   Free directorio Búsqueda por
  nacional                                                                                                  código
  stagers**                                                                                                 postal.

  **Franquicia    **Showhomes**          *showhomes.com*                                    Variable por    Múltiples
  nacional                                                                                  mercado         ciudades.
  staging**                                                                                                 

  **Portfolios    **Houzz Pros           *houzz.com/professionals/home-staging*             Free            Filtra por
  stagers         (Stagers)**                                                                               ciudad.
  locales**                                                                                                 

  **Reviews       **HomeAdvisor          *homeadvisor.com/c.Home-Staging.html*              Free            Filtra por
  locales         Stagers**                                                                                 ciudad.
  staging**                                                                                                 

  **Virtual       **BoxBrownie**         *boxbrownie.com*                                   \\$32/foto       Estándar de
  staging                                                                                                   la
  premium**                                                                                                 industria.

  **Virtual       **VirtualStagingAI**   *virtualstagingai.app*                             \\$15-29/foto    Más rápido,
  staging AI**                                                                                              calidad
                                                                                                            media.

  **Virtual       **Stuccco**            *stuccco.com*                                      Variable        ---
  staging                                                                                                   
  alternativa**                                                                                             

  **Virtual       **Spotless Agency**    *spotlessagency.com*                               Variable        ---
  staging                                                                                                   
  alternativa**                                                                                             
  ----------------------------------------------------------------------------------------------------------------------

E4.2 · Fotografía y Tour 3D 🟢

  ------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**     **Términos y    **Notas**
  necesario**                                          condiciones**   
  --------------- ----------------- ------------------ --------------- ---------------
  **Fotografía RE **HomeJab**       *homejab.com*      \\$149-219+ por  Calidad
  on-demand                                            shoot;          consistente.
  nacional**                                           turnaround 24h  

  **Marketplace   **Aryeo**         *aryeo.com*        \\$150-400 por   Network
  fotógrafos**                                         shoot           pre-validado.

  **Fotografía RE **VHT Studios**   *vht.com*          Premium pricing High-end
  premium**                                                            nacional.

  **Tour 3D       **Matterport 3D** *matterport.com*   \\$99-299/mes;   Para flips
  inmersivo**                                          vía fotógrafo   premium o casas
                                                                       grandes.

  **Floor plan    **Cube            *cubicasa.com*     Vía fotógrafo o Plano técnico
  profesional**   (CubiCasa)**                         directo         para listing.

  **Edición de    **BoxBrownie      *boxbrownie.com*   Twilight, sky   Premium
  fotos premium** edición**                            replacement,    retouch.
                                                       decluttering    

  **Fotógrafos    **Buscar          *---*              \\$100-300       Pide referido
  locales         «\[city\] real                                       al agente
  económicos**    estate                                               listing.
                  photographer» +                                      
                  Google reviews**                                     
  ------------------------------------------------------------------------------------

E4.3 · Agentes Investor-Friendly y Listing 🟢

  ----------------------------------------------------------------------------------------------
  **Actor          **Nombre**        **Página web**               **Términos y    **Notas**
  necesario**                                                     condiciones**   
  ---------------- ----------------- ---------------------------- --------------- --------------
  **Directorio     **BiggerPockets   *biggerpockets.com/agents*   Free, filtra    Filtrado por
  nacional         Agent Finder**                                 por ciudad      experiencia
  pro-investor**                                                                  con flippers.

  **Agentes con    **Clever Real     *listwithclever.com*         1-1.5% listing  Para listing
  commission       Estate**                                                       flat-fee.
  reducida**                                                                      

  **Match con top  **HomeLight**     *homelight.com*              Free algoritmo  Match por
  agents**                                                                        ciudad.

  **Agentes        **UpNest**        *upnest.com*                 Free            Reduce
  compiten por                                                                    commission.
  listing**                                                                       

  **Roofstock para **Roofstock**     *roofstock.com*              Comisión 3%     Para flippers
  venta a                                                                         que venden a
  investors**                                                                     inversores.

  **Flat fee MLS   **Houzeo**        *houzeo.com*                 \\$349-499 flat  Listing en MLS
  DIY**                                                           fee             sin agente
                                                                                  seller-side.

  **Flat fee MLS   **Homecoin**      *homecoin.com*               \\$95 flat       Más económico,
  económico**                                                                     menos
                                                                                  servicios.

  **Referidos del  **Tu REIA local** *Ver E1.5*                   Membresía       El método más
  REIA local**                                                    \\$97-250/año    confiable.
  ----------------------------------------------------------------------------------------------

E4.4 · Plataformas de Listing y iBuyers 🟢

  ----------------------------------------------------------------------------------------------
  **Actor            **Nombre**        **Página web**               **Términos y    **Notas**
  necesario**                                                       condiciones**   
  ------------------ ----------------- ---------------------------- --------------- ------------
  **MLS local (vía   **Local MLS**     *Vía tu agente o licencia*   ---             El #1. Sin
  agente)**                                                                         esto no se
                                                                                    vende
                                                                                    rápido.

  **Sindicación      **Zillow**        *zillow.com*                 Free (sindicado Tráfico #1
  automática #1**                                                   desde MLS)      USA.

  **Sindicación +    **Realtor.com**   *realtor.com*                Free (sindicado Asociación
  Premier**                                                         desde MLS)      nacional
                                                                                    NAR.

  **Listing +        **Redfin**        *redfin.com*                 Free            Buena UX.
  agentes propios**                                                                 

  **Propiedad de     **Trulia**        *trulia.com*                 Free            Listings
  Zillow**                                                                          duplicados
                                                                                    de Zillow.

  **Re-emergente**   **Homes.com**     *homes.com*                  Free            Listing +
                                                                                    agent
                                                                                    promotion.

  **FSBO +           **Facebook        *facebook.com/marketplace*   Free            Local cash
  accelerated sale** Marketplace +                                                  buyers.
                     Groups**                                                       

  **Listings open    **Open House      *realtor.com*                Vía agente      Aumenta
  house**            (Realtor.com)**                                                tráfico.

  **iBuyer #1        **Opendoor**      *opendoor.com*               Comisión 5-7% + Mercados
  (backup exit)**                                                   repairs         limitados.
                                                                    deduction       Cotización
                                                                                    24h.

  **iBuyer           **Offerpad**      *offerpad.com*               Variable        Misma idea,
  alternativa**                                                                     cobertura
                                                                                    diferente.

  **iBuyer +         **Knock**         *knock.com*                  Modelo híbrido  ---
  trade-in**                                                                        

  **Cash offer       **HomeLight Cash  *homelight.com/cash-offer*   Conecta con     Backup.
  service**          Offer**                                        investors       
                                                                    locales         

  **Franchise cash   **We Buy Ugly     *webuyuglyhouses.com*        Variable        Oferta muy
  buyer**            Houses                                                         baja ---
                     (HomeVestors)**                                                solo último
                                                                                    recurso.
  ----------------------------------------------------------------------------------------------

E4.5 · Property Managers (para Fix & Hold) 🟢🟠

  ---------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**     **Página web**                        **Términos y    **Notas**
  necesario**                                                           condiciones**   
  ---------------- -------------- ------------------------------------- --------------- -------------------
  **Directorio     **All Property *allpropertymanagement.com*           Free directorio Filtra por ciudad.
  nacional PMs**   Management**                                                         

  **Asociación     **NARPM**      *narpm.org*                           Membership para Estándar
  profesional                                                           PMs             profesional.
  PMs**                                                                                 

  **PMs            **Roofstock    *roofstock.com/property-management*   Verificados     Para portafolio.
  verificados      Property                                                             
  Roofstock**      Management**                                                         

  **PM nacional    **Mynd**       *mynd.co*                             Tech-enabled    Fuerte en
  tech-enabled**                                                        multi-ciudad    Phoenix/TX/FL/CA.

  **PM Miami       **All County   *allcounty.com*                       Franquicia      ---
  local**          Property Mgmt                                        nacional local  
                   Miami**                                                              

  **PM Tampa       **Rent         *rentsolutions.com*                   Local           ---
  local**          Solutions**                                          especializado   

  **PM Orlando     **Real         *realpropertymgt.com*                 National brand  ---
  local**          Property Mgmt                                                        
                   Central FL**                                                         

  **PM             **Watson       *watsonrealtycorp.com*                Local grande    ---
  Jacksonville     Realty PM**                                                          
  local**                                                                               

  **PM Houston     **Mynd         *mynd.co*                             Tech-enabled    ---
  local**          Houston**                                                            

  **PM Dallas      **RentLife     *rentlife.com*                        Local Dallas    ---
  local**          Property                                                             
                   Management**                                                         

  **PM Austin      **Austin       *alps-pm.com*                         Local Austin    ---
  local**          Landmark                                                             
                   Property**                                                           

  **PM San Antonio **Liberty      *libertymgmt.com*                     Local SA        ---
  local**          Management**                                                         

  **PM Los Angeles **Onerent      *mynd.co*                             Tech-enabled    ---
  local**          (ahora Mynd)**                                       multi-mercado   

  **PM Atlanta     **HomeRiver    *homerivergroup.com*                  Nacional HQ     ---
  local**          Group**                                              Atlanta         

  **PM Phoenix     **American     *aregroup.com*                        Local AZ        ---
  local**          Real Estate                                                          
                   Investments                                                          
                   PM**                                                                 

  **PM Charlotte   **Henderson    *hendersonproperties.com*             Local           ---
  local**          Properties**                                                         
  ---------------------------------------------------------------------------------------------------------

E4.6 · Tenant Screening 🟢

  ---------------------------------------------------------------------------------------------------------
  **Actor           **Nombre**         **Página web**                    **Términos y        **Notas**
  necesario**                                                            condiciones**       
  ----------------- ------------------ --------------------------------- ------------------- --------------
  **Plataforma +    **TurboTenant**    *turbotenant.com*                 Free básico;        Free básico.
  screening                                                              \\$99/año premium    Bueno para
  gratis**                                                                                   1-10 unidades.

  **Landlord        **RentRedi**       *rentredi.com*                    \\$9-29.95/mes       Screening +
  software                                                                                   payments.
  completo**                                                                                 

  **Landlord        **Avail**          *avail.co*                        Free básico         Propiedad de
  software gratis**                                                                          Realtor.com.

  **Landlord        **Innago**         *innago.com*                      FREE sin caps de    ---
  software gratis**                                                      unidades            

  **Screening       **TransUnion       *mysmartmove.com*                 \\$25-40/aplicante   Reportes
  TransUnion        SmartMove**                                          (paga inquilino)    crédito
  premium**                                                                                  profundos.

  **Application +   **RentSpree**      *rentspree.com*                   Variable            Compatible con
  screening MLS**                                                                            MLS.

  **Listing +       **Apartments.com   *apartments.com/manage-rentals*   Free                ---
  screening         Rental Manager**                                                         
  Apartments**                                                                               

  **Screening       **RentPrep**       *rentprep.com*                    \\$19-39/aplicante   Más completo
  manual completo**                                                                          manualmente.

  **Screening       **Rent Perfect**   *rentperfect.com*                 \\$35/aplicante;     Para members
  descuento REIA**                                                       descuento National  REIA.
                                                                         REIA                
  ---------------------------------------------------------------------------------------------------------

E4.7 · 1031 Exchange Qualified Intermediaries 🟢

+-----------------------------------------------------------------+
| **CRÍTICO: 1031 NO APLICA A FLIPS**                             |
|                                                                 |
| Los flippers que VENDEN en menos de 12 meses generalmente NO    |
| califican para 1031 (es operación, no inversión --- propiedad   |
| clasificada como inventory). Consulta CPA antes. El 1031 sirve  |
| para Fix & Hold y para venta de rentas estabilizadas.           |
+-----------------------------------------------------------------+

  -----------------------------------------------------------------------------------------------
  **Actor           **Nombre**       **Página web**              **Términos y      **Notas**
  necesario**                                                    condiciones**     
  ----------------- ---------------- --------------------------- ----------------- --------------
  **QI #1 USA       **IPX1031**      *ipx1031.com*               \\$1,000+ por      Subsidiaria de
  (Fidelity)**                                                   exchange          Fidelity
                                                                                   National
                                                                                   Financial. Top
                                                                                   tier.

  **QI Stewart      **Asset          *apiexchange.com*           \\$1,200+ por      Subsidiaria de
  Title**           Preservation Inc                             exchange          Stewart
                    (API)**                                                        Information
                                                                                   Services.

  **QI con software **Accruit**      *accruit.com*               Variable          Software
  propio**                                                                         Exchange
                                                                                   Manager Pro
                                                                                   patentado.
                                                                                   Staff
                                                                                   attorneys +
                                                                                   CPAs.

  **QI First        **First American *firstexchange.com*         \\$1,000+          Subsidiaria de
  American family** Exchange**                                                     First
                                                                                   American.

  **QI Old Republic **Old Republic   *oldrepublicexchange.com*   \\$1,000+          Subsidiaria de
  family**          Exchange**                                                     Old Republic
                                                                                   Title.

  **QI Qualified    **Exeter 1031**  *exeter1031.com*            Qualified Trust   ---
  Trust**                                                        Account           
                                                                 state-regulated   

  **QI boutique     **Equity         *equityadvantage.com*       \\$750+            Boutique
  personalizado**   Advantage**                                                    establecido.

  **QI boutique**   **Compass 1031** *compass1031.com*           Variable          Boutique
                                                                                   smaller QI.

  **Educación       **1031           *1031exchange.com*          Free              Educación, no
  1031**            Exchange.com**                                                 es QI.
  -----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E4**                                          |
|                                                                 |
| Casa retail (rehab completo): Agente investor-friendly + fotos  |
| profesionales HomeJab + virtual staging \\$32/foto BoxBrownie.   |
| Casa intermedia: Houzeo flat fee + fotos básicas. Venta a otro  |
| flipper: buyer list + New Western network. Emergencia: Opendoor |
| (pero pierdes 7-10%).                                           |
+-----------------------------------------------------------------+

**E5**

**ESCALAR**

**Sistematizar y crecer el negocio**

*Un flip es un logro. Un negocio de flips es un sistema. Escalar
significa documentar procesos, construir equipo, acceder a más capital,
hacer múltiples deals en paralelo.*

E5.1 · Bookkeeping multi-LLC 🟢

  ----------------------------------------------------------------------------------------
  **Actor         **Nombre**      **Página web**            **Términos y    **Notas**
  necesario**                                               condiciones**   
  --------------- --------------- ------------------------- --------------- --------------
  **Bookkeeping   **Stessa**      *stessa.com*              Free / Pro      Excelente
  FREE para REI**                                           \\$20/mes        starter.

  **Bookkeeping   **QuickBooks    *quickbooks.intuit.com*   \\$235/mes       Class tracking
  multi-LLC       Online                                                    por LLC.
  profesional**   Advanced**                                                

  **Bookkeeping   **Xero**        *xero.com*                \\$80/mes        Más simple que
  multi-entidad                                                             QBO para
  simple**                                                                  multi.

  **Bookkeeping   **REI Hub**     *reihub.net*              \\$25/mes        Diseñado para
  por propiedad**                                                           REI con job
                                                                            costing.

  **Outsourced    **Pinnacle Tax  *pinnacleadvisory.com*    Servicio        Para 5+
  REI             Strategies**                              mensual         propiedades.
  specialist**                                                              

  **Outsourced    **REI           *reibookkeepers.com*      Dedicated team  ---
  REI             Bookkeepers**                                             
  specialist**                                                              

  **Outsourced    **Bench**       *bench.co*                \\$299-499/mes   No specialty
  general**                                                                 pero
                                                                            confiable.

  **Outsourced    **Pilot**       *pilot.com*               \\$499+/mes      Para
  premium**                                                                 portafolios
                                                                            grandes.

  **AI            **Botkeeper**   *botkeeper.com*           Custom          Para volúmenes
  bookkeeping**                                                             altos.
  ----------------------------------------------------------------------------------------

E5.2 · Portfolio PM Software 🟢

  -------------------------------------------------------------------------------------------------
  **Actor necesario**    **Nombre**        **Página web**      **Términos y        **Notas**
                                                               condiciones**       
  ---------------------- ----------------- ------------------- ------------------- ----------------
  **Solo                 **Stessa Pro**    *stessa.com*        Free / \\$20/mes     1-15 unidades.
  accounting/reporting                                                             
  REI**                                                                            

  **PM profesional 50+   **AppFolio**      *appfolio.com*      \\$1.40+/unit/mes;   Estándar para
  unidades**                                                   mín. 50 unidades    PMs
                                                                                   profesionales.

  **PM 10-500 unidades** **Buildium**      *buildium.com*      \\$58-385/mes        Más accesible
                                                                                   que AppFolio.

  **PM landlord          **RentRedi**      *rentredi.com*      \\$9-29.95/mes       DIY portafolio.
  moderno**                                                                        

  **PM mid-tech**        **DoorLoop**      *doorloop.com*      \\$69-149/mes        Crecimiento
                                                                                   rápido.

  **PM híbrido           **Hemlane**       *hemlane.com*       \\$30-60/mes         Para
  self-management**                                                                self-managers.

  **PM gratis hasta 75   **TenantCloud**   *tenantcloud.com*   Free hasta 75;      Buen starter.
  unidades**                                                   Premium \\$15/mes    
  -------------------------------------------------------------------------------------------------

E5.3 · CRMs para REI 🟢

  ---------------------------------------------------------------------------------------------------
  **Actor           **Nombre**       **Página web**               **Términos y        **Notas**
  necesario**                                                     condiciones**       
  ----------------- ---------------- ---------------------------- ------------------- ---------------
  **CRM wholesaling **REsimpli**     *resimpli.com*               \\$99-399/mes        El más usado
  líder**                                                                             por wholesalers
                                                                                      serios.

  **CRM             **Podio +        *investorfuse.com*           \\$147-447/mes       Stack más
  wholesaling + REI InvestorFuse**                                                    popular.
  workflow**                                                                          

  **CRM REI         **REIPro**       *myreipro.com*               \\$109/mes           Lead
  all-in-one**                                                                        generation +
                                                                                      CRM.

  **CRM +           **REI Reply**    *reireply.com*               \\$99-297/mes        Foco
  automation                                                                          wholesaling.
  wholesale**                                                                         

  **CRM             **Pipedrive**    *pipedrive.com*              \\$14-99/mes         Customizable.
  sales-focused**                                                                     

  **CRM gratis para **HubSpot Free   *hubspot.com/products/crm*   Free tier           Para empezar.
  empezar**         CRM**                                                             

  **CRM agente RE** **BoldTrail      *boldtrail.com*              Variable            Si tienes
                    (antes kvCORE)**                                                  licencia.

  **CRM             **Salesforce**   *salesforce.com*             \\$25+/mes/usuario   Solo cuando
  enterprise**                                                                        escalas a
                                                                                      equipo de 5+.
  ---------------------------------------------------------------------------------------------------

E5.4 · Capital Raising y Syndication 🟢

  --------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**           **Página web**             **Términos y    **Notas**
                                                                      condiciones**   
  ------------------- -------------------- -------------------------- --------------- --------------
  **Networking +      **BiggerPockets      *biggerpockets.com*        Free; Pro       Capital + JV
  foros**             Network**                                       \\$39/mes        partners.

  **Networking        **Connected          *connectedinvestors.com*   \\$97/mes PiN    Pipeline +
  nacional**          Investors**                                                     capital.

  **Crowdfunding RE   **CrowdStreet**      *crowdstreet.com*          Accredited      Más para deals
  commercial**                                                                        comerciales.

  **Crowdfunding RE** **RealtyMogul**      *realtymogul.com*          Accredited      ---

  **Crowdfunding RE   **Cadre**            *cadre.com*                Mínimos altos   ---
  institucional**                                                                     

  **Crowdfunding**    **EquityMultiple**   *equitymultiple.com*       Accredited      ---

  **Alt investments   **Yieldstreet**      *yieldstreet.com*          Accredited      Diversifica.
  REI**                                                                               

  **Crowdfunding      **Fundrise**         *fundrise.com*             Mín. \\$10       REITs y
  retail-friendly**                                                                   eFunds.

  **Investor portal   **Juniper Square**   *junipersquare.com*        Custom          Reporting
  multi-LP**                                                          enterprise      trimestral a
                                                                                      LPs.

  **Investor portal   **InvestNext**       *investnext.com*           \\$300+/mes      Cap table
  mid-market**                                                                        software.

  **Investor portal   **Cashflow Portal**  *cashflowportal.com*       Variable        ---
  boutique**                                                                          

  **Pitch deck        **Canva**            *canva.com*                Free /          ---
  profesional**                                                       \\$14.99/mes Pro 

  **Reg D legal       **Regulation D       *regdresources.com*        \\$5K+ legal     Para raise \>
  services**          Resources**                                     fees            \\$1M de
                                                                                      accredited.
  --------------------------------------------------------------------------------------------------

E5.5 · Business Credit 🟢

  --------------------------------------------------------------------------------------------
  **Actor          **Nombre**      **Página web**                **Términos y    **Notas**
  necesario**                                                    condiciones**   
  ---------------- --------------- ----------------------------- --------------- -------------
  **Monitoreo      **Nav**         *nav.com*                     Free tier       Monitorea
  crédito                                                        robusto         D&B, Experian
  personal +                                                                     Business,
  business**                                                                     Equifax
                                                                                 Business.

  **Crédito        **Tillful**     *tillful.com*                 Free            Para LLCs
  empresarial +                                                                  nuevas.
  tarjeta**                                                                      

  **Construir      **Credit Strong *creditstrong.com/business*   Variable        Eficiente
  crédito vía      Business**                                                    para
  credit-builder                                                                 construir.
  loan**                                                                         

  **DUNS Number    **Dun &         *dnb.com/duns-number.html*    DUNS gratis;    OBLIGATORIO
  obligatorio**    Bradstreet**                                  Paydex          para business
                                                                 monitoring      credit.
                                                                 extra           

  **Reporta        **eCredable**   *ecredable.com*               Variable        Construye
  payments a                                                                     Paydex score.
  bureaus**                                                                      

  **Tarjeta        **Brex**        *brex.com*                    Free para LLCs  Sin garantía
  corporate sin                                                  con revenue     personal.
  PG**                                                                           

  **Tarjeta +      **Ramp**        *ramp.com*                    Free; 1.5%      Competidor
  spend                                                          cashback        Brex.
  management**                                                                   

  **Línea SBA +    **Live Oak      *liveoakbank.com*             SBA hasta \\$5M  ---
  comerciales**    Bank**                                                        

  **LOC business   **Bluevine      *bluevine.com*                FICO 625+       APR variable
  hasta \\$250K**   LOC**                                                         alto.
  --------------------------------------------------------------------------------------------

E5.6 · Virtual Assistants 🟢

  -----------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**          **Página web**         **Términos y    **Notas**
                                                                 condiciones**   
  ------------------- ------------------- ---------------------- --------------- ----------------
  **VA específico     **REVA Global**     *revaglobal.com*       \\$1,800/mes     Pre-entrenados
  para REI**                                                     full-time       para REI.

  **VA RE             **MyOutDesk**       *myoutdesk.com*        \\$1,988/mes     Establecido REI.
  entrenados**                                                   full-time       

  **VA agencia        **Helpware**        *helpware.com*         Múltiples       VAs / call
  general**                                                      paquetes        centers.

  **VA US-based**     **Time Etc**        *timeetc.com*          Más caro, local Premium.
                                                                 US              

  **VA dedicated**    **Wing Assistant**  *wingassistant.com*    Por mes         ---

  **VA on-demand**    **Magic**           *getmagic.com*         Tasks discretos ---

  **VA US             **Belay**           *belaysolutions.com*   Premium US      Para directivos.
  executive-level**                                                              

  **Hire directo      **OnlineJobs.ph**   *onlinejobs.ph*        \\$69/mes        Más barato pero
  Filipinas (más                                                 employer;       tú entrenas.
  barato)**                                                      \\$3-10/hora VA  

  **VA cold call      **InvestorPO**      *investorpo.com*       Variable        VAs
  REI**                                                                          pre-entrenados
                                                                                 cold calling
                                                                                 REI.
  -----------------------------------------------------------------------------------------------

E5.7 · Masterminds y Mentorías 🟢

  ---------------------------------------------------------------------------------------------------------------
  **Actor necesario**      **Nombre**        **Página web**                     **Términos y     **Notas**
                                                                                condiciones**    
  ------------------------ ----------------- ---------------------------------- ---------------- ----------------
  **Mastermind             **Collective      *collectivegeniusmastermind.com*   \\$25K+/año       Invite-only.
  wholesalers/flippers**   Genius**                                                              Alto nivel.

  **Mastermind RE          **GoBundance**    *gobundance.com*                   Variable;        Premium HNW.
  entrepreneurs**                                                               alto-net-worth   

  **Mastermind flippers**  **7 Figure        *7figureflipping.com*              \\$10K-25K/año    Justin Williams.
                           Flipping**                                                            Para 10+
                                                                                                 flips/año.

  **Mastermind +           **BiggerPockets   *biggerpockets.com/pro*            \\$39/mes +       Para todos los
  bootcamps**              Pro + Boot                                           bootcamps        niveles.
                           Camps**                                                               

  **Mastermind mentoría    **Lifestyles      *lifestylesunlimited.com*          Membership tiers Houston/Dallas
  TX**                     Unlimited**                                                           fuerte.

  **Mastermind             **Jake & Gino**   *jakeandgino.com*                  Variable         Si escalas a
  multifamily**                                                                                  multi.

  **Mastermind             **Multifamily     *multifamilymindset.com*           Variable         Tyler Deveraux.
  multifamily**            Mindset**                                                             

  **Educación +            **RE Mentor (Dave *rementor.com*                     Variable         Multifamily.
  mastermind**             Lindahl)**                                                            

  **Comunidad CRM + REI**  **REI BlackBook** *reiblackbook.com*                 \\$99-397/mes     CRM + comunidad.
  ---------------------------------------------------------------------------------------------------------------

E5.8 · Cost Segregation y Tax Strategy avanzada 🟢

  ----------------------------------------------------------------------------------------------------
  **Actor          **Nombre**        **Página web**                  **Términos y      **Notas**
  necesario**                                                        condiciones**     
  ---------------- ----------------- ------------------------------- ----------------- ---------------
  **Cost           **KBKG**          *kbkg.com*                      \\$3K-15K por      Acelera
  segregation                                                        propiedad         depreciación.
  líder**                                                                              Rentable en
                                                                                       propiedades \>
                                                                                       \\$250K.

  **Cost           **Engineered Tax  *engineeredtaxservices.com*     \\$3K-15K          Otra opción
  segregation**    Services**                                                          establecida.

  **Cost           **CSSI**          *costsegregationservices.com*   \\$3K-10K          Líder en
  segregation                                                                          estudios.
  alternativa**                                                                        

  **Tax strategy + **WealthAbility   *wealthability.com*             \\$200+ consulta   Red de CPAs
  planning**       (Tom                                              inicial; mensual  entrenados.
                   Wheelwright)**                                                      

  **Tax + legal +  **Anderson        *andersonadvisors.com*          \\$2,500+ planning LLC
  LLC structure**  Business                                                            structures +
                   Advisors**                                                          tax.

  **CPA RE         **The Real Estate *therealestatecpa.com*          \\$300-1,500/mes   Brandon Hall.
  escala**         CPA (Hall CPA)**                                                    

  **Educación      **IRS Pub 946**   *irs.gov/publications/p946*     Free              Lectura
  bonus                                                                                obligatoria si
  depreciation**                                                                       haces mejoras
                                                                                       grandes.
  ----------------------------------------------------------------------------------------------------

E5.9 · Payroll 🟢

  ---------------------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**      **Página web**                    **Términos y           **Notas**
                                                                        condiciones**          
  ------------------- --------------- --------------------------------- ---------------------- ------------------
  **Payroll estándar  **Gusto**       *gusto.com*                       \\$40 base +            Estándar.
  pequeñas LLCs**                                                       \\$6/empleado/mes       

  **Payroll           **OnPay**       *onpay.com*                       \\$40 base +            Más barato que
  económico**                                                           \\$6/empleado/mes       Gusto en planes
                                                                                               altos.

  **HR + benefits     **Justworks**   *justworks.com*                   \\$59-99/empleado/mes   Para LLC con 10+
  PEO**                                                                                        empleados.

  **Payroll QBO       **QuickBooks    *quickbooks.intuit.com/payroll*   Variable               Si ya usas QBO.
  integrado**         Payroll**                                                                

  **Payroll           **ADP**         *adp.com*                         Enterprise pricing     Solo si escalas.
  enterprise**                                                                                 

  **Pagos             **Wise**        *wise.com*                        Free + fee transfer    Para VAs
  internacionales                                                                              internacionales.
  VAs**                                                                                        

  **Compliance global **Deel**        *deel.com*                        \\$49/mes/contractor    Para contractors
  VAs**                                                                                        internacionales.

  **Pagos VAs         **Payoneer**    *payoneer.com*                    Free básico            Para VAs
  internacionales**                                                                            internacionales.
  ---------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **DECISIÓN RÁPIDA E5**                                          |
|                                                                 |
| 2-3 flips/año: aún no necesitas E5. Enfoque E1-E4. 5+ flips/año |
| o 5+ rentas: agrega VA (OnlineJobs.ph) y portfolio PM software. |
| 10+ flips/año o \\$1M revenue: agrega cost segregation, tax      |
| strategy firm (WealthAbility), mastermind (\\$10K+).             |
+-----------------------------------------------------------------+

Apéndice · Alertas Legales Críticas

A1 · Wholesaling legal status por estado (mayo 2026)

El wholesaling sin licencia es restringido o ilegal en varios estados.
Consulta abogado RE local antes de operar en estos estados.

  -------------------------------------------------------------------------------
  **Estado**          **¿Requiere         **Ley clave**     **Riesgo**
                      licencia?**                           
  ------------------- ------------------- ----------------- ---------------------
  **Florida**         NO si asignas       FL Statute        Medio --- frase mal
                      contrato. Marketing §475.42           en marketing =
                      de propiedad sin                      fiscalía.
                      licencia = felonía                    
                      3er grado                             

  **Texas**           NO; el mercado más  TX Occupations    Bajo.
                      amigable. Debes     Code §1101        
                      asignar contrato no                   
                      la propiedad                          

  **California**      NO específicamente, Civil Code        Alto ---
                      pero AB-968 obliga  §1102.6h; CSLB    divulgaciones
                      divulgaciones de                      detalladas
                      renovaciones si                       obligatorias.
                      vendes \< 18 meses                    

  **New York**        NO si solo asignas  RPL Art. 12-A     Medio --- solo
                      contrato --- pero                     marketing privado a
                      NO marketing                          buyers conocidos.
                      público de                            
                      propiedad sin                         
                      licencia                              

  **New Jersey**      NO específicamente; NJ RE License Act Medio.
                      marketing privado                     
                      solo                                  

  **Pennsylvania**    SÍ --- desde        Wholesale RE      ALTO. Requiere
                      4-ene-2025 (Act 52  Transaction       licencia broker +
                      of 2024)            Transparency and  divulgaciones +
                                          Protection Act    30-día right to
                                                            cancel.

  **Illinois**        SÍ si \> 1 deal por RELA 225 ILCS     ALTO. IDFPR multas
                      12 meses (2 o más   454, amended by   hasta \\$25,000 por
                      transacciones)      SB 1872 (2019)    violación.

  **Oklahoma**        SÍ --- desde        Predatory RE      MUY ALTO. Cárcel
                      1-nov-2021. SB 1075 Wholesaler        hasta 6 meses +
                      vigente             Prohibition Act   multas
                      1-nov-2024/2025     (HB3104) + SB     \\$5K/violación.
                                          1075              

  **South Carolina**  SÍ --- ley más      HB 4754 (2024);   MUY ALTO. Casi
                      estricta del país   SC Code           prohibido sin
                                          §40-57-350        licencia.

  **Nebraska**        SÍ --- marketing    LB 860 (2024);    ALTO.
                      público requiere    Choice Homes v.   
                      licencia            Donner (2022)     

  **Oregon**          SÍ --- debe         HB 4058           ALTO.
                      registrarse con                       
                      OREA y pasar                          
                      background                            

  **Connecticut**     SÍ --- debe         HB 5572           ALTO.
                      registrarse con DCP                   

  **Arizona**         Restricciones de    ARS Title 32 ch.  Medio.
                      publicidad          20                
                      reforzadas 2024-25                    

  **Wyoming**         NO restricciones    ---               Bajo.
                      específicas                           

  **Georgia**         NO licencia, pero   GA Code §43-40    Medio.
                      marketing sin                         
                      licencia =                            
                      brokerage                             

  **North Carolina**  NO licencia, pero   NCREC             Medio.
                      marketing sin                         
                      licencia =                            
                      brokerage                             

  **Massachusetts**   NO licencia         MGL c.112         Medio.
                      específica                            

  **Maryland**        NO licencia         MD RE Code        Medio.
                      específica                            
  -------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **REGLAS UNIVERSALES DE WHOLESALING SEGURO**                    |
|                                                                 |
| 1\) Asigna el contrato, NO comercialices la propiedad. 2) Usa   |
| «equitable interest in contract» en todo material. 3) Earnest   |
| money real (mínimo \\$500-\\$1,000) para que el contrato sea      |
| válido. 4) Comercializa SOLO a buyers list privada --- NUNCA    |
| público en redes (sobre todo IL, OK, NE, PA, SC, OR, CT). 5)    |
| Consulta abogado RE local ANTES del primer deal en estado       |
| nuevo.                                                          |
+-----------------------------------------------------------------+

A2 · California AB-968 --- Flipper Disclosure Law

Vigente **1 julio 2024**. Aplica a cualquier venta de propiedad
residencial 1-4 unidades dentro de 18 meses de adquisición.

El vendedor DEBE divulgar:

- Todas las habitaciones agregadas, modificaciones estructurales,
  alteraciones o reparaciones hechas por contratista (\> \\$500 en
  labor + materiales bajo B&P §7027.2).

- Nombre y contacto de cada contratista que hizo trabajo.

- Copias de permits o instrucciones para obtenerlos.

- Aplica al Civil Code §1102.6h (parte del Transfer Disclosure
  Statement).

**Penalidades:** el comprador puede cancelar la transacción o demandar
por rescisión.

Cómo cumplir AB-968

- **✓** Documenta cada contratista con copia de licencia CSLB y permits.

- **✓** NO uses «Owner Builder exemption» como atajo --- requiere que la
  propiedad sea tu residencia principal por 12+ meses antes de completar
  el trabajo.

- **✓** Mantén registro centralizado por proyecto: invoices, permits,
  COI, contratos.

A3 · Wyoming Holding LLC --- Cuándo SÍ y cuándo NO

+-----------------------------------------------------------------+
| **USE WY HOLDING SI:**                                          |
|                                                                 |
| Tiene 3+ propiedades en estado(s) donde quiere anonimato        |
| razonable. Quiere aislar la propiedad de operaciones (Property  |
| Mgmt LLC vs Holding LLC). Tiene una entidad operativa           |
| multi-estado.                                                   |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **NO USE WY HOLDING SI:**                                       |
|                                                                 |
| Tiene 1-2 propiedades --- el costo extra (\~\\$500/año) no se    |
| justifica. Cree que WY le protege de demandas --- NO. Olmstead  |
| v. FTC (FL Supreme Court 2010): single-member LLC NO tiene      |
| charging order exclusivo, los acreedores pueden ejecutar la     |
| membresía completa. Los tribunales del estado donde está la     |
| propiedad aplican SU ley, no la de WY.                          |
+-----------------------------------------------------------------+

**Estructura típica funcional:** WY Anonymous LLC (holding) ← dueño
beneficiario reportado a FinCEN BOI. La WY LLC es member único de → FL
LLC (dueña de propiedad Miami). La FL LLC contrata → Operating LLC para
property management.

A4 · Forms y Asociaciones de Realtors por estado

  ---------------------------------------------------------------------------
  **Estado**          **Asociación de Realtors **Permit / Building Portal**
                      (contratos)**            
  ------------------- ------------------------ ------------------------------
  **Florida**         floridarealtors.org      myfloridalicense.com (DBPR)
                      (FAR/BAR contract)       

  **Texas**           trec.texas.gov (TREC     Por ciudad --- ver E2.6
                      contracts gratis)        

  **California**      car.org (CAR contracts,  cslb.ca.gov + LADBS / SD DSD
                      miembros)                

  **New York**        nysar.com (NYSAR         nyc.gov/buildings (DOB NOW)
                      contracts)               

  **New Jersey**      njrealtor.com            njconsumeraffairs.gov/hic

  **Arizona**         aaronline.com            roc.az.gov + Phoenix SHAPE PHX

  **Georgia**         garealtor.com            Atlanta Office of Buildings

  **Pennsylvania**    parealtors.org           Philadelphia L&I eCLIPSE

  **Massachusetts**   marealtor.com            Boston ISD
  ---------------------------------------------------------------------------

Cómo usar este documento --- orden recomendado

Para un estudiante nuevo, prioriza así:

- **Semana 1-2:** EIN del IRS + LLC en estado de propiedad + cuenta
  Relay/Mercury. Si vives en CA/NY, NO formes LLC en tu estado de
  residencia.

- **Semana 3-4:** Entrevista 2 CPAs especializados RE en tu estado de
  RESIDENCIA. Contrata uno.

- **Semana 4-6:** Asiste a tu REIA local 2-3 veces como invitado ANTES
  de pagar membresía.

- **Mes 2:** PropStream (\\$99/mes) + buyer list de New Western en tu
  ciudad.

- **Antes de primera oferta:** Abogado RE local + Kiavi/Easy Street
  pre-aprobación + COI NREIG/Arcana.

- **Antes de primera obra:** Verifica GC en sitio estatal
  (DBPR/CSLB/ROC) + Home Depot Pro Xtra + Flipper Force si tienes \>1
  proyecto.

- **Después de 3 flips:** Considera WY holding + cost segregation +
  mastermind.

**FLIPPING RENTALS · FLIPMENTORÍA**

*Documento A · Base de Contactos por Etapa · Mayo 2026*
$FMBL0LFA$,
  100,
  ARRAY['contactos', 'directorio', 'HML', 'CPA', 'abogado', 'wholesaler', 'GC', 'stager', 'agente']::text[],
  '{}'::jsonb
);

-- ─── TODOS · procesos · 🛠️ Documento B · Stack de Procesos y Herramientas ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'TODOS',
  'procesos',
  null,
  $FMW1P0F4$🛠️ Documento B · Stack de Procesos y Herramientas$FMW1P0F4$,
  $FMW1P0F4$Software, portales y apps por sub-tarea E0-E5$FMW1P0F4$,
  $FMW1P0F4$**FLIPPING RENTALS · FLIPMENTORÍA**

**STACK DE PROCESOS**

***Herramientas y portales por etapa --- Fix & Flip USA***

*Documento de referencia para estudiantes*

Fix & Flip · Estados Unidos · 2026

Documento B · Para qué sirve

Este es el **Documento B** de la trilogía FlipMentoría. Mientras el Doc
A te da los **contactos y empresas**, el Doc B te da las **herramientas,
portales y software** que usas en cada sub-tarea del flujo de trabajo.

Formato de cada tabla

  ------------------------------------------------------------------
  **Columna**     **Qué contiene**
  --------------- --------------------------------------------------
  **Sub-tarea /   La actividad específica dentro de la etapa
  Proceso**       

  **Herramienta   El software o portal que se usa
  principal**     

  **Página web**  URL oficial

  **Costo /       Gratis · Freemium · Pago. Indica rango cuando
  Tier**          aplica

  **Cuándo es     Si lo necesitas desde el deal #1 o más adelante
  esencial**      
  ------------------------------------------------------------------

Stack transversal --- funciona en todas las etapas

  --------------------------------------------------------------------------------------------------------
  **Actor            **Nombre**      **Página web**            **Términos y          **Notas**
  necesario**                                                  condiciones**         
  ------------------ --------------- ------------------------- --------------------- ---------------------
  **Centro de        **Taskade**     *taskade.com*             Free; Pro \\$8/mes     Esencial. Reemplaza
  comando / docs                                                                     Notion + Trello +
  colaborativos**                                                                    Loom en uno.

  **Base de datos    **Airtable**    *airtable.com*            Free hasta 1,000      Esencial desde deal
  relacional**                                                 registros; Plus       #1 para tracking de
                                                               \\$10/mes              deals.

  **Almacenamiento   **Google        *drive.google.com*        Free 15GB; Workspace  Esencial. Plantillas
  de archivos**      Drive**                                   \\$6+/mes              y contratos
                                                                                     centralizados.

  **Comunicación     **WhatsApp      *business.whatsapp.com*   Free                  Esencial para LATAM
  cliente / equipo** Business**                                                      team y comunicación
                                                                                     rápida.

  **Firma            **DocuSign**    *docusign.com*            \\$15-65/mes/usuario   Esencial desde el
  electrónica de                                                                     primer LOI.
  contratos**                                                                        Alternativa:
                                                                                     HelloSign / Dropbox
                                                                                     Sign.

  **Firma            **PandaDoc**    *pandadoc.com*            Free starter;         Alternativa más
  electrónica                                                  \\$19/mes Essentials   barata.
  económica**                                                                        

  **Reuniones y      **Fathom**      *fathom.video*            Free                  Graba calls + AI
  notas IA**                                                                         summary. Excelente.

  **Reuniones        **Google Meet / *meet.google.com /        Free básico           Estándar.
  video**            Zoom**          zoom.us*                                        

  **Calendario**     **Google        *calendar.google.com*     Free                  Esencial para
                     Calendar**                                                      coordinación con GC,
                                                                                     inspectores, agentes.

  **Programar        **Calendly**    *calendly.com*            Free básico; \\$10/mes Para que
  reuniones**                                                  Pro                   wholesalers/agentes
                                                                                     agenden contigo.

  **Gestión de       **1Password**   *1password.com*           \\$2.99/mes            Esencial ---
  contraseñas**                                                                      compartir
                                                                                     credenciales con VAs
                                                                                     de forma segura.

  **Notas y          **Notion**      *notion.so*               Free; \\$10/mes Plus   Custom SOPs y
  diagramas**                                                                        documentación de
                                                                                     procesos.

  **Grabar           **Loom**        *loom.com*                Free hasta 5 min; Pro Para entrenar VAs y
  tutoriales y                                                 \\$15/mes              subcontratistas.
  SOPs**                                                                             

  **Automatización   **Zapier**      *zapier.com*              Free 100 tasks; Pro   Conecta Airtable +
  entre apps**                                                 \\$19.99/mes           GHL + Slack + Gmail.

  **Automatización   **Make (antes   *make.com*                Free 1,000 ops; Core  Más visual y barato
  alternativa**      Integromat)**                             \\$9/mes               que Zapier.

  **IA asistente     **ClaudeAI /    *claude.ai / chatgpt.com* Free / Plus \\$20/mes  Análisis, redacción,
  personal**         ChatGPT**                                                       SOPs.
  --------------------------------------------------------------------------------------------------------

**E0**

**FUNDACIÓN**

**Setup legal, fiscal, bancario**

*Las herramientas de esta etapa son one-time setup. Lo que aquí
configures vivirá los próximos años de tu negocio.*

E0.1 · Setup legal: LLC, EIN, BOI

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**       **Página web**                                                                                               **Términos y    **Notas**
  necesario**                                                                                                                                   condiciones**   
  --------------- ---------------- ------------------------------------------------------------------------------------------------------------ --------------- ---------------
  **Solicitar EIN **IRS EIN        *irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online*   Free            Esencial día 1.
  del IRS         Application**                                                                                                                                 NUNCA pagues a
  gratis**                                                                                                                                                      un servicio por
                                                                                                                                                                esto.

  **Formar LLC    **Northwest      *northwestregisteredagent.com*                                                                               \\$39 + state    Esencial día
  online (todo en Registered                                                                                                                    fee; \\$125/año  2-7.
  uno)**          Agent**                                                                                                                       RA              

  **Filing TX     **TX SOSDirect** *sos.state.tx.us*                                                                                            \\$300 + small   Si formas en TX
  directo (ahorra                                                                                                                               filing fee      directamente.
  fee)**                                                                                                                                                        

  **Filing FL     **FL Sunbiz**    *dos.fl.gov/sunbiz*                                                                                          \\$125 + annual  Si formas en FL
  directo (ahorra                                                                                                                               report          directamente.
  fee)**                                                                                                                                                        

  **Reporte       **FinCEN BOI**   *fincen.gov/boi*                                                                                             Free            Esencial ---
  Beneficial                                                                                                                                    obligatorio     Hasta 30 días
  Ownership                                                                                                                                                     después de
  obligatorio**                                                                                                                                                 formar LLC.
                                                                                                                                                                Multas
                                                                                                                                                                \\$500/día.

  **Verificar     **Secretary of   *Ver Doc A E0.1*                                                                                             Variable        Antes de pagar
  nombre LLC +    State (cada                                                                                                                                   la formación.
  buscar          estado)**                                                                                                                                     
  registros**                                                                                                                                                   

  **Operating     **Northwest /    *incluido en setup paquetes*                                                                                 Variable        Esencial ---
  Agreement       RocketLawyer**                                                                                                                                define quién
  plantilla**                                                                                                                                                   decide y cómo
                                                                                                                                                                se reparten
                                                                                                                                                                utilidades.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

E0.2 · Bookkeeping y banca digital

  --------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**            **Términos y     **Notas**
  necesario**                                                 condiciones**    
  --------------- ----------------- ------------------------- ---------------- ---------------
  **Abrir cuenta  **Relay           *relayfi.com*             Free; 20         Esencial.
  digital de      (recomendado                                sub-cuentas      Permite Profit
  negocio**       REI)**                                                       First.

  **Bookkeeping   **Stessa**        *stessa.com*              Free / Pro       Inicia gratis.
  starter free**                                              \\$20/mes         

  **Bookkeeping   **QuickBooks      *quickbooks.intuit.com*   Simple Start     Si tu CPA te lo
  profesional**   Online**                                    \\$30/mes         pide.

  **Tarjeta de    **Chase Ink       *chase.com*               Free; 5% en      Para Home
  crédito de      Business Cash**                             Pro/internet     Depot/Lowe\'s
  negocio**                                                                    spend.

  **Connect       **Plaid           *plaid.com*               Free             Esencial para
  bank +          (integración)**                             (transparente)   auto-bank
  QBO/Xero**                                                                   feeds.
  --------------------------------------------------------------------------------------------

E0.3 · Seguros (cotización online)

  -----------------------------------------------------------------------------------------------
  **Actor        **Nombre**     **Página web**                  **Términos y    **Notas**
  necesario**                                                   condiciones**   
  -------------- -------------- ------------------------------- --------------- -----------------
  **Cotizar      **NREIG**      *nreig.com*                     Mensual por     Estándar de oro
  Builder\'s                                                    propiedad       flippers.
  Risk +                                                                        
  Vacant**                                                                      

  **Cotizar      **Arcana       *arcanainsuranceservices.com*   Variable        Sin
  seguro REI con Insurance                                                      foto/inspección
  descuento      Services**                                                     si eres National
  REIA**                                                                        REIA member.

  **Cotizar      **Steadily**   *steadily.com*                  Cotización      50 estados.
  landlord                                                      instantánea     
  digital**                                                                     

  **Cotizar GL   **Next         *nextinsurance.com*             \\$20-60/mes     Esencial antes de
  para LLC**     Insurance**                                                    primer contrato.

  **Comparar     **Insurify**   *insurify.com*                  Free            Cotización en 1
  múltiples                                                                     lugar.
  carriers**                                                                    
  -----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **FLUJO E0 SUGERIDO (SEMANA 1-2)**                              |
|                                                                 |
| Día 1: IRS EIN online → Día 2: Northwest LLC + Operating        |
| Agreement → Día 3: Relay business account → Día 4-7: BOI report |
| en FinCEN + cotización NREIG + buscar CPA en AICPA por estado   |
| de residencia. Total inversión \~\\$200-400 + state filing fee.  |
+-----------------------------------------------------------------+

**E1**

**EVALUAR**

**Generar leads y analizar deals**

*El stack de E1 es el corazón operativo del wholesaler/flipper. Aquí
inviertes tiempo y dinero en encontrar deals que pasen el filtro.*

E1.1 · Plataformas de datos y pull de propiedades

  --------------------------------------------------------------------------------------------
  **Actor        **Nombre**          **Página web**        **Términos y     **Notas**
  necesario**                                              condiciones**    
  -------------- ------------------- --------------------- ---------------- ------------------
  **Pull de      **PropStream        *propstream.com*      \\$99/mes;        Esencial. 160M+
  propiedades    Essentials**                              \\$81/mes anual   propiedades. Antes
  por filtros +                                                             de pagar otros
  comps**                                                                   tools.

  **Pull con     **BatchLeads**      *batchleads.io*       \\$99-399/mes     Cuando ya superas
  SMS + dialer +                                                            PropStream solo.
  skip                                                                      
  incluidos**                                                               

  **Driving for  **DealMachine**     *dealmachine.com*     \\$99-299/mes     Si tu estrategia
  dollars en                                                                es D4D
  app**                                                                     específicamente.

  **Pull con CRM **REIPro**          *myreipro.com*        \\$109/mes        Si quieres
  integrado**                                                               todo-en-uno.

  **Datos West   **PropertyRadar**   *propertyradar.com*   \\$79-299/mes     Para CA/AZ/OR/WA.
  Coast                                                                     
  profundos**                                                               

  **MLS-based    **Privy**           *getprivy.com*        \\$97/mes         Para deals
  deal alerts                                                               on-market.
  (necesitas                                                                
  licencia o                                                                
  agente)**                                                                 

  **Comps        **Zillow + Redfin** *zillow.com ·         Free             Backup; siempre
  gratuitos para                     redfin.com*                            compara con tu
  validar**                                                                 PropStream.

  **STR analysis **AirDNA**          *airdna.co*           \\$39-200/mes     Esencial si
  (para Airbnb                                                              pivoteas a STR.
  exit)**                                                                   

  **Análisis cap **Mashvisor**       *mashvisor.com*       \\$17.99-99/mes   Para BRRRR
  rate /                                                                    strategy.
  cashflow**                                                                
  --------------------------------------------------------------------------------------------

E1.2 · Skip tracing y contacto

  -------------------------------------------------------------------------------------------------
  **Actor         **Nombre**             **Página web**           **Términos y       **Notas**
  necesario**                                                     condiciones**      
  --------------- ---------------------- ------------------------ ------------------ --------------
  **Skip tracing  **BatchSkipTracing**   *batchskiptracing.com*   \\$0.07-0.20/lead   Integrado con
  en bulk                                                                            BatchLeads /
  económico**                                                                        PropStream.

  **Skip tracing  **Skip Genie**         *skipgenie.com*          \\$59/mes ilimitado Para volumen
  manual                                                                             consistente
  completo**                                                                         fijo.

  **Skip tracing  **REISkip**            *reiskip.com*            \\$0.10-0.15/hit    Más barato que
  económico REI**                                                                    TLO.

  **Skip tracing  **TLO (TransUnion)**   *tlo.com*                Por uso; requiere  Para casos
  premium**                                                       aprobación         difíciles.

  **Suprimir DNC  **National DNC         *donotcall.gov*          Free               OBLIGATORIO.
  obligatorio**   Registry**                                                         Multas
                                                                                     \\$40,000+ por
                                                                                     violación.

  **Verificar     **Tu plataforma SMS    *---*                    Incluido en costo  Crítico para
  TCPA            (Launch Control,                                                   evitar multas.
  compliance**    etc.)**                                                            
  -------------------------------------------------------------------------------------------------

E1.3 · Direct mail, dialer, SMS

  ---------------------------------------------------------------------------------------------------
  **Actor            **Nombre**         **Página web**             **Términos y        **Notas**
  necesario**                                                      condiciones**       
  ------------------ ------------------ -------------------------- ------------------- --------------
  **Direct mail      **Ballpoint        *ballpointmarketing.com*   \\$0.65-1.20/carta   El más usado
  handwritten yellow Marketing**                                                       para yellow
  letters**                                                                            letters.

  **Direct mail      **REIPrintMail**   *reiprintmail.com*         Volumen variable    Integrado con
  postcards en                                                                         PropStream.
  bulk**                                                                               

  **Cold calling     **Mojo Dialer**    *mojosells.com*            \\$99-149/mes        Estándar para
  triple-line                                                                          wholesalers.
  dialer**                                                                             

  **Cold calling     **BatchDialer**    *batchdialer.com*          Ahora dentro de     Si usas
  power dialer                                                     PropStream          BatchLeads.
  integrado**                                                                          

  **SMS              **Launch Control** *launchcontrol.us*         \\$147+/mes          Para SMS legal
  TCPA-compliant**                                                                     y escalable.

  **SMS + voice      **Smarter          *smartercontact.com*       \\$197+/mes          Muy usado en
  broadcast**        Contact**                                                         wholesaling.

  **Ringless         **REI Rail**       *reirail.com*              \\$99+/mes           Drops sin que
  voicemail drops**                                                                    suene el
                                                                                       teléfono.
  ---------------------------------------------------------------------------------------------------

E1.4 · Análisis y underwriting

  -----------------------------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**                                **Términos y     **Notas**
  necesario**                                                                     condiciones**    
  --------------- ----------------- --------------------------------------------- ---------------- ----------------
  **Calculadora   **BiggerPockets   *biggerpockets.com/fix-and-flip-calculator*   Pro \\$39/mes     Estándar
  Fix & Flip**    House Flipping                                                                   inicial. Buena
                  Calculator**                                                                     para
                                                                                                   principiantes.

  **Calculadora   **BiggerPockets   *biggerpockets.com/buy-and-hold-calculator*   Pro \\$39/mes     Para Fix & Hold.
  rental BRRRR**  BRRRR                                                                            
                  Calculator**                                                                     

  **Deal analyzer **Flipper Force   *flipperforce.com*                            Incluido en      Más detallado,
  profesional**   Deal Analyzer**                                                 suscripción      scope of work
                                                                                  \\$79/mes         integrado.

  **Spreadsheet   **Airtable +      *airtable.com*                                Free hasta 1,000 Para flippers
  propio          plantilla deal                                                  records          serios que
  Airtable**      evaluator**                                                                      quieren
                                                                                                   customizar.

  **ARV de        **MLS + Zillow +  *---*                                         Free             Validación
  comparables     Redfin**                                                                         cruzada de
  manuales**                                                                                       comps.

  **Análisis rent **Mashvisor**     *mashvisor.com*                               \\$17.99-99/mes   Para evaluar
  vs sell**                                                                                        BRRRR vs flip.
  -----------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **STACK MÍNIMO E1 PARA EMPEZAR**                                |
|                                                                 |
| Mes 1: PropStream (\\$99/mes) + BiggerPockets Pro (\\$39/mes      |
| calculadoras) + Google Drive + Airtable free. Total:            |
| \~\\$140/mes. NO compres más tools hasta que cierres 1 deal con  |
| este stack.                                                     |
+-----------------------------------------------------------------+

**E2**

**ESTRUCTURAR**

**Financiamiento, equipo, plan de obra**

*Aquí pides dinero, contratas GC, verificas licencias y compras la
propiedad. Los portales de verificación son tu protección legal.*

E2.1 · Cotización de financiamiento

  ------------------------------------------------------------------------------------------------
  **Actor necesario**  **Nombre**          **Página web**        **Términos y    **Notas**
                                                                 condiciones**   
  -------------------- ------------------- --------------------- --------------- -----------------
  **Cotización online  **Kiavi**           *kiavi.com*           Free quote en 5 Esencial ---
  HML simple**                                                   min             primera
                                                                                 cotización
                                                                                 siempre Kiavi.

  **Cotización HML     **Easy Street       *easystreetcap.com*   Free quote      Para FICO 600+.
  rápida**             Capital**                                                 

  **Cotización HML por **RCN Capital**     *rcncapital.com*      Free quote      Para
  experiencia**                                                                  experimentados.

  **Comparador hard    **HardMoneyHome**   *hardmoneyhome.com*   Free directorio Compara 50+ HMLs
  money múltiple**                                                               por estado.

  **Cotización DSCR    **Visio Lending**   *visiolending.com*    Free quote      Para refi Fix &
  rápida**                                                                       Hold.

  **Cotización Lima    **Lima One          *limaone.com*         Free quote      Para portfolio.
  One**                Capital**                                                 

  **Directorio HMLs    **Scotsman Guide**  *scotsmanguide.com*   Free            Lista completa.
  verificados                                                                    
  nacional**                                                                     

  **Pre-aprobación +   **Cualquiera de los *---*                 Variable        Esencial ANTES de
  term sheet**         anteriores**                                              hacer ofertas.
  ------------------------------------------------------------------------------------------------

E2.2 · Verificación de contratistas (CRÍTICO)

  ----------------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**    **Página web**                                     **Términos y    **Notas**
  necesario**                                                                     condiciones**   
  -------------- ------------- -------------------------------------------------- --------------- ----------------
  **Verificar    **FL DBPR     *myfloridalicense.com/wl11.asp?mode=2*             Free            OBLIGATORIO
  licencia FL**  License                                                                          antes de firmar
                 Search**                                                                         contrato GC.

  **Verificar    **AZ ROC      *roc.az.gov/search*                                Free            45,000+
  licencia AZ**  Contractor                                                                       contratistas
                 Search**                                                                         verificables.

  **Verificar    **CSLB        *cslb.ca.gov*                                      Free            Obra \> \\$500
  licencia CA**  Contractor                                                                       requiere
                 License                                                                          licencia.
                 Check**                                                                          

  **Verificar    **TX TDLR     *tdlr.texas.gov/verify.htm*                        Free            Solo HVAC,
  trades TX**    License                                                                          electricistas,
                 Search**                                                                         mold, solar.

  **Verificar    **TX TSBPE**  *tsbpe.texas.gov*                                  Free            Texas State
  plomeros TX**                                                                                   Board of
                                                                                                  Plumbing
                                                                                                  Examiners.

  **Verificar    **NV NSCB**   *nscb.nv.gov*                                      Free            ---
  licencia NV**                                                                                   

  **Verificar    **NC NCLBGC** *nclbgc.org*                                       Free            ---
  licencia NC**                                                                                   

  **Verificar    **GA State    *sos.ga.gov*                                       Free            ---
  licencia GA**  Licensing                                                                        
                 Board**                                                                          

  **Verificar    **PA HICPA**  *hicsearch.attorneygeneral.gov*                    Free            Obligatorio
  licencia PA**                                                                                   obras \>
                                                                                                  \\$5,000/año.

  **Verificar    **NJ HICB**   *njconsumeraffairs.gov/hic*                        Free            Verifica
  licencia NJ**                                                                                   registro + bond.

  **Verificar    **MA HIC +    *mass.gov/info-details/hic-contractor-resources*   Free            Ambos pueden
  licencia MA**  CSL**                                                                            requerirse.

  **Verificar    **MD MHIC**   *labor.maryland.gov/license/mhic*                  Free            Guaranty Fund
  licencia MD**                                                                                   hasta \\$20K.

  **Verificar    **NYC DCWP    *nyc.gov/dcwp*                                     Free            ---
  licencia NYC** HIC**                                                                            

  **Verificar    **UT DOPL**   *dopl.utah.gov*                                    Free            ---
  licencia UT**                                                                                   

  **BBB          **Better      *bbb.org*                                          Free            Verificar
  Complaints     Business                                                                         disputes
  check**        Bureau**                                                                         registradas.
  ----------------------------------------------------------------------------------------------------------------

E2.3 · Portales de permisos por ciudad

  ----------------------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**      **Página web**                                   **Términos y    **Notas**
  necesario**                                                                       condiciones**   
  ---------------- --------------- ------------------------------------------------ --------------- --------------------
  **Permits        **Austin AMANDA *austintexas.gov/abc-applications*               Variable por    Online application
  Austin**         (AB+C)**                                                         permit          system.

  **Permits        **Houston       *houstonpermittingcenter.org*                    Variable        ---
  Houston**        iPermits                                                                         
                   Center**                                                                         

  **Permits San    **SA DSD**      *sanantonio.gov/DSD*                             Variable        ---
  Antonio**                                                                                         

  **Permits        **SHAPE PHX**   *shapephx.phoenix.gov/s/*                        Reemplaza PDD   Release 1
  Phoenix**                                                                         Online          residencial activo,
                                                                                                    Release 3 comercial
                                                                                                    abril 2026.

  **Permits        **Miami-Dade    *miamidade.gov*                                  Variable        Plomería/eléctrico
  Miami-Dade**     ePermits**                                                                       online.

  **Permits        **Tampa         *aca-prod.accela.com/tampa*                      Variable        ---
  Tampa**          Accela**                                                                         

  **Permits        **Orlando       *orlando.gov/Building-Development*               Variable        ---
  Orlando**        ProjectDox**                                                                     

  **Permits        **JaxEPICS**    *coj.net/jaxepics*                               Variable        ---
  Jacksonville**                                                                                    

  **Permits Los    **LADBS**       *ladbs.org*                                      Variable        ---
  Angeles**                                                                                         

  **Permits NYC    **NYC DOB NOW** *nyc.gov/buildings*                              Variable        LL-97 emissions para
  (LL-97)**                                                                                         \>25K sqft.

  **Permits        **Office of     *atlantaga.gov*                                  Variable        ---
  Atlanta**        Buildings**                                                                      

  **Permits        **Mecklenburg   *mecklenburgcountync.gov*                        Variable        ---
  Charlotte**      County LUESA**                                                                   

  **Permits        **Chicago DOB** *chicago.gov/buildings*                          Variable        ---
  Chicago**                                                                                         

  **Permits        **L&I eCLIPSE** *phila.gov/li*                                   Variable        ---
  Philadelphia**                                                                                    

  **Permits        **Boston ISD**  *boston.gov/departments/inspectional-services*   Variable        ---
  Boston**                                                                                          
  ----------------------------------------------------------------------------------------------------------------------

E2.4 · Contratos y due diligence

  -----------------------------------------------------------------------------------------------
  **Actor        **Nombre**         **Página web**          **Términos y    **Notas**
  necesario**                                               condiciones**   
  -------------- ------------------ ----------------------- --------------- ---------------------
  **Contratos TX **TREC Forms**     *trec.texas.gov*        Free            Texas RE Commission
  gratis**                                                                  --- formularios
                                                                            oficiales.

  **Contratos FL **Florida          *floridarealtors.org*   Members; via    Estándar FL para
  FAR/BAR**      Realtors**                                 agente          compras.

  **Contratos CA **California       *car.org*               Members; via    Estándar CA.
  CAR**          Association of                             agente          
                 Realtors**                                                 

  **Contratos NY **NYSAR Forms**    *nysar.com*             Members; via    NY requiere abogado
  NYSAR**                                                   abogado         en cierre.

  **Plantillas   **EZ Landlord      *ezlandlordforms.com*   \\$80/año        Plantillas
  de contratos   Forms**                                    Premium         estado-específicas.
  investor**                                                                

  **Plantillas   **RocketLawyer**   *rocketlawyer.com*      \\$39.99/mes     Útil pero NO
  legales                                                   membership      sustituye abogado RE
  generales**                                                               local.

  **Search title **Vía title        *---*                   Variable        Solicita preliminary
  online**       company del Doc                                            title commitment.
                 A**                                                        

  **Property     **Reonomy / county *reonomy.com*           \\$50+/mes       Verificar permits
  history +      portal**                                   Reonomy         previos.
  permits**                                                                 
  -----------------------------------------------------------------------------------------------

**E3**

**EJECUTAR**

**Gerencia activa de obra**

*Aquí el stack se vuelve más físico: cuentas Pro de Home Depot, gestión
de proyecto, cámaras de seguridad, drones.*

E3.1 · Compra de materiales (Pro accounts)

  ------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**           **Página web**                      **Términos y    **Notas**
  necesario**                                                             condiciones**   
  -------------- -------------------- ----------------------------------- --------------- --------------
  **Home Depot   **Home Depot**       *homedepot.com/c/Pro_Xtra*          Free; 2% rebate Esencial
  Pro Xtra                                                                \> \\$5K c/6     día 1.
  (esencial)**                                                            meses           National REIA
                                                                                          rebate extra.

  **Lowe\'s For  **Lowe\'s**          *lowesforpros.com*                  Free; LARS      Bueno para
  Pros**                                                                  rewards         appliances.

  **Pisos al por **Floor & Decor Pro  *flooranddecor.com/pro*             Free            LVP, tile,
  mayor**        Premier**                                                                hardwood.

  **Plomería +   **Ferguson**         *ferguson.com*                      Pro account     Estándar
  HVAC                                                                                    profesional.
  mayorista**                                                                             

  **Cabinets     **Cabinets To Go**   *cabinetstogo.com*                  Variable        \~\\$5-8K
  RTA**                                                                                   cocina.

  **Cabinets RTA **RTA Cabinet        *rtacabinetstore.com*               Económico       Para flips
  económico**    Store**                                                                  bajo
                                                                                          presupuesto.

  **Pinturas     **Sherwin-Williams   *sherwin-williams.com/contractor*   Free; 20-40%    Estándar 20%
  Pro**          PaintPerks**                                             off             off.

  **Appliances   **ABT**              *abt.com*                           Bulk discounts  Para 3+
  bulk**                                                                                  unidades.
  ------------------------------------------------------------------------------------------------------

E3.2 · Project Management Software

  ----------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**         **Página web**       **Términos y       **Notas**
                                                              condiciones**      
  ------------------- ------------------ -------------------- ------------------ ---------------
  **Job costing +     **Flipper Force**  *flipperforce.com*   \\$79/mes           Esencial cuando
  scope of work                                                                  tienes 2+
  flip**                                                                         flips.

  **PM construcción   **Buildertrend**   *buildertrend.com*   \\$399/mes          Para GC con 3+
  profesional**                                               (Essential)        proyectos.

  **PM construcción   **BuildBook**      *buildbook.co*       \\$79/mes           Más simple que
  client-friendly**                                                              Buildertrend.

  **PM + accounting** **Knowify**        *knowify.com*        \\$186/mes          Para GCs
                                                                                 serios.

  **PM TX-based**     **JobTread**       *jobtread.com*       \\$159-199/mes      TX-based,
                                                                                 nacional.

  **Workspace custom  **Taskade**        *taskade.com*        Free / \\$8/mes Pro SOPs y
  REI**                                                                          plantillas REI.

  **Project tracking  **Trello / Asana** *trello.com /        Free               Para 1-2 flips
  simple**                               asana.com*                              simultáneos.

  **App medición      **MagicPlan**      *magicplan.app*      \\$9.99-29.99/mes   Floor plans con
  floor plans**                                               Pro                la cámara.
  ----------------------------------------------------------------------------------------------

E3.3 · Inspecciones, seguridad, logística

  ---------------------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**                            **Términos y         **Notas**
  necesario**                                                                 condiciones**        
  ---------------- ---------------- ----------------------------------------- -------------------- --------------------
  **Directorio     **InterNACHI**   *nachi.org/find/*                         Free                 Estándar. CMI para
  inspectores                                                                                      premium.
  certificados**                                                                                   

  **Directorio     **ASHI**         *homeinspector.org*                       Free                 Otra opción.
  inspectores                                                                                      
  ASHI**                                                                                           

  **Seguridad      **Deep           *deepsentinel.com*                        \\$50+/mes            Para flips vacantes.
  cámaras AI +     Sentinel**                                                                      
  guard**                                                                                          

  **Seguridad      **SimpliSafe**   *simplisafe.com*                          \\$200-500 + \\$30/mes Estándar para
  cámaras simple**                                                                                 flippers.

  **Drone progress **DroneBase**    *dronebase.com*                           \\$99-299/proyecto    FAA Part 107 piloto
  photo**                                                                                          certificado.

  **Dumpster       **Bin There Dump *bintheredumpthat.com*                    \\$400-800/dumpster   Driveway-friendly.
  rental           That**                                                                          
  nacional**                                                                                       

  **Dumpster       **Hometown       *hometowndumpsterrental.com*              Free comparador      Cotiza 2-3 antes.
  cotización       Dumpster                                                                        
  local**          Rental**                                                                        

  **Tool rental    **United         *unitedrentals.com*                       Pro account          Para equipos
  nacional**       Rentals**                                                                       grandes.

  **Tool rental    **Home Depot     *homedepot.com/c/tool_and_truck_rental*   Por hora/día         Para herramientas
  local**          Tool Rental**                                                                   pequeñas.
  ---------------------------------------------------------------------------------------------------------------------

**E4**

**ESTRATEGIA DE SALIDA**

**Vender o rentar**

*Aquí transformas el activo en cash. El stack se enfoca en marketing,
fotos, listing y screening de inquilinos.*

E4.1 · Marketing del listing

  --------------------------------------------------------------------------------------------------
  **Actor         **Nombre**             **Página web**           **Términos y       **Notas**
  necesario**                                                     condiciones**      
  --------------- ---------------------- ------------------------ ------------------ ---------------
  **Fotografía RE **HomeJab**            *homejab.com*            \\$149-219/shoot;   Calidad
  on-demand**                                                     24h turnaround     consistente
                                                                                     nacional.

  **Marketplace   **Aryeo**              *aryeo.com*              \\$150-400/shoot    Network
  fotógrafos                                                                         pre-validado.
  verificados**                                                                      

  **Virtual       **BoxBrownie**         *boxbrownie.com*         \\$32/foto          Estándar
  staging                                                                            industria.
  premium**                                                                          

  **Virtual       **VirtualStagingAI**   *virtualstagingai.app*   \\$15-29/foto       Más rápido,
  staging AI                                                                         calidad media.
  rápido**                                                                           

  **Tour 3D       **Matterport 3D**      *matterport.com*         \\$99-299/mes vía   Para flips
  inmersivo**                                                     fotógrafo          premium.

  **Floor plan    **CubiCasa**           *cubicasa.com*           Vía fotógrafo      Plano técnico
  profesional**                                                                      listing.

  **Edición       **BoxBrownie edición** *boxbrownie.com*         Variable           Premium
  twilight + sky                                                                     retouch.
  replace**                                                                          
  --------------------------------------------------------------------------------------------------

E4.2 · MLS y plataformas de listing

  ---------------------------------------------------------------------------------------------------
  **Actor necesario**   **Nombre**        **Página web**               **Términos y    **Notas**
                                                                       condiciones**   
  --------------------- ----------------- ---------------------------- --------------- --------------
  **MLS via agente      **BP Agent        *biggerpockets.com/agents*   Free            Estándar de
  investor-friendly**   Finder**                                                       listing.

  **MLS flat fee DIY**  **Houzeo**        *houzeo.com*                 \\$349-499 flat  Sin agente
                                                                       fee             seller-side.

  **MLS flat fee        **Homecoin**      *homecoin.com*               \\$95 flat       Más barato.
  económico**                                                                          

  **Sindicación         **Zillow**        *zillow.com*                 Free (vía MLS)  Tráfico #1
  Zillow**                                                                             USA.

  **Sindicación         **Realtor.com**   *realtor.com*                Free (vía MLS)  NAR oficial.
  Realtor.com**                                                                        

  **Sindicación         **Redfin**        *redfin.com*                 Free            Buena UX.
  Redfin**                                                                             

  **FSBO + Facebook     **FB              *facebook.com/marketplace*   Free            Cash buyers
  Marketplace**         Marketplace +                                                  locales.
                        Groups**                                                       

  **iBuyer backup       **Opendoor**      *opendoor.com*               5-7% + repairs  Mercados
  (Opendoor)**                                                                         limitados.

  **iBuyer              **Offerpad**      *offerpad.com*               Variable        ---
  alternativa**                                                                        
  ---------------------------------------------------------------------------------------------------

E4.3 · Property Management software

  ------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**      **Términos y        **Notas**
  necesario**                                           condiciones**       
  --------------- ----------------- ------------------- ------------------- ----------------
  **PM 1-10       **TurboTenant**   *turbotenant.com*   Free básico;        Esencial para
  unidades free**                                       \\$99/año premium    Fix & Hold.

  **PM 5-50       **RentRedi**      *rentredi.com*      \\$9-29.95/mes       Payments +
  unidades**                                                                screening +
                                                                            maintenance.

  **PM 50-500     **Buildium**      *buildium.com*      \\$58-385/mes        Para PMs
  unidades**                                                                profesionales.

  **PM 50+        **AppFolio**      *appfolio.com*      \\$1.40+/unit/mes;   Estándar PMs
  unidades                                              mín. 50             grandes.
  profesional**                                                             

  **PM landlord   **DoorLoop**      *doorloop.com*      \\$69-149/mes        Crecimiento
  moderno DIY**                                                             rápido.

  **PM gratis     **TenantCloud**   *tenantcloud.com*   Free / \\$15/mes     ---
  hasta 75                                              Premium             
  unidades**                                                                
  ------------------------------------------------------------------------------------------

E4.4 · Tenant screening (background, credit, eviction)

  ---------------------------------------------------------------------------------------------------------
  **Actor           **Nombre**         **Página web**                    **Términos y        **Notas**
  necesario**                                                            condiciones**       
  ----------------- ------------------ --------------------------------- ------------------- --------------
  **Screening       **TransUnion       *mysmartmove.com*                 \\$25-40/aplicante   Credit +
  TransUnion        SmartMove**                                                              criminal +
  premium**                                                                                  eviction.

  **Screening       **RentPrep**       *rentprep.com*                    \\$19-39/aplicante   Más completo
  manual completo**                                                                          manualmente.

  **Screening con   **Rent Perfect**   *rentperfect.com*                 \\$35/aplicante      Descuento
  descuento REIA**                                                                           National REIA
                                                                                             member.

  **Application +   **RentSpree**      *rentspree.com*                   Variable            Compatible
  screening MLS**                                                                            MLS.

  **Listing +       **Apartments.com   *apartments.com/manage-rentals*   Free                ---
  screening combo** Rental Manager**                                                         
  ---------------------------------------------------------------------------------------------------------

E4.5 · 1031 Exchange (solo Fix & Hold)

  --------------------------------------------------------------------------------------------------
  **Actor        **Nombre**             **Página web**        **Términos y        **Notas**
  necesario**                                                 condiciones**       
  -------------- ---------------------- --------------------- ------------------- ------------------
  **QI #1        **IPX1031**            *ipx1031.com*         \\$1,000+/exchange   Fidelity
  nacional**                                                                      subsidiary.

  **QI Stewart   **Asset Preservation   *apiexchange.com*     \\$1,200+            Stewart
  subsidiary**   Inc (API)**                                                      subsidiary.

  **QI con       **Accruit**            *accruit.com*         Variable            Exchange Manager
  software                                                                        Pro patentado.
  propio**                                                                        

  **QI First     **First American       *firstexchange.com*   \\$1,000+            ---
  American       Exchange**                                                       
  family**                                                                        

  **QI           **Exeter 1031**        *exeter1031.com*      Variable            Qualified Trust
  boutique**                                                                      state-regulated.

  **Educación    **1031Exchange.com**   *1031exchange.com*    Free                Aprender antes de
  1031**                                                                          contratar.
  --------------------------------------------------------------------------------------------------

**E5**

**ESCALAR**

**Sistematizar y crecer**

*El stack de E5 son las herramientas que te permiten dejar de ser «el
que hace todo» y construir un negocio que opera sin ti.*

E5.1 · Bookkeeping multi-LLC y portfolio PM

  -----------------------------------------------------------------------------------------
  **Actor         **Nombre**      **Página web**            **Términos y      **Notas**
  necesario**                                               condiciones**     
  --------------- --------------- ------------------------- ----------------- -------------
  **Bookkeeping   **QuickBooks    *quickbooks.intuit.com*   \\$235/mes         Class
  multi-LLC**     Online                                                      tracking por
                  Advanced**                                                  LLC.

  **Bookkeeping   **Xero**        *xero.com*                \\$80/mes          Más simple
  multi-entidad                                                               que QBO.
  simple**                                                                    

  **Bookkeeping   **REI           *reibookkeepers.com*      Mensual           Equipo
  outsourced      Bookkeepers**                                               dedicado REI.
  REI**                                                                       

  **Bookkeeping   **Pilot**       *pilot.com*               \\$499+/mes        Para
  outsourced                                                                  portafolios
  premium**                                                                   grandes.

  **Portfolio PM  **AppFolio**    *appfolio.com*            \\$1.40/unit/mes   Estándar.
  50+ unidades**                                            mín. 50           

  **Portfolio PM  **Buildium**    *buildium.com*            \\$58-385/mes      Más
  10-500**                                                                    accesible.

  **Portfolio PM  **DoorLoop**    *doorloop.com*            \\$69-149/mes      Crecimiento
  landlord                                                                    rápido.
  moderno**                                                                   
  -----------------------------------------------------------------------------------------

E5.2 · CRMs para escalar

  --------------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**               **Términos y    **Notas**
  necesario**                                                    condiciones**   
  ---------------- ---------------- ---------------------------- --------------- -------------
  **CRM            **REsimpli**     *resimpli.com*               \\$99-399/mes    El más usado
  wholesaling                                                                    wholesalers
  líder**                                                                        serios.

  **CRM +          **Podio +        *investorfuse.com*           \\$147-447/mes   Stack
  automation       InvestorFuse**                                                popular.
  wholesale**                                                                    

  **CRM REI        **REIPro**       *myreipro.com*               \\$109/mes       Lead gen +
  all-in-one**                                                                   CRM.

  **CRM RE         **BoldTrail      *boldtrail.com*              Variable        Si tienes
  agentes**        (antes kvCORE)**                                              licencia RE.

  **CRM            **Pipedrive**    *pipedrive.com*              \\$14-99/mes     Custom para
  sales-focused                                                                  REI.
  customizable**                                                                 

  **CRM free para  **HubSpot Free   *hubspot.com/products/crm*   Free tier       Para empezar.
  empezar**        CRM**                                                         
  --------------------------------------------------------------------------------------------

E5.3 · Capital raising y syndication

  -----------------------------------------------------------------------------------------
  **Actor          **Nombre**       **Página web**         **Términos y    **Notas**
  necesario**                                              condiciones**   
  ---------------- ---------------- ---------------------- --------------- ----------------
  **Investor       **Juniper        *junipersquare.com*    Custom          Reporting
  portal           Square**                                enterprise      trimestral a
  multi-LP**                                                               LPs.

  **Investor       **InvestNext**   *investnext.com*       \\$300+/mes      Cap table
  portal                                                                   software.
  mid-market**                                                             

  **Investor       **Cashflow       *cashflowportal.com*   Variable        ---
  portal           Portal**                                                
  boutique**                                                               

  **Pitch deck     **Canva Pro**    *canva.com*            \\$14.99/mes     Plantillas
  design**                                                                 profesionales.

  **Reg D legal    **Regulation D   *regdresources.com*    \\$5K+ legal     Para raise \>
  SaaS**           Resources**                             fees            \\$1M accredited.

  **Crowdfunding   **Fundrise**     *fundrise.com*         Mín. \\$10       Para invertir
  RE retail**                                                              como LP.
  -----------------------------------------------------------------------------------------

E5.4 · Business Credit

  -----------------------------------------------------------------------------------------
  **Actor         **Nombre**     **Página web**               **Términos y    **Notas**
  necesario**                                                 condiciones**   
  --------------- -------------- ---------------------------- --------------- -------------
  **Monitoreo     **Nav Pro**    *nav.com*                    Free tier;      Monitorea los
  D&B + Experian                                              \\$30/mes Pro    3 bureaus.
  Bus**                                                                       

  **DUNS Number   **Dun &        *dnb.com/duns-number.html*   DUNS free;      Obligatorio
  obligatorio**   Bradstreet**                                monitoring      para business
                                                              extra           credit.

  **Tarjeta       **Brex**       *brex.com*                   Free para LLCs  Sin garantía
  corporate sin                                               con revenue     personal.
  PG**                                                                        

  **Tarjeta +     **Ramp**       *ramp.com*                   Free; 1.5%      Competidor
  spend                                                       cashback        Brex.
  management**                                                                

  **LOC hasta     **Bluevine     *bluevine.com*               FICO 625+       APR variable
  \\$250K**        LOC**                                                       alto.

  **SBA +         **Live Oak     *liveoakbank.com*            SBA hasta \\$5M  ---
  comerciales**   Bank**                                                      
  -----------------------------------------------------------------------------------------

E5.5 · Virtual Assistants y outsourcing

  -------------------------------------------------------------------------------------------------
  **Actor necesario** **Nombre**          **Página web**     **Términos y          **Notas**
                                                             condiciones**         
  ------------------- ------------------- ------------------ --------------------- ----------------
  **VA REI            **REVA Global**     *revaglobal.com*   \\$1,800/mes FT        Especializa REI.
  pre-entrenados**                                                                 

  **VA RE             **MyOutDesk**       *myoutdesk.com*    \\$1,988/mes FT        Establecido.
  entrenados**                                                                     

  **Hire directo      **OnlineJobs.ph**   *onlinejobs.ph*    \\$69/mes employer +   Más barato pero
  Filipinas**                                                \\$3-10/hr             entrenas tú.

  **VA cold call      **InvestorPO**      *investorpo.com*   Variable              Pre-entrenados
  REI**                                                                            cold calling.

  **Pagos VAs         **Wise**            *wise.com*         Free + fee transfer   Para VAs en
  internacionales**                                                                LATAM/Asia.

  **Compliance        **Deel**            *deel.com*         \\$49/mes/contractor   Estándar.
  contractors                                                                      
  internacional**                                                                  

  **Payroll empleados **Gusto**           *gusto.com*        \\$40 + \\$6/empleado   Estándar US.
  US**                                                                             
  -------------------------------------------------------------------------------------------------

E5.6 · Tax strategy + cost segregation

  -------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**        **Página web**                  **Términos y         **Notas**
  necesario**                                                        condiciones**        
  ---------------- ----------------- ------------------------------- -------------------- ---------------
  **Cost           **KBKG**          *kbkg.com*                      \\$3K-15K/propiedad   Acelera
  segregation                                                                             depreciación.
  líder**                                                                                 Rentable \>
                                                                                          \\$250K.

  **Cost           **Engineered Tax  *engineeredtaxservices.com*     \\$3K-15K             Otra opción.
  segregation      Services**                                                             
  alternativa**                                                                           

  **Cost           **CSSI**          *costsegregationservices.com*   \\$3K-10K             ---
  segregation                                                                             
  alternativa**                                                                           

  **Tax strategy   **WealthAbility   *wealthability.com*             \\$200+ consulta;     Tom
  avanzada**       (Wheelwright)**                                   mensual              Wheelwright.

  **Tax + legal +  **Anderson        *andersonadvisors.com*          \\$2,500+ planning    LLC + tax.
  LLC combo**      Business                                                               
                   Advisors**                                                             

  **CPA RE         **The Real Estate *therealestatecpa.com*          \\$300-1,500/mes      Brandon Hall.
  escala**         CPA (Hall CPA)**                                                       

  **Educación      **IRS Pub 946**   *irs.gov/publications/p946*     Free                 Lectura
  bonus                                                                                   obligatoria.
  depreciation**                                                                          
  -------------------------------------------------------------------------------------------------------

Resumen ejecutivo · Stack mínimo por etapa

Si solo pudieras invertir en lo absolutamente esencial:

  -------------------------------------------------------------------------
  **Etapa**   **Stack mínimo                 **Cuando escalas
              (\~\\$200-400/mes)**            (\~\\$1,000+/mes)**
  ----------- ------------------------------ ------------------------------
  **E0**      Northwest LLC + Relay banca +  QBO Advanced + Anderson
              Stessa free + NREIG quotes     Advisors planning + cost seg
                                             KBKG

  **E1**      PropStream \\$99 +              \+ BatchLeads \\$199 + Launch
              BiggerPockets Pro \\$39 +       Control \\$147 + REsimpli \\$99
              Airtable free + WhatsApp       

  **E2**      Kiavi quote + DBPR/CSLB        \+ Buildertrend \\$399 +
              verificación + TREC/FAR        Multiple HML quotes + permit
              forms + DocuSign \\$15          expediter

  **E3**      Home Depot Pro + Lowe\'s Pro + \+ Flipper Force \\$79 + Deep
              SimpliSafe + InterNACHI        Sentinel monitoring +
              inspector                      DroneBase

  **E4**      Houzeo \\$349 + HomeJab \\$149 + \+ MLS via agente + Matterport
              TurboTenant free + BoxBrownie  3D + AppFolio + IPX1031
              \\$32/foto                      

  **E5**      Stessa free + OnlineJobs.ph    \+ QBO Advanced + REVA
              \\$69 + Nav free monitoring     Global + WealthAbility +
                                             Juniper Square
  -------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **FILOSOFÍA DEL STACK**                                         |
|                                                                 |
| No compres herramientas antes de tener el problema que          |
| resuelven. Cada herramienta de este documento existe para       |
| resolver un dolor específico. Si no sientes el dolor, no        |
| necesitas la herramienta. Empieza con lo esencial y agrega solo |
| cuando el flujo lo pida.                                        |
+-----------------------------------------------------------------+

**FLIPPING RENTALS · FLIPMENTORÍA**

*Documento B · Stack de Procesos por Etapa · Mayo 2026*
$FMW1P0F4$,
  110,
  ARRAY['procesos', 'software', 'herramientas', 'stack', 'portales']::text[],
  '{}'::jsonb
);

-- ─── TODOS · extras · ⚙️ Documento C · Extras por Etapa — Plantillas, KPIs, Scripts, Quality Gates, Casos ───
insert into public.fm_documents (etapa, categoria, codigo, titulo, subtitulo, contenido_md, posicion, tags, metadata) values (
  'TODOS',
  'extras',
  null,
  $FMCEP44S$⚙️ Documento C · Extras por Etapa — Plantillas, KPIs, Scripts, Quality Gates, Casos$FMCEP44S$,
  null,
  $FMCEP44S$**FLIPPING RENTALS · FLIPMENTORÍA**

**EXTRAS POR ETAPA**

***Plantillas, KPIs, scripts, casos, recursos***

*Documento de referencia para estudiantes*

Fix & Flip · Estados Unidos · 2026

Documento C · Para qué sirve

Este es el **Documento C** --- el complemento estratégico. Mientras el
Doc A da **contactos** y el Doc B da **herramientas**, el Doc C te
entrega lo que falta para ejecutar profesionalmente:

- **Plantillas:** estructuras listas para copiar --- contratos, scripts,
  scope of work, checklists.

- **KPIs:** métricas que indican si estás bien o mal en cada etapa.

- **Scripts:** frases probadas para llamadas, SMS, mensajes y
  negociación.

- **Casos de estudio:** aprendizajes de operaciones reales de Flipping
  Rentals.

- **Quality gates:** validaciones que NO puedes saltar antes de pasar a
  la siguiente etapa.

- **Recursos externos:** libros, podcasts, cursos para profundizar.

+-----------------------------------------------------------------+
| **CÓMO USAR ESTE DOCUMENTO**                                    |
|                                                                 |
| No es para leer de corrido. Es para consultarlo cuando estés    |
| ejecutando una sub-tarea específica. Por ejemplo: vas a hacer   |
| una llamada en frío → ve a E1.scripts. Vas a entregar la obra → |
| E3.quality gates. Vas a definir tu remuneración → E5.KPIs.      |
+-----------------------------------------------------------------+

**E0**

**FUNDACIÓN**

**Setup que protege tu patrimonio**

*En esta etapa los extras son listas de verificación. No vuelvas atrás
--- un error aquí cuesta años de impuestos mal pagados.*

E0 · Plantillas y checklists

  ------------------------------------------------------------------------------------------------------
  **Actor        **Nombre**         **Página web**                         **Términos y    **Notas**
  necesario**                                                              condiciones**   
  -------------- ------------------ -------------------------------------- --------------- -------------
  **Checklist    **Lista de 22      *Ver Doc B E0.1 + esta plantilla*      Free            Sigue al pie
  setup LLC 30   ítems desde EIN                                                           de la letra.
  días**         hasta primera                                                             Cero atajos.
                 factura**                                                                 

  **Operating    **Definir          *Incluido en Northwest setup*          Variable        Esencial si
  Agreement      distribución,                                                             tienes socio.
  plantilla**    decisiones, exits,                                                        
                 transferencias**                                                          

  **Plantilla    **Form SS-4 IRS**  *irs.gov/forms-pubs/about-form-ss-4*   Free            Online es más
  EIN                                                                                      rápido. Tarda
  solicitud**                                                                              1 hora total.

  **BOI report   **Reporte          *fincen.gov/boi*                       Free            Vence 30 días
  plantilla**    beneficial                                                obligatorio     después de
                 ownership FinCEN**                                                        formar LLC.

  **Chart of     **Estructura       *Solicitar a tu CPA REI*               Variable        Esencial para
  Accounts para  contable propiedad                                                        job costing.
  Fix & Flip**   por propiedad**                                                           

  **Checklist    **Lista para       *Lista propia*                         Free            Maximiza la
  documentos     primera reunión                                                           primera hora
  abogado**      con abogado RE**                                                          paga.

  **Plantilla    **Documentos para  *Lista propia*                         Free            Ahorra
  pre-flight     abrir                                                                     rebotes.
  check banco**  Relay/Mercury**                                                           
  ------------------------------------------------------------------------------------------------------

E0 · KPIs (Indicadores)

  ------------------------------------------------------------------
  **KPI**           **Cómo se calcula**             **Meta
                                                    saludable**
  ----------------- ------------------------------- ----------------
  **Tiempo total    Días desde decisión hasta tener ≤ 14 días
  setup LLC**       cuenta bancaria operativa       

  **Costo total     EIN + LLC + RA + cuenta + GL +  ≤ \\$1,500 año 1
  fundación**       Operating Agreement             

  **Días entre EIN  Cumplimiento FinCEN             ≤ 30 días
  y BOI report**                                    (obligatorio)

  **Documentos      Operating Agreement + EIN       100% antes de
  centralizados**   letter + Articles + COI +       primer deal
                    permisos archivados en Drive    

  **CPA             Sí/No --- entrevistas hechas y  Antes del mes 2
  contratado**      elección                        
  ------------------------------------------------------------------

E0 · Quality Gates antes de pasar a E1

- **✓** LLC activa con EIN + cuenta bancaria operativa.

- **✓** BOI report enviado a FinCEN.

- **✓** CPA especializado RE contratado y on-boarded en QBO/Stessa.

- **✓** Operating Agreement firmado.

- **✓** Seguro GL para LLC contratado.

- **✓** Abogado RE en estado de inversión identificado (no
  necesariamente retained aún).

- **✓** Si vives en CA/NY y vas a invertir fuera: verificación de que NO
  necesitas LLC en tu estado de residencia.

E0 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO: LLC MAL FORMADA**                                       |
|                                                                 |
| Inversionista colombiano residiendo en CA formó LLC en          |
| California para invertir en propiedad de TX. Pagó \\$800/año     |
| franchise tax CA + \\$300 TX. Costo evitable: \\$800/año.         |
| Lección: forma la LLC en el ESTADO DE INVERSIÓN, no de          |
| RESIDENCIA. La banca y el CPA sí van en residencia.             |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **CASO: BOI REPORT OLVIDADO**                                   |
|                                                                 |
| Inversionista olvidó reportar BOI 4 meses tras formar LLC.      |
| Multa potencial \\$500/día (FinCEN). Lección: agenda el BOI      |
| report en Google Calendar el mismo día que formas la LLC. Vence |
| en 30 días exactos.                                             |
+-----------------------------------------------------------------+

E0 · Recursos externos

  ---------------------------------------------------------------------------------------------------------
  **Actor          **Nombre**      **Página web**                            **Términos y    **Notas**
  necesario**                                                                condiciones**   
  ---------------- --------------- ----------------------------------------- --------------- --------------
  **Libro - LLC &  **«The Tax &    *Amazon / kkoslawyers.com*                \\$20            Fundación
  Asset            Legal                                                                     completa para
  Protection**     Playbook» -                                                               LLCs REI.
                   Mark Kohler**                                                             

  **Libro -        **«Tax-Free     *Amazon*                                  \\$15            Filosofía
  Tax-Free         Wealth» - Tom                                                             fiscal del REI
  Wealth**         Wheelwright**                                                             inteligente.

  **Podcast - Tax  **Tax Smart     *therealestatecpa.com/podcast*            Free            Brandon Hall +
  Smart REI**      Real Estate                                                               Thomas
                   Investors**                                                               Castelli.

  **Podcast -      **Anderson      *andersonadvisors.com*                    Free            Tax + legal
  Anderson         Advisors Tax                                                              Q&A semanal.
  Advisors**       Tuesdays**                                                                

  **Video -        **Northwest     *youtube.com/@NorthwestRegisteredAgent*   Free            Tutoriales
  Northwest LLC**  Registered                                                                prácticos.
                   Agent YouTube**                                                           

  **Curso - REI    **Real Estate   *therealestatecpa.com*                    Membership      Educación
  Tax Strategist** CPA Tax Smart                                                             profunda.
                   Investors**                                                               

  **IRS Pub 527 -  **Residential   *irs.gov/publications/p527*               Free            Lectura
  Residential      Rental                                                                    obligatoria si
  Rental**         Property**                                                                haces Fix &
                                                                                             Hold.

  **IRS Pub 946 -  **How to        *irs.gov/publications/p946*               Free            Esencial para
  Depreciation**   Depreciate                                                                cost
                   Property**                                                                segregation
                                                                                             futuro.
  ---------------------------------------------------------------------------------------------------------

**E1**

**EVALUAR**

**Encontrar deals y aprender a decir NO**

*El 95% de las propiedades que mires NO son deal. Los extras de esta
etapa te enseñan a filtrar rápido y a decir NO sin culpa.*

E1 · Plantillas

  -----------------------------------------------------------------------------------------
  **Actor         **Nombre**       **Página web**  **Términos y        **Notas**
  necesario**                                      condiciones**       
  --------------- ---------------- --------------- ------------------- --------------------
  **Deal Analyzer **Excel/Sheet    *Plantilla en   Free                Esencial. Cada deal
  Sheet**         con ARV, Repair, Airtable o                          pasa por aquí.
                  Holding, MAO,    BiggerPockets                       
                  ROI, profit %**  calculadora*                        

  **Carta yellow  **Texto corto +  *Ver Doc B E1.3 \\$0.65-1.20/carta   Templates probadas
  letter          handwritten      (Ballpoint)*                        en wholesaling.
  plantilla**     font**                                               

  **LOI (Letter   **1 página, no   *Plantilla      Free                Más rápido que
  of Intent)      vinculante, abre genérica REI*                       contrato. Inicia
  plantilla**     conversación**                                       negociación.

  **Purchase &    **Contrato       *TREC (TX) /    Free oficiales      Adapta a cada
  Sale Agreement  compraventa con  FAR-BAR (FL)*                       estado.
  plantilla**     cláusula de                                          
                  asignación**                                         

  **Assignment    **Cesión de      *Plantilla      Free                Crítica en
  Agreement       derechos del PSA wholesalers*                        wholesaling.
  plantilla**     al buyer final**                                     Estado-específica.

  **Buyer list    **Tabla con cash *Airtable       Free                Construye desde día
  spreadsheet**   buyers, ciudades plantilla*                          1.
                  preferidas,                                          
                  criterios**                                          

  **Driving for   **Cómo           *Lista propia + Free                Capacitación visual.
  Dollars         identificar      DealMachine*                        
  checklist**     distress                                             
                  signals**                                            

  **Cold call     **Tabla con      *Mojo /         Variable            Para tracking.
  call sheet      leads, status,   REsimpli /                          
  (CRM)**         próximo paso**   Airtable*                           
  -----------------------------------------------------------------------------------------

E1 · KPIs

  ----------------------------------------------------------------------
  **KPI**                  **Cómo se calcula**          **Meta
                                                        saludable**
  ------------------------ ---------------------------- ----------------
  **Lead-to-appointment    Citas / Total leads          ≥ 8-12%
  rate**                   contactados                  

  **Appointment-to-offer   Ofertas hechas / Citas       ≥ 50%
  rate**                                                

  **Offer-to-contract      Contratos firmados / Ofertas ≥ 10-15%
  rate**                                                

  **Costo por lead**       (\\$Marketing total) / Leads  ≤ \\$100 (D4D), ≤
                           generados                    \\$50 (cold call)

  **Costo por contrato**   (\\$Marketing total) /        ≤ \\$3,000-5,000
                           Contratos firmados           

  **Tiempo en pipeline     Días promedio                ≤ 30 días
  (lead → contrato)**                                   

  **Deals                  Volumen de análisis          ≥ 20-50
  analizados/semana**                                   deals/semana

  **DSCR mín. del deal**   NOI / Servicio deuda         ≥ 1.25 (para Fix
                                                        & Hold)

  **Spread mín. profit /   Profit / ARV                 ≥ 15% Fix & Flip
  venta**                                               

  **MAO (Maximum Allowable ARV × 70% - Repairs -        Regla del 70%
  Offer)**                 Wholesale fee                
  ----------------------------------------------------------------------

E1 · Scripts

Script cold call inicial (15 segundos)

+-----------------------------------------------------------------+
| **APERTURA COLD CALL (VERSIÓN FLIPPING RENTALS)**               |
|                                                                 |
| «Hola, soy \[Nombre\] de Flipping Rentals. Compro casas en      |
| efectivo en \[ciudad\] para repararlas y revenderlas. Vi que su |
| propiedad en \[dirección\] podría calificar. ¿Tiene 90 segundos |
| para que le explique cómo funciona? Si no le interesa, no le    |
| molesto más.» --- Pausa larga. Si dice NO: «Entiendo. Le dejo   |
| mi número por si cambia de opinión. Buen día.»                  |
+-----------------------------------------------------------------+

Script SMS inicial

+-----------------------------------------------------------------+
| **SMS OPENER TCPA-COMPLIANT**                                   |
|                                                                 |
| «Hola \[Nombre\], soy \[Tu nombre\] de Flipping Rentals. ¿Aún   |
| es dueño de \[dirección\]? Me interesa comprársela en cash si   |
| está abierto a una oferta. Reply STOP para no recibir más.      |
| Reply YES para hablar.» --- Envía solo en horario laboral.      |
+-----------------------------------------------------------------+

Script overcome objection --- «No estoy interesado»

+-----------------------------------------------------------------+
| **MANEJO DE OBJECIÓN**                                          |
|                                                                 |
| «Lo entiendo perfectamente. La mayoría de propietarios dicen lo |
| mismo cuando los contactamos primero. Solo le hago una          |
| pregunta: si yo le ofreciera cash, cierre en 14 días y sin      |
| reparaciones de su parte, ¿estaría dispuesto a escuchar el      |
| número? Si la respuesta es no, no le molesto más.»              |
+-----------------------------------------------------------------+

Script pedir agendar visita

+-----------------------------------------------------------------+
| **CIERRE PARA VISITA**                                          |
|                                                                 |
| «Perfecto. Para hacerle una oferta seria necesito ver la        |
| propiedad por 15-20 minutos. ¿Le funciona el \[día\] a las      |
| \[hora\] o prefiere \[día alternativo\] a \[hora\]? Después de  |
| verla, le doy mi oferta máxima por escrito en 24 horas.»        |
+-----------------------------------------------------------------+

E1 · Quality Gates antes de pasar a E2

- **✓** Tienes una buyer list de mínimo 20-30 cash buyers verificados.

- **✓** Conoces el ARV de la zona dentro de ±5%.

- **✓** Tu cost estimate de rehab está validado por GC o por benchmark
  \\$/sqft.

- **✓** El deal pasa la regla del 70% con margen.

- **✓** Verificaste título (preliminary title commitment de la title
  company).

- **✓** Inspector InterNACHI/ASHI hizo inspección general --- sin red
  flags estructurales.

- **✓** Si vas a hacer wholesaling: tu estado lo permite (ver Doc A
  Apéndice A1).

E1 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO BRAMBLE DR (AUSTIN)**                                    |
|                                                                 |
| Compra \\$245K, repair budget \\$40K, ARV proyectado \\$360K.      |
| Repair real \\$58K (45% sobre presupuesto). Lección: SIEMPRE usa |
| contingencia 20-25% en repair budget. El estudiante debe contar |
| contigo MAS contingencia desde el análisis.                     |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **CASO GARDEN PATH DR (ROUND ROCK)**                            |
|                                                                 |
| Comprado por encima de ARV por error en cálculo (margin contra  |
| internal value en vez de client value). Pérdida estructural del |
| proyecto desde día 1. Lección: el análisis de margen DEBE usar  |
| el precio que el cliente final pagará, no el precio interno     |
| entre LLCs propias.                                             |
+-----------------------------------------------------------------+

E1 · Recursos externos

  ------------------------------------------------------------------------------------------------
  **Actor         **Nombre**        **Página web**                 **Términos y    **Notas**
  necesario**                                                      condiciones**   
  --------------- ----------------- ------------------------------ --------------- ---------------
  **Libro -       **«Wholesaling    *wholesalinginc.com*           Variable        El estándar.
  Wholesaling     Inc» - Tom Krol**                                                
  masterclass**                                                                    

  **Libro - Fix & **«The Book on    *Amazon / BiggerPockets*       \\$15-25         Análisis de
  Flip math**     Flipping                                                         deals.
                  Houses» - J                                                      
                  Scott**                                                          

  **Libro - Rehab **«The Book on    *Amazon*                       \\$15-25         Para no
  estimating**    Estimating Rehab                                                 quedarse corto.
                  Costs» - J                                                       
                  Scott**                                                          

  **Podcast -     **Wholesaling     *wholesalinginc.com/podcast*   Free            Diario.
  Wholesaling**   Inc**                                                            

  **Podcast - BP  **BiggerPockets   *biggerpockets.com/podcasts*   Free            Episodios sobre
  Real Estate**   Real Estate                                                      análisis.
                  Podcast**                                                        

  **Podcast -     **Best Ever       *joefairless.com*              Free            Multifamily +
  Best Ever**     Show**                                                           REI.

  **YouTube -     **Pace Morby**    *youtube.com/@PaceMorby*       Free            Creative
  Driving for                                                                      finance + D4D.
  Dollars**                                                                        

  **Curso -       **Wholesaling Inc *wholesalinginc.com*           \\$1,000+        Tom Krol.
  Wholesaling     Mastermind**                                                     
  formal**                                                                         
  ------------------------------------------------------------------------------------------------

**E2**

**ESTRUCTURAR**

**Capital, equipo, plan**

*Los extras de E2 evitan que te quemes financieramente o legalmente.
Verificaciones aquí valen más que velocidad.*

E2 · Plantillas

  --------------------------------------------------------------------------------------
  **Actor        **Nombre**           **Página      **Términos y    **Notas**
  necesario**                         web**         condiciones**   
  -------------- -------------------- ------------- --------------- --------------------
  **Scope of     **Lista detallada    *Flipper      Variable        Esencial antes de
  Work (SOW)     por área (cocina,    Force /                       cotizar GCs.
  template**     baño, etc.) con      propia                        
                 specs y precios**    Airtable*                     

  **GC bid       **Tabla para         *Airtable     Free            Nunca contrates con
  comparison     comparar 3 GCs lado  plantilla*                    1 cotización.
  sheet**        a lado**                                           

  **Contractor   **Contrato con       *Plantilla    Free            Debe ser
  agreement      scope, pagos,        legal local*                  estado-específico.
  template**     penalty clauses**                                  

  **Draw         **Cronograma de      *Plantilla    Free            Protege contra GC
  schedule       pagos por hitos      GC*                           que abandona.
  template**     (10/20/40/20/10)**                                 

  **Permit       **Lista de permits   *Solicitar    Variable        Permits faltantes
  checklist por  según scope**        permit                        son razón #1 de
  ciudad**                            expediter o                   denial en exit.
                                      ciudad*                       

  **Inspector    **Solicitud de       *Plantilla    Free            Pide ser «additional
  COI request**  Certificate of       propia*                       insured».
                 Insurance al GC**                                  

  **Loan term    **Tabla para         *Excel        Free            Compara: rate,
  sheet          comparar 3 HMLs**    propio*                       points, prepay,
  comparator**                                                      draw, max LTC/ARV.
  --------------------------------------------------------------------------------------

E2 · KPIs

  -------------------------------------------------------------------
  **KPI**               **Cómo se calcula**          **Meta
                                                     saludable**
  --------------------- ---------------------------- ----------------
  **Cotizaciones GC     Número de bids antes de      ≥ 3 GCs
  obtenidas**           decidir                      

  **Variance entre bids (Bid max - Bid min) / Bid    ≤ 15-20%
  GC**                  avg                          (variance alta =
                                                     falta de
                                                     claridad SOW)

  **Rate HML negociado  Tu rate vs media local       ≤ media local
  vs market**                                        (mejora con
                                                     experiencia)

  **Tiempo desde        Días en escrow / due         ≤ 21-30 días
  contrato a cierre**   diligence                    

  **LTC efectivo HML**  \% del costo total           ≥ 85-90% para
                        financiado                   Fix & Flip

  **Reserve líquido al  Cash en cuenta tras cierre   ≥ 10-15% del
  cerrar**                                           project total
                                                     para reservas

  **Permits requeridos  Pre-verificados antes de     100%
  confirmados**         demolición                   

  **GC con licencia     Lookup en DBPR/CSLB/ROC      100%
  verificada en                                      
  estado**                                           
  -------------------------------------------------------------------

E2 · Scripts

Script entrevista a GC

+-----------------------------------------------------------------+
| **ENTREVISTA FILTRO GC (10 PREGUNTAS)**                         |
|                                                                 |
| 1\) Número de licencia (anota y verifica al colgar). 2) Años en |
| el negocio. 3) Cuántos flips ha hecho para inversores. 4) Puede |
| compartir 3 referencias verificables. 5) Lleva GL y Workers     |
| Comp; puedo agregarme como additional insured. 6) Acepta draw   |
| schedule por hitos. 7) Penalty por retraso por día. 8) Quién es |
| el lead contact del proyecto. 9) Cuál es su capacidad actual    |
| (cuántos proyectos simultáneos). 10) Tiempo promedio para flips |
| \\$50K rehab.                                                    |
+-----------------------------------------------------------------+

Script negociar HML

+-----------------------------------------------------------------+
| **NEGOCIACIÓN RATE CON HML**                                    |
|                                                                 |
| «Tengo cotización de \[HML competidor\] a \[X\]% con \[Y\]      |
| points y \[Z\]% LTC. Si pudieran igualar o mejorar, cerramos    |
| con ustedes hoy. ¿Pueden trabajar con eso?» --- Funciona si     |
| tienes 2+ cotizaciones reales. NO mientas.                      |
+-----------------------------------------------------------------+

E2 · Quality Gates antes de pasar a E3

- **✓** HML aprobado con term sheet firmado.

- **✓** GC seleccionado con licencia + GL + Workers Comp verificados.

- **✓** Contractor agreement firmado con scope detallado y draw
  schedule.

- **✓** Permits identificados y pre-aplicados.

- **✓** Builder\'s Risk + Vacant insurance contratados (NREIG/Arcana).

- **✓** Title company alineada con HML --- cierre programado.

- **✓** Cash reserve ≥ 10-15% del proyecto en cuenta separada.

- **✓** Si CA y vendes \< 18 meses: archivo de cumplimiento AB-968
  inicializado.

E2 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO 6203 SHADOW BND (AUSTIN)**                               |
|                                                                 |
| Healthy projected margin. GC verificado, scope claro, 3         |
| cotizaciones obtenidas. Lección: los proyectos con E2 ejecutada |
| disciplinadamente son los que terminan en target. NO hay magia, |
| solo disciplina en setup.                                       |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **CASO GC SIN VERIFICACIÓN**                                    |
|                                                                 |
| Flipper hispano en Phoenix contrató GC sin licencia (era        |
| subcontratista que se hacía pasar por GC). Cuando ROC           |
| inspeccionó, paró la obra y aplicó penalty. Pérdida: 4          |
| semanas + multa + costo de GC nuevo. Lección: SIEMPRE verifica  |
| licencia en roc.az.gov ANTES del contrato. 5 minutos te ahorra  |
| \\$15,000.                                                       |
+-----------------------------------------------------------------+

E2 · Recursos externos

  -----------------------------------------------------------------------------------------------
  **Actor        **Nombre**        **Página web**                  **Términos y    **Notas**
  necesario**                                                      condiciones**   
  -------------- ----------------- ------------------------------- --------------- --------------
  **Libro -      **«Estimating     *Amazon*                        \\$30-50         Estimating
  construction   Building Costs» -                                                 profesional.
  estimating**   Calin Popescu**                                                   

  **Libro - hard **BiggerPockets   *biggerpockets.com/blog*        Free            Conceptos
  money basics** Hard Money                                                        clave.
                 Guide**                                                           

  **Curso -      **Buildertrend    *buildertrend.com/academy*      Incluido        Gestión de
  construction   Academy**                                         suscripción     proyectos.
  PM**                                                                             

  **Curso -      **FlipperForce    *flipperforce.com/academy*      Variable        Específico
  rehab          Academy**                                                         para flippers.
  estimating                                                                       
  REI**                                                                            

  **Podcast -    **REI Money       *Varios podcasts REI*           Free            Para entender
  Hard money     Talk**                                                            los términos.
  explained**                                                                      

  **Webinar -    **Anderson        *andersonadvisors.com/events*   Free            Estructura
  Anderson tax   Advisors                                                          legal antes de
  structure**    Webinars**                                                        capital.
  -----------------------------------------------------------------------------------------------

**E3**

**EJECUTAR**

**Donde se gana o se pierde**

*Los extras de E3 son las herramientas de control. Si la obra se sale de
tiempo o presupuesto, lo notas con estos KPIs antes de que sea tarde.*

E3 · Plantillas

  --------------------------------------------------------------------------------
  **Actor        **Nombre**          **Página web**  **Términos y    **Notas**
  necesario**                                        condiciones**   
  -------------- ------------------- --------------- --------------- -------------
  **Project      **Gantt por fase    *Buildertrend / Variable        Cronograma de
  Cronograma     (demo, framing,     Flipper Force /                 referencia
  8-16 semanas** MEP, drywall,       Sheets*                         ajustable.
                 finish, punch)**                                    

  **Daily site   **Lo que se hizo,   *Plantilla      Free / variable El GC lo
  report         fotos, problemas,   Sheets o                        llena cada
  template**     próximos pasos**    Buildertrend*                   día.

  **Punch list   **Lista de defectos *Sheets /       Free            Crítica antes
  final          antes de aceptar    Buildertrend*                   de pagar
  template**     entrega**                                           último draw.

  **Change order **Para cambios al   *Plantilla      Free            Toda
  template**     scope original con  legal*                          variación al
                 costos**                                            SOW por
                                                                     escrito.

  **Material     **Lo que entra al   *Sheets*        Free            Evita robos y
  delivery       sitio y cuándo**                                    duplicados.
  tracker**                                                          

  **Inspection   **Plumbing,         *InterNACHI     Free básico     Para
  checklist by   electric, HVAC,     templates*                      inspectores
  trade**        framing, etc.**                                     aliados.

  **Lien waiver  **Subcontratistas   *Plantilla      Free            Esencial.
  template**     firman waiver al    legal*                          Evita
                 recibir pago**                                      mecanic\'s
                                                                     liens
                                                                     sorpresa.

  **Bonus de     **Incentivo \\$1-3K  *Plantilla      Free            Aceleración
  finalización   si entrega a        propia*                         real.
  template**     tiempo**                                            
  --------------------------------------------------------------------------------

E3 · KPIs

  -----------------------------------------------------------------------
  **KPI**                   **Cómo se calcula**          **Meta
                                                         saludable**
  ------------------------- ---------------------------- ----------------
  **Días de obra vs         Días reales / Días planeados ≤ 110% (10%
  cronograma**                                           overrun
                                                         aceptable)

  **Costo real vs           \\$ Real / \\$ Presupuesto     ≤ 115% (15%
  presupuesto**                                          overrun =
                                                         revisar)

  **Cambios al scope        \# CO / Total proyecto       ≤ 5 CO por
  (change orders)**                                      proyecto

  **Inspecciones pasadas    Inspecciones aprobadas /     ≥ 80% primera
  primera vez**             Total intentos               vez

  **Daily site reports      \% de días con report        ≥ 90%
  recibidos**               enviado                      

  **Días desde demo hasta   Tiempo total construcción    ≤ 90-120 días
  certificate of                                         según scope
  occupancy**                                            

  **Fotos                   Documentación completa por   100% (crítico
  antes/durante/después**   área                         para AB-968 CA +
                                                         dispute defense)
  -----------------------------------------------------------------------

E3 · Quality Gates antes de listar (E4)

- **✓** Certificate of Occupancy (C.O.) obtenido si la ciudad lo
  requiere.

- **✓** Todas las inspecciones de permits pasadas.

- **✓** Punch list cerrado al 100% --- no listar con defectos visibles.

- **✓** Lien waivers firmados por TODOS los subcontratistas.

- **✓** Fotografía profesional programada (NO fotos del celular).

- **✓** Limpieza profunda hecha --- la propiedad debe verse «show
  ready».

- **✓** Si CA: archivo completo de contratistas con licencias + permits
  para cumplir AB-968.

- **✓** Termite WDO en FL/TX --- obligatorio para closing.

E3 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO: FOTO AI GENERADA EN LISTING**                           |
|                                                                 |
| Listing con foto AI-generated llamó atención y obtuvo offers    |
| rápidas. Comprador descubrió que la foto NO correspondía al     |
| estado real de la propiedad → canceló reserva. Lección: las     |
| fotos AI generative son riesgosas. Si usas virtual staging,     |
| declárelo en el listing. Framework permanente FlipMentoría: NO  |
| fotos AI generative de partes que no existen en la propiedad.   |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **CASO: GC ABANDONA OBRA AL 70%**                               |
|                                                                 |
| Flipper Houston pagó 3 de 4 draws (\\$45K) y el GC desapareció.  |
| Sin lien waivers firmados, 2 subs reclamaron mechanic\'s liens. |
| Costo de recuperación: 45 días, \\$20K legal, otro GC. Lección:  |
| NUNCA pagues sin lien waiver firmado del draw anterior. Esto es |
| no negociable.                                                  |
+-----------------------------------------------------------------+

E3 · Recursos externos

  ---------------------------------------------------------------------------------------------------
  **Actor          **Nombre**         **Página web**                 **Términos y    **Notas**
  necesario**                                                        condiciones**   
  ---------------- ------------------ ------------------------------ --------------- ----------------
  **Libro - PM     **«Construction    *Amazon*                       \\$25-40         PM básico.
  construcción**   Management                                                        
                   JumpStart» -                                                      
                   Barbara Jackson**                                                 

  **Libro -        **InterNACHI       *nachi.org*                    Free            Estándar
  inspección       International                                                     inspecciones.
  casas**          Standards**                                                       

  **Curso - PM     **Buildertrend     *buildertrend.com/academy*     Incluido        Gestión por
  construcción**   Academy**                                                         software.

  **YouTube -      **BiggerPockets, J *youtube.com*                  Free            Visual
  Rehab            Scott videos**                                                    walk-throughs.
  walkthroughs**                                                                     

  **Podcast -      **Construction     *constructionbrothers.com*     Free            Hands-on
  Construction     Brothers**                                                        stories.
  stories**                                                                          

  **Lectura -      **California Civil *leginfo.legislature.ca.gov*   Free            Lectura
  AB-968 CA        Code §1102.6h**                                                   obligatoria si
  detalle**                                                                          CA.
  ---------------------------------------------------------------------------------------------------

**E4**

**ESTRATEGIA DE SALIDA**

**Cobrar lo que vale**

*Los extras de E4 maximizan el precio de venta y minimizan el tiempo en
el mercado. La presentación es 50% del precio.*

E4 · Plantillas

  -------------------------------------------------------------------------------------------
  **Actor           **Nombre**        **Página web**       **Términos y    **Notas**
  necesario**                                              condiciones**   
  ----------------- ----------------- -------------------- --------------- ------------------
  **Listing         **Estructura:     *Plantilla propia*   Free            Escrita para SEO +
  description       ubicación +                                            emoción.
  template**        features +                                             
                    lifestyle + CTA**                                      

  **Comparable      **Tabla con 3-6   *MLS / Zillow /      Variable        Validación del
  analysis (CMA)**  comps activos +   agente*                              precio.
                    vendidos en 90                                         
                    días**                                                 

  **Open house plan **Logística +     *Plantilla propia*   Free            Eventos abiertos
  template**        agentes +                                              pre-listing.
                    refreshments +                                         
                    lead capture**                                         

  **Email a agentes **Email           *Plantilla propia +  Free / \\$10/mes Vende antes de
  / cash buyer      pre-launch a tu   Mailchimp*                           listar público.
  list**            network**                                              

  **Inspection      **Cómo responder  *Plantilla propia +  Free            Negocia
  response          a inspecciones    abogado*                             repairs/credits.
  template**        del buyer**                                            

  **Counter-offer   **Para            *Plantilla MLS       Free            Estructura clara.
  template**        negociaciones     estado-específica*                   
                    precio +                                               
                    términos**                                             

  **Tenant          **Aplicación de   *TurboTenant /       Free            Estandariza
  application       inquilino**       Apartments.com*                      screening.
  template (Fix &                                                          
  Hold)**                                                                  

  **Lease agreement **Contrato de     *TX/FL/CA Realtors   Free / vía      Específico por
  template estado** arrendamiento**   Assn*                agente          estado.

  **Move-in /       **Tabla con foto  *TurboTenant /       Free            Protege deposit.
  move-out          por habitación al propia*                              
  condition**       firmar**                                               
  -------------------------------------------------------------------------------------------

E4 · KPIs

  -------------------------------------------------------------------
  **KPI**               **Cómo se calcula**          **Meta
                                                     saludable**
  --------------------- ---------------------------- ----------------
  **DOM (Days on        Días desde listing hasta     ≤ 14 días
  Market)**             contract                     (premium); ≤ 30
                                                     días (normal)

  **Sale price vs ARV   Precio final / ARV original  ≥ 95-100%
  proyectado**                                       

  **Precio final vs     Sale / List                  ≥ 98% (sin
  listing price**                                    descuento
                                                     grande)

  **Showings hasta      Visitas / Primera offer      ≤ 10-15
  primera oferta**                                   

  **Multiple offer      Si recibes 2+ ofertas: prima ≥ 102-105%
  ratio**               sobre asking                 asking

  **Total selling       Agente + closing +           ≤ 8% del sale
  costs**               concessions + repairs        price

  **Profit final vs     Profit real / Profit         ≥ 85%
  proyectado**          proyectado                   

  **Tenant placement    Días desde ready a tenant in ≤ 21-30 días
  (Fix & Hold)**                                     

  **Rent vs proyectado  Rent firmado / Proyectado    ≥ 95%
  (Fix & Hold)**                                     
  -------------------------------------------------------------------

E4 · Scripts

Email a buyer list pre-listing

+-----------------------------------------------------------------+
| **SUBJECT: «OFF-MARKET EXCLUSIVO · \[CIUDAD\] · \\$XXXK · 7      |
| DÍAS»**                                                         |
|                                                                 |
| «Hola \[Nombre\], antes de listar al público quería darte       |
| exclusiva 7 días. Acabamos de terminar un flip en \[zona\] de   |
| \[N\] habitaciones / \[M\] baños / \[sqft\]. ARV comparable:    |
| \\$XXXk. Precio: \\$XXX,XXX. Profit estimado para buy & hold con  |
| DSCR: \\$YYY/mes. Si quieres tour, responde a este email antes   |
| del \[fecha\]. Después va a MLS.» --- Listo desde día -7.       |
+-----------------------------------------------------------------+

Respuesta a inspección con repairs

+-----------------------------------------------------------------+
| **RESPUESTA PROFESIONAL A BUYER INSPECTION**                    |
|                                                                 |
| «Gracias por compartir el reporte de inspección. Hemos revisado |
| los ítems. Proponemos: 1) \[Items mayores estructurales\] ---   |
| los corregimos antes del cierre con factura. 2) \[Items menores |
| cosméticos\] --- ofrecemos credit de \\$X al cierre. 3) \[Items  |
| no críticos\] --- propiedad se vende as-is según contrato.      |
| Esperamos cierre el \[fecha\].»                                 |
+-----------------------------------------------------------------+

E4 · Quality Gates antes de cierre

- **✓** MLS listing activo con fotos profesionales + virtual staging si
  aplica.

- **✓** Inspection del buyer completada --- respuesta enviada en ≤ 48
  horas.

- **✓** Appraisal del buyer ≥ contract price. Si no: negocia con buyer
  y/o HML.

- **✓** Title company tiene clear title commitment.

- **✓** Lien waivers + final inspection report archivados.

- **✓** CA AB-968: Disclosure form enviado al buyer y firmado.

- **✓** Si Fix & Hold: tenant pre-screened, lease firmado, deposit
  cobrado.

E4 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO: AGENTE NO INVESTOR-FRIENDLY**                           |
|                                                                 |
| Flipper contrató agente residencial regular para listing.       |
| Agente puso fotos del celular, sin staging, sin marketing. Casa |
| estuvo 95 días en mercado, vendió 8% bajo ARV. Pérdida: \\$28K.  |
| Lección: el agente debe ser INVESTOR-FRIENDLY con experiencia   |
| listando flips. Pide ver portfolio de listings de flips         |
| anteriores.                                                     |
+-----------------------------------------------------------------+

E4 · Recursos externos

  --------------------------------------------------------------------------------------
  **Actor         **Nombre**      **Página web**          **Términos y    **Notas**
  necesario**                                             condiciones**   
  --------------- --------------- ----------------------- --------------- --------------
  **Libro -       **«SOLD: The    *Amazon*                \\$15-25         Marketing
  Selling         Art of Real                                             residencial.
  residential**   Estate                                                  
                  Marketing» -                                            
                  Sam                                                     
                  Khorramian**                                            

  **Libro -       **«Never Split  *Amazon*                \\$15-20         Negociación
  Negociación     the                                                     general
  RE**            Difference» -                                           aplicable a
                  Chris Voss**                                            RE.

  **Libro -       **«The Book on  *Amazon / BP*           \\$20-25         Para Fix &
  Landlord        Managing Rental                                         Hold.
  guide**         Properties» -                                           
                  Brandon                                                 
                  Turner**                                                

  **Curso -       **Photography   *creativelive.com /     Variable        ---
  Listing         for Real Estate Skillshare*                             
  photography**   by Eric                                                 
                  Stenberg**                                              

  **Curso -       **BoxBrownie    *boxbrownie.com/blog*   Free            Best
  Virtual         tutorials**                                             practices.
  staging**                                                               

  **Podcast -     **Real Estate   *hibandigital.com*      Free            ---
  Listing         Rockstars (Pat                                          
  strategies**    Hiban)**                                                
  --------------------------------------------------------------------------------------

**E5**

**ESCALAR**

**De operador a constructor de negocio**

*Los extras de E5 documentan tus procesos para que otros los ejecuten.
Sin SOPs no hay escala.*

E5 · Plantillas

  -----------------------------------------------------------------------------------
  **Actor          **Nombre**         **Página web** **Términos y    **Notas**
  necesario**                                        condiciones**   
  ---------------- ------------------ -------------- --------------- ----------------
  **SOP master     **Documento que    *Notion /      Free / \\$8/mes  Esencial. Sin
  template**       describe cada      Taskade*                       SOPs no puedes
                   proceso                                           delegar.
                   paso-a-paso**                                     

  **JD (Job        **Acquisitions,    *Sheets /      Free            Antes de
  Description) por Disposition, PM,   Notion*                        contratar.
  rol**            VA, Bookkeeping,                                  
                   etc.**                                            

  **Onboarding     **Setup primeros   *Sheets /      Free            Acelera
  checklist        30 días**          Taskade*                       productividad.
  VA/empleado**                                                      

  **KPIs dashboard **Tablero con      *Airtable /    Free / variable Revisa cada
  mensual**        métricas por       Sheets /                       lunes.
                   etapa**            Stessa*                        

  **Pitch deck     **Para presentar   *Canva /       Free /          Esencial cuando
  capital raise**  deals a private    PowerPoint*    \\$14.99/mes     levantas
                   money**                                           capital.

  **LP Reporting   **Reportes a       *Juniper       Variable        Profesionaliza
  trimestral**     inversionistas**   Square /                       tu raise.
                                      InvestNext /                   
                                      propio*                        

  **Profit-First   **Sistema de       *Plantilla     Free / \\$20     Cash management
  spreadsheet**    buckets para       Mike           libro           filosófico.
                   flippers**         Michalowicz*                   

  **Mastermind     **Para mastermind  *Notion*       Free            Reuniones
  agenda           interno con                                       efectivas.
  template**       socios**                                          
  -----------------------------------------------------------------------------------

E5 · KPIs

  --------------------------------------------------------------------
  **KPI**                **Cómo se calcula**          **Meta
                                                      saludable**
  ---------------------- ---------------------------- ----------------
  **Deals/año por        Volumen anual                ≥ 6-10 flips o
  estudiante/equipo**                                 12+ rentas

  **Margen bruto         (Sale - Total cost) / Sale   ≥ 15-20%
  promedio Fix & Flip**                               

  **IRR Fix & Hold       Cash-on-cash + appreciation  ≥ 12-15%
  portfolio**                                         

  **Revenue/empleado**   Top-line / FTE               \\$500K-\\$1M por
                                                      persona

  **Months of operating  Cash + LOC disponible / OpEx ≥ 6 meses
  reserve**              mensual                      

  **NPS de               Net Promoter Score           ≥ 50
  inversionistas LP**                                 

  **Tiempo del founder   Horas/semana en tareas no    ≤ 15-20 horas
  en operaciones**       estratégicas                 (resto delegar)

  **Procesos             \% de tareas críticas con    ≥ 80%
  documentados (SOPs)**  SOP                          
  --------------------------------------------------------------------

E5 · Quality Gates para escalar

- **✓** Mínimo 6 flips o 6 rentas exitosas ANTES de escalar
  agresivamente.

- **✓** Operating reserve de 6 meses cubierta.

- **✓** SOPs documentados para acquisitions, project management y
  disposition.

- **✓** Primer VA o assistant en onboarding completo.

- **✓** Tax strategy firm contratada (Anderson, WealthAbility, o Hall
  CPA).

- **✓** Si vas a levantar capital LP: estructura Reg D / 506(b) o 506(c)
  clara.

- **✓** Cost segregation evaluada para propiedades \> \\$250K en hold.

E5 · Casos de estudio

+-----------------------------------------------------------------+
| **CASO: ESCALAR SIN SOPS**                                      |
|                                                                 |
| Equipo pasó de 3 a 12 flips/año en 18 meses sin documentar      |
| procesos. Calidad cayó: rehab overruns 30%, dispute con         |
| inquilinos, 2 demandas. Lección: documenta ANTES de duplicar    |
| volumen. Cada hora invertida en SOPs ahorra 10 horas            |
| operativas + previene errores costosos.                         |
+-----------------------------------------------------------------+

+-----------------------------------------------------------------+
| **CASO: COST SEGREGATION \\$80K SAVINGS**                        |
|                                                                 |
| Inversionista refi 8 propiedades multifamily con cost           |
| segregation studies de KBKG. Acelerar depreciación generó \\$80K |
| en tax savings primer año, reinvirtidos en 2 propiedades        |
| adicionales. Lección: cuando llegas a 5+ propiedades hold \>    |
| \\$250K cada una, cost seg es no-brainer.                        |
+-----------------------------------------------------------------+

E5 · Recursos externos

  ----------------------------------------------------------------------------------------------------
  **Actor          **Nombre**        **Página web**                     **Términos y    **Notas**
  necesario**                                                           condiciones**   
  ---------------- ----------------- ---------------------------------- --------------- --------------
  **Libro -        **«Built to       *Amazon*                           \\$15-25         Negocio que
  Sistemas y       Sell» - John                                                         opera sin ti.
  SOPs**           Warrillow**                                                          

  **Libro - Profit **«Profit         *Amazon*                           \\$15-25         Cash
  First**          First» - Mike                                                        management con
                   Michalowicz**                                                        buckets.

  **Libro -        **«Scaling Up» -  *Amazon*                           \\$25-30         Framework
  Scaling**        Verne Harnish**                                                      Rockefeller
                                                                                        Habits.

  **Libro - VAs y  **«Virtual        *Amazon*                           \\$15-20         Cómo construir
  delegación**     Freedom» - Chris                                                     equipo
                   Ducker**                                                             virtual.

  **Curso - tax    **WealthAbility   *wealthability.com*                Premium         Para REI con
  strategy**       Academy**                                                            varios
                                                                                        deals/año.

  **Curso -        **Joe Fairless    *joefairless.com*                  \\$1K+           Networking +
  capital          Best Ever                                                            educación.
  raising**        Conference**                                                         

  **Mastermind -   **7 Figure        *7figureflipping.com*              \\$10K-25K/año   Para 10+
  flippers         Flipping**                                                           flips/año.
  grandes**                                                                             

  **Mastermind -   **Collective      *collectivegeniusmastermind.com*   \\$25K+/año      Invite-only.
  top tier**       Genius**                                                             

  **Podcast - Real **Real Wealth     *realwealthshow.com*               Free            Estrategia
  Wealth Network** Show (Kathy                                                          portfolio.
                   Fettke)**                                                            
  ----------------------------------------------------------------------------------------------------

Resumen ejecutivo · Qué incluir en cada etapa

Vista compacta de los extras críticos por etapa:

  ------------------------------------------------------------------------
  **Etapa**   **Plantillas críticas**        **KPIs clave**
  ----------- ------------------------------ -----------------------------
  **E0**      Checklist setup LLC 30 días +  Tiempo total setup ≤ 14d ·
              Operating Agreement + BOI      Costo año 1 ≤ \\$1,500

  **E1**      Deal Analyzer + Yellow         Costo/contrato ≤ \\$3-5K ·
              Letter + Assignment + Buyer    Deals analizados/sem ≥ 20
              List                           

  **E2**      SOW + GC bid comparison + Draw Cotizaciones GC ≥ 3 · LTC HML
              schedule + Term sheet comp     ≥ 85% · Reserve ≥ 10-15%

  **E3**      Cronograma + Daily report +    Días vs plan ≤ 110% · \\$ vs
              Punch list + Lien waivers      presupuesto ≤ 115% · Pasa
                                             inspección 1ra vez ≥ 80%

  **E4**      Listing description + CMA +    DOM ≤ 14d · Sale/ARV ≥ 95% ·
              Inspection response + Lease    Sale/List ≥ 98%

  **E5**      SOPs + JD por rol + KPIs       Reserve ≥ 6 meses · SOPs
              dashboard + Pitch deck + LP    documentados ≥ 80% · Margen ≥
              report                         15-20%
  ------------------------------------------------------------------------

+-----------------------------------------------------------------+
| **REFLEXIÓN FINAL**                                             |
|                                                                 |
| Las plantillas no te hacen exitoso. Los KPIs no te hacen        |
| exitoso. Lo que te hace exitoso es ejecutar las plantillas con  |
| disciplina y revisar los KPIs cada semana. La diferencia entre  |
| el estudiante que escala y el que se estanca NO es talento ---  |
| es consistencia en revisar números y mejorar procesos.          |
+-----------------------------------------------------------------+

**FLIPPING RENTALS · FLIPMENTORÍA**

*Documento C · Extras por Etapa · Mayo 2026*
$FMCEP44S$,
  120,
  ARRAY['plantillas', 'KPIs', 'scripts', 'qualitygates', 'casos', 'recursos']::text[],
  '{}'::jsonb
);

-- Verificar
select etapa, categoria, titulo, length(contenido_md) as chars, posicion
from public.fm_documents
order by posicion;
