# 🔧 Fix Rápido: Error "operator does not exist: uuid = text"

## 🐛 El Error

```
ERROR: 42883: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
```

## ❓ Causa

Las políticas RLS intentan comparar:
- `auth.uid()` → devuelve **UUID**
- `user_id` → es de tipo **TEXT**

PostgreSQL no puede comparar UUID con TEXT directamente.

## ✅ Solución

Usar **cast explícito** con `::text`:

```sql
-- ❌ INCORRECTO
USING (auth.uid() = user_id)

-- ✅ CORRECTO
USING (auth.uid()::text = user_id)
```

## 🚀 Aplicar Fix

### Opción 1: Script Automático (RECOMENDADO)

1. Abrir Supabase Dashboard
2. Ir a **SQL Editor**
3. Click en **New query**
4. Copiar todo el contenido de `supabase_rls_setup.sql`
5. Pegar en el editor
6. Click en **Run** (o Ctrl+Enter)

El script:
- ✅ Habilita RLS en las 4 tablas
- ✅ Elimina políticas existentes (si hay)
- ✅ Crea políticas correctas con cast
- ✅ Verifica la configuración
- ✅ Incluye queries de testing

### Opción 2: Fix Manual Rápido

Si solo necesitas corregir las políticas existentes:

```sql
-- Eliminar políticas incorrectas
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- Crear con cast correcto
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
```

Repetir para `props`, `locations`, `reference_frames`.

## 🔍 Verificar que Funcionó

```sql
-- Ver políticas creadas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('characters', 'props', 'locations', 'reference_frames')
ORDER BY tablename, cmd;

-- Deberías ver 16 políticas (4 por tabla)
```

## 🧪 Probar

```sql
-- 1. Ver tu UUID
SELECT auth.uid();

-- 2. Insertar un test
INSERT INTO characters (id, user_id, name, description, created_at)
VALUES (
    gen_random_uuid()::text,
    auth.uid()::text,  -- ← Con cast!
    'Test',
    'Testing RLS',
    now()
);

-- 3. Ver tus datos (debería funcionar)
SELECT * FROM characters WHERE user_id = auth.uid()::text;

-- 4. Limpiar
DELETE FROM characters WHERE name = 'Test';
```

Si todo funciona sin errores: **¡Fix aplicado correctamente!** ✅

## 📚 Más Info

Ver documentación completa en `AUTENTICACION_GUIA.md` sección "Troubleshooting".

## 🆘 Ayuda

Si sigues teniendo problemas:

1. Verifica que estás autenticado: `SELECT auth.uid();`
2. Verifica tipo de columna: `\d+ characters` (debe mostrar `user_id text`)
3. Verifica que RLS está habilitado: Ver query en `supabase_rls_setup.sql`
4. Contacta en GitHub Issues

---

**Resumen:** Agrega `::text` después de `auth.uid()` en todas las políticas RLS. 🎯
