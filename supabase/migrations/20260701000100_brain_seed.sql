-- 🧠 Seed de memoria del Cerebro (idempotente: reemplaza las filas fuente='seed').
-- Embedding NULL al insertar; se rellena con backfill (Voyage) si hay key.
DELETE FROM pm_brain_memory WHERE fuente = 'seed';
INSERT INTO pm_brain_memory (tipo, texto, fuente) VALUES
('hecho', 'Portafolio: 19 casas activas, 34 unidades. REGLA DE UNIDADES: las habitaciones de una misma casa cuentan JUNTAS como 1 unidad; cada estudio, apartamento o casa completa = 1 unidad. Ocupación oficial del portafolio ≈82% (ocupadas/34). Nunca reportar 49 (conteo físico de habitaciones) como "unidades".', 'seed'),
('hecho', 'Modelo de negocio: compran casas y las subdividen. Un ADU se parte en 2 estudios; o el 1er piso queda como Casa Completa y el 2º piso como estudios. Por eso una misma casa puede tener "Casa Completa + estudios" como unidades REALES separadas — no es un error de datos.', 'seed'),
('hecho', 'Zonas del portafolio: Norte, Sur, Round Rock y Marlin.', 'seed'),
('hecho', 'Hipotecas ≈$45,719/mes en total. Cada casa tiene su fecha de inicio y tipo de préstamo (HML o REF 30) y se carga como gasto fijo mensual por casa desde su fecha real. En varias casas el HML cubría los primeros meses, por eso la hipoteca aparece recién desde cierto mes.', 'seed'),
('hecho', 'Casas en rojo conocidas: 514 Ramble (EN VENTA; 100% ocupada pero $0 facturado = problema de REGISTRO/COBRANZA, no de ocupación), 6107 Idlewood (mismo patrón ocupada sin ingreso), 7105 Bethune (baja ocupación real), 6203 Shadow y 902 Virginia.', 'seed'),
('decisión', 'Limpiezas de datos ya hechas: Barkbridge pasó a Casa Completa; la inquilina "Jackelin Gonzales" se unificó con "Jackelin Gonzales Fernandez"; los Estudios 2 y 3 de 407 Capitol son Jose Ernesto Perez y Justin Parkhill; el "Estudio 1" duplicado de 1607 Picnic se renombró Estudio 3 (ambos tienen inquilino).', 'seed'),
('hecho', 'Reglas duras del sistema: NUNCA borrar inquilinos ni pagos (se marcan Pasado/Histórica); la app es SOLO LECTURA de datos (Airtable es la fuente de verdad, ahí se corrige); las contraseñas de accesos viven en Airtable (se recomienda un password manager); la pestaña Feeds fue eliminada.', 'seed');
