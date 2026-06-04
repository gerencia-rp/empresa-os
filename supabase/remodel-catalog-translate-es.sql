-- Traducir catálogo remodel_catalog_items al español
-- Actualiza desc, unit, subcat por code. Items sin match se quedan como están.

update remodel_catalog_items set desc='Demolición de pisos - hasta la estructura', unit='ft²', subcat='Demoliciones' where code='1.1.1';
update remodel_catalog_items set desc='Desmonte de cocina (gabinetes, mesones, electrodomésticos)', unit='unidad', subcat='Demoliciones' where code='1.1.3';
update remodel_catalog_items set desc='Desmonte de baño (demolición completa)', unit='unidad', subcat='Demoliciones' where code='1.1.4';
update remodel_catalog_items set desc='Retiro de drywall', unit='ft²', subcat='Demoliciones' where code='1.1.6';
update remodel_catalog_items set desc='Demolición superior de concreto (entrada/patio)', unit='ft²', subcat='Demoliciones' where code='1.1.7';
update remodel_catalog_items set desc='Retiro de muro - estructural', unit='ft²', subcat='Demoliciones' where code='1.1.8';
update remodel_catalog_items set desc='Alquiler de contenedor (por carga)', unit='carga', subcat='Disposición' where code='1.1.9';
update remodel_catalog_items set desc='Acarreo de escombros', unit='proyecto', subcat='Disposición' where code='1.1.10';
update remodel_catalog_items set desc='Protección de sitio, plástico, señalización', unit='proyecto', subcat='Preliminares' where code='1.1.11';
update remodel_catalog_items set desc='Tarifas de disposición/vertedero por carga', unit='carga', subcat='Disposición' where code='1.1.12';
update remodel_catalog_items set desc='Retiro de basura existente', unit='ft²', subcat='Disposición' where code='1.1.13';

update remodel_catalog_items set desc='Evaluación e inspección de cimentación', unit='proyecto', subcat='Reparación' where code='2.1.1';
update remodel_catalog_items set desc='Reparación de grietas en cimentación (asentamiento básico)', unit='proyecto', subcat='Reparación' where code='2.1.4';
update remodel_catalog_items set desc='Excavación y nivelación del terreno', unit='proyecto', subcat='Concreto' where code='2.2.1';
update remodel_catalog_items set desc='Reparación de losa de concreto', unit='unidad', subcat='Concreto' where code='2.2.6';
update remodel_catalog_items set desc='Sistema de impermeabilización (cimentación)', unit='proyecto', subcat='Concreto' where code='2.2.9';

update remodel_catalog_items set desc='Reemplazo de techo (tejas arquitectónicas)', unit='techo', subcat='Cubierta' where code='3.1.1';
update remodel_catalog_items set desc='Membrana y tapajuntas de techo', unit='techo', subcat='Cubierta' where code='3.1.2';
update remodel_catalog_items set desc='Canaletas y bajantes', unit='ft lineal', subcat='Cubierta' where code='3.1.3';
update remodel_catalog_items set desc='Reemplazo de cerramiento', unit='techo', subcat='Cerramiento' where code='3.2.1';
update remodel_catalog_items set desc='Reemplazo de revestimiento (fibrocemento Hardieboard)', unit='ft²', subcat='Fachada' where code='3.4.1';
update remodel_catalog_items set desc='Acento de piedra (manufacturada)', unit='ft²', subcat='Fachada' where code='3.4.2';
update remodel_catalog_items set desc='Pintura exterior (casa completa, preparación total)', unit='casa', subcat='Fachada' where code='3.4.3';
update remodel_catalog_items set desc='Puerta principal de entrada (premium)', unit='unidad', subcat='Puertas' where code='3.5.1';
update remodel_catalog_items set desc='Puertas exteriores secundarias (atrás/lateral)', unit='unidad', subcat='Puertas' where code='3.5.2';
update remodel_catalog_items set desc='Instalación de patio de concreto', unit='ft²', subcat='Urbanismo' where code='3.6.1';
update remodel_catalog_items set desc='Construcción de deck de madera', unit='ft²', subcat='Urbanismo' where code='3.6.2';
update remodel_catalog_items set desc='Reparación/repavimentación de entrada vehicular', unit='proyecto', subcat='Urbanismo' where code='3.13.1';
update remodel_catalog_items set desc='Cerca de madera (perímetro)', unit='ft lineal', subcat='Urbanismo' where code='3.14.1';
update remodel_catalog_items set desc='Paisajismo y césped (renovación total)', unit='proyecto', subcat='Urbanismo' where code='3.15.1';
update remodel_catalog_items set desc='Reemplazo de ventanas (eficiencia energética, todas)', unit='casa', subcat='Fachada' where code='3.7.1';
update remodel_catalog_items set desc='Reemplazo de columnas de madera', unit='unidad', subcat='Fachada' where code='3.16.1';

