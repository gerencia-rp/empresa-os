# C7 — Ventas verificadas usando únicamente los recursos actuales

**Estado:** RentCast como ARV automático aprobado; evidencia documental como mejora de confianza
**Fecha:** 2026-08-25
**Decisión de Nicolás:** no contratar ni integrar ATTOM ni otra fuente nueva.

## Fuentes permitidas

El ARV solo podrá usar cierres sustentados por evidencia que ya posee o aporta el equipo:

1. **Appraisals** con sales-comparison approach y tabla de comparables cerrados.
2. **HUD/CD o documentos de cierre** que demuestren precio y fecha de una operación.
3. **Exportes o reportes MLS/CMA** obtenidos legítimamente por el equipo o su realtor.
4. **Datos internos confirmados** de propiedades propias, cuando exista el documento de cierre asociado.

RentCast se usa como fuente automática del ARV mediante su **AVM de valor**. Sus estados `Active`/`Inactive` no se convierten artificialmente en cierres: los listings se muestran como contexto y temperatura. Cuando existan comparables documentados, el motor profesional de ventas verificadas tiene prioridad; si no existen, el AVM de RentCast entrega el número y la UI lo identifica como estimado.

## Admisión de un comparable

Cada comparable debe conservar:

- `status=sold|closed`;
- `sale_type=arms_length` confirmado por el documento o revisión humana responsable;
- `sale_price>0` y `close_date`;
- dirección y, cuando esté disponible, APN u otro identificador;
- archivo fuente, fecha de carga, persona que verificó y página/sección de evidencia;
- nivel de evidencia según `AI-EVIDENCE-CONTRACT.md`.

Si falta un dato obligatorio, el comparable individual queda como referencia con peso cero. Esto no elimina el ARV: se usa el AVM de RentCast como respaldo automático. La confirmación humana no sustituye el documento: registra quién interpretó la evidencia.

## Flujo mínimo en ambos productos

1. El usuario carga o vincula appraisal, HUD/CD o reporte MLS/CMA.
2. El sistema extrae candidatos sin declararlos automáticamente válidos.
3. Una vista de revisión muestra dirección, precio, fecha, tipo de venta y evidencia.
4. El responsable confirma o rechaza cada comparable.
5. Se guarda el registro normalizado con vínculo al documento y auditoría.
6. El motor contractual recibe exclusivamente los comparables confirmados.
7. Si no hay ventas documentadas suficientes, RentCast AVM entrega el ARV estimado y muestra su rango; el contexto activo queda separado.

## Gate para cerrar C7

- Esquema de evidencia y almacenamiento aprobado.
- Importador de appraisal/HUD/MLS implementado sin exponer documentos privados.
- Revisión humana y trazabilidad funcionando.
- Prueba con documentos reales ya disponibles y fixtures anonimizados.
- Paridad Empresa OS ⇄ Bóveda.
- QA antes de cualquier despliegue.

El ARV no queda vacío. La cascada obligatoria es: ventas documentadas → RentCast AVM → appraisal/ARV existente → superficie × valor por pie cuadrado configurado para la zona. La fuente y confianza siempre se muestran. La evidencia documental incrementa la confianza y permite sustituir los respaldos por la mediana profesional.
