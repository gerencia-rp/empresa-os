import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization' };
type Answers = Record<string, unknown>;
type Block = { id: string; etapa: string; subetapa: string; titulo: string; descripcion: string; observacion: string; actividad: string; entregable: string; tiempo: string; pasos: string[]; criterios_exito: string[]; herramientas: string[]; errores_comunes: string[]; recursos: unknown[] };
const val = (a: Answers, key: string) => String(a[key] ?? '').trim();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

function makeBlock(id: string, etapa: string, subetapa: string, titulo: string, observacion: string, entregable: string, pasos: string[]): Block {
  return { id, etapa, subetapa, titulo, descripcion: observacion, observacion, actividad: titulo, entregable, tiempo: '1–4 semanas', pasos, criterios_exito: [entregable + ' está completo y verificable.', 'La evidencia queda guardada en el sistema.'], herramientas: ['Empresa OS', 'Bóveda'], errores_comunes: ['Avanzar sin evidencia.', 'Conservar información solo en mensajes o memoria.'], recursos: [] };
}

function buildPlan(a: Answers) {
  const objetivo = val(a, 'objetivo');
  const deals = val(a, 'deals_cerrados');
  const credit = val(a, 'credit');
  const llc = val(a, 'llc');
  const capital = val(a, 'capital');
  const mercado = val(a, 'mercado_estado') || 'tu mercado objetivo';
  const estrategia = objetivo === 'hold' ? 'Fix & Hold' : objetivo === 'wholesale' ? 'Wholesaling' : objetivo === 'hibrido' ? 'Mix Flip + Hold' : objetivo === 'lender' ? 'Private Lending' : 'Fix & Flip';
  let perfil = { num: 1, nombre: 'Constructor de fundamentos', emoji: '🏁', color: 'blue' }, etapa = 'E0', cronograma = '9–12 meses al primer deal controlado';
  if (objetivo === 'lender') { perfil = { num: 8, nombre: 'Lender pasivo', emoji: '💰', color: 'emerald' }; etapa = 'E2'; cronograma = '30–60 días'; }
  else if (['5_mas', '2_4'].includes(deals)) { perfil = { num: 4, nombre: 'Operador listo para escalar', emoji: '🚀', color: 'rose' }; etapa = 'E5'; cronograma = '90 días para instalar sistemas'; }
  else if (deals === '1') { perfil = { num: 4, nombre: 'Primer deal cerrado', emoji: '📊', color: 'purple' }; etapa = 'E5'; cronograma = '30 días para post-mortem'; }
  else if (objetivo === 'hold') { perfil = { num: 5, nombre: 'Constructor de portafolio de rentas', emoji: '🏘️', color: 'teal' }; }
  else if (['menos_600', '600_660', 'sin_historial'].includes(credit)) { perfil = { num: 2, nombre: 'Capital y crédito en preparación', emoji: '🏗️', color: 'amber' }; }
  else if (llc !== 'no') { perfil = { num: 3, nombre: 'Operador en evaluación', emoji: '🔎', color: 'orange' }; etapa = 'E1'; cronograma = '90 días para dominar análisis y ofertas'; }

  const blocks = [
    makeBlock('fundacion', 'E0', 'Fundación legal y financiera', 'Dejá lista la base del negocio', 'Separá estructura legal, dinero personal y capital del negocio antes de asumir riesgo.', 'Carpeta legal, bancaria y presupuesto operativo', [llc === 'si_mismo' ? 'Verificar que la LLC esté activa en el estado correcto.' : 'Definir la estructura legal adecuada con un profesional.', 'Separar finanzas personales y del negocio.', 'Documentar capital líquido, reservas y costos mensuales.', 'Centralizar documentos legales, fiscales y bancarios.']),
    makeBlock('buybox', 'E1', 'Mercado, Buy Box y ARV', 'Convertí tu estrategia en criterios medibles', 'Un Buy Box específico evita analizar propiedades que nunca deberían llegar a oferta.', `Buy Box escrito y 10 análisis de ${mercado}`, ['Elegir zonas y códigos postales prioritarios.', 'Definir precio, propiedad, alcance y margen mínimo.', 'Validar ARV con comparables vendidos.', 'Analizar 10 oportunidades con el mismo formato.']),
    makeBlock('financiamiento', 'E2', 'Capital y financiamiento', 'Llegá a la oferta con el dinero estructurado', 'Una aprobación verbal no reemplaza términos escritos, reservas ni un plan alternativo.', 'Matriz de financiamiento principal y respaldo', [capital === 'menos_20k' ? 'Definir partnership o private money compatible con tu liquidez.' : 'Separar capital para cierre, obra, holding y contingencia.', 'Solicitar términos escritos de dos fuentes.', 'Calcular puntos, intereses, fees y reservas.', 'Definir exposición máxima por deal.']),
    makeBlock('dealflow', 'E3', 'Deal flow y ofertas', 'Construí una máquina de oportunidades', 'El resultado depende de un proceso semanal constante, no de encontrar una propiedad perfecta.', 'Pipeline con responsables, fechas y próximos pasos', ['Crear fuentes priorizadas de oportunidades.', 'Registrar cada lead y su próxima acción.', 'Analizar solo oportunidades dentro del Buy Box.', 'Enviar ofertas formales y medir conversiones.', 'Revisar el pipeline cada semana.']),
    makeBlock('ejecucion', 'E4', 'Due diligence y ejecución', 'Ejecutá el deal con control', 'La utilidad se pierde cuando alcance, responsables y cambios no quedan documentados.', 'Checklist de cierre, SOW, presupuesto y calendario', ['Completar due diligence legal, física y financiera.', 'Cerrar un SOW detallado.', 'Validar presupuestos, seguros y referencias.', 'Pagar contra hitos y evidencia.', 'Registrar cambios, facturas, fotos y desviaciones.']),
    makeBlock('salida', 'E5', 'Salida, aprendizaje y escala', 'Cerrá el ciclo y mejorá el siguiente deal', 'Sin post-mortem se repiten errores que ya costaron dinero.', 'Reporte final y SOPs actualizados', ['Consolidar ingresos, gastos, tiempos y resultado neto.', 'Comparar resultado real contra Underwriting.', 'Documentar qué funcionó y qué falló.', 'Actualizar Buy Box, proveedores y SOPs.', 'Definir la siguiente meta con capacidad real.']),
  ];
  const start = Math.max(0, blocks.findIndex((b) => b.etapa === etapa));
  const selected = objetivo === 'lender' ? blocks.filter((b) => ['E0', 'E2', 'E5'].includes(b.etapa)) : blocks.slice(start);
  const riesgos = [llc === 'no' ? 'La estructura legal y bancaria todavía requiere completarse.' : '', ['menos_600', '600_660', 'sin_historial'].includes(credit) ? 'El crédito debe trabajarse en paralelo.' : '', 'No avanzar a compra sin reservas y contingencia.'].filter(Boolean);
  return { perfil, etapa, cronograma, userProfile: { mercado, estrategiaLabel: estrategia }, objetivo_operativo: `Construir un sistema repetible de ${estrategia} en ${mercado} con números verificables.`, regla_plan: 'Avanzá cuando el entregable esté completo, no por entusiasmo.', analisis_profundo: [`Tu ruta comienza en ${etapa} según tu diagnóstico.`, 'Cada etapa conserva evidencia para que el aprendizaje no se pierda.'], fortalezas: [deals && deals !== '0' ? 'Ya contás con experiencia real para convertir en procesos.' : 'Estás construyendo el sistema antes de asumir riesgos mayores.'], riesgos, bloques: selected, checklist_final: ['Buy Box medible', 'Financiamiento y reservas documentados', 'Pipeline con próximas acciones', 'Underwriting conservador', 'Post-mortem final'], frase_final: 'Puedo explicar qué compro, por qué, cuánto puedo perder y qué evidencia necesito antes de avanzar.', fromInvite: true, generated_at: new Date().toISOString(), generator_version: 2 };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'método no permitido' }, 405);
  try {
    const { token } = await req.json();
    if (!token) return json({ error: 'token requerido' }, 400);
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: invite, error: inviteError } = await sb.from('edu_diagnostic_invites').select('*').eq('token', token).maybeSingle();
    if (inviteError || !invite) return json({ error: 'invitación no encontrada' }, 404);
    if (!invite.completed_at || !invite.answers) return json({ error: 'el diagnóstico todavía no está completo' }, 409);
    if (!invite.student_id || !invite.mentorship_id) return json({ error: 'invitación sin estudiante o mentoría' }, 422);
    if (invite.result_plan_id) return json({ ok: true, plan_id: invite.result_plan_id, already: true });

    const { data: active } = await sb.from('edu_student_plans').select('id').eq('student_id', invite.student_id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (active?.id) {
      await sb.from('edu_diagnostic_invites').update({ result_plan_id: active.id }).eq('id', invite.id).is('result_plan_id', null);
      return json({ ok: true, plan_id: active.id, recovered: true });
    }

    const fullPlan = buildPlan(invite.answers as Answers);
    const blocks = fullPlan.bloques as Block[];
    const { data: plan, error: planError } = await sb.from('edu_student_plans').insert({ student_id: invite.student_id, mentorship_id: invite.mentorship_id, diagnostico: invite.answers, perfil: fullPlan, bloques_ids: blocks.map((b) => b.id), modo: 'completo', status: 'active' }).select().single();
    if (planError || !plan) {
      const { data: winner } = await sb.from('edu_student_plans').select('id').eq('student_id', invite.student_id).eq('status', 'active').limit(1).maybeSingle();
      if (!winner?.id) throw planError || new Error('No se pudo guardar el plan');
      await sb.from('edu_diagnostic_invites').update({ result_plan_id: winner.id }).eq('id', invite.id);
      return json({ ok: true, plan_id: winner.id, recovered: true });
    }
    const tasks = blocks.flatMap((b, bi) => b.pasos.map((paso, pi) => ({ plan_id: plan.id, student_id: invite.student_id, bloque_id: b.id, bloque_etapa: b.etapa, bloque_subetapa: b.subetapa, bloque_orden: bi, paso_index: pi, paso_text: paso, completed: false })));
    const { error: taskError } = await sb.from('edu_student_plan_tasks').insert(tasks);
    if (taskError) { await sb.from('edu_student_plans').delete().eq('id', plan.id); throw taskError; }
    const { error: linkError } = await sb.from('edu_diagnostic_invites').update({ perfil: fullPlan.perfil, result_plan_id: plan.id }).eq('id', invite.id);
    if (linkError) throw linkError;
    return json({ ok: true, plan_id: plan.id, created: true });
  } catch (error) {
    console.error('[edu-generate-plan-from-invite]', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