update remodel_catalog_items set desc='Enmarcado de madera (carpintería estructural, casa completa)', unit='ft²', subcat='Estructura' where code='4.1.2';
update remodel_catalog_items set desc='Viga de acero / modificación de muro estructural', unit='unidad', subcat='Estructura' where code='4.1.3';
update remodel_catalog_items set desc='Enmarcado de techo / reparación de cerchas', unit='ft²', subcat='Estructura' where code='4.1.4';
update remodel_catalog_items set desc='Instalación de subpiso (nuevo)', unit='ft²', subcat='Estructura' where code='4.1.5';
update remodel_catalog_items set desc='Permisos de construcción (remodelación casa completa)', unit='proyecto', subcat='Permisos' where code='4.2.1';
update remodel_catalog_items set desc='Honorarios de arquitecto / ingeniero estructural', unit='proyecto', subcat='Permisos' where code='4.2.2';
update remodel_catalog_items set desc='Gestión de contratista general (overhead)', unit='proyecto', subcat='Permisos' where code='4.2.3';

update remodel_catalog_items set desc='Instalación/reemplazo de drywall', unit='ft²', subcat='Muros' where code='5.1.1';
update remodel_catalog_items set desc='Pintura interior (casa completa)', unit='ft²', subcat='Muros' where code='5.1.2';
update remodel_catalog_items set desc='Aislamiento - paneles de muro', unit='ft²', subcat='Muros' where code='5.1.3';
update remodel_catalog_items set desc='Tomacorrientes e interruptores (interior)', unit='casa', subcat='Redes Eléctricas' where code='5.1.4';
update remodel_catalog_items set desc='Actualización de panel eléctrico', unit='unidad', subcat='Redes Eléctricas' where code='5.1.5';
update remodel_catalog_items set desc='Recableado de toda la casa', unit='casa', subcat='Redes Eléctricas' where code='5.1.6';
update remodel_catalog_items set desc='Luminarias + ventiladores de techo', unit='casa', subcat='Redes Eléctricas' where code='5.1.7';
update remodel_catalog_items set desc='Detectores de humo y CO (cableados)', unit='casa', subcat='Redes Eléctricas' where code='5.1.9';
update remodel_catalog_items set desc='Instalación de molduras de techo', unit='ft lineal', subcat='Techo' where code='5.2.1';
update remodel_catalog_items set desc='Recambio de tubería de toda la casa (PEX)', unit='casa', subcat='Plomería' where code='5.2.1p';
update remodel_catalog_items set desc='Reemplazo de tubería principal de aguas residuales', unit='casa', subcat='Plomería' where code='5.2.2p';
update remodel_catalog_items set desc='Aislamiento - soplado en ático', unit='ft²', subcat='Techo' where code='5.2.3';
update remodel_catalog_items set desc='Reemplazo de calentador de agua', unit='unidad', subcat='Plomería' where code='5.2.3p';
update remodel_catalog_items set desc='Aparatos sanitarios (lavamanos, grifería, etc.)', unit='casa', subcat='Plomería' where code='5.2.4p';
update remodel_catalog_items set desc='Enchape de baño (piso + muros)', unit='ft²', subcat='Baños' where code='5.3.1';
update remodel_catalog_items set desc='Instalación de ducha a medida', unit='unidad', subcat='Baños' where code='5.3.2';
update remodel_catalog_items set desc='Cerramiento de ducha en vidrio', unit='unidad', subcat='Baños' where code='5.3.3';
update remodel_catalog_items set desc='Accesorios de baño (botiquín, espejo, toalleros)', unit='juego', subcat='Baños' where code='5.3.4';
update remodel_catalog_items set desc='Mueble de lavamanos + mesón', unit='unidad', subcat='Baños' where code='5.3.5';
update remodel_catalog_items set desc='Reemplazo de inodoro', unit='unidad', subcat='Baños' where code='5.3.6';
update remodel_catalog_items set desc='Gabinetes de cocina (semi a medida)', unit='ft lineal', subcat='Cocina' where code='5.4.1';
update remodel_catalog_items set desc='Mesones de cocina (cuarzo)', unit='ft²', subcat='Cocina' where code='5.4.2';
update remodel_catalog_items set desc='Salpicadero de azulejo', unit='ft²', subcat='Cocina' where code='5.4.3';
update remodel_catalog_items set desc='Lavaplatos + grifería', unit='unidad', subcat='Cocina' where code='5.4.4';
update remodel_catalog_items set desc='Construcción de isla de cocina', unit='unidad', subcat='Cocina' where code='5.4.5';
update remodel_catalog_items set desc='Electrodomésticos (estufa/nevera/lavavajillas/microondas)', unit='juego', subcat='Cocina' where code='5.4.6';
update remodel_catalog_items set desc='Reemplazo de sistema HVAC (AC + caldera + ductos)', unit='casa', subcat='HVAC' where code='5.5.1h';
update remodel_catalog_items set desc='Reparación HVAC / solo 1 unidad', unit='unidad', subcat='HVAC' where code='5.5.2h';
update remodel_catalog_items set desc='Instalación de pisos (LVP)', unit='ft²', subcat='Pisos' where code='5.6.1';
update remodel_catalog_items set desc='Instalación de alfombra (dormitorios)', unit='ft²', subcat='Pisos' where code='5.6.2';
update remodel_catalog_items set desc='Instalación de zócalos', unit='ft lineal', subcat='Pisos' where code='5.6.3';
update remodel_catalog_items set desc='Reemplazo de puertas interiores', unit='unidad', subcat='Carpintería' where code='5.8.1';
update remodel_catalog_items set desc='Estantería de closet', unit='unidad', subcat='Carpintería' where code='5.8.2';

