# Instrucciones para Actualizar Schema de Supabase

## 🔍 Problema
Los personajes no muestran sus imágenes porque el campo `image_url` está vacío en la base de datos.

## ✅ Solución: Actualizar Schema de Supabase

### 1. Verifica que la tabla `characters` tenga estos campos:

Ejecuta en SQL Editor de Supabase:

```sql
-- Ver estructura actual de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'characters';
```

### 2. Si faltan campos, agrégalos:

```sql
-- Agregar campos faltantes si no existen
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS appearance TEXT,
ADD COLUMN IF NOT EXISTS clothing TEXT;
```

### 3. Actualizar imágenes de personajes existentes

Tienes 3 opciones:

#### Opción A: Eliminar y recrear personajes (MÁS FÁCIL)
1. Ve a la aplicación en localhost:3000
2. Haz clic en el panel "Materiales y Casting"
3. Elimina cada personaje (icono de basura)
4. Haz clic en "+ Crear Material / Subir Imagen"
5. Crea cada personaje nuevamente:
   - Nombre: Lia
   - Descripción: (tu descripción)
   - Sube la imagen
   - Haz clic en "Crear Personaje"

#### Opción B: Actualizar SQL directamente
```sql
-- Actualizar imagen de Lia (reemplaza con tu URL de Supabase Storage)
UPDATE characters 
SET image_url = 'https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/character-avatars/XXXXX.jpg'
WHERE name = 'Lia';

-- Repite para Tomas, Noah, etc.
```

#### Opción C: Usar la UI de Supabase Table Editor
1. Ve a Table Editor en Supabase
2. Selecciona la tabla `characters`
3. Para cada fila (Lia, Tomas, Noah), edita el campo `image_url`
4. Pega la URL de la imagen desde Supabase Storage

## 🧪 Verificar el Fix

Después de actualizar, recarga la aplicación (F5) y deberías ver las imágenes de los personajes.

Si aún no aparecen:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Filtra por "images"
4. Intenta ver un personaje
5. Si hay errores 404, significa que la URL es incorrecta
6. Si hay errores de CORS, verifica las políticas de Supabase Storage

## 📋 Schema Completo Recomendado

```sql
-- Tabla characters con todos los campos
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  gender TEXT,
  appearance TEXT,
  clothing TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por user_id
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
```

## 🚀 Testing

Después de arreglar:

```
Prompt: @lia @tomas @noah todos cantan

Resultado esperado:
✅ Cada personaje con su imagen de referencia
✅ [Image1], [Image2], [Image3] correctamente sincronizados
✅ Imágenes visibles en el panel de Materiales
```
