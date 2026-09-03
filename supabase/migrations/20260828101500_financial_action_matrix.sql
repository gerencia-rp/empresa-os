-- Traduce cada control financiero abierto a una cola operativa comprensible.
-- No resuelve ni modifica fuentes: asigna frente, responsable, evidencia exigida
-- y prioridad para que Jarvis pueda coordinar el cierre sin interpretar códigos.

create or replace view public.v_financial_findings_actionable
with (security_invoker=true) as
select f.id,f.check_id,f.empresa,f.clave,f.titulo,f.detalle,f.fuente,
  f.impacto_usd,f.severidad,f.estado,f.first_seen,f.last_seen,
  greatest(0,current_date-f.first_seen::date) dias_abierto,
  case f.check_id
    when 'C1' then 'Conciliación OS ↔ QuickBooks'
    when 'C3' then 'Cierre contable y criterios'
    when 'C4' then 'Cartera y cobranza'
    when 'C7' then 'Rentabilidad de obra'
    when 'C8' then 'Higiene de periodos contables'
    when 'C9' then 'Posibles valores duplicados'
    when 'C10' then 'Intereses y plazo HML'
    when 'C11' then 'Fondos de obra y cobros'
    when 'C12' then 'Nómina y horas de obra'
    when 'C14' then 'Comprobantes de pagos'
    when 'C15' then 'Vencimientos HML'
    when 'C16' then 'Corte Fix & Flip ↔ Rentas'
    when 'C17' then 'Montos fuera de rango'
    when 'C18' then 'Labor asignada a propiedad'
    when 'C19' then 'Inventario de unidades'
    when 'C22' then 'Clasificación de cartera'
    else 'Control financiero sin clasificar'
  end frente,
  case f.check_id
    when 'C1' then 'Controller'
    when 'C3' then 'Controller'
    when 'C4' then 'Financiero Rentas'
    when 'C7' then 'Financiero Remodelación'
    when 'C8' then 'Auditor de Integridad Financiera y Datos'
    when 'C9' then 'Auditor de Integridad Financiera y Datos'
    when 'C10' then 'Financiero Fix & Flip'
    when 'C11' then 'Financiero Fix & Flip + Financiero Remodelación'
    when 'C12' then 'Financiero Remodelación'
    when 'C14' then 'Controller'
    when 'C15' then 'Financiero Fix & Flip'
    when 'C16' then 'Financiero Fix & Flip + Financiero Rentas'
    when 'C17' then 'Financiero Remodelación'
    when 'C18' then 'Ejecución Remodelación'
    when 'C19' then 'Gerente de Rentas'
    when 'C22' then 'Financiero Rentas'
    else 'Auditor de Integridad Financiera y Datos'
  end responsable,
  case f.check_id
    when 'C1' then 'Balance o transacción QBO, registro operativo equivalente y conciliación firmada por cuenta/propiedad.'
    when 'C3' then 'Estado de resultados QBO, periodo OS idéntico y memo de diferencias de criterio o fecha.'
    when 'C4' then 'Ledger del inquilino, pagos aplicados y plan de cobro con responsable y próxima fecha.'
    when 'C7' then 'Presupuesto aprobado, costos reales, facturas y explicación de la variación final.'
    when 'C8' then 'Mes y año corregidos en la fuente, más repetición del cierre sin registros ambiguos.'
    when 'C9' then 'Factura o statement independiente por cada propiedad; si es costo estándar, confirmación documentada.'
    when 'C10' then 'Statement HML, periodos cubiertos, periodo de hueco y extensión sin meses superpuestos.'
    when 'C11' then 'Draw statement, salidas financiadas, factura de Remodelación y origen de cualquier aporte de caja.'
    when 'C12' then 'Horas, nómina, tarifa y propiedad correctas, conciliadas con el costo laboral real.'
    when 'C14' then 'Factura o recibo específico enlazado a cada pago; un enlace general no cuenta como soporte.'
    when 'C15' then 'Payoff, refinanciación, venta o extensión firmada con fecha, monto y comprobante.'
    when 'C16' then 'Primera renta y factura del servicio que demuestren qué empresa asume el periodo.'
    when 'C17' then 'Factura y aprobación del monto; si hay error, corrección confirmada en la fuente.'
    when 'C18' then 'Parte de horas, fechas de obra y propiedad correcta para cada registro reasignado.'
    when 'C19' then 'Conteo real de unidades y campo manual reconciliado en Airtable.'
    when 'C22' then 'Cartera separada entre mes en curso, mora vencida y saldo a favor.'
    else 'Fuente original, corrección confirmada y nueva corrida que deje de disparar la regla.'
  end evidencia_requerida,
  case f.check_id
    when 'C1' then 'Conciliar por cuenta y propiedad; proponer ajuste solo después de identificar la diferencia.'
    when 'C3' then 'Alinear periodo y criterio contable con la contadora antes de comparar resultados.'
    when 'C4' then 'Confirmar deuda neta, contactar y registrar compromiso o escalamiento.'
    when 'C7' then 'Explicar la pérdida, cerrar costos faltantes y registrar la lección para futuros presupuestos.'
    when 'C8' then 'Completar el año faltante y repetir la clasificación del periodo.'
    when 'C9' then 'Verificar cada documento; aceptar como estándar o corregir el valor copiado.'
    when 'C10' then 'Eliminar doble conteo o registrar la extensión real con soporte.'
    when 'C11' then 'Conciliar draw, salidas y cobro; identificar cualquier aporte de caja sin inventar su origen.'
    when 'C12' then 'Cargar o reasignar nómina y horas a la propiedad correcta.'
    when 'C14' then 'Adjuntar soportes empezando por mayor impacto; no aprobar pagos sin evidencia.'
    when 'C15' then 'Confirmar estado con el HML y registrar payoff, salida o extensión real.'
    when 'C16' then 'Mover el gasto a la empresa responsable y conservar trazabilidad entre compañías.'
    when 'C17' then 'Confirmar contra factura y corregir solo si el monto fuente está equivocado.'
    when 'C18' then 'Reasignar labor a la obra correcta y reconciliar nómina afectada.'
    when 'C19' then 'Corregir el conteo manual y volver a reconciliar ocupación.'
    when 'C22' then 'Usar el informe canónico y dejar de sumar cuentas por cobrar corrientes como mora.'
    else 'Asignar dueño, validar la fuente y definir una resolución verificable.'
  end siguiente_accion,
  case
    when f.severidad='critica' then 'inmediata'
    when current_date-f.first_seen::date>=30 then 'vencida'
    when current_date-f.first_seen::date>=14 then 'prioritaria'
    else 'seguimiento'
  end prioridad_operativa
from public.ct_findings f
where f.active and f.resolved_at is null and f.archived_at is null;

grant select on public.v_financial_findings_actionable to authenticated;
comment on view public.v_financial_findings_actionable is
  'Cola financiera accionable: traduce controles a frente, responsable, evidencia y próxima acción sin cerrar hallazgos.';