update remodel_catalog_items set desc='Pintura de retoque y reparaciones', unit='proyecto', subcat='Acabados finales' where code='6.1.1';
update remodel_catalog_items set desc='Completar lista de pendientes (punch list)', unit='proyecto', subcat='Cierre' where code='6.2.1';
update remodel_catalog_items set desc='Tarifas de inspección final municipal', unit='unidad', subcat='Cierre' where code='6.2.2';
update remodel_catalog_items set desc='Limpieza profunda previa a entrega', unit='casa', subcat='Cierre' where code='6.2.3';
update remodel_catalog_items set desc='Limpieza final de construcción', unit='ft²', subcat='Limpieza final' where code='6.3.1';
update remodel_catalog_items set desc='Limpieza profunda (interior + exterior)', unit='casa', subcat='Limpieza final' where code='6.3.2';

-- También normalizar cualquier unit en inglés que quede
update remodel_catalog_items set unit='ft²' where unit in ('sqft','Sq ft','SqFt');
update remodel_catalog_items set unit='unidad' where unit in ('unit','Unit');
update remodel_catalog_items set unit='proyecto' where unit in ('project','Project');
update remodel_catalog_items set unit='carga' where unit in ('load','Load');
update remodel_catalog_items set unit='casa' where unit in ('house','House');
update remodel_catalog_items set unit='techo' where unit in ('roof','Roof');
update remodel_catalog_items set unit='juego' where unit in ('set','Set','Package','package');
update remodel_catalog_items set unit='ft lineal' where unit in ('lf','lin_ft','Lin ft','LinFt');

select code, desc, unit, subcat from remodel_catalog_items order by code;
