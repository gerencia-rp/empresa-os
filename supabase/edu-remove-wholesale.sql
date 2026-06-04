-- Eliminar Wholesale Program de las mentorías visibles
-- Si tiene estudiantes, los pasa a archived (no borra data)
update public.edu_students set status = 'dropped' where mentorship_id = 'wholesale';
delete from public.edu_mentorships where id = 'wholesale';

select id, name from public.edu_mentorships order by position;
