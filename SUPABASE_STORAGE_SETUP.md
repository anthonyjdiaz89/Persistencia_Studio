# Configuración de Supabase Storage

## 📦 Bucket Requerido

Crea el siguiente bucket en tu proyecto de Supabase:

### Bucket: `video-assets`
- **Tipo**: Público
- **Tamaño máximo de archivo**: 50MB (recomendado)
- **Tipos de archivo permitidos**: `image/*`

## 🗂️ Estructura de Carpetas

Dentro del bucket `video-assets`, las imágenes se organizan automáticamente en:

```
video-assets/
├── images/                    # Imágenes de referencia general
├── reference-images/          # Reference frames del Prompt Builder
├── character-avatars/         # Avatares de personajes
├── prop-images/              # Imágenes de props
├── location-images/          # Imágenes de locaciones
├── reference-frames/         # Frames de referencia de Asset Library
└── director-images/          # Imágenes del AI Director
```

## 🔧 Pasos de Configuración

### 1. Crear el Bucket

1. Ve a tu dashboard de Supabase
2. Navega a **Storage** en el menú lateral
3. Haz clic en **New bucket**
4. Nombre: `video-assets`
5. Marca como **Public bucket** ✓
6. Haz clic en **Create bucket**

### 2. Configurar Políticas de Acceso

Añade estas políticas RLS (Row Level Security) al bucket:

#### Política de Lectura Pública (SELECT)
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'video-assets' );
```

#### Política de Escritura para Usuarios Autenticados (INSERT)
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-assets' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

#### Política de Eliminación (DELETE) - Opcional
```sql
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'video-assets'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);
```

### 3. Verificar Variables de Entorno

Asegúrate de tener estas variables en tu archivo `.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## ✅ Verificar Configuración

Para verificar que todo funciona correctamente:

1. Ejecuta `npm run dev`
2. Sube una imagen en cualquiera de los siguientes lugares:
   - Prompt Builder → Reference Images
   - Asset Library → Agregar Character/Prop/Location
   - AI Director → Adjuntar imagen

3. Verifica que:
   - La imagen se sube correctamente
   - Se muestra en la UI
   - Aparece en tu bucket de Supabase Storage

## 📊 Beneficios de Supabase Storage vs Base64

### ✅ Ventajas
- **Rendimiento**: ~33% menos tamaño de datos (sin encoding base64)
- **Escalabilidad**: Storage dedicado para archivos binarios
- **URLs directas**: Enlaces públicos permanentes a imágenes
- **CDN integrado**: Entrega rápida de imágenes globalmente
- **Firestore más limpio**: Documentos más pequeños sin base64

### ❌ Limitaciones Eliminadas
- ~~Documentos Firestore gigantes~~
- ~~Overhead de encoding/decoding base64~~
- ~~Límites de tamaño de documento Firestore~~

## 🔍 Troubleshooting

### Error: "Failed to upload image to Supabase"

**Causas comunes**:
1. El bucket `video-assets` no existe → Créalo
2. El bucket es privado → Cámbialo a público
3. Faltan políticas RLS → Añade las políticas mencionadas arriba
4. Variables de entorno incorrectas → Verifica SUPABASE_URL y SUPABASE_ANON_KEY

### Error: "Could not get canvas context"

**Solución**: Verifica que el navegador soporte Canvas API (todos los navegadores modernos)

### Las imágenes no se muestran después de subir

**Solución**:
1. Verifica que el bucket sea público
2. Comprueba las políticas de lectura pública
3. Verifica la URL generada en la consola del navegador

## 📝 Migración desde Base64

Si tienes datos existentes con imágenes en base64:

1. Las nuevas imágenes se subirán automáticamente a Supabase Storage
2. Las imágenes existentes en base64 seguirán funcionando
3. Opcionalmente, puedes ejecutar un script de migración para convertir base64 existente a Storage

## 🎯 URLs Generadas

Las URLs públicas siguen este formato:

```
https://tu-proyecto.supabase.co/storage/v1/object/public/video-assets/[carpeta]/[timestamp]_[random].[ext]
```

Ejemplo:
```
https://bd.persistenciadigital.com/storage/v1/object/public/video-assets/character-avatars/1735872234567_a8b3f2.jpg
```
