# 🗄️ Migración a Supabase - Guía Completa

## ✅ Estado de la Migración

Persistencia Studio ahora usa **Supabase** como base de datos principal, reemplazando completamente a Firebase para almacenamiento de:

- ✅ **Personajes** (Characters)
- ✅ **Objetos** (Props)
- ✅ **Escenarios** (Locations)
- ✅ **Fotogramas de Referencia** (Reference Frames)

---

## 📋 Requisitos Previos

1. **Cuenta de Supabase** (gratuita): https://app.supabase.com
2. **Proyecto creado** en Supabase Dashboard
3. **Credenciales** del proyecto:
   - `SUPABASE_URL`: URL de tu proyecto (ej: `https://abc123.supabase.co`)
   - `SUPABASE_ANON_KEY`: Clave pública anónima para acceso cliente

---

## 🚀 Pasos de Configuración

### 1. Obtener Credenciales de Supabase

1. Ve a tu proyecto en Supabase: https://app.supabase.com/project/_/settings/api
2. Copia los siguientes valores:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`

### 2. Configurar Variables de Entorno

Edita tu archivo `.env` y agrega las credenciales:

```env
# SUPABASE: Database configuration (replaces Firebase)
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Crear Tablas en Supabase

1. Ve al **SQL Editor** en Supabase: https://app.supabase.com/project/_/sql
2. Copia y pega el contenido completo de `supabase_schema.sql`
3. Click en **Run** para ejecutar el script
4. Verifica que se crearon 4 tablas:
   - `characters`
   - `props`
   - `locations`
   - `reference_frames`

### 4. Verificar Tablas Creadas

Ejecuta esta query en el SQL Editor para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('characters', 'props', 'locations', 'reference_frames');
```

Deberías ver las 4 tablas listadas.

### 5. Reiniciar el Servidor

```powershell
npm run dev
```

El servidor debería mostrar:
```
Server running on http://localhost:3000
```

---

## 📊 Estructura de Datos

### Characters (Personajes)
```typescript
{
  id: string;           // UUID único
  user_id: string;      // ID del usuario local
  name: string;         // Nombre del personaje
  description: string;  // Descripción detallada
  image_url?: string;   // URL opcional de imagen
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Props (Objetos)
```typescript
{
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Locations (Escenarios)
```typescript
{
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url?: string;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Reference Frames (Fotogramas)
```typescript
{
  id: string;
  user_id: string;
  name: string;
  image_url: string;    // URL requerida
  created_at: timestamp;
  updated_at: timestamp;
}
```

---

## 🔧 Archivos Modificados

### Nuevos Archivos
- ✅ `src/lib/supabase.ts` - Cliente y funciones de Supabase
- ✅ `supabase_schema.sql` - Esquema de base de datos
- ✅ `SUPABASE_SETUP.md` - Esta documentación

### Archivos Actualizados
- ✅ `server.ts` - Nuevo endpoint `/api/supabase-config`
- ✅ `src/App.tsx` - Reemplazadas llamadas Firebase → Supabase
- ✅ `.env` - Agregadas variables `SUPABASE_URL` y `SUPABASE_ANON_KEY`
- ✅ `package.json` - Agregada dependencia `@supabase/supabase-js`

### Archivos Deprecados (ya no se usan)
- ⚠️ `src/lib/firebase.ts` - Mantener por compatibilidad, pero no se usa
- ⚠️ `firebase-applet-config.json` - Ya no necesario

---

## 🔄 Migración de Datos (Opcional)

Si ya tienes datos en Firebase y quieres migrarlos a Supabase:

### Opción 1: Exportar desde Firebase y reimportar

1. **Exportar desde Firebase**:
   ```javascript
   // En la consola del navegador mientras usas la app anterior
   const chars = localStorage.getItem('seedance_characters');
   const props = localStorage.getItem('seedance_props');
   const locs = localStorage.getItem('seedance_locations');
   console.log({chars, props, locs});
   ```

2. **Reimportar manualmente** creándolos de nuevo en la UI

### Opción 2: Script de migración automática

Si tienes muchos datos, puedo crear un script Node.js que:
- Lee todos los documentos de Firebase
- Los inserta en Supabase
- Mapea correctamente los campos

---

## 🧪 Verificar que Funciona

1. **Abrir la app**: http://localhost:3000
2. **Crear un personaje nuevo**:
   - Click en "+ Crear Material / Subir Imagen"
   - Selecciona "Personaje"
   - Llena el nombre y descripción
   - Click "Guardar"
3. **Verificar en Supabase**:
   - Ve al **Table Editor**: https://app.supabase.com/project/_/editor
   - Selecciona tabla `characters`
   - Deberías ver tu personaje recién creado

---

## 🔐 Seguridad

### Row Level Security (RLS)

Las tablas están configuradas con **políticas públicas** (`PUBLIC access`) para simplificar el desarrollo inicial.

**Para producción**, considera implementar autenticación real:

```sql
-- Ejemplo: Política restrictiva por usuario autenticado
CREATE POLICY "Users access own data"
  ON characters
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Variables de Entorno

- ✅ `SUPABASE_URL` es **pública** - puede estar en el cliente
- ✅ `SUPABASE_ANON_KEY` es **pública** - diseñada para el cliente
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` es **privada** - NUNCA la expongas al cliente

---

## 📈 Capacidad y Límites

### Plan Gratuito de Supabase
- **500 MB de base de datos**
- **1 GB de archivos** (Storage)
- **2 GB de ancho de banda**
- **50,000 usuarios mensuales activos**

Más que suficiente para desarrollo y proyectos personales.

---

## 🐛 Troubleshooting

### Error: "Supabase configuration missing"

**Causa**: Variables no configuradas en `.env`

**Solución**:
```env
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
```

Reinicia el servidor: `npm run dev`

### Error: "relation "characters" does not exist"

**Causa**: Tablas no creadas en Supabase

**Solución**:
1. Ve al SQL Editor
2. Ejecuta `supabase_schema.sql` completo
3. Verifica con `SELECT * FROM characters LIMIT 1;`

### Error: "row-level security policy"

**Causa**: RLS activado sin política adecuada

**Solución**: El esquema ya incluye políticas públicas. Si modificaste algo, ejecuta:

```sql
CREATE POLICY "Public access" ON characters FOR ALL TO PUBLIC USING (true);
```

### Datos no se guardan

**Causa Posible**: API key incorrecta o permisos de tabla

**Verificación**:
1. Abre DevTools → Console
2. Busca errores de Supabase
3. Verifica que `SUPABASE_ANON_KEY` sea correcta
4. Confirma que las políticas RLS están activas

---

## 🎯 Próximos Pasos

✅ **Completado**: Migración de materiales (personajes, props, locations)  
⏭️ **Próximo**: Puedes agregar:
- Historial de videos generados en Supabase
- Logs de uso de API keys
- Sistema de autenticación real con Supabase Auth
- Compartir materiales entre usuarios

---

## 💡 Recursos Adicionales

- **Documentación Supabase**: https://supabase.com/docs
- **Supabase Client JS**: https://supabase.com/docs/reference/javascript
- **SQL Reference**: https://supabase.com/docs/guides/database
- **Dashboard del Proyecto**: https://app.supabase.com/project/_/editor

---

## 🆘 Soporte

Si encuentras problemas:

1. **Verifica logs** del servidor en la terminal
2. **Revisa consola** del navegador (DevTools)
3. **Confirma credenciales** en `.env`
4. **Valida tablas** en Supabase SQL Editor

**Todo configurado correctamente = datos se guardan automáticamente** ✨
