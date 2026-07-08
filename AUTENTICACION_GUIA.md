# Sistema de Autenticación - Persistencia Studio

## 🔐 Autenticación con Supabase

Persistencia Studio ahora cuenta con un sistema completo de autenticación usando Supabase Auth.

---

## ✨ Características

### 1. **Registro de Usuarios**
- ✅ Crear cuenta con email y contraseña
- ✅ Validación: mínimo 6 caracteres para contraseña
- ✅ Confirmación por email
- ✅ Campo opcional para nombre completo

### 2. **Inicio de Sesión**
- ✅ Login con email y contraseña
- ✅ Sesión persistente (se mantiene al recargar)
- ✅ Auto-refresh de tokens
- ✅ Toggle para mostrar/ocultar contraseña

### 3. **Recuperación de Contraseña**
- ✅ Envío de enlace de recuperación por email
- ✅ Flujo completo de reset password

### 4. **Gestión de Sesión**
- ✅ Logout con un click
- ✅ Muestra email del usuario en header
- ✅ Protección automática de rutas
- ✅ Loading screen mientras verifica autenticación

---

## 📱 Flujo de Usuario

### Primera Vez (Nuevo Usuario)

1. **Abrir la aplicación** → Pantalla de auth animada
2. **Click en "Regístrate"** → Formulario de registro
3. **Llenar datos:**
   - Nombre completo (opcional)
   - Email
   - Contraseña (mínimo 6 caracteres)
4. **Click en "Crear cuenta"**
5. **Revisar email** → Confirmar cuenta
6. **Volver y hacer login** → Acceso a la aplicación

### Usuario Existente

1. **Abrir la aplicación** → Pantalla de login
2. **Ingresar credenciales:**
   - Email
   - Contraseña
3. **Click en "Iniciar sesión"** → Acceso inmediato
4. **Sesión persiste** → No necesita volver a loguearse

### Olvidó Contraseña

1. **Pantalla de login** → Click en "¿Olvidaste tu contraseña?"
2. **Ingresar email** → Click en "Enviar enlace"
3. **Revisar email** → Seguir instrucciones
4. **Volver y hacer login** con nueva contraseña

---

## 🎨 UI/UX

### Pantalla de Autenticación

**Diseño:**
- Fondo con gradiente animado (burbujas de colores)
- Logo de Persistencia Studio
- Formularios limpios y modernos
- Validación inline
- Mensajes de error y éxito destacados

