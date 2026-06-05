// ════════════════════════════════════════════════════════════
// 📚 Biblioteca de bloques tipo Miguel Guzmán (extraído de education.js)
// FM_BLOQUES + fmGenerarBloques + helpers para cada perfil.
// ════════════════════════════════════════════════════════════

// ─── BIBLIOTECA DE BLOQUES TIPO MIGUEL GUZMÁN ───
// Cada bloque tiene: aplicaA, etapa, subetapa, observacion, tiempo, actividad,
//                    entregable, pasos[], recursos[{nombre, url, desc}], errores[]
const FM_BLOQUES = [
  // ━━━━━━━━━━ E0 — FUNDACIÓN ━━━━━━━━━━
  {
    id: 'llc_setup',
    aplicaA: (p, a) => a.llc === 'no',
    etapa: 'E0', subetapa: 'LLC y fundación legal',
    observacion: 'No se ofertan propiedades sin LLC. Es la diferencia entre proteger tu patrimonio personal y arriesgarlo en cada deal. Esto se hace ANTES de buscar deals — toma 1-4 semanas según el estado, así que se arranca paralelo al estudio de mercado.',
    tiempo: '8-12 horas + tiempo de procesamiento estatal (1-4 semanas)',
    actividad: (p, a) => `Formar LLC en el estado donde se va a invertir (${p.mercado || 'estado de inversión'}), obtener EIN del IRS, firmar Operating Agreement, abrir cuenta bancaria de negocio + tarjeta crédito, configurar software contable y identificar CPA + abogado de real estate.`,
    entregable: 'LLC aprobada + EIN + Operating Agreement firmado + cuenta bancaria activa + software contable conectado + CPA y abogado en lista de contactos.',
    pasos: [
      'Decidir el estado donde se invertirá (NO donde vive — el estado de la propiedad).',
      'Verificar disponibilidad del nombre de la LLC en el portal del Secretary of State.',
      'Contratar Registered Agent profesional ($99-$300/año) o ser propio si vive en el estado.',
      'Llenar Certificate of Formation + pagar filing fee ($50-$425 según estado).',
      'Solicitar EIN gratis al IRS (10 minutos online, inmediato).',
      'Descargar template de Operating Agreement (LLC University) y firmarlo.',
      'Abrir cuenta bancaria de negocio (Chase Business / Bluevine / Mercury) + tarjeta crédito.',
      'Conectar cuenta a software contable (Stessa gratis para 1-2 props, QuickBooks si escala).',
      'Entrevistar 2-3 CPAs y 2-3 abogados de real estate. Elegir 1 primario de cada uno.'
    ],
    recursos: [
      { nombre: 'Northwest Registered Agent', url: 'https://www.northwestregisteredagent.com', desc: 'LLC formation + RA ($39 + state fee)' },
      { nombre: 'IRS EIN Application', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', desc: 'EIN gratis online' },
      { nombre: 'LLC University Template', url: 'https://www.llcuniversity.com/llc-operating-agreement', desc: 'Operating Agreement gratis' },
      { nombre: 'Stessa', url: 'https://www.stessa.com', desc: 'Contabilidad real estate gratis' },
      { nombre: 'BiggerPockets Find a Tax Pro', url: 'https://www.biggerpockets.com/professionals/tax-pros', desc: 'CPAs de real estate' }
    ],
    errores: [
      'Formar LLC en Delaware/Nevada por "protección extra" (genera foreign filing + costo doble).',
      'Usar cuenta personal "temporalmente" para el negocio — destruye protección legal.',
      'Operar sin Operating Agreement (vulnerable a pierce the corporate veil).',
      'Buscar CPA en abril (deadline taxes) — pagás 2-3x más y servicio mediocre.',
      'No verificar Registered Agent (no puede ser PO Box, debe ser dirección física).'
    ]
  },
  {
    id: 'big_why_mindset',
    aplicaA: (p, a) => a.deals_cerrados === '0' && (a.mayor_obstaculo === 'miedo' || !a.setup_legal?.includes('cpa')),
    etapa: 'E0', subetapa: 'Big Why + bloque diario + Quick Win',
    observacion: 'El 80% de los que abandonan no es por falta de información — es por falta de claridad de propósito y disciplina. El Big Why escrito, el bloque diario no negociable y un Quick Win en semana 1 son los predictores #1 de NO abandono.',
    tiempo: '4-6 horas (setup) + cadencia diaria sostenida',
    actividad: 'Documentar Big Why personal por escrito (1-2 páginas), bloquear 90 min diarios no negociables en el calendario, ejecutar un Quick Win medible en la primera semana del programa.',
    entregable: 'Big Why firmado + bloque diario activo en calendario + Quick Win documentado con evidencia (screenshot, foto, email).',
    pasos: [
      'Bloquear 2-3 horas sin interrupciones para escribir Big Why (template del Anexo C).',
      'Llenar template: situación actual, visión a 5 años, lo que pierdo si no lo logro, por qué ahora, compromisos no negociables.',
      'Firmar + imprimir + colocar en lugar visible (escritorio o espejo).',
      'Compartir con coach + 2 personas cercanas (accountability público).',
      'Bloquear 90 min diarios mismo horario en Google Calendar como "FLIPPING NEGOCIO - NO DISPONIBLE".',
      'Elegir 1 Quick Win de las 4 opciones (oferta en vivo / wholesaler en buyer list / evento REIA / term sheet HML).',
      'Ejecutar + documentar con evidencia.',
      'Compartir Quick Win con coach y comunidad para refuerzo social.'
    ],
    recursos: [
      { nombre: 'Anexo C — Mindset y Top 20 errores', url: '#', desc: 'Template Big Why + sistema accountability' },
      { nombre: 'Google Calendar', url: 'https://calendar.google.com', desc: 'Bloque diario recurrente' },
      { nombre: 'Toggl Track', url: 'https://toggl.com', desc: 'Medir tiempo real del bloque' },
      { nombre: 'National REIA Directory', url: 'https://nationalreia.org/find-a-reia/', desc: 'Encontrar evento local para Quick Win' }
    ],
    errores: [
      'Big Why genérico ("quiero ser libre financieramente") — sin pierde fuerza.',
      'No compartir con nadie — sin accountability.',
      'Bloque flexible ("a veces en la mañana, a veces en la noche") — nunca se convierte en hábito.',
      'Saltarse el Quick Win — semana 1 sin victoria mata la motivación.',
      'Esperar a "sentir ganas" para trabajar — nunca llegan.'
    ]
  },

  // ━━━━━━━━━━ E1 — EVALUAR ━━━━━━━━━━
  {
    id: 'buybox_operativo',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.buybox === 'cero' || a.buybox === 'mental' || a.buybox === 'parcial'),
    etapa: 'E1', subetapa: 'Buy Box operativo',
    observacion: 'Crear 5 Buy Boxes porque un solo ZIP puede engañar. Comparar 5 zonas le permite ver dónde hay mejor ARV, velocidad de salida, inventario y margen. No es para comprar en todas; es para escoger con datos y no por intuición.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: (p, a) => `Definir exactamente qué compra, dónde compra, con qué estrategia y bajo qué condiciones mínimas. La estrategia principal será ${p.estrategiaLabel || 'Fix & Flip'}; ${a.objetivo === 'hibrido' ? 'Fix & Hold se revisa como segunda lectura' : 'una estrategia secundaria se revisa solo si los números lo justifican'}, pero no debe distraer el foco inicial.`,
    entregable: 'Buy Box Resumen de 1 página listo para enviar a wholesalers, realtors, lenders e inversionistas.',
    pasos: (p, a) => [
      `Definir estrategia principal: ${p.estrategiaLabel || 'Fix & Flip'} como base.`,
      `Elegir máximo 5 ZIP codes objetivo en ${p.mercado || '[tu mercado]'}. No abrir más zonas hasta dominar estas primeras.`,
      'Por cada ZIP definir: tipo de propiedad, ARV objetivo, precio máximo de compra, rehab aceptado, DOM máximo y perfil del comprador final.',
      'Crear lista de red flags: foundation severa, flood zone, liens, HOA alta, DOM excesivo, zona sin compradores o rehab fuera de control.',
      'Reducir a un Buy Box de 1 página con lenguaje claro y profesional.',
      'Practicar el pitch en voz alta hasta explicarlo en menos de 60 segundos.'
    ],
    recursos: [
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Validar precios, activos y vendidos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Validar vendidos y DOM' },
      { nombre: 'Realtor.com', url: 'https://www.realtor.com', desc: 'Validación adicional del mercado' },
      { nombre: 'GreatSchools', url: 'https://www.greatschools.org', desc: 'Validar perfil familiar del comprador final' },
      { nombre: 'FEMA Flood Map', url: 'https://msc.fema.gov/portal/home', desc: 'Validar flood zones' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Organizar Buy Box, tareas y evidencia' }
    ],
    errores: [
      'Hacer un Buy Box tan amplio que cualquier propiedad parece oportunidad.',
      'Mezclar Fix & Flip y Fix & Hold en el mismo criterio sin separar números.',
      'Elegir ZIPs porque "se ven buenos" y no porque tienen ventas reales.',
      'No incluir cómo cierra: HML, cash, días de cierre y capacidad real.',
      'Enviar a wholesalers un documento largo que nadie lee.'
    ]
  },
  {
    id: 'arv_comparables',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.arv_skill !== 'experto'),
    etapa: 'E1', subetapa: 'Validación de mercado y comparables',
    observacion: 'El ARV no se toma del wholesaler ni de una plataforma sin validar. El ARV se prueba con vendidos reales, fotos, condición, ubicación y similitud. Un ARV inflado destruye el deal desde el día uno.',
    tiempo: 'Aproximadamente 8 a 10 horas totales.',
    actividad: 'Validar los 5 ZIP codes del Buy Box con comparables vendidos y comportamiento real del mercado.',
    entregable: 'Mapa de ARV por ZIP con ARV conservador, ARV agresivo, DOM promedio, riesgo principal y decisión final: usar, observar o descartar.',
    pasos: [
      'Tomar los 5 ZIP codes definidos en el Bloque 1.',
      'Buscar mínimo 3 flips vendidos recientemente por cada ZIP.',
      'Buscar propiedades activas y pendientes similares para entender competencia.',
      'Comparar sqft, habitaciones, baños, año, lote, condición y ubicación.',
      'Revisar DOM promedio y velocidad de venta.',
      'Definir ARV conservador por ZIP y eliminar zonas donde el ARV dependa de un solo comparable bonito.'
    ],
    recursos: [
      { nombre: 'Zillow Sold', url: 'https://www.zillow.com', desc: 'Filtro Sold y últimos 6 a 12 meses' },
      { nombre: 'Redfin Data Center', url: 'https://www.redfin.com/news/data-center', desc: 'Datos de DOM, sale-to-list ratio y mercado' },
      { nombre: 'Realtor.com Research', url: 'https://www.realtor.com/research/data', desc: 'Tendencias de mercado' },
      { nombre: 'NeighborhoodScout', url: 'https://www.neighborhoodscout.com', desc: 'Perfil de zona, crimen y demografía' },
      { nombre: 'U.S. Census QuickFacts', url: 'https://www.census.gov/quickfacts', desc: 'Datos poblacionales y económicos' },
      { nombre: 'PropStream', url: 'https://www.propstream.com', desc: 'Comps y datos de propiedades (si tiene acceso)' }
    ],
    errores: [
      'Usar listados activos como prueba de ARV. Los activos son expectativas, no ventas.',
      'Elegir el comparable más alto para justificar una oferta emocional.',
      'Ignorar DOM alto porque "la casa está barata".',
      'Comparar contra casas con remodelación superior, mejor lote o ubicación premium.',
      'No guardar screenshots ni evidencia.'
    ]
  },
  {
    id: 'analisis_mao',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.ofertas_mes === 'cero' || a.ofertas_mes === 'analisis_no_oferta' || a.ofertas_mes === '1_9'),
    etapa: 'E1', subetapa: 'Sistema de análisis, MAO y descarte',
    observacion: 'Repetición. La habilidad no se forma con una propiedad perfecta; se forma analizando varias, descartando rápido y justificando con números. Si no analiza volumen, no desarrolla criterio.',
    tiempo: 'Aproximadamente 6 a 9 horas totales.',
    actividad: 'Crear una plantilla única de análisis y analizar mínimo 10 propiedades, aunque no todas sean buenas. La meta no es encontrar el deal perfecto; es entrenar criterio.',
    entregable: 'Tabla con 10 propiedades analizadas con ARV, rehab, holding costs, closing costs, MAO, decisión y evidencia.',
    pasos: [
      'Crear una plantilla en Google Sheets, Airtable o Taskade.',
      'Por cada propiedad registrar dirección, ZIP, fuente, asking price, ARV, rehab, holding costs, closing costs, fees, profit mínimo, MAO y decisión.',
      'Calcular MAO base: ARV × 75% − Rehab.',
      'Ajustar el MAO por holding costs, closing costs, lender fees, wholesale fee, contingencia y riesgo.',
      'Clasificar cada propiedad: ofertar, negociar o descartar.',
      'Guardar screenshots de comps, fotos relevantes y cálculo final.'
    ],
    recursos: [
      { nombre: 'Airtable', url: 'https://www.airtable.com', desc: 'Tracking de deals y contactos' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Plantilla de análisis' },
      { nombre: 'BiggerPockets Flip Calculator', url: 'https://www.biggerpockets.com/fix-and-flip-calculator', desc: 'Calculadora Fix & Flip' },
      { nombre: 'Flipper Force', url: 'https://www.flipperforce.com', desc: 'Deal analyzer y scope of work' },
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Comps gratuitos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Validación cruzada' }
    ],
    errores: [
      'Cambiar la fórmula para que el deal "cuadre".',
      'No incluir holding costs, utilities, insurance, taxes e intereses.',
      'Usar rehab "a ojo" sin rango ni contingencia.',
      'No descartar rápido propiedades malas.',
      'Enamorarse de una propiedad porque se ve remodelable.'
    ]
  },

  // ━━━━━━━━━━ E2 — ESTRUCTURAR ━━━━━━━━━━
  {
    id: 'capital_stack',
    aplicaA: (p, a) => a.objetivo !== 'lender',
    etapa: 'E2', subetapa: 'Capital Stack real',
    observacion: 'Este es el punto más delicado. No puede decir que está listo si no sabe cuánto earnest money puede poner, cuánto gap puede cubrir y cuánto debe dejar de reserva. El capital teórico no se usa para ofertar.',
    tiempo: 'Aproximadamente 4 a 6 horas totales.',
    actividad: 'Documentar cuánto capital real tiene disponible y separar lo líquido, lo probable y lo teórico.',
    entregable: 'Capital Stack documentado con cash, crédito personal, crédito comercial, dinero familiar, capital privado, earnest money, reserva mínima y capacidad real de cierre.',
    pasos: [
      'Listar todas las fuentes de capital actuales.',
      'Clasificar cada fuente como líquida inmediata, probable o teórica.',
      'Definir cuánto puede usar para earnest money en 24 a 48 horas.',
      'Definir cuánto puede usar para gap sin comprometer su estabilidad.',
      'Definir reserva mínima que no se toca.',
      'Crear una tabla con monto, tiempo de acceso, costo, riesgo y uso permitido.'
    ],
    recursos: [
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Tabla Capital Stack' },
      { nombre: 'Bank of America Business', url: 'https://www.bankofamerica.com/smallbusiness', desc: 'Banca y tarjetas de negocio' },
      { nombre: 'Chase Business', url: 'https://www.chase.com/business', desc: 'Banca y tarjetas de negocio' },
      { nombre: 'Bluevine', url: 'https://www.bluevine.com', desc: 'Online business banking, sin fees' }
    ],
    errores: [
      'Usar todo el crédito para EMD y quedarse sin reserva.',
      'No separar dinero de cierre, rehab, holding y contingencia.',
      'No calcular el gap antes de hablar con HMLs.',
      'Asumir que el HML cubre el 100% — siempre hay equity del estudiante (10-20%).',
      'Contar como capital el HELOC sin haberlo aplicado todavía.'
    ]
  },
  {
    id: 'hml_documentos',
    aplicaA: (p, a) => a.objetivo !== 'lender' && (a.hml_status === 'ninguno' || a.hml_status === 'investigando' || a.hml_status === 'hablado'),
    etapa: 'E2', subetapa: 'HMLs con documentos',
    observacion: 'Las llamadas no cierran propiedades. Los documentos sí. El estudiante puede hablar con 10 HMLs, pero si no tiene términos comparados ni term sheets, todavía no tiene estructura de financiamiento.',
    tiempo: 'Aproximadamente 8 a 10 horas totales.',
    actividad: 'Construir base de 10 HMLs, comparar términos y solicitar term sheets oficiales a mínimo 6.',
    entregable: 'HML Database con 10 fichas + 5 term sheets oficiales + HML primario y backup identificados.',
    pasos: [
      'Armar lista de 10 HMLs: 5 nacionales y 5 locales.',
      'Llamar o escribir a cada uno usando un script profesional.',
      'Documentar tasa, puntos, LTV, LTC, plazo, draw schedule, experiencia requerida y tiempo de cierre.',
      'Preguntar si hacen hard inquiry o soft pull.',
      'Preguntar si aceptan primer flip y si financian rehab.',
      'Solicitar term sheet oficial en PDF a los 5 mejores.',
      'Elegir HML primario y HML backup.'
    ],
    recursos: [
      { nombre: 'Kiavi', url: 'https://www.kiavi.com', desc: 'Cotización HML rápida (32+ estados)' },
      { nombre: 'Lima One Capital', url: 'https://www.limaone.com', desc: 'HML nacional (40+ estados)' },
      { nombre: 'RCN Capital', url: 'https://www.rcncapital.com', desc: 'HML nacional' },
      { nombre: 'Easy Street Capital', url: 'https://www.easystreetcap.com', desc: 'HML y DSCR' },
      { nombre: 'Visio Lending', url: 'https://www.visiolending.com', desc: 'DSCR / rental loans' },
      { nombre: 'HardMoneyHome', url: 'https://hardmoneyhome.com', desc: 'Directorio de hard money por estado' },
      { nombre: 'Scotsman Guide', url: 'https://www.scotsmanguide.com/Profiles/Search', desc: 'Directorio de lenders' }
    ],
    errores: [
      'Aceptar términos verbales sin term sheet.',
      'Solo preguntar tasa e ignorar puntos, fees, draw schedule y prepayment penalty.',
      'No preguntar si aceptan first-time flipper.',
      'No tener HML backup.',
      'Aplicar con todos sin controlar hard inquiries (dañan score).'
    ]
  },
  {
    id: 'base_contactos',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.wholesalers !== '10_mas',
    etapa: 'E2', subetapa: 'Base mínima de contactos',
    observacion: 'Sin flujo no hay criterio. Si solo recibe 1 o 2 propiedades ocasionales, cualquier deal regular parece bueno. La red debe alimentar el análisis semanal.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: 'Construir la base mínima del mercado para no depender de 2 o 3 wholesalers.',
    entregable: 'Base de contactos con: 25 wholesalers, 10 realtors investor-friendly, 5 agentes distressed, 5 REIA/networking, 5 private lenders, 10 HMLs, 5 contratistas, 2 title companies.',
    pasos: [
      'Crear tabla maestra de contactos en Airtable, Google Sheets o Taskade.',
      'Buscar y registrar 25 wholesalers activos.',
      'Buscar 10 realtors investor-friendly y 5 agentes que trabajen distressed properties.',
      'Identificar 5 contactos de REIA o networking local.',
      'Listar 5 posibles private lenders del círculo cercano o red profesional.',
      'Agregar los 10 HMLs del bloque anterior.',
      'Agregar 5 contratistas y 2 title companies investor-friendly.',
      'Clasificar cada contacto: nuevo, contactado, respondió, activo o descartado.'
    ],
    recursos: [
      { nombre: 'BiggerPockets Marketplace', url: 'https://www.biggerpockets.com/marketplace', desc: 'Contactos REI y deals' },
      { nombre: 'Connected Investors', url: 'https://connectedinvestors.com', desc: 'Red nacional de inversionistas' },
      { nombre: 'InvestorLift', url: 'https://www.investorlift.com', desc: 'Deals de wholesalers' },
      { nombre: 'New Western', url: 'https://newwestern.com', desc: 'Wholesaler nacional' },
      { nombre: 'NetWorth Realty', url: 'https://networthrealty.com', desc: 'Wholesaler nacional' },
      { nombre: 'National REIA', url: 'https://nationalreia.org/find-a-reia/', desc: 'Encontrar REIA local' },
      { nombre: 'Meetup', url: 'https://www.meetup.com', desc: 'Eventos de real estate' },
      { nombre: 'Eventbrite', url: 'https://www.eventbrite.com', desc: 'Eventos locales' }
    ],
    errores: [
      'Guardar nombres sin contactar a nadie.',
      'Tener wholesalers fuera de los ZIPs del Buy Box.',
      'No registrar fecha de último contacto.',
      'No pedir referidos a cada contacto.',
      'No distinguir contactos activos de contactos muertos.'
    ]
  },
  {
    id: 'wholesalers_pitch',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.wholesalers !== '10_mas',
    etapa: 'E2/E1', subetapa: 'Wholesalers y pitch de comprador',
    observacion: 'El estudiante debe sonar como comprador serio, no como estudiante explorando. El wholesaler manda primero el deal al buyer que entiende rápido, responde rápido y puede cerrar.',
    tiempo: '5 a 7 horas totales.',
    actividad: 'Enviar el Buy Box a 25 wholesalers y construir un pipeline con calidad de respuesta, EMD típico y flujo real de deals.',
    entregable: 'Wholesaler Pipeline con 25 contactos enviados, mínimo 10 activos y clasificación A/B/C.',
    pasos: [
      'Enviar mensaje inicial con Buy Box de 1 página.',
      'Pedir que lo agreguen a buyer list.',
      'Preguntar ZIPs que cubren, deals por mes, EMD típico y tiempo de cierre.',
      'Preguntar si aceptan inspection period y qué title company usan.',
      'Clasificar A/B/C según calidad y respuesta.',
      'Hacer follow-up a los que no respondan en 48 horas.'
    ],
    recursos: [
      { nombre: 'InvestorLift', url: 'https://www.investorlift.com', desc: 'Deals y wholesalers' },
      { nombre: 'Facebook Groups', url: 'https://www.facebook.com', desc: 'Grupos locales de real estate investors' },
      { nombre: 'BiggerPockets', url: 'https://www.biggerpockets.com', desc: 'Networking y marketplace' },
      { nombre: 'HouseCashin Directory', url: 'https://www.housecashin.com', desc: 'Directorio de wholesalers' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Guardar Buy Box PDF y evidencias' },
      { nombre: 'WhatsApp Business', url: 'https://business.whatsapp.com', desc: 'Seguimiento rápido' }
    ],
    errores: [
      'Escribir mensajes genéricos sin Buy Box.',
      'No decir cómo cierra ni cuánto tarda.',
      'No preguntar EMD antes de ofertar.',
      'No hacer seguimiento en 48 horas.',
      'Creer que por estar en una buyer list ya tiene flujo real.'
    ]
  },
  {
    id: 'contratistas_filtrados',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.gc_status !== 'primario_backup' && a.gc_status !== 'primario',
    etapa: 'E2', subetapa: 'Contratistas filtrados antes del deal',
    observacion: 'No necesitás llevar contratistas a casas que no son serias, pero sí necesitás tenerlos filtrados antes. Cuando aparece el deal no hay tiempo para empezar a buscar quién cotiza.',
    tiempo: 'Aproximadamente 6 a 8 horas totales.',
    actividad: 'Identificar 10 contratistas o GCs, entrevistarlos, validar licencia/seguro y elegir top 3 para cotizar rápido cuando aparezca un deal.',
    entregable: 'Contractor Database con 10 contratistas filtrados + top 3 clasificados A/B/C.',
    pasos: [
      'Buscar 10 contratistas o GCs en su mercado.',
      'Llamarlos y preguntar si trabajan Fix & Flip.',
      'Validar licencia, General Liability y Workers Comp si aplica.',
      'Pedir 2 proyectos recientes con fotos o dirección.',
      'Preguntar tiempos típicos para rehab de $50K, $75K y $100K.',
      'Preguntar si trabajan con contrato y draw schedule.',
      'Clasificar A/B/C y dejar top 3 listos para cotizar.'
    ],
    recursos: [
      { nombre: 'Better Business Bureau', url: 'https://www.bbb.org', desc: 'Revisar quejas y reputación' },
      { nombre: 'Angi', url: 'https://www.angi.com', desc: 'Buscar contratistas' },
      { nombre: 'Thumbtack', url: 'https://www.thumbtack.com', desc: 'Buscar contratistas locales' },
      { nombre: 'Google Business Profile', url: 'https://www.google.com/business/', desc: 'Reviews y reputación' },
      { nombre: 'HomeAdvisor', url: 'https://www.homeadvisor.com', desc: 'Contratistas con rating' }
    ],
    errores: [
      'Contratar al más barato sin verificar licencia ni seguro.',
      'No pedir proyectos recientes.',
      'No preguntar capacidad actual.',
      'No usar draw schedule.',
      'Confundir subcontratista bueno con GC capaz de manejar un flip completo.'
    ]
  },
  {
    id: 'ofertas_justificadas',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.ofertas_mes !== '10_mas',
    etapa: 'E1/E2', subetapa: 'Ofertas justificadas por números',
    observacion: 'Sí puede ofrecer bajo, pero no puede ofrecer bajo sin justificar. La oferta no se negocia desde "quiero pagar menos"; se negocia desde ARV, rehab, costos, riesgo y MAO.',
    tiempo: 'Aproximadamente 5 a 7 horas totales.',
    actividad: 'Preparar 3 paquetes de oferta con números completos y justificación para wholesaler.',
    entregable: '3 ofertas justificadas por MAO, con comps, ARV, rehab, costos, margen y explicación escrita.',
    pasos: [
      'Elegir 3 propiedades con potencial de las 10 analizadas.',
      'Preparar 3 comparables vendidos por propiedad.',
      'Definir ARV conservador, rehab realista, holding costs, closing costs y profit mínimo.',
      'Calcular MAO y oferta máxima.',
      'Redactar explicación breve para el wholesaler.',
      'Enviar oferta o dejarla lista para revisión del mentor.'
    ],
    recursos: [
      { nombre: 'Zillow', url: 'https://www.zillow.com', desc: 'Comps vendidos' },
      { nombre: 'Redfin', url: 'https://www.redfin.com', desc: 'Comps vendidos y DOM' },
      { nombre: 'BiggerPockets Calculator', url: 'https://www.biggerpockets.com/fix-and-flip-calculator', desc: 'Validación de números' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Paquete de oferta' },
      { nombre: 'DocuSign', url: 'https://www.docusign.com', desc: 'Firma de LOI o documentos' },
      { nombre: 'PandaDoc', url: 'https://www.pandadoc.com', desc: 'Alternativa para documentos' }
    ],
    errores: [
      'Ofertar alto por miedo a ofender al wholesaler.',
      'No explicar la oferta con números.',
      'No incluir holding y closing costs.',
      'Usar profit mínimo demasiado bajo.',
      'No guardar evidencia de los comps que respaldan la oferta.'
    ]
  },

  // ━━━━━━━━━━ E5 — ESCALAR ━━━━━━━━━━
  {
    id: 'post_mortem',
    aplicaA: (p, a) => a.deals_cerrados === '1',
    etapa: 'E5', subetapa: 'Post-mortem del primer flip',
    observacion: 'Sin análisis del primer flip, los errores se repiten. El post-mortem convierte experiencia en aprendizaje sistemático. NO empezar el segundo deal sin este documento completo.',
    tiempo: '6-10 horas totales',
    actividad: 'Hacer post-mortem detallado del primer flip: presupuesto real vs plan, cronograma real vs plan, ROI obtenido vs esperado, qué funcionó bien (top 5), qué falló (top 5), 3 procesos a sistematizar.',
    entregable: 'Documento de post-mortem completo + identificación de top 3 SOPs prioritarios para crear antes del próximo deal.',
    pasos: [
      'Reunir bitácoras semanales, budget tracker, fotos antes/después, todas las decisiones registradas.',
      'Análisis financiero: completar tabla presupuesto vs real con variación % por categoría.',
      'Análisis cronograma: comparar fechas planeadas vs reales por hito.',
      'Análisis ROI: ROI esperado vs obtenido + razón principal de variación.',
      'Listar TOP 5 cosas que funcionaron bien (replicar).',
      'Listar TOP 5 cosas que fallaron (corregir).',
      'Identificar 3 procesos críticos que deben sistematizarse en SOPs.',
      'Presentar al coach en sesión 1-a-1.'
    ],
    recursos: [
      { nombre: 'Plantilla Post-Mortem (Anexo C)', url: '#', desc: '10 secciones estructuradas' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Comparativo plan vs real' },
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'Documentación organizada' }
    ],
    errores: [
      'Saltarse el post-mortem por la urgencia del próximo deal.',
      'Post-mortem solo cualitativo sin números.',
      'No presentar al coach (perdés perspectiva externa).',
      'Identificar errores sin diseñar cómo evitarlos en próximo deal.',
      'Empezar segundo deal sin SOPs.'
    ]
  },
  {
    id: 'sops',
    aplicaA: (p, a) => a.deals_cerrados === '1' || a.deals_cerrados === '2_4',
    etapa: 'E5', subetapa: 'SOPs (Standard Operating Procedures)',
    observacion: 'Los SOPs son lo que permite delegar. Sin SOPs todo el conocimiento está en tu cabeza y el negocio no puede crecer. Cada SOP documenta cómo hacer una tarea sin que la haga el dueño.',
    tiempo: '4-6 horas por SOP (total 12-30 horas para top 3-5 SOPs)',
    actividad: 'Crear Standard Operating Procedures escritos para los procesos críticos identificados en el post-mortem.',
    entregable: '3-5 SOPs documentados en Taskade/Notion + validados con prueba real por terceros.',
    pasos: [
      'Tomar los 3-5 procesos priorizados en el post-mortem.',
      'Por cada proceso escribir el SOP con plantilla de 8 secciones (objetivo, responsable, cuándo, herramientas, pasos, criterios éxito, excepciones, checklist).',
      'Validar SOP con prueba real: que una persona DIFERENTE ejecute el proceso solo con el documento.',
      'Ajustar el SOP según fricciones encontradas en la prueba.',
      'Versionar (1.0, 1.1, etc.) y subir a Taskade en sección "SOPs del Negocio".'
    ],
    recursos: [
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'SOPs con estructura potente' },
      { nombre: 'Tango', url: 'https://www.tango.us', desc: 'Graba pasos en pantalla automáticamente' },
      { nombre: 'Loom', url: 'https://www.loom.com', desc: 'Videos tutoriales para SOPs visuales' },
      { nombre: 'Process Street', url: 'https://www.process.st', desc: 'SOPs en formato checklist' }
    ],
    errores: [
      'SOPs genéricos sin pasos específicos accionables.',
      'No validar con tercero (asume claridad que no existe).',
      'No versionar (el SOP se desactualiza sin trazabilidad).',
      'Documentar TODO al mismo tiempo (prioriza top 3-5 primero).',
      'No actualizar SOPs cuando aprendés algo nuevo.'
    ]
  },
  {
    id: 'project_manager',
    aplicaA: (p, a) => a.deals_cerrados === '2_4' || a.deals_cerrados === '5_mas' || (a.objetivo === 'escalar' && a.meta_deals !== '1'),
    etapa: 'E5', subetapa: 'Contratar Project Manager',
    observacion: 'La trampa del flipper es quedarse atrapado en E3 (ejecución) y nunca volver a E1 (evaluación). Sin PM hacés 2-3 flips al año. Con PM hacés 8-12. Es el cuello de botella más importante para escalar.',
    tiempo: '20-30 horas (proceso completo de contratación)',
    actividad: 'Contratar Project Manager que asuma ejecución diaria de obra mientras te enfocás en buscar deals y construir relaciones.',
    entregable: 'PM contratado con contrato firmado + 1 obra delegada totalmente + estudiante reduce 60%+ tiempo en obra.',
    pasos: [
      'Definir perfil del PM (job description con experiencia, hard skills, soft skills).',
      'Publicar vacante en LinkedIn Jobs + Indeed + ZipRecruiter + red de referidos.',
      'Screening + entrevista técnica con mínimo 5 candidatos.',
      'Prueba pagada de 2 semanas con el finalista usando los SOPs.',
      'Contratar formalmente con contrato escrito (KPIs, salario base, bonos por proyecto).',
      'Onboarding con los SOPs + acompañamiento primeras 4 semanas.'
    ],
    recursos: [
      { nombre: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', desc: 'Calidad alta' },
      { nombre: 'Indeed', url: 'https://www.indeed.com', desc: 'Volumen de candidatos' },
      { nombre: 'ZipRecruiter', url: 'https://www.ziprecruiter.com', desc: 'Posting rápido' },
      { nombre: 'AngelList', url: 'https://wellfound.com', desc: 'Para startups y proyectos pequeños' }
    ],
    errores: [
      'Contratar sin prueba pagada (descubrís fit después de 3 meses).',
      'No tener SOPs antes de contratar (PM no tiene cómo operar).',
      'Micromanage al PM (anula el propósito de contratarlo).',
      'Compensación solo base sin bonos por proyecto.',
      'No definir KPIs medibles para el PM.'
    ]
  },

  // ━━━━━━━━━━ (Wholesaling removido del programa) ━━━━━━━━━━
  {
    id: '_deprecated_wholesale',
    aplicaA: () => false,  // No se aplica nunca — kept para evitar romper índices
    etapa: '',  subetapa: '',
    observacion: '', tiempo: '', actividad: '', entregable: '',
    pasos: [], recursos: [], errores: []
  },

  // ━━━━━━━━━━ LENDER PASIVO ━━━━━━━━━━
  {
    id: 'lender_due_diligence',
    aplicaA: (p, a) => a.objetivo === 'lender',
    etapa: 'E1+E5', subetapa: 'Due diligence + estructura legal del préstamo',
    observacion: 'Como lender pasivo no operás el negocio, pero TU plata está en juego. La calidad del operador y la estructura legal del préstamo determinan si recuperás capital + intereses o perdés todo.',
    tiempo: '10-15 horas (proceso completo de evaluación + estructura)',
    actividad: 'Construir framework para evaluar operadores + estructurar legalmente el préstamo con Note + Deed of Trust + 1st lien position.',
    entregable: 'Framework de evaluación de operadores + abogado + title company + 1 deal piloto cerrado con documentación legal correcta.',
    pasos: [
      'Aprender a evaluar deals (ARV, MAO, rehab estimate) — leer Anexo A caso de estudio.',
      'Identificar 3-5 operadores activos (vía REIA local, BiggerPockets, FlipMentoría).',
      'Validar track record de cada operador: cuántos deals cerrados, ROI promedio, referencias.',
      'Contratar abogado de real estate (preparar Note, Deed of Trust, Loan Agreement).',
      'Contratar title company para recording del 1st lien.',
      'Para primer préstamo: empezar con $50K-$100K (no todo el capital).',
      'Establecer cadencia: estados mensuales del operador + visita a propiedad opcional.',
      'Diversificar entre 3-5 operadores en próximos 12 meses.'
    ],
    recursos: [
      { nombre: 'BiggerPockets Lender Forum', url: 'https://www.biggerpockets.com/forums/65-private-lending', desc: 'Comunidad y casos' },
      { nombre: 'AAPL (American Association of Private Lenders)', url: 'https://aaplonline.com', desc: 'Industria y estándares' },
      { nombre: 'PrivateLenderLink', url: 'https://privatelenderlink.com', desc: 'Network + recursos' }
    ],
    errores: [
      'Prestar sin abogado y title company (sin protección legal real).',
      'Aceptar 2nd lien en lugar de 1st lien (mayor riesgo).',
      'No verificar insurance coverage de la propiedad.',
      'No diversificar (todo el capital con 1 operador).',
      'No establecer mecanismo de salida si el operador no paga (judicial foreclosure).'
    ]
  },

  // ━━━━━━━━━━ INTERNACIONAL ━━━━━━━━━━
  {
    id: 'internacional_setup',
    aplicaA: (p, a) => a.inmigracion === 'internacional' || (a.inmigracion === 'itin' && a.deals_cerrados === '0'),
    etapa: 'E0', subetapa: 'Setup específico internacional',
    observacion: 'Inversores internacionales tienen 3 capas extra de complejidad: estructura legal cross-border, tax treaties, financiamiento sin SSN. Estos NO son opcionales — son el setup base.',
    tiempo: '20-30 horas + tiempos de tramitación',
    actividad: 'Setup legal/fiscal completo para invertir desde fuera de USA: LLC USA + ITIN + CPA bilingüe + abogado tax internacional + HMLs que financian non-residents.',
    entregable: 'LLC USA + ITIN obtenido + CPA y abogado bilingües + lista de 3 HMLs que financian non-residents + entender treaties de doble tributación.',
    pasos: [
      'Solicitar ITIN al IRS (Form W-7) — toma 6-11 semanas si lo hacés desde fuera USA.',
      'Formar LLC USA (puede ser single-member, con foreign owner).',
      'Identificar CPA bilingüe especializado en investors internacionales.',
      'Verificar treaty de doble tributación entre tu país y USA.',
      'Investigar HMLs que financian non-residents (algunos lo hacen con 30-40% down).',
      'Considerar estructura holding offshore si el capital lo justifica (consultar abogado).',
      'Aprender glosario técnico en inglés (Anexo C.6).',
      'Decidir si vas a viajar a USA para closings o usar power of attorney.'
    ],
    recursos: [
      { nombre: 'IRS Form W-7 (ITIN)', url: 'https://www.irs.gov/forms-pubs/about-form-w-7', desc: 'Aplicación ITIN' },
      { nombre: 'Northwest Registered Agent', url: 'https://www.northwestregisteredagent.com', desc: 'LLC formation para foreign owners' },
      { nombre: 'America\'s Best Tax Lenders', url: 'https://www.americasbest.com', desc: 'CPAs internacional' },
      { nombre: 'Investopedia 1031 Exchange', url: 'https://www.investopedia.com/terms/s/section1031.asp', desc: 'Concepto USA fundamental' }
    ],
    errores: [
      'Asumir que las reglas de tu país aplican igual en USA.',
      'No obtener ITIN antes de necesitarlo (toma 6-11 semanas).',
      'CPA generalista que no entiende treaties internacionales.',
      'Cerrar deals sin entender tax implications (FIRPTA, withholding 15%).',
      'No considerar que la repatriación de capital tiene reglas específicas.'
    ]
  },

  // ━━━━━━━━━━ RECONSTRUIR CRÉDITO ━━━━━━━━━━
  {
    id: 'reconstruir_credito',
    aplicaA: (p, a) => a.credit === 'menos_600' || a.credit === '600_660' || a.credit === 'sin_historial',
    etapa: 'PRE-E0', subetapa: 'Reconstruir / construir crédito',
    observacion: 'Sin crédito sólido, los HMLs te rechazan o te cobran tasas 3-5 puntos arriba del mercado. El crédito se reconstruye en 6-12 meses con disciplina. Track paralelo al estudio del negocio.',
    tiempo: '2-4 horas setup + cadencia mensual durante 6-12 meses',
    actividad: 'Reconstruir credit score a 660+ FICO en paralelo al setup del negocio (E0). Aplicar herramientas específicas de credit building.',
    entregable: 'Credit score subiendo +50-100 puntos en 6 meses + acceso a HMLs estándar al mes 12.',
    pasos: [
      'Pedir reporte gratis en annualcreditreport.com (las 3 agencias).',
      'Disputar cualquier error en los reportes.',
      'Aplicar a 1 secured credit card (Discover It Secured o Capital One Platinum).',
      'Usar la tarjeta < 30% utilization + pagar 100% a tiempo cada mes.',
      'Pedirle a familiar con buen score que te agregue como authorized user.',
      'Si tenés deudas en colecciones, negociar pay-for-delete con coleccionistas.',
      'Considerar Self Credit Builder Loan ($25-50/mes builds credit history).',
      'Monitor mensual con Credit Karma o Experian Boost.'
    ],
    recursos: [
      { nombre: 'AnnualCreditReport.com', url: 'https://www.annualcreditreport.com', desc: 'Reporte gratis 3 agencias (única página legítima)' },
      { nombre: 'Discover It Secured', url: 'https://www.discover.com/credit-cards/secured', desc: 'Secured card que reporta a 3 agencias' },
      { nombre: 'Capital One Platinum Secured', url: 'https://www.capitalone.com/credit-cards/platinum-secured', desc: 'Alternativa secured card' },
      { nombre: 'Self Credit Builder Loan', url: 'https://www.self.inc', desc: 'Loan que construye historial' },
      { nombre: 'Credit Karma', url: 'https://www.creditkarma.com', desc: 'Monitor mensual gratis' },
      { nombre: 'Experian Boost', url: 'https://www.experian.com/consumer-products/score-boost.html', desc: 'Reportar pagos de utilities' }
    ],
    errores: [
      'Aplicar a 5+ tarjetas a la vez (hard inquiries dañan score).',
      'Cerrar tarjetas viejas (acorta credit history).',
      'Maxing out la tarjeta secured (>30% utilization).',
      'Pagar el balance "casi a tiempo" (1 pago tardío = -60 a -100 puntos).',
      'No disputar errores en los reportes (35% de los reportes tienen errores).'
    ]
  },

  // ━━━━━━━━━━ E3 — EJECUCIÓN DE OBRA ━━━━━━━━━━
  {
    id: 'deal_closing',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.objetivo !== 'escalar',
    etapa: 'E3', subetapa: 'Closing del primer deal',
    observacion: 'Closing es donde se concretan todos los meses de evaluación. El estudiante que llega acá sin documentación completa pierde el deal o paga 2-3x más en sorpresas. El día del closing NO se improvisa — todo se prepara con 2 semanas de anticipación.',
    tiempo: '8-12 horas (preparación) + 2-3 horas (día del closing)',
    actividad: 'Coordinar HML, title company, inspector y abogado para cerrar el deal en 14-21 días desde aceptación de oferta. Cumplir el contingency period sin perder leverage ni earnest money.',
    entregable: 'Title transferida a la LLC + HML fundeado + propiedad lista para iniciar obra.',
    pasos: [
      'Día 1-3 post aceptación: abrir escrow con title company + enviar earnest money.',
      'Día 3-7: inspección general profesional ($400-600). Hallazgos → renegociar o seguir.',
      'Día 7-10: HML completa underwriting. Subir: bank statements 2 meses, credit report, LLC docs, plan del deal.',
      'Día 10-14: HML completa appraisal. Si appraisal viene bajo, renegociar precio o salir.',
      'Día 14-18: title company hace title search. Verificar liens, easements, encumbrances.',
      'Día 18-20: revisar Closing Disclosure (HUD-1) — todos los números, fees, prorrateos.',
      'Día 21: Closing. Firmar 40-60 documentos. Wire del down payment. Recibir keys.',
      'Mismo día: cambiar locks, contratar insurance (Builder\'s Risk policy).'
    ],
    recursos: [
      { nombre: 'Kiavi Borrower Portal', url: 'https://www.kiavi.com', desc: 'Subir docs underwriting' },
      { nombre: 'First American Title', url: 'https://www.firstam.com', desc: 'Title company nacional' },
      { nombre: 'Old Republic Title', url: 'https://www.oldrepublictitle.com', desc: 'Title alternativa' },
      { nombre: 'InterNACHI', url: 'https://www.nachi.org/find-an-inspector', desc: 'Buscar inspector certificado' },
      { nombre: 'Steadily Insurance', url: 'https://www.steadily.com', desc: 'Builder\'s Risk + Vacant insurance' }
    ],
    errores: [
      'No abrir escrow inmediatamente (perder 3-5 días al inicio).',
      'Saltarse inspección general "porque la casa se ve bien".',
      'No leer Closing Disclosure → firmar con $500-2000 en fees inesperados.',
      'No tener Builder\'s Risk insurance el día del closing (riesgo total).',
      'Olvidar cambiar locks el mismo día (el seller puede tener copia).'
    ]
  },
  {
    id: 'obra_kickoff',
    aplicaA: (p, a) => a.objetivo !== 'lender' && a.objetivo !== 'wholesale' && a.objetivo !== 'escalar',
    etapa: 'E3', subetapa: 'Inicio de obra y draw schedule',
    observacion: 'La obra avanza al ritmo de la supervisión. Si el GC sabe que el estudiante visita poco, los tiempos se extienden y la calidad baja. Esta etapa NO se delega completa al GC — el estudiante es el Project Manager.',
    tiempo: '10-15 horas/semana durante 3-6 meses de obra',
    actividad: (p, a) => `Gerenciar activamente la obra como Project Manager: visitas 3x/semana, draw schedule respetado, budget tracker semanal, bitácoras documentadas, change orders firmados. Coordinar permisos e inspecciones con Building Department de ${p.mercado || 'tu ciudad'}.`,
    entregable: 'Obra completa con CO (Certificate of Occupancy) + presupuesto cumplido ±15% + cronograma cumplido ±20% + galería de fotos antes/durante/después.',
    pasos: [
      'Firmar contrato con GC + draw schedule de 6 hitos (10/15/20/20/25/10%).',
      'Aplicar permits en Building Department (Express si <$25K, Standard si más).',
      'Pagar Draw #1 (10%) al firmar — máximo 10% adelantado, nunca más.',
      'Visitar la obra Lun-Mie-Vie. Llevar checklist de fase + 10 fotos por visita.',
      'Reunión semanal con GC: agenda 15min avance + 15min budget + 15min issues + 15min próx semana.',
      'Actualizar Budget Tracker cada lunes con gastos reales por categoría.',
      'Coordinar inspecciones (rough plumbing, electrical, framing, drywall, final).',
      'Documentar TODO change order por escrito antes de aprobar costo extra.',
      'Bitácora semanal cada viernes con KPIs + fotos + decisiones + próx hitos.'
    ],
    recursos: [
      { nombre: 'Asana / ClickUp', url: 'https://asana.com', desc: 'PM software para tracking' },
      { nombre: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', desc: 'Budget Tracker semanal' },
      { nombre: 'Magicplan', url: 'https://www.magicplan.app', desc: 'Medir y documentar obra desde celular' },
      { nombre: 'Home Depot Pro', url: 'https://www.homedepot.com/c/PRO_Services', desc: 'Cuenta pro para materiales + descuentos' },
      { nombre: 'Permit portal de tu ciudad', url: '#', desc: 'Buscar "[tu ciudad] building permits" en Google' },
      { nombre: 'Loom', url: 'https://www.loom.com', desc: 'Videos rápidos para coach y GC' }
    ],
    errores: [
      'Pagar > 10% adelantado al GC (perdés leverage).',
      'No documentar change orders → GC factura $5K-$15K extras "sin haberlo acordado".',
      'Visitar la obra 1x/semana → cronograma se atrasa 2-3 semanas sin que te enteres.',
      'No cumplir cronograma de inspecciones → drywall encima del rough work = retrabajo.',
      'No mantener Builder\'s Risk insurance durante toda la obra.'
    ]
  },

  // ━━━━━━━━━━ E4 — SALIDA (Fix & Flip) ━━━━━━━━━━
  {
    id: 'salida_flip',
    aplicaA: (p, a) => (a.objetivo === 'flip' || a.objetivo === 'hibrido') && a.objetivo !== 'escalar',
    etapa: 'E4', subetapa: 'Listing + venta del primer flip',
    observacion: 'El listing es donde se materializa todo el trabajo. Listing equivocado = 60-90 días en mercado = $5K-$15K en holding extra. Listing bien hecho = venta en 14-30 días sobre asking.',
    tiempo: '20-30 horas (preparación) + 2-6 semanas de listing activo',
    actividad: (p, a) => `Preparar producto final (staging + fotografía) + listing en 4+ plataformas + open house primera semana + negociación de ofertas + closing del comprador final. Objetivo: vender en 14-30 días al precio target.`,
    entregable: 'Propiedad vendida + cheque al banco + HML cancelado + ganancia neta documentada.',
    pasos: [
      'Día 1-3: contratar stager profesional ($2K-$6K) + fotógrafo real estate ($500-$1K).',
      'Día 4-7: sesión de fotos profesionales con drone + video tour 60-90 seg.',
      'Día 8-10: entrevistar 3 agentes investor-friendly. Elegir 1 con DOM promedio <30 días.',
      'Día 10-12: definir precio con CMA + walking number (precio mínimo no negociable).',
      'Día 12-14: activar listing simultáneo en MLS + Zillow + Realtor.com + Facebook.',
      'Día 14-16: open house sábado y domingo (1-4pm). Promover en Facebook + Nextdoor.',
      'Recibir ofertas + negociar con disciplina (NUNCA bajar del walking number).',
      'Closing del comprador: title transfer + payoff HML + ganancia neta a LLC.',
      'Después del closing: archivar TODO en Taskade para post-mortem (E5).'
    ],
    recursos: [
      { nombre: 'RESA Find a Stager', url: 'https://www.realestatestagingassociation.com/Find-a-Stager', desc: 'Stagers certificados' },
      { nombre: 'HomeJab', url: 'https://www.homejab.com', desc: 'Fotografía real estate nacional' },
      { nombre: 'BiggerPockets Agent Finder', url: 'https://www.biggerpockets.com/agents', desc: 'Agentes investor-friendly' },
      { nombre: 'Zillow Listing', url: 'https://www.zillow.com/post-for-sale/', desc: 'Listing directo si tenés license' },
      { nombre: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace', desc: 'Listing local importante' },
      { nombre: 'Open Home Pro', url: 'https://www.openhomepro.com', desc: 'App para registrar visitantes' }
    ],
    errores: [
      'Listar sin staging (DOM se duplica, precio baja 3-5%).',
      'Fotos con celular en lugar de fotógrafo pro (CTR cae 60%).',
      'No definir walking number ANTES de listar → aceptás primera oferta sin saber si era buena.',
      'Agente generalista que no entiende flips → marketing pobre.',
      'No hacer open house primera semana (perdés momentum crítico).'
    ]
  },

  // ━━━━━━━━━━ E4 — SALIDA (Fix & Hold con DSCR refi) ━━━━━━━━━━
  {
    id: 'salida_hold',
    aplicaA: (p, a) => (a.objetivo === 'hold' || a.objetivo === 'hibrido') && a.objetivo !== 'escalar',
    etapa: 'E4', subetapa: 'Rentar + refinanciar con DSCR loan',
    observacion: 'En Fix & Hold, la "salida" es: rentar + refinanciar con DSCR loan para sacar el HML caro y dejar capital trabajando long-term. El DSCR loan se prepara DURANTE la obra para activarse al mes 1 de renta.',
    tiempo: '15-25 horas (proceso completo de leasing + refi)',
    actividad: (p, a) => `Listar propiedad como renta en plataformas según modelo (${a.estrategia_renta || 'tradicional'}), screening de inquilinos, lease firmado, primer mes de renta cobrado, aplicar a DSCR loan para refinanciar el HML.`,
    entregable: 'Propiedad rentada + cash flow mensual positivo + DSCR loan aprobado + HML pagado + capital recuperado para próximo deal.',
    pasos: [
      'Pre-DSCR: aplicar al DSCR lender 4-6 semanas ANTES de terminar obra (Visio, Kiavi, Lima One).',
      'Listar renta en plataformas según modelo (Zillow Rentals + Apartments.com o PadSplit si coliving).',
      'Screening profesional con TurboTenant o TransUnion SmartMove ($30-50).',
      'Firmar lease (template del estado) + cobrar primer mes + security deposit.',
      'Una vez rentada, DSCR completa underwriting: appraisal + rent verification.',
      'Closing del DSCR refi: paga el HML, deja equity en la propiedad, libera capital sobrante.',
      'Establecer cadencia mensual: cobro renta + paga mortgage + categorizar gasto en Stessa.',
      'Considerar property manager (8-10% renta) si vas a escalar a 3+ propiedades.'
    ],
    recursos: [
      { nombre: 'Visio Lending', url: 'https://www.visiolending.com', desc: 'DSCR loan especializado en investors' },
      { nombre: 'Zillow Rental Manager', url: 'https://www.zillow.com/rental-manager', desc: 'Listing renta gratis' },
      { nombre: 'Apartments.com', url: 'https://www.apartments.com', desc: 'Listing renta + screening' },
      { nombre: 'TurboTenant', url: 'https://www.turbotenant.com', desc: 'Screening + leases gratis' },
      { nombre: 'PadSplit', url: 'https://www.padsplit.com', desc: 'Plataforma coliving room-by-room' },
      { nombre: 'Buildium / AppFolio', url: 'https://www.buildium.com', desc: 'PM software cuando escales' }
    ],
    errores: [
      'Esperar a terminar obra para aplicar DSCR → 6-8 semanas extras de holding HML caro.',
      'Aceptar primer inquilino sin screening profesional (eviction cuesta $3K-$8K + 6 meses).',
      'No verificar regulación STR si vas por Airbnb (muchas ciudades USA restringen).',
      'DSCR loan a tasa mala porque no comparaste 3 lenders.',
      'No establecer cash reserves de 6 meses PITI antes de cerrar refi.'
    ]
  },

  // ━━━━━━━━━━ E5 — SISTEMA Y SEGUNDO DEAL ━━━━━━━━━━
  {
    id: 'segundo_deal',
    aplicaA: (p, a) => (a.objetivo === 'flip' || a.objetivo === 'hold' || a.objetivo === 'hibrido') && (a.meta_deals === '2_3' || a.meta_deals === '4_6' || a.meta_deals === '7_mas'),
    etapa: 'E5', subetapa: 'Segundo deal con todo el sistema activado',
    observacion: 'El segundo deal es donde se valida si tenés un negocio o un evento aleatorio. Usá TODO lo aprendido en el post-mortem. NO hagas un segundo deal sin documentar el primero — los errores se repiten.',
    tiempo: '4-7 meses (paralelo: post-mortem del primero + búsqueda del segundo)',
    actividad: 'Aplicar lecciones del post-mortem del primer deal + buscar segundo deal con criterios refinados + ejecutar con SOPs creados.',
    entregable: 'Segundo deal cerrado y completado con ROI ≥ primer deal + 2-3 SOPs validados + capital recuperado disponible para deal #3.',
    pasos: [
      'Completar post-mortem E5.1.1 del primer deal (NO empezar segundo sin esto).',
      'Identificar las 3-5 lecciones críticas a aplicar (errores que NO repetir).',
      'Refinar Buy Box con datos reales del primer deal (ZIPs que funcionaron, los que no).',
      'Crear 2-3 SOPs prioritarios (Evaluación de deal / Manejo de obra / Listing).',
      'Activar pipeline: 25 wholesalers + 5 contactos directos + lead gen propio.',
      'Aplicar criterios MAO más estrictos (margen mínimo 25% vs 20% del primer deal).',
      'Cerrar segundo deal con cronograma ajustado (-15% del primer deal).',
      'Documentar comparativo deal 1 vs deal 2: ROI, tiempo, sorpresas, equipo.'
    ],
    recursos: [
      { nombre: 'Notion / Taskade', url: 'https://www.notion.so', desc: 'Documentar SOPs validados' },
      { nombre: 'BiggerPockets Forum', url: 'https://www.biggerpockets.com/forums', desc: 'Aprender de otros flippers' },
      { nombre: 'Anexo C (Mindset)', url: '#', desc: 'Releer Top 20 errores antes de cada deal nuevo' }
    ],
    errores: [
      'Empezar segundo deal antes de cerrar post-mortem del primero.',
      'No documentar SOPs entre deal 1 y 2 (repetís errores).',
      'No subir el margen mínimo (deal 2 debería tener mejor ROI que deal 1).',
      'No diversificar wholesalers (depender de 1 wholesaler que envió el primer deal).',
      'Hacer deal 2 en mismo ZIP que deal 1 sin validar que el mercado siga igual.'
    ]
  },

  // ━━━━━━━━━━ E5 — META FINAL (5+ deals + equipo) ━━━━━━━━━━
  {
    id: 'sistema_escala',
    aplicaA: (p, a) => a.meta_deals === '4_6' || a.meta_deals === '7_mas' || a.objetivo === 'escalar',
    etapa: 'E5', subetapa: 'Sistema completo para 4+ deals/año',
    observacion: 'Llegar a 4+ deals al año NO es hacer 4 veces más esfuerzo — es construir un sistema donde múltiples deals corren simultáneos sin que vos seas el cuello de botella. Sin PM + SOPs + capital diversificado, te quemás al deal #3.',
    tiempo: '6-12 meses (paralelo a deals activos)',
    actividad: 'Construir infraestructura completa: 5 SOPs documentados + PM contratado + lead gen propio + capital diversificado (HML + Private + DSCR) + dashboard de portfolio.',
    entregable: 'Sistema operativo donde 3 deals corren simultáneos sin descarrilar + estudiante dedica <30% tiempo a obra + cashflow / capital reinvertible cada 60-90 días.',
    pasos: [
      'Crear 5 SOPs maestros: Deal Evaluation, HML Process, Obra Management, Listing & Marketing, Post-Closing.',
      'Validar cada SOP con prueba real (otra persona ejecuta el proceso solo con el doc).',
      'Contratar Project Manager con prueba pagada 2 semanas ($65K-$95K total package).',
      'Construir buyer list propia con lead gen (1 canal dominado: Direct Mail / DfD / FB Ads).',
      'Conseguir 3-5 private money lenders comprometidos ($50K-$250K cada uno).',
      'Implementar dashboard de portfolio (Airtable o Notion) con KPIs por deal.',
      'Reunión semanal de portfolio (1h): estado de 3 deals + bottlenecks + decisiones.',
      'Trimestral: revisar plan anual con coach, ajustar metas, evaluar expansión a segundo mercado.'
    ],
    recursos: [
      { nombre: 'Airtable', url: 'https://www.airtable.com', desc: 'Dashboard de portfolio multi-deal' },
      { nombre: 'Notion', url: 'https://www.notion.so', desc: 'SOPs versionados' },
      { nombre: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', desc: 'Contratar PM' },
      { nombre: 'PropStream', url: 'https://www.propstream.com', desc: 'Lead gen propio' },
      { nombre: 'BiggerPockets PRO', url: 'https://www.biggerpockets.com/pro', desc: 'Tools para investors escalando' }
    ],
    errores: [
      'Escalar a 3 deals sin SOPs (te quemás + calidad cae).',
      'Contratar PM sin prueba pagada (descubrís fit después de 3 meses caros).',
      'Mantener todo el capital en HML (limita escala — diversificar a private + DSCR).',
      'Reunión de portfolio que se vuelve operativa en lugar de estratégica.',
      'Saltar la revisión trimestral con coach (perdés perspectiva externa).'
    ]
  },

  // ━━━━━━━━━━ REVISIÓN MENTOR (siempre) ━━━━━━━━━━
  {
    id: 'revision_mentor',
    aplicaA: (p, a) => true, // Aplica a todos
    etapa: 'Revisión', subetapa: 'Preparación para sesión con mentor',
    observacion: 'La reunión con mentor debe usarse para tomar decisiones, no para organizar información básica. El estudiante debe llegar con evidencia, números y preguntas puntuales.',
    tiempo: 'Aproximadamente 4 a 6 horas totales.',
    actividad: 'Consolidar todo el trabajo en un resumen ejecutivo para revisión con el mentor.',
    entregable: 'Resumen + carpetas/evidencias organizadas en Taskade, Drive o plataforma.',
    pasos: [
      'Consolidar Buy Box final.',
      'Adjuntar Capital Stack y gap máximo disponible.',
      'Adjuntar HML primario, backup y term sheets.',
      'Adjuntar top 10 wholesalers y top 3 contratistas.',
      'Adjuntar 3 paquetes de oferta.',
      'Escribir preguntas puntuales para el mentor.',
      'Subir evidencias a plataforma antes de la sesión.'
    ],
    recursos: [
      { nombre: 'Taskade / FlipTrack', url: 'https://www.taskade.com', desc: 'Subir tareas y evidencias' },
      { nombre: 'Google Drive', url: 'https://drive.google.com', desc: 'Carpeta del caso' },
      { nombre: 'Google Meet', url: 'https://meet.google.com', desc: 'Sesión con mentor' },
      { nombre: 'Google Calendar', url: 'https://calendar.google.com', desc: 'Agendar próximos hitos' }
    ],
    errores: [
      'Llegar a la sesión con dudas generales y sin documentos.',
      'No subir evidencia antes de pedir revisión.',
      'No priorizar una propiedad o caso concreto.',
      'Pedir validación de estrategia sin tener capital y HML claros.',
      'No convertir la reunión en próximos pasos medibles.'
    ]
  }
];

function fmGenerarBloques(p, a) {
  // Filtrar bloques que aplican al perfil
  const bloques = FM_BLOQUES.filter(b => b.aplicaA(p, a));
  // Ordenar por etapa
  const ordenEtapas = { 'PRE-E0': 0, 'E0': 1, 'E1': 2, 'E2': 3, 'E1+E2': 3.5, 'E1+E5': 4, 'E2/E1': 4, 'E1/E2': 4.5, 'E3': 5, 'E4': 6, 'E5': 7, 'Revisión': 99 };
  bloques.sort((a, b) => (ordenEtapas[a.etapa] || 50) - (ordenEtapas[b.etapa] || 50));
  return bloques;
}

function fmRenderDiagPlanLegacyHelpers() { /* placeholder */ }

function fmRenderDiagPlanLegacy() {
  const r = fmState.diagResult;
  const a = r.answers;

  // Contactos clave según perfil (referenciados al Documento A)
  const contactosPorPerfil = {
    1: ['Northwest Registered Agent (LLC)', 'Stessa o QuickBooks (contabilidad)', 'Kiavi (HML nacional)', 'Lima One Capital (HML)', '1 REIA local — buscar en nationalreia.org'],
    2: ['Discover It Secured (reconstruir crédito)', 'Easy Street Capital (HML flexible FICO 600+)', 'Anchor Loans (HML)', 'Partnership con socio con crédito'],
    3: ['Coach asignado (sesión emergencia)', 'Accountability partner del programa', 'Kiavi o Lima One (HML pre-aprobación)', '3-5 wholesalers locales activos'],
    4: ['CPA de real estate (S-Corp election si gana >$80K)', 'Visio Lending (DSCR refi)', 'Private money lenders (5-10 nuevos)', 'Project Manager (cuando llega a 3 deals simultáneos)'],
    5: ['Visio Lending (DSCR loans)', 'PadSplit (coliving si aplica)', 'Furnished Finder (corporate housing)', 'Zillow Rentals + Apartments.com'],
    6: ['PropStream (lead generation)', 'BatchSkipTracing (encontrar owners)', 'DealMachine (driving for dollars)', 'Carrot (website + SEO investor)'],
    7: ['CPA bilingüe internacional', 'Abogado de tax internacional', 'HMLs que financian non-residents', 'Anexo C.6 — glosario términos en inglés'],
    8: ['Operadores activos de FlipMentoría', 'Abogado de real estate (Note + Deed of Trust)', 'Title company para 1st lien recording', 'CPA para estructura del préstamo']
  };

  // Plataformas (referenciadas al Documento B — Stack)
  const plataformasPorPerfil = {
    1: ['Taskade (portal del programa)', 'Stessa (contabilidad real estate gratis)', 'Zillow + Redfin (research)', 'BiggerPockets (network + foros)', 'Calendly (agendar reuniones)'],
    2: ['Credit Karma (monitor de crédito)', 'Experian Boost', 'Taskade', 'Stessa', 'Bluevine o Mercury (online business bank)'],
    3: ['Calendly (forzar reuniones con wholesalers)', 'PropStream (más deal flow)', 'BatchLeads (cold outreach)', 'Loom (videos para coach)'],
    4: ['QuickBooks Online (S-Corp ready)', 'ClickUp o Notion (PM software)', 'Airtable (portfolio tracking)', 'DocuSign (contratos)'],
    5: ['AppFolio o Buildium (PM software)', 'TurboTenant (tenant screening)', 'Rent Manager', 'TransUnion SmartMove (screening)'],
    6: ['PropStream', 'BatchLeads', 'DealMachine', 'Carrot website', 'Mojo Dialer (cold calling)'],
    7: ['Anexo C.6 — glosario', 'Taskade en español + inglés', 'WhatsApp Business para coach', 'Zoom para sesiones remotas'],
    8: ['DocuSign (Notes + Deed of Trust)', 'Title company online portal', 'Excel para tracking de préstamos', 'Calendly para due diligence calls']
  };

  // Calculadoras (Anexo B)
  const calculadorasPorPerfil = {
    1: ['B.1 Deal Analyzer (1-página)', 'B.2 ARV Calculator', 'B.3 MAO Calculator', 'B.4 Rehab Estimator'],
    2: ['B.1 Deal Analyzer', 'B.5 Breakeven Calculator', 'B.10 Cash Flow Projection'],
    3: ['B.1 Deal Analyzer', 'B.3 MAO Calculator', 'B.8 Pipeline Tracker (forzar tracking)'],
    4: ['B.7 Budget Tracker', 'B.8 Pipeline Tracker', 'B.9 KPI Dashboard', 'B.10 Cash Flow Projection'],
    5: ['B.1 Deal Analyzer', 'B.2 ARV', 'Cash-on-Cash custom (no en anexo B — pedir a coach)'],
    6: ['B.3 MAO (para presentar a buyers)', 'B.1 Deal Analyzer simplificado'],
    7: ['Las 10 (B.1 a B.10) — full set, aprovechá todo'],
    8: ['B.5 Breakeven (entender el proyecto que financiás)', 'LTV calculator (custom)']
  };

  // Quick Win por perfil
  const quickWinPorPerfil = {
    1: 'E0.2.3 Opción A: Primera oferta en vivo a una propiedad de Zillow esta semana (con MAO calculado, aunque sea baja)',
    2: 'Track 1: Aplicar a 1 secured credit card HOY (Discover It Secured) + Track 2: Iniciar E0.1.1',
    3: 'Romper la parálisis: enviar 10 ofertas formales esta semana — el volumen elimina el miedo',
    4: 'Bloquear 6-10h este fin de semana para hacer el post-mortem del primer deal',
    5: 'Definir el modelo de renta (tradicional / coliving / Airbnb si aplica zoning) — esto define toda la estrategia',
    6: 'Buscar 3 wholesalers activos en Facebook Groups de tu ciudad + agregarse a sus buyer lists',
    7: 'Conseguir CPA bilingüe especializado en investors internacionales esta semana',
    8: 'Conectar con 1 operador activo (vía REIA local o referido) y pedir ver sus últimos 2 deals'
  };

  // Documentos para profundizar
  const docsPorPerfil = {
    1: ['📘 Índice Maestro', '🏛️ E0 Fundación (TODO)', '📚 Anexo A (caso de estudio)', '🧠 Anexo C (mindset + Top 20 errores)'],
    2: ['🏛️ E0 Fundación (foco 0.1)', '🧠 Anexo C (mindset crítico)', '🗺️ Estados del Estudiante (Perfil #2)'],
    3: ['🧠 Anexo C.7 (plan acción bloqueado)', '🔍 E1.4 (ofertas y negociación)', '🗺️ Estados (Perfil #3)'],
    4: ['🚀 E5 completo (escalar)', '🧠 Anexo C (FAQ E5)', '🗺️ Estados (Perfil #4)'],
    5: ['🔍 E1.1.1 (Buy Box renta)', '🏗️ E2.1 (HML + DSCR refi)', '🗺️ Estados (Perfil #5)'],
    6: ['🚀 E5.2.2 (sistema lead gen)', '🏗️ E2.3 (wholesalers)', '🗺️ Estados (Perfil #6)'],
    7: ['🧠 Anexo C.6 (glosario)', '🏛️ E0 (foco legal/fiscal)', '🗺️ Estados (Perfil #7)'],
    8: ['🏗️ E2.1.3 (private money)', '🧠 Anexo C (mindset del lender)', '🗺️ Estados (Perfil #8)']
  };

  const p = r.perfil;
  const tareasAhora = (r.gaps || []).slice(0, 5);

  return `
    <div class="h-full overflow-y-auto bg-slate-50">
      <div class="max-w-4xl mx-auto px-6 py-6">

        <!-- Header con perfil identificado -->
        <div class="bg-gradient-to-br from-${p.color}-50 to-${p.color}-100 rounded-2xl border-2 border-${p.color}-200 p-6 mb-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="text-xs font-bold text-${p.color}-700 tracking-wider mb-1">PERFIL IDENTIFICADO · #${p.num}</div>
              <h2 class="text-2xl font-bold text-slate-900">${p.emoji} ${p.nombre}</h2>
            </div>
            <button onclick="fmDiagReset()" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50">🔄 Repetir</button>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-4">
            <div class="bg-white bg-opacity-60 rounded-lg p-3">
              <div class="text-xs text-slate-600 font-medium">ETAPA ACTUAL</div>
              <div class="text-lg font-bold text-slate-900">${r.etapa}</div>
            </div>
            <div class="bg-white bg-opacity-60 rounded-lg p-3">
              <div class="text-xs text-slate-600 font-medium">CRONOGRAMA</div>
              <div class="text-sm font-bold text-slate-900">${r.cronograma}</div>
            </div>
          </div>
        </div>

        <!-- Fortalezas -->
        ${r.fortalezas.length ? `
          <div class="bg-white rounded-xl border border-emerald-200 p-5 mb-4">
            <h3 class="font-bold text-emerald-900 mb-3">✅ Fortalezas que ya tenés</h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${r.fortalezas.map(f => `<li class="flex items-start gap-2"><span class="text-emerald-600 mt-0.5">✓</span><span>${f}</span></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Gaps prioritarios -->
        ${tareasAhora.length ? `
          <div class="bg-white rounded-xl border border-amber-200 p-5 mb-4">
            <h3 class="font-bold text-amber-900 mb-3">⚡ Gaps prioritarios (próximas 4 semanas)</h3>
            <div class="space-y-2">
              ${tareasAhora.map((g, i) => `
                <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <div class="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">${i + 1}</div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                      <code class="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">${g.codigo}</code>
                      <span class="text-xs font-bold ${g.prioridad === 'CRÍTICA' ? 'text-red-700' : 'text-amber-700'}">${g.prioridad}</span>
                    </div>
                    <div class="text-sm text-slate-800">${g.titulo}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Quick Win -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 mb-4">
          <h3 class="font-bold text-blue-900 mb-2">🎯 Quick Win — Semana 1</h3>
          <p class="text-sm text-blue-900">${quickWinPorPerfil[p.num]}</p>
        </div>

        <!-- 4 columnas: Contactos / Plataformas / Calculadoras / Lectura -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">📇 Contactos a activar <span class="text-xs font-normal text-slate-500">(Documento A)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(contactosPorPerfil[p.num] || []).map(c => `<li class="flex items-start gap-2"><span class="text-blue-600 mt-0.5">•</span><span>${c}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">🛠️ Plataformas a setupear <span class="text-xs font-normal text-slate-500">(Documento B)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(plataformasPorPerfil[p.num] || []).map(s => `<li class="flex items-start gap-2"><span class="text-indigo-600 mt-0.5">•</span><span>${s}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">🧮 Calculadoras <span class="text-xs font-normal text-slate-500">(Anexo B)</span></h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(calculadorasPorPerfil[p.num] || []).map(c => `<li class="flex items-start gap-2"><span class="text-cyan-600 mt-0.5">•</span><span>${c}</span></li>`).join('')}
            </ul>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <h3 class="font-bold text-slate-900 mb-3 text-sm">📚 Lectura recomendada</h3>
            <ul class="space-y-1.5 text-sm text-slate-700">
              ${(docsPorPerfil[p.num] || []).map(d => `<li class="flex items-start gap-2"><span class="text-fuchsia-600 mt-0.5">•</span><span>${d}</span></li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Acciones finales -->
        <div class="bg-slate-900 text-white rounded-xl p-5">
          <h3 class="font-bold mb-2">📝 Resumen ejecutivo</h3>
          <p class="text-sm text-slate-200 mb-4">
            Sos perfil <strong>#${p.num} (${p.nombre})</strong>, ubicado en etapa <strong>${r.etapa}</strong>.
            Tu cronograma esperado es de <strong>${r.cronograma}</strong>.
            Empezá por el Quick Win esta semana y los ${tareasAhora.length} gaps prioritarios en el próximo mes.
          </p>
          <div class="flex gap-2 flex-wrap">
            <button onclick="fmDiagOpenLibrary()" class="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100">📚 Abrir Biblioteca</button>
            <button onclick="fmDiagPrintPlan()" class="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700">🖨️ Imprimir Plan</button>
            <button onclick="fmDiagCopyPlan()" class="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700">📋 Copiar Plan</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

