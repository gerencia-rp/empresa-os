(function () {
  'use strict';

  const STORAGE_KEY = 'empresa-os-growth-demo-v1';

  const clone = value => JSON.parse(JSON.stringify(value));

  const DEMO_SNAPSHOT = {
    meta: {
      mode: 'demo',
      label: 'Datos de demostración',
      period: 'Semana 36, 2026',
      updatedAt: '2026-09-03T08:40:00-05:00',
      owner: 'Nicolás Lara'
    },
    directive: {
      title: 'Convertir alcance en conversaciones calificadas',
      summary: 'La audiencia crece, pero pocas personas levantan la mano. Esta semana priorizamos pruebas, objeciones y CTA con recurso concreto.',
      focus: 'Leads calificados',
      target: '350 leads',
      confidence: 'hipótesis demo'
    },
    communicationPlaybook: {
      title: 'De información correcta a una idea que se recuerda',
      thesis: 'La atención se gana con tensión relevante; la confianza se conserva cuando la promesa, la prueba y la entrega coinciden.',
      source: 'Marco incorporado desde una transcripción externa analizada · septiembre 2026',
      formula: ['Dato', 'Beneficio', 'Escena concreta'],
      principles: [
        { id: 'experience-backwards', name: 'Empezar por la experiencia', rule: 'Definir primero qué debe entender, sentir o decidir la audiencia; después elegir información, formato y tecnología.' },
        { id: 'purposeful-surprise', name: 'Sorpresa con propósito', rule: 'Romper el patrón con un contraste, objeto, pregunta o demostración que revele el problema; nunca con ruido o engaño.' },
        { id: 'identity-reframe', name: 'Reencuadre de identidad', rule: 'Mostrar la elección entre seguir operando por intuición o convertirse en alguien que decide con método, sin atacar a la persona.' },
        { id: 'radical-clarity', name: 'Claridad repetible', rule: 'Reducir cada pieza a una idea que otra persona pueda explicar en diez segundos sin jerga ni contexto adicional.' },
        { id: 'scene-translation', name: 'Del dato a la escena', rule: 'Traducir cada cifra o característica a un beneficio y luego a una situación visible de la vida del operador.' },
        { id: 'credibility-bank', name: 'Banco de credibilidad', rule: 'Tratar cada promesa como deuda: mostrar evidencia, declarar límites y entregar al menos lo prometido.' },
        { id: 'facts-over-force', name: 'Hechos sin presión', rule: 'Ante una objeción, pausar, reconocer lo válido, presentar hechos, reencuadrar y devolver la conversación a la audiencia.' }
      ],
      weeklyUse: [
        'Una tensión central por pieza, no cinco mensajes compitiendo.',
        'Una prueba visible antes del CTA.',
        'Una escena concreta que haga tangible el beneficio.',
        'Una revisión de credibilidad antes de aprobar.'
      ]
    },
    funnel: [
      { id: 'reach', label: 'Alcance', value: 218400, target: 300000, unit: '', conversion: null },
      { id: 'audience', label: 'Audiencia', value: 18940, target: 22000, unit: '', conversion: 8.7 },
      { id: 'leads', label: 'Leads calificados', value: 286, target: 350, unit: '', conversion: 1.5 },
      { id: 'calls', label: 'Agendas', value: 41, target: 52, unit: '', conversion: 14.3 },
      { id: 'sales', label: 'Ventas', value: 9, target: 12, unit: '', conversion: 22.0 }
    ],
    platforms: [
      { id: 'instagram', name: 'Instagram', short: 'IG', planned: 7, goal: 5, reach: 86400, trend: 18 },
      { id: 'tiktok', name: 'TikTok', short: 'TK', planned: 6, goal: 5, reach: 72100, trend: 31 },
      { id: 'youtube', name: 'YouTube', short: 'YT', planned: 5, goal: 5, reach: 32700, trend: 12 },
      { id: 'linkedin', name: 'LinkedIn', short: 'IN', planned: 5, goal: 5, reach: 16300, trend: 9 },
      { id: 'x', name: 'X', short: 'X', planned: 7, goal: 5, reach: 10900, trend: -4 }
    ],
    firstDay: {
      title: 'Poner la semana en marcha sin publicar por accidente',
      outcome: 'Al terminar, Nicolás tendrá una directiva revisada, señales priorizadas, piezas decididas, riesgos visibles y un paquete listo para entrega manual.',
      steps: [
        { id: 'directive', order: 1, title: 'Confirmar la directiva semanal', detail: 'Validar foco, meta, hipótesis y tensión narrativa antes de producir.', owner: 'Nicolás', view: 'command', status: 'pending' },
        { id: 'radar', order: 2, title: 'Priorizar el radar de señales', detail: 'Elegir qué probar y qué descartar antes de que pierda vigencia.', owner: 'Radar de viralidad', view: 'radar', status: 'pending' },
        { id: 'agents', order: 3, title: 'Ejecutar y revisar los nueve agentes', detail: 'Probar cada misión y conservar evidencia de entradas, entregas y controles.', owner: 'Gerencia de crecimiento', view: 'lab', status: 'pending', calculated: 'agents' },
        { id: 'angles', order: 4, title: 'Revisar avatar y ángulo', detail: 'Confirmar dolor, objeción y promesa de cada apuesta.', owner: 'Avatares y ángulos', view: 'approval', status: 'pending' },
        { id: 'approval', order: 5, title: 'Decidir las piezas pendientes', detail: 'Aprobar o devolver con una razón concreta.', owner: 'Nicolás', view: 'approval', status: 'pending', calculated: 'approval' },
        { id: 'quality', order: 6, title: 'Cerrar hallazgos del Consejo', detail: 'Ninguna entrega sale con controles abiertos.', owner: 'Consejo de calidad', view: 'quality', status: 'pending', calculated: 'quality' },
        { id: 'connections', order: 7, title: 'Revisar conexiones externas', detail: 'Confirmar qué está verificado y qué exige configuración.', owner: 'Arquitectura', view: 'today', status: 'blocked', calculated: 'connections' },
        { id: 'handoff', order: 8, title: 'Preparar la entrega semanal', detail: 'Exportar el paquete manual mientras Metricool y Drive no estén activos.', owner: 'Orquestador', view: 'calendar', status: 'pending' },
        { id: 'learning', order: 9, title: 'Registrar la decisión de aprendizaje', detail: 'Dejar explícito qué repetir, detener o probar después.', owner: 'Analítica', view: 'learning', status: 'pending' }
      ]
    },
    agentTest: {
      brief: 'Prueba operativa sobre datos de demostración: diseñar una semana multiplataforma para atraer conversaciones calificadas con personas que analizan su primer Fix & Flip y suelen subestimar costos indirectos. Aplicar el sistema de comunicación incluido en el snapshot: tensión relevante, reencuadre, claridad repetible, dato→beneficio→escena y credibilidad. El objetivo es evaluar coordinación, adaptación nativa, CTA, riesgos y aprendizaje; no publicar ni presentar cifras ficticias como resultados reales.',
      inputLabel: 'Escenario de prueba · datos demo',
      rule: 'Las salidas son propuestas para revisión humana. Ningún agente publica, agenda, envía mensajes ni escribe en sistemas externos.'
    },
    signals: [
      { id: 'signal-1', platform: 'instagram', source: 'Exploración manual demo', pattern: 'Costo invisible explicado con objeto físico', window: '48 horas', fit: 'Alto', decision: 'pending', why: 'Une autoridad, prueba visible y una objeción frecuente.' },
      { id: 'signal-2', platform: 'tiktok', source: 'Exploración manual demo', pattern: 'Decisión contrarreloj con tres opciones', window: '24 horas', fit: 'Alto', decision: 'test', why: 'Permite participación y una adaptación nativa de ritmo rápido.' },
      { id: 'signal-3', platform: 'youtube', source: 'Búsquedas demo', pattern: 'Desglose de un error completo, no una lista', window: '14 días', fit: 'Medio', decision: 'pending', why: 'Responde intención profunda y puede originar recortes.' },
      { id: 'signal-4', platform: 'linkedin', source: 'Conversaciones demo', pattern: 'Decisión difícil narrada con datos y aprendizaje', window: '7 días', fit: 'Alto', decision: 'test', why: 'Construye autoridad sin tono promocional.' },
      { id: 'signal-5', platform: 'x', source: 'Exploración manual demo', pattern: 'Checklist abierto sin evidencia', window: '12 horas', fit: 'Bajo', decision: 'discard', why: 'El formato circula, pero no demuestra una ventaja propia.' }
    ],
    alerts: [
      { id: 'alert-1', severity: 'high', title: 'Leads por debajo del ritmo', detail: 'Faltan 64 leads para la meta semanal. Revisar CTA y distribución.', owner: 'Conversaciones y CTA' },
      { id: 'alert-2', severity: 'medium', title: 'Dos piezas esperan aprobación', detail: 'El calendario del viernes depende de estas decisiones.', owner: 'Gerencia de crecimiento' },
      { id: 'alert-3', severity: 'info', title: 'X perdió tracción', detail: 'La frecuencia está cubierta, pero el alcance cae 4% en la muestra.', owner: 'Analítica y aprendizaje' }
    ],
    stages: [
      { id: 'signals', label: 'Tendencias', verb: 'Detectar', count: 18, status: 'done', owner: 'Radar de viralidad', sla: 'Diario 07:10', detail: 'Señales con contexto, vida útil y ajuste de marca.' },
      { id: 'strategy', label: 'Estrategia', verb: 'Priorizar', count: 8, status: 'done', owner: 'Gerencia de crecimiento', sla: 'Lunes 08:00', detail: 'Apuestas semanales por objetivo, avatar y ángulo.' },
      { id: 'production', label: 'Producción', verb: 'Crear', count: 25, status: 'planned', owner: 'Fábrica de contenido', sla: 'Lun a jue', detail: 'Piezas demo propuestas con gancho, valor, prueba y siguiente acción.' },
      { id: 'approval', label: 'Aprobación', verb: 'Decidir', count: 2, status: 'attention', owner: 'Nicolás', sla: 'Jueves 16:00', detail: 'Revisión humana de precisión, marca, riesgo y prioridad.' },
      { id: 'quality', label: 'Consejo de calidad', verb: 'Verificar', count: 3, status: 'attention', owner: 'Consejo de calidad', sla: 'Jueves 17:00', detail: 'Controles independientes antes de autorizar calendario o entrega.' },
      { id: 'calendar', label: 'Calendario', verb: 'Programar', count: 30, status: 'planned', owner: 'Orquestador', sla: 'Viernes 09:00', detail: 'Distribución demo adaptada por plataforma, sin conexión de publicación.' },
      { id: 'publish', label: 'Publicación', verb: 'Distribuir', count: 0, status: 'planned', owner: 'Publicación multiplataforma', sla: 'Pendiente de Metricool', detail: 'Sin salidas reales: Metricool no está configurado.' },
      { id: 'metrics', label: 'Métricas', verb: 'Medir', count: 0, status: 'planned', owner: 'Analítica y aprendizaje', sla: 'Pendiente de Metricool', detail: 'La muestra es ficticia; no hay ingestión automática de resultados.' },
      { id: 'learning', label: 'Aprendizaje', verb: 'Reinvertir', count: 6, status: 'attention', owner: 'Gerencia de crecimiento', sla: 'Domingo 18:00', detail: 'Decisiones comprobables que alimentan la próxima estrategia.' }
    ],
    teams: [
      {
        id: 'management', name: 'Gerencia de crecimiento', area: 'Dirección', status: 'supervised', cadence: 'Lunes 08:00 y domingo 18:00',
        mission: 'Elegir el cuello de botella y convertirlo en una apuesta semanal medible.',
        inputs: ['Embudo completo', 'Alertas', 'Aprendizajes validados'],
        outputs: ['Directiva semanal', 'Prioridades', 'Decisiones para Nicolás'],
        kpis: ['Leads calificados', 'Agendas', 'Ventas'], lastRun: 'Ejecución demo · 08:02', nextRun: 'Cadencia propuesta · domingo 18:00'
      },
      {
        id: 'virality', name: 'Radar de viralidad', area: 'Descubrimiento', status: 'active', cadence: 'Diario 07:10',
        mission: 'Detectar señales aprovechables antes de que pierdan relevancia.',
        inputs: ['Tendencias por canal', 'Referentes', 'Comentarios y búsquedas'],
        outputs: ['Radar priorizado', 'Patrones de gancho', 'Ventana de oportunidad'],
        kpis: ['Señales útiles', 'Tiempo a producción', 'Alcance'], lastRun: 'Ejecución demo · 07:12', nextRun: 'Cadencia propuesta · 07:10'
      },
      {
        id: 'avatars', name: 'Avatares y ángulos', area: 'Estrategia', status: 'active', cadence: 'Lunes y jueves',
        mission: 'Relacionar dolores, deseos y objeciones con una promesa comprobable.',
        inputs: ['Conversaciones', 'Objeciones', 'Resultados por segmento'],
        outputs: ['Mapa de ángulos', 'Hipótesis de mensaje', 'Criterios de prueba'],
        kpis: ['Retención', 'Respuestas útiles', 'Conversión por avatar'], lastRun: 'Ejecución demo · 17:40', nextRun: 'Cadencia propuesta · jueves 09:30'
      },
      {
        id: 'production', name: 'Fábrica de contenido', area: 'Producción', status: 'supervised', cadence: 'Lunes a jueves 10:00',
        mission: 'Convertir una apuesta en piezas nativas para cinco plataformas.',
        inputs: ['Brief aprobado', 'Prueba', 'Formato y canal'],
        outputs: ['Guion', 'Paquete visual', 'Adaptaciones por canal'],
        kpis: ['Piezas listas', 'Retrabajo', 'Tiempo de ciclo'], lastRun: 'Ejecución demo · 10:18', nextRun: 'Cadencia propuesta · 10:00'
      },
      {
        id: 'magnets', name: 'Lead magnets', area: 'Conversión', status: 'active', cadence: 'Martes 11:00',
        mission: 'Crear recursos que resuelvan el siguiente problema real del prospecto.',
        inputs: ['CTA ganadores', 'Preguntas frecuentes', 'Oferta vigente'],
        outputs: ['Recurso', 'Página o entrega', 'Criterio de calificación'],
        kpis: ['Tasa de solicitud', 'Consumo', 'Lead calificado'], lastRun: 'Ejecución demo · 11:21', nextRun: 'Cadencia propuesta · martes 11:00'
      },
      {
        id: 'conversations', name: 'Conversaciones y CTA', area: 'Conversión', status: 'attention', cadence: 'Cada 2 horas, 09:00-19:00',
        mission: 'Transformar intención visible en conversación útil y siguiente paso.',
        inputs: ['Comentarios', 'Mensajes', 'Palabras clave'],
        outputs: ['Respuesta sugerida', 'Calificación', 'Agenda o nutrición'],
        kpis: ['Respuesta', 'Lead calificado', 'Agenda'], lastRun: 'Ejecución demo · 14:05', nextRun: 'Cadencia propuesta · cada 2 horas'
      },
      {
        id: 'nurture', name: 'Nutrición', area: 'Conversión', status: 'planned', cadence: 'Miércoles y sábado',
        mission: 'Mantener confianza hasta que el prospecto esté listo para avanzar.',
        inputs: ['Lead calificado', 'Etapa', 'Objeción principal'],
        outputs: ['Secuencia', 'Historia de prueba', 'Próxima conversación'],
        kpis: ['Respuesta diferida', 'Agenda asistida', 'Tiempo a venta'], lastRun: 'Sin ejecución real', nextRun: 'Cadencia propuesta · miércoles 12:00'
      },
      {
        id: 'analytics', name: 'Analítica y aprendizaje', area: 'Inteligencia', status: 'active', cadence: 'Diario 20:30',
        mission: 'Explicar qué funcionó, para quién y qué debe cambiar después.',
        inputs: ['Métricas por pieza', 'Embudo', 'Decisiones humanas'],
        outputs: ['Patrones ganadores', 'Alertas', 'Experimentos'],
        kpis: ['Aprendizajes accionables', 'Lift por iteración', 'Datos completos'], lastRun: 'Ejecución demo · 20:36', nextRun: 'Cadencia propuesta · 20:30'
      },
      {
        id: 'quality', name: 'Consejo de calidad', area: 'Aseguramiento', status: 'attention', cadence: 'Jueves 17:00 y antes de cada entrega',
        mission: 'Encontrar riesgos y mejoras antes de autorizar una pieza, una campaña o una versión del sistema.',
        inputs: ['Piezas aprobadas', 'Plan por plataforma', 'Resultados de pruebas', 'Cambios del sistema'],
        outputs: ['Dictamen verificable', 'Hallazgos con responsable', 'Decisión de salida'],
        kpis: ['Hallazgos resueltos', 'Retrabajo posterior', 'Controles con evidencia'], lastRun: 'Revisión demo · 13:40', nextRun: 'Cadencia propuesta · jueves 17:00'
      }
    ],
    pieces: [
      {
        id: 'piece-1', title: 'El costo invisible de un flip barato', format: 'Reel', category: 'autoridad',
        platforms: ['instagram', 'tiktok', 'youtube'], owner: 'Fábrica de contenido', status: 'pending', due: 'Jue 16:00',
        avatar: 'Profesional que evalúa su primer deal', angle: 'El precio de compra no decide solo',
        hook: 'Ese flip no cuesta lo que dice el contrato.', proof: 'Desglose demo de cinco costos ignorados',
        cta: 'Comentá NÚMEROS para recibir la hoja de revisión.', risk: 'Validar que ningún monto se presente como caso real.',
        asset: { label: 'Guion y hoja visual', status: 'missing', detail: 'Sin archivo real en Drive.' }
      },
      {
        id: 'piece-2', title: 'La pregunta que evita contratar al GC equivocado', format: 'Carrusel', category: 'valor',
        platforms: ['instagram', 'linkedin'], owner: 'Fábrica de contenido', status: 'pending', due: 'Jue 16:00',
        avatar: 'Operador con una obra en puerta', angle: 'Seleccionar por proceso, no por precio',
        hook: 'Antes del presupuesto, pedile esto.', proof: 'Lista demo de evidencia y referencias',
        cta: 'Escribí FILTRO para recibir el checklist.', risk: 'Evitar promesas legales o garantías.',
        asset: { label: 'Carrusel y checklist', status: 'missing', detail: 'Sin archivo real en Drive.' }
      },
      {
        id: 'piece-3', title: 'Lo que aprendí de una semana sin alcance', format: 'Post', category: 'personalidad',
        platforms: ['linkedin', 'x'], owner: 'Nicolás', status: 'approved', due: 'Vie 09:00',
        avatar: 'Emprendedor que publica sin sistema', angle: 'Aprender del resultado sin dramatizar',
        hook: 'Publicar más no arregló el problema.', proof: 'Reflexión en primera persona, datos demo rotulados',
        cta: 'Responder con el cuello de botella actual.', risk: 'Sustituir los números demo antes de publicar.',
        asset: { label: 'Texto final', status: 'missing', detail: 'Sin archivo real en Drive.' }
      },
      {
        id: 'piece-4', title: 'Deal rápido: comprar, pasar o renegociar', format: 'Video', category: 'comunidad',
        platforms: ['youtube', 'instagram'], owner: 'Nicolás', status: 'scheduled', due: 'Sáb 11:00',
        avatar: 'Flipper que necesita criterio', angle: 'Decisión acompañada por la audiencia',
        hook: 'Tenés 30 segundos para decidir este deal.', proof: 'Escenario completamente ficticio',
        cta: 'Votar y explicar la decisión.', risk: 'Mostrar “caso ficticio” durante todo el ejercicio.',
        asset: { label: 'Video y recortes', status: 'missing', detail: 'Sin archivo real en Drive.' }
      },
      {
        id: 'piece-5', title: 'Tres señales de que tu análisis está incompleto', format: 'Hilo', category: 'conversión',
        platforms: ['x', 'linkedin'], owner: 'Avatares y ángulos', status: 'revision', due: 'Vie 12:00',
        avatar: 'Analista autodidacta', angle: 'Incertidumbre visible antes de ofertar',
        hook: 'Si no podés responder estas tres preguntas, todavía no tenés un deal.', proof: 'Criterios de decisión, sin cifras operativas',
        cta: 'Solicitar el mapa de decisión.', risk: 'CTA todavía demasiado genérico.',
        asset: { label: 'Hilo final', status: 'missing', detail: 'Sin archivo real en Drive.' }
      },
      {
        id: 'piece-6', title: 'De comentario a conversación calificada', format: 'Historia', category: 'conversión',
        platforms: ['instagram'], owner: 'Conversaciones y CTA', status: 'draft', due: 'Lun 14:00',
        avatar: 'Seguidor con interés activo', angle: 'Dar el siguiente paso sin presión',
        hook: 'Si ya guardaste tres videos, esta pregunta es para vos.', proof: 'Secuencia demo con encuesta y respuesta',
        cta: 'Elegir entre analizar, financiar o ejecutar.', risk: 'Requiere revisión de tono.',
        asset: { label: 'Secuencia de historias', status: 'missing', detail: 'Sin archivo real en Drive.' }
      }
    ],
    calendar: [
      { id: 'cal-1', day: 'Lun', time: '09:00', platform: 'instagram', pieceId: 'piece-6', status: 'draft' },
      { id: 'cal-2', day: 'Mar', time: '11:30', platform: 'tiktok', pieceId: 'piece-1', status: 'pending' },
      { id: 'cal-3', day: 'Mié', time: '08:15', platform: 'x', pieceId: 'piece-5', status: 'revision' },
      { id: 'cal-4', day: 'Jue', time: '17:30', platform: 'linkedin', pieceId: 'piece-2', status: 'pending' },
      { id: 'cal-5', day: 'Vie', time: '09:00', platform: 'linkedin', pieceId: 'piece-3', status: 'approved' },
      { id: 'cal-6', day: 'Vie', time: '12:30', platform: 'x', pieceId: 'piece-3', status: 'approved' },
      { id: 'cal-7', day: 'Sáb', time: '11:00', platform: 'youtube', pieceId: 'piece-4', status: 'scheduled' },
      { id: 'cal-8', day: 'Sáb', time: '18:00', platform: 'instagram', pieceId: 'piece-4', status: 'scheduled' }
    ],
    metrics: {
      weekly: [
        { week: 'S31', reach: 128400, leads: 172, calls: 24, sales: 5 },
        { week: 'S32', reach: 146900, leads: 188, calls: 27, sales: 6 },
        { week: 'S33', reach: 171200, leads: 221, calls: 31, sales: 6 },
        { week: 'S34', reach: 198700, leads: 264, calls: 38, sales: 8 },
        { week: 'S35', reach: 218400, leads: 286, calls: 41, sales: 9 }
      ],
      patterns: [
        { id: 'pattern-1', name: 'Error costoso + prueba visual', signal: '+42% retención', evidence: '4 piezas demo', action: 'Probar con avatar avanzado' },
        { id: 'pattern-2', name: 'Historia personal + decisión', signal: '+31% respuestas', evidence: '3 piezas demo', action: 'Adaptar a LinkedIn y X' },
        { id: 'pattern-3', name: 'CTA con recurso específico', signal: '+1.8x leads', evidence: '5 piezas demo', action: 'Mantener una palabra por recurso' }
      ],
      experiments: [
        { id: 'exp-1', hypothesis: 'La prueba visual supera al consejo hablado', metric: 'Retención 50%', status: 'running', owner: 'Radar de viralidad' },
        { id: 'exp-2', hypothesis: 'Un CTA diagnóstico califica mejor que una guía general', metric: 'Lead a agenda', status: 'planned', owner: 'Lead magnets' },
        { id: 'exp-3', hypothesis: 'LinkedIn convierte mejor una historia que un carrusel técnico', metric: 'Conversaciones', status: 'review', owner: 'Analítica y aprendizaje' }
      ]
    },
    qualityCouncil: {
      status: 'blocked',
      verdict: 'No listo todavía',
      summary: 'Tres controles de demostración requieren evidencia o corrección antes de autorizar la salida.',
      reviewedAt: '2026-09-03T13:40:00-05:00',
      scope: 'Semana 36 y versión demo del centro de mando',
      reviewers: [
        { id: 'social-strategy', name: 'Estrategia de redes', specialty: 'Coherencia del portafolio, objetivo y embudo', status: 'passed', finding: 'La cobertura semanal cumple el mínimo demo y cada pieza tiene un trabajo en el embudo.', evidence: 'Matriz de 5 plataformas y directiva semanal' },
        { id: 'virality-validation', name: 'Validación de viralidad', specialty: 'Gancho, retención, prueba y potencial de distribución', status: 'improve', finding: 'Una pieza todavía abre con una afirmación genérica y necesita una prueba más visible.', evidence: 'Revisión de 6 briefs demo' },
        { id: 'instagram-specialist', name: 'Especialista Instagram', specialty: 'Reels, carruseles, historias y conversación', status: 'passed', finding: 'Hay adaptación por formato y una interacción explícita en historias.', evidence: 'Plan de Instagram demo' },
        { id: 'tiktok-specialist', name: 'Especialista TikTok', specialty: 'Ritmo, lenguaje nativo y respuesta rápida', status: 'improve', finding: 'Falta documentar una variante de apertura exclusiva para TikTok.', evidence: 'Brief multicanal de la pieza 1' },
        { id: 'youtube-specialist', name: 'Especialista YouTube', specialty: 'Idea, empaque, retención y recortes', status: 'passed', finding: 'La pieza larga incluye promesa, prueba y adaptación vertical prevista.', evidence: 'Paquete YouTube demo' },
        { id: 'linkedin-specialist', name: 'Especialista LinkedIn', specialty: 'Autoridad, datos y conversación profesional', status: 'passed', finding: 'El ángulo se apoya en decisiones y evita el tono promocional genérico.', evidence: 'Plan de LinkedIn demo' },
        { id: 'x-specialist', name: 'Especialista X', specialty: 'Densidad, apertura y continuidad del hilo', status: 'improve', finding: 'El CTA de un hilo sigue siendo demasiado amplio para atribuir conversaciones.', evidence: 'Revisión de pieza 5' },
        { id: 'ai-quality', name: 'Calidad de IA y patrones', specialty: 'Trazabilidad, repetición, sesgo y calidad de salidas', status: 'passed', finding: 'Cada recomendación demo expone hipótesis y muestra; no se afirma certeza de viralidad.', evidence: 'Patrones y experimentos demo' },
        { id: 'engineering', name: 'Arquitectura, lógica y seguridad', specialty: 'Errores, permisos, privacidad y degradación segura', status: 'passed', finding: 'El prototipo no usa credenciales, separa repositorio de UI y contempla estados de error.', evidence: 'Pruebas locales del prototipo' },
        { id: 'orchestration', name: 'Orquestación de agentes', specialty: 'Misiones, contratos, reglas y transferencias', status: 'passed', finding: 'Todos los equipos muestran misión, entradas, entregas, horario y KPIs.', evidence: 'Directorio de equipos demo' },
        { id: 'project-management', name: 'Gerencia de proyecto', specialty: 'Responsables, cadencia, dependencias y bloqueos', status: 'passed', finding: 'Las decisiones pendientes tienen responsable y ventana de revisión.', evidence: 'Flujo y alertas demo' },
        { id: 'data-auditor', name: 'Auditor de datos y KPIs', specialty: 'Procedencia, completitud, atribución y aprendizaje', status: 'passed', finding: 'Las cifras están marcadas como demostración y los patrones declaran tamaño de muestra.', evidence: 'Embudo y aprendizaje demo' },
        { id: 'communication-editor', name: 'Dirección de comunicación', specialty: 'Tensión, reencuadre, claridad, escenas y credibilidad', status: 'passed', finding: 'El sistema exige una idea central, prueba visible y traducción de datos a consecuencias humanas.', evidence: 'Sistema de comunicación · marco externo sintetizado' },
        { id: 'brand-risk', name: 'Marca, promesa y riesgo', specialty: 'Precisión, ética, accesibilidad y reputación', status: 'passed', finding: 'No hay promesas de viralidad ni de ausencia total de fallos.', evidence: 'Guardrails de contenido y mensajes de estado' }
      ]
    },
    integrations: [
      { id: 'supabase-auth', name: 'Supabase · acceso', purpose: 'Sesión privada y permisos', status: 'unverified', action: 'Se verifica al entrar con una cuenta administradora.' },
      { id: 'supabase-growth', name: 'Supabase · datos Growth', purpose: 'Persistencia, auditoría y aprendizaje', status: 'not_configured', action: 'Crear el esquema versionado y activar el adaptador de Growth.' },
      { id: 'drive', name: 'Google Drive', purpose: 'Guiones, recursos y entregables', status: 'not_configured', action: 'Agregar la cuenta de servicio y carpeta raíz en Vercel.' },
      { id: 'metricool', name: 'Metricool', purpose: 'Calendario, publicación y métricas', status: 'not_configured', action: 'Agregar token, usuario y blog de Metricool en Vercel.' }
    ]
  };

  class DemoGrowthRepository {
    constructor(options) {
      this.options = options || {};
    }

    async getSnapshot() {
      if (this.options.fail) throw new Error('No pudimos cargar el centro de mando de demostración.');
      if (this.options.delay) await new Promise(resolve => setTimeout(resolve, this.options.delay));
      const snapshot = clone(DEMO_SNAPSHOT);
      const saved = this.readSavedState();
      snapshot.pieces = snapshot.pieces.map(piece => ({ ...piece, ...(saved.pieces[piece.id] || {}) }));
      snapshot.signals = snapshot.signals.map(signal => ({ ...signal, ...(saved.signals[signal.id] || {}) }));
      snapshot.qualityCouncil.reviewers = snapshot.qualityCouncil.reviewers.map(reviewer => ({ ...reviewer, ...(saved.qa[reviewer.id] || {}) }));
      const openFindings = snapshot.qualityCouncil.reviewers.filter(reviewer => reviewer.status !== 'passed').length;
      snapshot.qualityCouncil.status = openFindings ? 'blocked' : 'passed';
      snapshot.qualityCouncil.verdict = openFindings ? 'No listo todavía' : 'Listo con controles aprobados';
      snapshot.qualityCouncil.summary = openFindings
        ? `${openFindings} controles de demostración requieren evidencia o corrección antes de autorizar la salida.`
        : 'Todos los controles de demostración tienen evidencia registrada. La decisión final sigue siendo humana.';
      snapshot.firstDay.steps = snapshot.firstDay.steps.map(step => {
        if (step.calculated === 'approval') return { ...step, status: snapshot.pieces.some(piece => ['pending', 'revision'].includes(piece.status)) ? 'pending' : 'completed' };
        if (step.calculated === 'quality') return { ...step, status: openFindings ? 'pending' : 'completed' };
        return { ...step, ...(saved.firstDay[step.id] || {}) };
      });
      return snapshot;
    }

    async updatePieceStatus(pieceId, status) {
      const allowed = ['draft', 'pending', 'approved', 'revision', 'scheduled'];
      if (!allowed.includes(status)) throw new Error('Estado de revisión no válido.');
      const saved = this.readSavedState();
      saved.pieces[pieceId] = { ...(saved.pieces[pieceId] || {}), status };
      saved.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return { pieceId, status, demo: true };
    }

    async updateQaCheck(reviewerId, status) {
      const allowed = ['passed', 'improve'];
      if (!allowed.includes(status)) throw new Error('Estado de control no válido.');
      const saved = this.readSavedState();
      saved.qa[reviewerId] = { ...(saved.qa[reviewerId] || {}), status };
      saved.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return { reviewerId, status, demo: true };
    }

    async updateFirstDayStep(stepId, status) {
      if (!['pending', 'completed'].includes(status)) throw new Error('Estado de jornada no válido.');
      const saved = this.readSavedState();
      saved.firstDay[stepId] = { status };
      saved.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return { stepId, status, demo: true };
    }

    async updateSignalDecision(signalId, decision) {
      if (!['pending', 'test', 'discard'].includes(decision)) throw new Error('Decisión de señal no válida.');
      const saved = this.readSavedState();
      saved.signals[signalId] = { decision };
      saved.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return { signalId, decision, demo: true };
    }

    async reset() {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }

    readSavedState() {
      try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return { pieces: value.pieces || {}, qa: value.qa || {}, firstDay: value.firstDay || {}, signals: value.signals || {}, updatedAt: value.updatedAt || null };
      } catch (_) {
        return { pieces: {}, qa: {}, firstDay: {}, signals: {}, updatedAt: null };
      }
    }
  }

  class EmptyGrowthRepository {
    async getSnapshot() {
      const snapshot = clone(DEMO_SNAPSHOT);
      snapshot.meta.mode = 'empty';
      snapshot.meta.label = 'Estado vacío de demostración';
      snapshot.funnel = [];
      snapshot.alerts = [];
      snapshot.signals = [];
      snapshot.firstDay.steps = [];
      snapshot.stages = [];
      snapshot.teams = [];
      snapshot.pieces = [];
      snapshot.calendar = [];
      snapshot.metrics.weekly = [];
      snapshot.metrics.patterns = [];
      snapshot.metrics.experiments = [];
      snapshot.qualityCouncil.reviewers = [];
      return snapshot;
    }
  }

  window.GrowthData = {
    createRepository(mode) {
      if (mode === 'empty') return new EmptyGrowthRepository();
      if (mode === 'error') return new DemoGrowthRepository({ fail: true, delay: 240 });
      return new DemoGrowthRepository({ delay: 380 });
    },
    contracts: {
      repository: ['getSnapshot()', 'updatePieceStatus(pieceId, status)', 'updateQaCheck(reviewerId, status)', 'updateFirstDayStep(stepId, status)', 'updateSignalDecision(signalId, decision)', 'reset()'],
      futureAdapters: ['GoogleDriveRepository', 'MetricoolRepository', 'SupabaseGrowthRepository']
    }
  };
})();
