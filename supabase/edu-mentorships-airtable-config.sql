-- Configurar Airtable para las 3 mentorías
-- Flipping Rentals: base appFNKrtV0mMk960t · TBL Seguimiento tbl07CsLovRpyMWmZ
-- Rental Profits: base app0XnxP7XtQJL1sC · tabla tbljy63yarjqptcQr
-- Wholesale: pendiente

update public.edu_mentorships
set airtable_base_id = 'appFNKrtV0mMk960t',
    airtable_students_table = 'tbl07CsLovRpyMWmZ'
where id = 'flipping-rentals';

update public.edu_mentorships
set airtable_base_id = 'app0XnxP7XtQJL1sC',
    airtable_students_table = 'tbljy63yarjqptcQr'
where id = 'rental-profits';

-- Verificar
select id, name, airtable_base_id, airtable_students_table
from public.edu_mentorships
order by position;
