-- Actualizar imágenes de personajes y localizaciones
-- Ejecuta esto en Supabase SQL Editor: https://bd.persistenciadigital.com

-- 1. Verificar estructura actual
SELECT id, name, image_url FROM characters LIMIT 5;
SELECT id, name, image_url FROM locations LIMIT 5;

-- 2. Actualizar personajes
UPDATE characters 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/1783403018430_o61l01.png'
WHERE LOWER(name) = 'lia';

UPDATE characters 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/1783403052856_928bm5.png'
WHERE LOWER(name) = 'noah';

UPDATE characters 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/1783403073536_rizzu2.png'
WHERE LOWER(name) = 'tomas';

UPDATE characters 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/1783403094684_rhq6rg.png'
WHERE LOWER(name) = 'coco';

-- 3. Actualizar localización
UPDATE locations 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/reference-frames/1783403148806_8di5dk.jpg'
WHERE LOWER(name) = 'isla';

-- 4. Verificar cambios
SELECT id, name, image_url FROM characters WHERE name IN ('lia', 'Lia', 'noah', 'Noah', 'tomas', 'Tomas', 'coco', 'Coco');
SELECT id, name, image_url FROM locations WHERE name IN ('isla', 'Isla');