**Colores:**
- Primario: Púrpura/Índigo gradiente
- Acento: Amarillo neón (#d1f025)
- Fondo: Degradado pastel
- Texto: Gris oscuro/Negro

**Animaciones:**
- Burbujas flotantes en el fondo
- Transiciones suaves en botones
- Loading spinner durante acciones

### Header de la Aplicación

**Nuevo:**
- Muestra email del usuario (truncado si es largo)
- Botón de logout con icono
- Estilo consistente con tema oscuro

---

## 🔧 Implementación Técnica

### Arquitectura

```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticación
├── components/
│   └── AuthPage.tsx             # UI de login/registro
├── AuthenticatedApp.tsx         # Wrapper protegido
├── App.tsx                      # App principal (modificado)
├── main.tsx                     # Entry point (modificado)
└── lib/
    └── supabase.ts              # Cliente Supabase (modificado)
```

### AuthContext

**Estado:**
```typescript
{
  user: User | null;           // Usuario actual
  session: Session | null;     // Sesión activa
  loading: boolean;            // Estado de carga
}
```

**Métodos:**
```typescript
signUp(email, password, fullName?)  // Registro
signIn(email, password)             // Login
signOut()                           // Logout
resetPassword(email)                // Recuperación
```

### AuthenticatedApp

**Lógica:**
```typescript
if (loading) return <LoadingScreen />;
if (!user) return <AuthPage />;
return <App />;
```

### Supabase Client

**Configuración:**
```typescript
{
  auth: {
    persistSession: true,      // Sesión persistente
    autoRefreshToken: true,    // Auto-refresh
    detectSessionInUrl: true,  // Detectar en URL
    storage: localStorage      // Almacenamiento
  }
}
```

---

## 🗄️ Base de Datos

### Tablas Afectadas

Todas las tablas usan `user_id` para separar datos por usuario:

- **characters** → `user_id: string`
- **props** → `user_id: string`
- **locations** → `user_id: string`
- **reference_frames** → `user_id: string`

### Políticas RLS (Row Level Security)

**IMPORTANTE:** El campo `user_id` en las tablas es de tipo TEXT, pero `auth.uid()` devuelve UUID. Debes hacer cast explícito usando `::text`.

Ejecutar este SQL completo en **SQL Editor** de Supabase:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE props ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_frames ENABLE ROW LEVEL SECURITY;

-- Políticas para characters
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

-- Políticas para props
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

-- Políticas para locations
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

-- Políticas para reference_frames
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
```

**Explicación del Cast:**
- `auth.uid()` devuelve un UUID (tipo de dato de PostgreSQL)
- `user_id` en las tablas es TEXT (string)
- `auth.uid()::text` convierte el UUID a texto para la comparación
- Sin el cast, obtienes el error: `operator does not exist: uuid = text`

**Alternativa:** Si prefieres usar UUID nativo:
```sql
-- Cambiar tipo de columna (solo si las tablas están vacías o migradas correctamente)
ALTER TABLE characters ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE props ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE locations ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE reference_frames ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Luego las políticas pueden usar comparación directa
CREATE POLICY "Users can view own characters"
ON characters FOR SELECT
USING (auth.uid() = user_id);
-- etc...
```

---

## 🚀 Configuración en Producción

### Paso 1: Verificar Variables de Entorno

Asegúrate de que Coolify tenga configuradas:

```bash
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Paso 2: Habilitar Email Auth en Supabase

1. Ir al Dashboard de Supabase
2. **Authentication** → **Providers**
3. Habilitar **Email**
4. Configurar:
   - **Enable email confirmations** → ON
   - **Confirm email** template → Personalizar si quieres

### Paso 3: Configurar Email Templates

En **Authentication** → **Email Templates**, personalizar:

- **Confirm signup** (confirmación de registro)
- **Reset password** (recuperación de contraseña)
- **Magic Link** (si quieres habilitarlo)

### Paso 4: Configurar URLs de Redirect

En **Authentication** → **URL Configuration**:

```
Site URL: https://tu-dominio.com
Redirect URLs:
  - https://tu-dominio.com
  - https://tu-dominio.com/reset-password
  - http://localhost:3000 (para desarrollo)
```

### Paso 5: Habilitar RLS en Tablas

Ver sección "Políticas RLS" arriba.

---

## 🧪 Testing

### Desarrollo Local

```bash
# Terminal 1: Backend
npm start

# Terminal 2: Frontend (si desarrollo separado)
npm run dev
```

### Probar Flujos

1. **Registro:**
   - Usar email real
   - Verificar recepción de email de confirmación
   - Confirmar cuenta
   - Intentar login

2. **Login:**
   - Usar credenciales existentes
   - Verificar que cargue la app
   - Recargar página → sesión persiste

3. **Logout:**
   - Click en botón logout
   - Verificar que vuelva a auth
   - Intentar acceder directamente → redirige a auth

4. **Reset Password:**
   - Click en "Olvidaste contraseña"
   - Ingresar email
   - Verificar email recibido
   - Seguir enlace y cambiar contraseña
   - Login con nueva contraseña

---

## 🐛 Troubleshooting

### Problema: "Failed to load Supabase configuration"

**Causa:** Backend no tiene variables de entorno configuradas

**Solución:**
```bash
# En .env o Coolify
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### Problema: Email de confirmación no llega

**Causa:** SMTP no configurado en Supabase

**Solución:**
1. Supabase Dashboard → **Project Settings** → **Auth**
2. Configurar SMTP custom o usar el de Supabase
3. Verificar spam/junk folder

### Problema: "Invalid login credentials"

**Causas posibles:**
1. Email no confirmado
2. Contraseña incorrecta
3. Usuario no existe

**Solución:**
1. Verificar email confirmado en Supabase Dashboard → **Authentication** → **Users**
2. Intentar reset password
3. Crear nueva cuenta

### Problema: Sesión no persiste

**Causa:** localStorage bloqueado

**Solución:**
- Verificar que el navegador permite localStorage
- Revisar modo incógnito (puede bloquear storage)
- Limpiar cookies y cache

### Problema: "User already registered" al hacer signup

**Causa:** Email ya existe en sistema

**Solución:**
- Usar otro email
- O hacer login con ese email
- O recuperar contraseña si la olvidó

### Problema: "operator does not exist: uuid = text" en RLS

**Error completo:**
```
ERROR: 42883: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
```

**Causa:** Las políticas RLS intentan comparar `auth.uid()` (UUID) con `user_id` (TEXT) sin cast explícito.

**Solución:**
Agregar `::text` al cast en todas las políticas:

```sql
-- ❌ INCORRECTO (causa el error)
USING (auth.uid() = user_id)

-- ✅ CORRECTO
USING (auth.uid()::text = user_id)
```

**Verificar políticas existentes:**
```sql
-- Ver políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('characters', 'props', 'locations', 'reference_frames');

-- Eliminar políticas incorrectas si es necesario
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
-- ... repetir para todas las políticas incorrectas

-- Crear políticas correctas con cast
-- (Ver script completo en la sección "Políticas RLS" arriba)
```

### Problema: No puedo ver mis datos después de habilitar RLS

**Causa:** RLS habilitado pero políticas no creadas o incorrectas

**Solución:**
1. Verificar que las políticas se crearon correctamente (ver query arriba)
2. Verificar que estás autenticado (tienes un token válido)
3. Verificar que `user_id` en los registros coincide con tu UUID de auth:

```sql
-- Ver tu UUID de auth
SELECT auth.uid();

-- Ver user_id de tus registros
SELECT id, name, user_id FROM characters LIMIT 5;

-- Si no coinciden, actualizar (CUIDADO: solo en desarrollo)
UPDATE characters SET user_id = (SELECT auth.uid()::text) WHERE user_id = 'tu-viejo-id';
```

---

## 📊 Métricas y Monitoreo

### Dashboard de Supabase

Ver estadísticas en **Authentication** → **Users**:

- Total de usuarios registrados
- Usuarios activos últimos 7 días
- Usuarios confirmados vs pendientes
- Últimos logins

### Logs

Ver logs de autenticación en:
- **Authentication** → **Logs**
- Filtrar por tipo: Login, Signup, Reset, etc.

---

## 🔒 Seguridad

### Mejores Prácticas Implementadas

✅ **Passwords hasheados** → Supabase usa bcrypt  
✅ **Sesiones con JWT** → Tokens firmados  
✅ **Auto-refresh** → Tokens se renuevan automáticamente  
✅ **Email confirmation** → Previene registros falsos  
✅ **Rate limiting** → Supabase aplica límites automáticos  
✅ **HTTPS only** → Forzar SSL en producción  
✅ **Row Level Security** → Usuarios solo ven sus datos  

### Recomendaciones Adicionales

📌 **Producción:**
- Habilitar 2FA en Dashboard de Supabase
- Configurar rate limits custom si es necesario
- Monitorear intentos de login fallidos
- Configurar alertas de seguridad

📌 **Políticas de Password:**
- Mínimo actual: 6 caracteres
- Considerar aumentar a 8 o agregar complejidad
- Configurar en Supabase Dashboard → **Auth** → **Policies**

---

## 🎯 Roadmap Futuro

### Posibles Mejoras

1. **OAuth Providers**
   - Google Sign-In
   - GitHub Sign-In
   - Apple Sign-In

2. **Magic Links**
   - Login sin contraseña
   - Envío por email

3. **2FA/MFA**
   - TOTP (Google Authenticator)
   - SMS (Twilio)

4. **Perfiles de Usuario**
   - Avatar customizable
   - Preferencias
   - Configuración de notificaciones

5. **Roles y Permisos**
   - Admin
   - Editor
   - Viewer
   - Team collaboration

6. **Planes y Subscripciones**
   - Free tier
   - Pro tier
   - Enterprise
   - Integración con Stripe

---

## 📚 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [React Context API](https://react.dev/reference/react/createContext)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

## 👥 Soporte

Para preguntas o problemas:
- GitHub Issues: [Persistencia_Studio/issues](https://github.com/anthonyjdiaz89/Persistencia_Studio/issues)
- Email: Contactar a través de GitHub

---

## 📝 Changelog

### 2026-07-08 - v1.0.0

✨ **Nueva Funcionalidad:**
- Sistema completo de autenticación con Supabase Auth
- UI moderna con animaciones
- Registro, login, logout, reset password
- Sesiones persistentes
- Protección de rutas
- Integración con base de datos existente

🔧 **Modificaciones:**
- `supabase.ts`: Habilitado auth real
- `App.tsx`: Agregado user menu y logout
- `main.tsx`: Agregado AuthProvider

📦 **Archivos Nuevos:**
- `AuthContext.tsx`
- `AuthPage.tsx`
- `AuthenticatedApp.tsx`

---

## ✅ Checklist de Implementación

Para implementar en un nuevo entorno:

- [ ] Variables de entorno configuradas (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Email provider configurado en Supabase
- [ ] Email templates personalizados
- [ ] Redirect URLs configuradas
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS creadas
- [ ] Testing de registro completo
- [ ] Testing de login completo
- [ ] Testing de logout completo
- [ ] Testing de reset password completo
- [ ] Testing de persistencia de sesión
- [ ] Monitoreo de logs habilitado
- [ ] Documentación compartida con equipo

---

¡Disfruta del nuevo sistema de autenticación! 🎉
