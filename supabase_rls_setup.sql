-- ============================================
-- CONFIGURACIÓN RLS PARA PERSISTENCIA STUDIO
-- ============================================
-- Este script configura Row Level Security (RLS) para las tablas
-- de Persistencia Studio, asegurando que cada usuario solo pueda
-- acceder a sus propios datos.
--
-- IMPORTANTE: Ejecutar en SQL Editor de Supabase
-- Dashboard → SQL Editor → New query → Pegar y ejecutar
--
-- Fecha: 2026-07-08
-- ============================================

-- ============================================
-- PASO 1: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE props ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_frames ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS EXISTENTES (SI EXISTEN)
-- ============================================
-- Esto evita errores si estás re-ejecutando el script

-- Characters
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- Props
DROP POLICY IF EXISTS "Users can view own props" ON props;
DROP POLICY IF EXISTS "Users can insert own props" ON props;
DROP POLICY IF EXISTS "Users can update own props" ON props;
DROP POLICY IF EXISTS "Users can delete own props" ON props;

-- Locations
DROP POLICY IF EXISTS "Users can view own locations" ON locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON locations;
DROP POLICY IF EXISTS "Users can update own locations" ON locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON locations;

-- Reference Frames
DROP POLICY IF EXISTS "Users can view own reference_frames" ON reference_frames;
DROP POLICY IF EXISTS "Users can insert own reference_frames" ON reference_frames;
DROP POLICY IF EXISTS "Users can update own reference_frames" ON reference_frames;
DROP POLICY IF EXISTS "Users can delete own reference_frames" ON reference_frames;

-- ============================================
-- PASO 3: CREAR POLÍTICAS CORRECTAS
-- ============================================
-- NOTA: Usamos auth.uid()::text porque user_id es TEXT
-- auth.uid() devuelve UUID, por eso hacemos cast a ::text

-- ============================================
-- POLÍTICAS PARA CHARACTERS
-- ============================================

CREATE POLICY "Users can view own characters"
ON characters FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own characters"
ON characters FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own characters"
ON characters FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own characters"
ON characters FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- POLÍTICAS PARA PROPS
-- ============================================

CREATE POLICY "Users can view own props"
ON props FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own props"
ON props FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own props"
ON props FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own props"
ON props FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- POLÍTICAS PARA LOCATIONS
-- ============================================

CREATE POLICY "Users can view own locations"
ON locations FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own locations"
ON locations FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own locations"
ON locations FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own locations"
ON locations FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- POLÍTICAS PARA REFERENCE_FRAMES
-- ============================================

CREATE POLICY "Users can view own reference_frames"
ON reference_frames FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own reference_frames"
ON reference_frames FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own reference_frames"
ON reference_frames FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reference_frames"
ON reference_frames FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- PASO 4: VERIFICAR CONFIGURACIÓN
-- ============================================

-- Ver todas las políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('characters', 'props', 'locations', 'reference_frames')
ORDER BY tablename, cmd;

-- Ver estado de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('characters', 'props', 'locations', 'reference_frames');

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Deberías ver:
-- - 4 políticas por tabla (SELECT, INSERT, UPDATE, DELETE)
-- - Total: 16 políticas
-- - RLS habilitado (rls_enabled = true) en las 4 tablas
-- ============================================

-- ============================================
-- TESTING (OPCIONAL)
-- ============================================
-- Descomentar para probar que RLS funciona correctamente

-- Ver tu UUID de auth actual
-- SELECT auth.uid();

-- Insertar un personaje de prueba
-- INSERT INTO characters (id, user_id, name, description, created_at)
-- VALUES (
--     gen_random_uuid()::text,
--     auth.uid()::text,
--     'Test Character',
--     'Testing RLS',
--     now()
-- );

-- Ver solo tus personajes (debería funcionar)
-- SELECT id, name, user_id FROM characters WHERE user_id = auth.uid()::text;

-- Intentar ver personajes de otro usuario (debería devolver 0 filas)
-- SELECT id, name, user_id FROM characters WHERE user_id = 'otro-user-id';

-- Limpiar prueba
-- DELETE FROM characters WHERE name = 'Test Character';

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Si obtienes "operator does not exist: uuid = text":
-- → Verifica que todas las políticas usan auth.uid()::text (con ::text)

-- Si no puedes ver tus datos después de habilitar RLS:
-- → Verifica que estás autenticado: SELECT auth.uid();
-- → Verifica que user_id en registros coincide con tu UUID
-- → Verifica que las políticas se crearon correctamente (ver query arriba)

-- Si necesitas deshabilitar RLS temporalmente (SOLO DESARROLLO):
-- ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE props DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reference_frames DISABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTAS FINALES
-- ============================================
-- 1. Este script es idempotente (puedes ejecutarlo múltiples veces)
-- 2. Las políticas garantizan que cada usuario solo ve sus propios datos
-- 3. Los datos existentes con user_id antiguo necesitan migración manual
-- 4. Para producción, asegúrate de hacer backup antes de ejecutar
-- ============================================

-- ¡Configuración completa! 🎉
