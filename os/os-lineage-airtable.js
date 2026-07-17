// ════════════════════════════════════════════════════════════════
// 🧭 REGISTRO EXACTO DE AIRTABLE — GENERADO (no editar a mano).
// Regenerar con: AIRTABLE_API_KEY=... node scripts/lineage-airtable-gen.mjs
// Fuente: API meta de Airtable (nombres/IDs EXACTOS de base·tabla·campo, 17-jul-2026)
// + config REAL de los syncs (supabase/functions — la base efectiva que lee la app HOY).
// Verificado 17-jul-2026: los secrets AIRTABLE_BASE_ID / _FF / _REMODEL NO están
// seteados en Supabase → el default del código ES la base efectiva de cada sync.
// Lo consume os/os-lineage.js (Mapa de Conexiones /mapa).
// ════════════════════════════════════════════════════════════════
/* eslint-disable */
(function () {
  'use strict';

  // ─── La base que lee la app HOY, por módulo (alias del mapa → identidad real) ───
  window.LM_AT_BASES = {
    'Fix & Flip': { tipo: 'airtable', id: 'applMXFyPq1hXj7iN', nombre: 'Flipping Rentals matriz ', modulo: 'sync-ff-airtable', env: 'AIRTABLE_BASE_ID_FF' },
    'Rentas': { tipo: 'airtable', id: 'apptTKRYbx6gu701i', nombre: 'Empresa Rentas — Modelo Nuevo (sandbox)', modulo: 'pm-sync-airtable', env: 'AIRTABLE_BASE_ID' },
    'Remodelación': { tipo: 'airtable', id: 'appwFRqnkyyRljOld', nombre: 'Empresa de Remodelación', modulo: 'sync-remodel-airtable · sync-remodel-workers', env: 'AIRTABLE_BASE_ID_REMODEL' },
    'Contable / QBO': { tipo: 'qbo', id: null, nombre: 'QuickBooks Online', modulo: 'qb-oauth · qb-sync', realms: [
      { empresa: 'fix_flip', company: 'Flipping Rentals LLC', realm: '9341456865356422' },
      { empresa: 'remodelacion', company: 'Structure One LLC', realm: '9341456789703342' },
      { empresa: 'rentas', company: 'EverHome LLC', realm: '9341456789885517' },
      { empresa: 'educacion', company: 'Rental Profits LLC', realm: '9341456789875094' }
    ] },
    'ClickUp (espejo)': { tipo: 'clickup', id: null, nombre: 'ClickUp API → espejo clickup_tasks_mirror', modulo: 'sync-clickup' },
    'Supabase (vista)': { tipo: 'supabase', id: null, nombre: 'Supabase nezbaljfhhyznhltpjnk (vistas del OS)', modulo: '—' }
  };

  // ─── Otras bases de Airtable con nombre PARECIDO que la app NO lee (anti-confusión) ───
  window.LM_AT_OTRAS = [
    { id: 'appzEnsuy4qPT6iHj', nombre: 'Empresa Rentas', nota: 'base VIEJA deprecada (cutover 29-jun-2026)' },
    { id: 'appHZs8DWIBhwhunZ', nombre: 'Empresa Rentas', nota: 'no conectada al OS' },
    { id: 'appQRDa3usFb6Loei', nombre: 'Empresa Rentas (Ejemplo)', nota: 'base de ejemplo' },
    { id: 'appvfqSPiwuiD1iLm', nombre: 'Flipping Rentals matriz  Plantilla', nota: 'plantilla — NO es la que lee sync-ff' },
    { id: 'app0XnxP7XtQJL1sC', nombre: 'Rental Profitss | Producción', nota: 'no conectada al OS' }
  ];

  // ─── Alias de tabla usados en el linaje → nombre real en Airtable ───
  window.LM_AT_TALIAS = {
    'pagos hml': 'Pagos interes (HML & REFI)',
    'nomina admin': 'Nomina Equipo Administrativo - Remodelación',
    'plataformas': 'Gasto Por Plataformas - Remodelación',
    'gastos empresariales ff': 'Gastos Equipo Fix and Flip'
  };

  // ─── Esquema exacto: baseId → tableId → { n: nombre exacto, f: { fieldId: nombre exacto } } ───
  window.LM_AT_SCHEMA = {

    // ═══ Empresa Rentas — Modelo Nuevo (sandbox) ═══
    'apptTKRYbx6gu701i': {
      'tblisRfa2IW02ltCL': { n: '🏠 Casas', f: {
        'fld1ZJXQndjw79IO1': 'Dirección', 'fldlgIZi2Tx30Z639': 'Zona', 'fldxHBhZP4JrTks29': 'Modelo de Negocio',
        'fldsr8FGN6y5OsaEr': 'Unidades', 'fldmRNmQdq6ocx3q2': 'Estado', 'fldueu9f3umYV27z7': 'Notas',
        'fld28PzWHJHFxmkVu': 'Inquilinos', 'fld0XI5S0sgkwvAXr': 'Reservas', 'fld0uhozeUiMLoB17': 'Pagos',
        'fldCevxXzydCgWauK': 'Gastos', 'fldBBbzyqAaBZdd6U': 'Unidades 2', 'fldiPCIMrkabbS1vR': 'Accesos',
        'fldnukNsOSGMk1nEQ': 'WiFi Nombre', 'fldMlhg35OmZwJA5i': 'WiFi Clave', 'fldohaq4JEfOuYiCj': 'Drive',
        'fldFsDu4p97kXAwh9': '# Habitaciones', 'fldOmRE1auWzA7RTj': 'Unidades (conteo)', 'fldEgUHBZxwnFr6Ot': 'Ingresos',
        'fldnlWCf3csy8kskG': 'Gastos totales', 'fldzS5U14IgLy4ngc': 'Rentabilidad', 'fldFl17XcifFcu68P': 'Unidades ocupadas',
        'fldQt9g6M07E166Wr': '% Ocupación', 'fldvyb3pip9EI8Tef': 'Hipoteca mensual', 'fldKuVpYVzh7JzRP8': 'Código de acceso',
        'fldfhZBsTWv01bg2L': 'Tareas Mantenimiento', 'fldsovAQ8HLefRp4Y': 'Inicio Hipoteca', 'fldn2af5YZi9Y12Hj': 'Tipo Préstamo',
        'fldnQv6eSGaUTuAtD': 'Nota Hipoteca' } },
      'tblXuFC9azHTZGjmE': { n: '👤 Inquilinos', f: {
        'flddqJeRovK6Hoxx0': 'Nombre', 'fldr9V8dpcuFQhvS0': 'Teléfono', 'flde117ojmuCdVnQu': 'Estado Cliente',
        'fldUqcPdrxxwoVXLz': 'Tipo de Renta', 'fldkvSFigcof1c5Cg': 'Monto Renta', 'fldmK1GKgpS2Pm21c': 'Fecha Inicio',
        'fld4fnXiwSYRYEWHy': 'Fecha Fin', 'fldVz4dXzg8Pg8nn9': 'Método de Pago', 'fldeTQFmUfpeZNpZk': 'Casa',
        'fldF1ea5nvH0nHWaM': 'Reservas', 'fldFE1LFOjFsmzuXY': 'Pagos', 'fldjR53AYIjaopndK': 'Alerta Contrato',
        'fldjpVuBes0xpGN5c': 'Observación IA', 'fldUAKKmHnzl6q7FU': 'Unidades', 'fldJ4tTS1NEtWTKKw': 'Depósito',
        'fldOWBlHEeVoTpHHj': 'Tiempos de pago' } },
      'tblzz3fokkBprEpIm': { n: '📅 Reservas', f: {
        'fld9fNiZbMNRVGioI': 'Reserva', 'fldFKmuQlwK3ABKtV': 'Unidad / Habitación', 'fldPj5rGjT0F71D18': 'Fecha Entrada',
        'fldjfrjwVTS9og5QF': 'Fecha Salida', 'flda3APWY41IFIkU0': 'Estado', 'fldBi4LqUYkX7Yu2f': 'Casa',
        'fldZJGnRFauzi8kM1': 'Inquilino', 'fldsGIfPe05k8Q2Wa': 'Pagos', 'fldPbGSnYMEhbX79X': 'Unidad (link)' } },
      'tbl5p63dUEhrzgHVJ': { n: '💵 Pagos', f: {
        'fldc3bGGY0JZMeODz': 'Pago', 'fld0RYuPMMUpcgnoF': 'Casa', 'fldyuK8LIIe6ucJ6b': '🚪 Unidades',
        'fld4plr3PqxUksUgo': 'Pago realizado', 'fldpUSJ1HdZQmQPMH': 'Renta pactada - Contrato', 'flduMsIV5gZRIv1eU': 'Balance de pago',
        'fld6lAfD9vg7fUv6T': 'Fecha de Pago', 'fldZp3MbTaJMyFftZ': 'Mes', 'fld5MWlLjaCNxaJ1I': 'Año',
        'fldfrgInDS8MQp12Z': 'Plataforma', 'fldyrBFPPdTyDw2EJ': 'Comprobante', 'fld01OK8T8TJl8ZXb': 'Inquilino',
        'fldU0KUvfPEdpp1tY': 'Reserva', 'fldlvCJbf2CgTspx5': 'Revisar inquilino', 'fldxPjAl31sz3fLGF': 'Observación',
        'fldBVvODboUMNwqHR': 'Conciliación IA' } },
      'tblGBQ5xn9Zp6YrTN': { n: '📤 Gastos X Casa', f: {
        'fld3anzEcnkjUd8Wg': 'Concepto', 'fldrCKw1ODHixzyi6': 'Tipo de Gasto', 'fldfjaeafdA2lS99K': 'Valor',
        'fldHnaieHa4XRCS7A': 'Fecha', 'fldc2AxqIU7xJldZE': 'Mes', 'fldtoc3jPdOZ5A2M3': 'Año',
        'fldFGenqtv8piockd': 'Factura', 'fld3NuV9K8Wxg86bL': 'Casa', 'fldhHLYaoS8VhfuTZ': 'Ámbito',
        'fldXvDCxeGqG6uwue': 'Observación', 'fldHYqdwU7Xr0q1ea': 'Enlace a Drive', 'fldRBQYhmIWsjUr6W': 'Responsable de pago' } },
      'tblItO7iMZT9QS87y': { n: '🚪 Unidades', f: {
        'fld1YmPcUiBlHbcye': 'Unidad', 'fldq2nGAAzyFsYbUU': 'Tipo de Unidad', 'fldQUeZq6LlBDUTob': 'Etiqueta',
        'fldPXwcneyhx7GPfB': 'Estado', 'fldkVcVVoAInhf6H1': 'Casa', 'fld36cAgIi5WfX1Vm': 'Inquilino actual',
        'fldON9xnHpWgiuMz0': 'Reservas', 'fldUrTYKTmnJFMa9G': 'Cantidad de baños', 'fldgzt12iBgwvrJce': 'Tipo de baño',
        'fldVfGtDVG0MdKpeh': 'Mobiliario', 'fldgT2qWEHUJ8juCK': 'Renta objetivo', 'fldc6V8g3ezEmaTwQ': 'Enlace a Drive',
        'fldvyq3nl4rwZPiF8': 'Accesos y códigos', 'fldqZKuz5F1VGFhr7': 'Observaciones', 'fldISqZ9ApqgPaHiZ': '💵 Pagos' } },
      'tblfb63Yhn0NIMDNw': { n: '🔑 Accesos', f: {
        'fldiAGNHPO8ieYrcF': 'Servicio', 'fldCmDi12qdwmFD9c': 'Categoría', 'fldV2yIKzsCNnnRB3': 'Usuario o Correo',
        'fldzyp9gzUMexAZ5p': 'Clave', 'fldzsUenXndDo2ohg': 'Casa', 'fld4JiSfJ5ONWsZKC': 'Observación' } },
      'tbl9dJXwI9Vn3kjKy': { n: 'Gastos x Empresa', f: {
        'fldTkGSK4rwO4VeBM': 'Concepto', 'fldS8m6mtZpiT1Lfb': 'Tipo de Gasto', 'fldOXIxBa41E7dqev': 'Valor',
        'fldI3Zjvp7OiGwbB9': 'Fecha', 'fld9gH2SlnD13fjzy': 'Mes', 'fldcW0W0sA5Iv70SJ': 'Año',
        'fld8YOKPID9G3gRdI': 'Factura', 'fld66QLuEkhXtJ4M1': 'Ámbito', 'fld5OWES0KD9JuPc9': 'Observación' } }
    },

    // ═══ Flipping Rentals matriz (Fix & Flip) ═══
    'applMXFyPq1hXj7iN': {
      'tblWM1oaWDu0Ukdqf': { n: 'Inversionistas', f: {
        'fldI09roeZswP65PK': 'Nombre del inversionista', 'fldJZcAtnPeC8EN1c': 'Propiedad del Inversionista',
        'fldXMQGQDauo5HnnV': 'Capital aportado (from Propiedad del Inversionista)', 'fldaSlCHNfi5dqKDi': 'Etiqueta del Inversionista',
        'fldoixuufPLltt6ZF': 'Email', 'fldB0k2KTsR4rvZHJ': 'Tiene socio', 'fldZKnOD3pu8CP3WS': 'Telefono',
        'fld5rdexk6h7iJ1UZ': 'Nombre del socio', 'fldSvCPZsP5J1Mhf4': 'Ciudad', 'fldQukBRQ8bhCrffa': 'Estado',
        'fldyLYGF9RuHQw2si': 'Diligenciamiento W9', 'fld2ECQ3uePt6yEGP': 'W9 ', 'fldeSmAm96EEhyIfG': 'Observaciones',
        'fldnguKQ6cgTiBNBR': 'Rangos' } },
      'tblw28KVOUcCAKZBU': { n: 'Propiedades', f: {
        'fldaDd6TuMkEKILyn': 'Direccion', 'fldzXun3iR1Bqucs9': 'Estado Actual', 'flddjD6WsvC98sM1k': 'Modelo de Negocio',
        'fld8O5pRBbbKy8eHf': 'Inversionista', 'fldrePoqg3C3caiZ5': 'Capital aportado',
        'fldiUTo6FT1gnYujs': 'Capital pagado al inversionista (Compra o dinero de cash out)', 'fldwCt0TQzyCGQOzd': 'Estado',
        'fldupd1Y33ciLAHjj': 'Ciudad', 'fldPdb3RjpLiSyUwn': 'Drive de la propiedad', 'fldPZeFoCCvFm2LXc': 'LInk de la propiedad',
        'fldeJFg5lD5L69Hio': 'Precio de compra', 'fldsRWMQJ4Lv86GOU': 'Estimado de remodelacion (calculadora inicial)',
        'fld9VNYFBzFI3tRdc': 'Costo Remodelacion Real (Cobrado por empresa remodelación)', 'fldPmfjmdVv7PRxjK': 'ARV',
        'fldLz4tIq3KMkS22h': 'Valuación por el Appraisal', 'fldOg97WmkVIQ0k0o': 'Link Appraisal',
        'fldYSrKPz6EhqiWSM': 'Link Operate Agreement', 'fldG2SABUD5Ptcuj8': 'Fecha de Cierre Compra',
        'fld8HJtRQJnXJUV9a': 'Nombre de la empresa', 'fldyijwnFRD2yFrx5': 'Estrategia utilizada',
        'fld7kjf6nBcNFvttH': 'Casa de Titulos', 'fldpMHKKLQAU0cD6e': 'Prestamista', 'fldMemLCkrcgus1lP': 'Prestamista Refinanciacion',
        'fldQ03XEnRDfow20c': 'Adquisición de propiedad', 'fldTTN0yVGO8YzADL': 'Fecha Pago HML',
        'fldMglNT8uPBvBZat': 'Valor Pago HML mensual', 'fldykiVuPvLal27vO': 'Fecha Pago Ref30',
        'fldaFJSXqjV7VXiCI': 'Valor Pago REF 30 mensual', 'fldZtdnJytZnfMYxI': 'Sqft Casa',
        'flddh8bS7oP34ak1M': 'Porcentaje de Owner Ship', 'fld27aZOShatm0I4k': 'Porcentaje que prestó el banco (refi)',
        'fldqIlx3P6eWXh6Pn': 'Valor Cash Out', 'fldwFvlA1YggAxgc6': 'Wholsaler', 'fldZ0PeYVEsLMiW2i': 'Datos por casa',
        'fld553t0k3HwNquCq': 'Pagos HML', 'fldj3xoSM5amtrBOQ': 'Renta mensual actual', 'fldnid53AmifS7kK1': 'Gastos mensuales actual',
        'fldjTGheOlYwM5Agr': 'Flujo mensual', 'fldKqIKfKfrN2YfMd': 'Déficit operativo acumulado',
        'fld2aby0lrH7iQNWw': 'Capital inversionista', 'fld9aN2wuYOIQs8fI': 'Rentabilidad prometida',
        'fldyglRho5ubMH0WU': 'Déficit total actual', 'fldWCI0jM9jKd0i1I': 'Meses para cubrir déficit',
        'fldi8gnI3G1qw3s0P': 'Utilidad final entregada', 'fldrmZlbLe5jNDpuO': 'Estado financiero',
        'fldgaoQJ2qfHvauke': 'Notas financieras', 'fldOhrVJhNmnEZSsD': 'Desglose Draws' } },
      'tblB9Wh3303LTbI5k': { n: 'Desglose Draws', f: {
        'fldfeGUdmGQzd2C0s': 'ID', 'fldEU8dXcmwovZP16': 'Dirección', 'fldQJtZBTEkvoxLER': 'Meses a tener en cuenta ',
        'fld208iuposxA20W0': 'Total Draws desembolsados (Lo que se pidio)',
        'fldr4DfeUx99NYC5R': 'Costo Remodelacion Real (lo que cobro remodelacion)',
        'fldEVC4tKVI5gnvrm': 'Numero de meses cubiertos por el HML',
        'fld4gBJ6ruD7Gfmbn': 'Pago Interéses con dinero HML - Mensual (Promedio)',
        'fldf3D0KEwJv8CLZA': 'Pago Interéses con dinero HML - Total', 'fldXsh3w2phWLiAmE': 'Pago Utilities con dinero HML (Total)',
        'fldRQ3HCLtiN3kBO6': 'Meses desde el plazo final HML hasta rentar o vender',
        'fld9taoGPqk8iKd7j': 'Pago Interéses HML hasta rentar - Mensual (Promedio)',
        'fldH5ARDkRu1QL3Ny': 'Pago Interéses HML hasta Rentar - Total', 'fldpmyUxjat9b1s2d': 'Pago utilities hasta rentar (Total)',
        'fldXwCW30iscTn3iL': 'Pago Muebles y/o Staging', 'fldSB6YjUmMZku28J': 'Pago Appraisal', 'fld7D7gN3GuhTMzaU': 'Otros Gastos',
        'fldOezTNcwnaWW7bD': 'Total Draws - Gastos Operativos', 'fldL4iMolqEibENFj': 'Total Draws - Déficit Total',
        'fldEYY25oThUoOOIb': 'Refinanciada', 'fldAuckcknVgT7pxa': 'Valor Cash Out (from Dirección)',
        'fldXtPfl6NOLm3Lqs': 'Comentarios', 'fldKGRnB1LsJXjfWN': 'Datos por casa' } },
      'tbluy4xlHJav9RtrZ': { n: 'Datos por casa', f: {
        'fldreZLLEAtXb1IcM': 'Numeración', 'fldgRmcy4oAfn9JYQ': 'Propiedad',
        'fldz7ethKUHkFGu4K': 'Precio de compra (from Propiedad)', 'fld58rjMzZuoEwtDj': 'Gastos de cierre HML',
        'fldxuB3kYq8cNQHIK': 'Down Payment', 'fldzH5n6milc56KAU': 'Cash to Close', 'fldZnz7Sq9iSuTtLe': 'Monto HML',
        'fld4Hv76aZCjXVhQ3': 'Tasa de Interés HML', 'fldbnPE1wT9Fm6D46': 'Plazo HML (Meses)',
        'fldFI4BNG08elmnO1': 'Fecha inicio HML', 'flddtzbmaVXAPSSoC': 'Fecha Vencimiento HML',
        'fldv1jDcw9kDjwZ3f': 'Costo Remodelacion Real (from Propiedad)', 'fldVgEcZaF6kQsmTJ': 'Porcentaje avance de la obra',
        'fldlhgKbDSkeXrXzi': 'Fecha inicio REHAB', 'fldPul8pDQ3bHrirm': 'Fecha Final real Rehab',
        'fld3UZOKmHMOw6VmS': 'Monto Draws aprobados por HML', 'fldlyv2c38vhBLHDd': 'Draws cobrados',
        'fld3jnL0jdxuZlILD': 'Draws Disponible restante', 'fldttSOwH3FXQfZJr': 'Fecha de refinanciación ',
        'fldiHb7SktnfkT5F1': 'Porcentaje que prestó el banco (refi) (from Propiedad)', 'fldif2zUp7yJDfiAu': 'Monto préstamo Refi',
        'fldZsDNjV8DmJH7Wd': 'Monto Pagado al HML con la Refi', 'fld31lPMUgUQdmp8M': 'Valor Cash out',
        'fldvBmFii4u9OtKy9': 'Precio de Venta', 'fldq9iOwlJ0jY8hen': 'Fecha de Venta', 'fldODC3HgNm2WvkJx': 'Comisión de venta (%)',
        'flddvolMdfDKEpng3': 'Costos de cierre venta', 'fldFB9AoZ6q3jJNRY': 'Utilidad Bruta', 'fld5t3ETIYxpHD7Z5': 'Utilidad Neta',
        'fld0V8zYdDJhUX4mL': 'ROI', 'fldlxYJq2XiCF9aKa': 'Desglose Draws' } },
      'tblV4wNA8hNs5Mmk8': { n: 'Pagos interes (HML & REFI)', f: {
        'fldw9zZRdQ4ku7XTz': 'ID', 'fldDyPAYGHDBmBdvk': 'Propiedad', 'fld7y5uQLeJlCHgno': 'Fecha de Pago - HML',
        'fldDe1BDW4fP5s3WR': 'Pago HML', 'fldrSE3aeiMqkfpHE': 'Fee Adicional', 'fldVbTG8ZaYAg1XPQ': 'Notas',
        'fldWACGPEKKhLp206': 'Ref30', 'fldlDpPWUnYhIsETm': 'Fecha de pago Ref 30', 'fldOOSgpzzdfw8ABA': 'Check de pago',
        'fldyjTdAXJ5NOecHB': 'Comprobante de pago', 'fldCPYEWKsSXPGWWg': 'Mes', 'fldKnlKn4MvsU5wem': 'Año' } },
      'tblwOv0IzAeWE2Xhd': { n: 'Contactos del negocio', f: {
        'fldX3695n8lrTHCsg': 'Nombre de la Empresa', 'fldpif2RsYdu84Hrx': 'Nombre del Asesor', 'fldcMysn4rHa9rHmt': 'Tipo de trabajo',
        'fldmzoy1mwTKQURKL': 'Telefono', 'fldd3POWTcqPiEwPb': 'Correo', 'fldPQBVOmVuAXPP9C': 'Ciudad',
        'fldRi0n4Ga20KH97S': 'Propiedad', 'fldbxtjjP6ryr0xgv': 'Porcentaje de interés ' } },
      'tblvULaFPu8YqDy1l': { n: 'Gasto Plataformas Fix And Flip', f: {
        'fldZUdExLDg4nsjeY': 'Plataformas', 'fldMblARwfiZ2NVqq': 'Mes', 'fldaV7Mc21PaMYwg4': 'Valor',
        'fld5SsHZLLYZDoi47': 'Plataforma', 'fldXDPOj6ytwHh9g6': 'comentarios', 'fldjyBD7p2KEP0Bfr': 'Factura' } },
      'tblE9UANWoYdlbEhX': { n: 'Gastos Equipo Fix and Flip', f: {
        'fldSsNBs1zQ6YZPxm': 'Name', 'fldRIzVjmccCPyslQ': 'Salario', 'fldwdnqHKkr4Pvl9y': 'Mes',
        'fldmW5oi6HnYiIBSy': 'Factura', 'fldckFo7H81jAMaBY': 'Nombre' } }
    },

    // ═══ Empresa de Remodelación ═══
    'appwFRqnkyyRljOld': {
      'tblw28KVOUcCAKZBU': { n: 'Propiedad en Reparación', f: {
        'fldaDd6TuMkEKILyn': 'Direccion', 'fld8HJtRQJnXJUV9a': 'Nombre de la empresa', 'fldpO1nrcsC48WVhJ': 'Procesos',
        'fldGryDWkPw99eYCd': 'Lider asignado', 'fldupd1Y33ciLAHjj': 'Ciudad', 'fldwCt0TQzyCGQOzd': 'Estado Geografico',
        'fldQrlNrrEJexZRrp': 'Sqft', 'fldG2SABUD5Ptcuj8': 'Fecha de inicio de remodelación',
        'fldQtRD47N2jHaRyh': 'Fecha estimada de finalización remodelación', 'fld8LqUjkqDV7qIP7': 'Fecha real finalizacion',
        'fld7Pl5a9YhAazAby': 'Retraso en Dias', 'fld8kILrCV4xXras6': 'Tiempo estimado de entrega',
        'fld5nTFwW161Xu3sk': 'Avance Real (Planner)', 'fldjdSUiunUf2a8Xs': 'Porcentaje avance obra %',
        'fldAP3lI2FgXds14q': 'Draws Ingresados', 'fldHCVca9YHhdCRrA': 'Intereses', 'fldvxo2bZXekrGSib': 'Pagos Servicios Públicos',
        'fldILIa8f6cQCTsiW': 'Muebles (confrimar)', 'fldq1Xpfb1SPPGIuz': 'Monto Destinado Remodelación',
        'fldg9kWaf60x6SeJo': 'Monto por Gastar', 'fldW26WBuAFPnWhi8': 'Utilidad', 'fldxyxgo4B4VcuQJX': '% Rentabilidad',
        'fldsRWMQJ4Lv86GOU': 'Valor Remodelación al cliente', 'fldPMBhxLYr4TMje0': 'Presupuesto Remodelación interna',
        'fldNmR8PgZWdjutIw': 'Gasto trabajadores (Real)', 'fldtqskgPEajaJT4Y': 'Gasto Materiales (Real)',
        'fldlECug99KuoEjI7': '5% de Margen de Error de Materiales', 'fldMgaWuUYEtsR8xd': 'Gasto interno final',
        'fldQ3vhMvBuCDUJVR': 'Utilidad Remodelación', 'fldywMYaieK1bQ9MP': '% Rentabilidad Remodelación',
        'fldXxmdccFiGk1zPI': 'Déficit / Exceso Fix & Flip', 'fldFqTNE5myVbDRzY': 'Pago de Materiales',
        'fldkaEDxd2ORn2cJX': 'Horas trabajadas semana', 'fldRh8a3mChqTfuIV': 'Nomina Trabajadores en Campo',
        'fld2lDnIslXTl9o75': 'Porcentaje avance obra' } },
      'tblQzJoPvakTbz4gt': { n: 'Personal en Campo', f: {
        'fldnSityxRqbpwDEF': 'Nombre', 'fldwKKxQ0epfOGWGM': 'Teléfono', 'fld4PEcliEXZ4kTgY': 'Experiencia',
        'fld4bAKu6waby0jrR': 'Pago x Hora', 'fld4JswUgzRraerSv': 'Propiedades en las que ha trabajado',
        'fld6hNEBaiA5QQv0J': 'Horas Trabajadas por Semana', 'fldA7bBV6vY7oQ0ib': 'Nomina Trabajadores en Campo',
        'fldrZ8QZOA8WuNYPs': 'Contacto de Emergencia', 'fldIshZWoEwBcO0YY': 'Numero del Contacto de Emergencia',
        'fldfNhMlpbAAjKWIo': 'Parentesco Contacto de Emergencia' } },
      'tbl7ivvry9GW4H8X3': { n: 'Pago de Materiales', f: {
        'fldLmoj5megyrXZAC': 'Fecha', 'fldmdpIcIYEIEq5Pv': 'Propiedad en reparación', 'fldAm8O2PzNWU6fcZ': 'Precio',
        'fld6GXm1R2W0JGkeS': 'Número de Orden', 'fldlMUzj5ZQYZOIn0': 'Link comprobante', 'fldULzXeG5oegyud6': 'Categoría',
        'fldgaOtpRRIkgH02F': 'Comentarios' } },
      'tblyCieXLFdZM60El': { n: 'Horas Trabajadas por Semana', f: {
        'fldkFHa9K5pRlO29V': 'Fecha', 'fldpIYjB33HK0tdEk': 'Trabajador', 'fldN20CWfhDsgwQNS': 'casa',
        'fldRWftVP66WRcbYD': 'horas trabajadas', 'fldP8mv5lJdehwvKx': 'pago', 'fldnouQ86a6cqMAkG': 'Propiedad en reparación',
        'flds9yFDE2din22ig': 'Personal en Campo', 'fldKh0LVgaVCwcUix': 'Pago x Hora (de Personal en Campo)',
        'fldKgQ5Eyv5esHpSQ': 'Pago Total Dia' } },
      'tblsmtrvcJbwwLjch': { n: 'Nomina Trabajadores en Campo', f: {
        'fld3N6NHkkvM93pAR': 'Fecha de Pago Quincena', 'fldwKifKq76Un5Em7': 'Inicio de Periodo', 'fldLa7LLEnO2C9ncC': 'Fin de Periodo',
        'fldKWmMHGKPduuWce': 'Valor Total de Pago', 'fld3j9xJQnAprUuWW': 'Propiedad', 'fld9GOVwKmSKzTtBv': 'Responsable',
        'fldEFY9GKbcQRrGWJ': 'Estado del Pago', 'fldKMRBpMuy4Uex57': 'Comprobante Pago Nomina' } },
      'tblk1vS2PW6OP0OyY': { n: 'Gastos Empresariales', f: {
        'fldIUMOsInhxxGs5Y': 'Descripción del Gasto', 'fldB8j7s4kCnccqSk': 'Estado del Pago',
        'fldgqzAPrhJDRaKgA': 'Enlace Comprobante / Factura', 'fld12a5wWYFPSM5VH': 'Fecha del Pago', 'fldDgzONzOg9v0tev': 'Monto',
        'fldr8TNXyOx6fF9qR': 'Categoría', 'fld8TvuxTKImmKfgZ': 'Proveedor / A quién se pagó', 'fld9h5l9GOAeI3Czr': 'Mes',
        'fldFDsokteNLzRGem': 'Año' } },
      'tblv77DAUX7mznOso': { n: 'Nomina Equipo Administrativo - Remodelación', f: {
        'fldPI1F8hqouEaXUL': 'Name', 'fldv0pTlmzh9Qxaoo': 'Salario', 'fldy8UDu3y9OD9MLi': 'Mes',
        'fldJJQBGPy96gqmlq': 'Nombre', 'fldIJrHcXNplfrI26': 'Factura' } },
      'tblgd4wcFSa7Aq9R5': { n: 'Gasto Por Plataformas - Remodelación', f: {
        'fld3ELE48t7BtgUQo': 'Plataforma', 'fldZQqHQz1xCLXBWI': 'Mes', 'fldYnTphFfdhuDAm0': 'Valor',
        'fldDnV8mNWneYAP99': 'Plataformas', 'fldCpjy6mdeMdOK0E': 'Factura', 'fldYJM6WtnHYSToyY': 'Enlace Factura' } },
      'tblGUPnE4E5IrUGEt': { n: 'OKRs / Metas', f: {
        'fldO1bR2kRbpkBMBk': 'Metrica', 'fldmeai0JuTWSLvTs': 'Clave', 'fldXQbJB3I5o0q3zt': 'Objetivo',
        'fld0fngB6uZnV92CS': 'Comparador', 'fldRdSqlgqyQ10r9m': 'Unidad', 'fldTMwsdgQuAWVA4Q': 'Periodo',
        'fld3Q6boqaf1aGPUb': 'Descripcion' } }
    }
  };
})();
