# Sistema de Autenticación - Persistencia Studio

## 🔐 Autenticación con Supabase

Persistencia Studio ahora cuenta con un sistema completo de autenticación usando Supabase Auth.

⚠️ **IMPORTANTE:** El registro público está DESACTIVADO. Los usuarios deben ser creados manualmente por el administrador desde el Dashboard de Supabase.

---

## ✨ Características

### 1. **Inicio de Sesión**
- ✅ Login con email y contraseña
- ✅ Sesión persistente (se mantiene al recargar)
- ✅ Auto-refresh de tokens
- ✅ Toggle para mostrar/ocultar contraseña
- ✅ Validación de credenciales

### 2. **Gestión de Usuarios** (Solo Administradores)
- ✅ Crear usuarios manualmente desde Supabase Dashboard
- ✅ Asignar contraseñas temporales
- ✅ Gestionar permisos y datos de usuario

### 3. **Gestión de Sesión**
- ✅ Logout con un click
- ✅ Muestra email del usuario en header
- ✅ Protección automática de rutas
- ✅ Loading screen mientras verifica autenticación

---

## 📱 Flujo de Usuario

### Para Usuarios Finales

1. **Recibir credenciales** del administrador (email y contraseña temporal)
2. **Abrir la aplicación** → Pantalla de login
3. **Ingresar credenciales:**
   - Email proporcionado por el admin
   - Contraseña temporal
4. **Click en "Iniciar sesión"** → Acceso a la aplicación
5. **Opcional:** Cambiar contraseña desde perfil

### Para Administradores (Crear Usuarios)

1. **Abrir Supabase Dashboard** → https://bd.persistenciadigital.com
2. **Ir a Authentication** → Users
3. **Click en "Add user"** → Botón verde
4. **Llenar el formulario:**
   - **Email:** Email del nuevo usuario (debe ser válido)
   - **Password:** Contraseña temporal (mínimo 6 caracteres)
   - **Auto Confirm User:** ✅ Marcar (para que pueda hacer login inmediatamente)
   - **Email Confirm:** ✅ Marcar
5. **Click en "Create user"**
6. **Copiar credenciales** y enviarlas al usuario de forma segura
7. **Verificar creación:** El usuario debe aparecer en la tabla con estado "Confirmed"

**Ejemplo de credenciales a enviar:**
```
Email: usuario@ejemplo.com
Contraseña temporal: Temp123456
URL: https://tu-app.com

Por favor cambia tu contraseña después del primer login.
```

**Gestión de usuarios existentes:**
- **Ver usuarios:** Authentication → Users (lista completa)
- **Editar usuario:** Click en el email → Editar datos
- **Eliminar usuario:** Click en el email → Delete user
- **Resetear contraseña:** Click en el email → Send password reset email
- **Ver sesiones activas:** Authentication → Users → Click en email → Sessions

---

## 🔐 Cambiar Contraseña (Usuarios)

Actualmente el sistema no tiene interfaz para que los usuarios cambien su contraseña. Opciones:

### Opción 1: Desde Supabase Dashboard (Recomendado)
1. Administrador va a Authentication → Users
2. Click en el email del usuario
3. Click en "Send password reset email"
4. Usuario recibe email con enlace
5. Sigue el enlace y establece nueva contraseña

### Opción 2: Implementar Cambio de Contraseña en App (Futuro)
```typescript
// Código para agregar en el futuro
const { data, error } = await supabase.auth.updateUser({
  password: newPassword
});
```

---

## 🚫 Por Qué Está Desactivado el Registro Público

**Razones:**

1. **Control de acceso:** Solo usuarios autorizados pueden usar la aplicación
2. **Costos:** Evita registros spam que consumen recursos
3. **Gestión:** El administrador conoce y aprueba cada usuario
4. **Seguridad:** Reduce superficie de ataque (no hay endpoint público de registro)
5. **Compliance:** Mejor control para auditorías y cumplimiento

**Si necesitas reactivar el registro público:**

Ver archivo `src/components/AuthPage.tsx` líneas 1-10 para instrucciones.

---

## 🎨 UI/UX (Actualizado)

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

## 🎨 UI/UX (Actualizado)

### Pantalla de Autenticación

**Diseño:**
- Fondo con gradiente animado (burbujas de colores)
- Logo de Persistencia Studio
- Formulario de login limpio y moderno
- Validación inline
- Mensajes de error destacados
- Mensaje informativo: "Los usuarios deben ser creados por un administrador"

**Campos:**
- Email (requerido)
- Contraseña (requerido, mínimo 6 caracteres, con toggle show/hide)

**Acciones:**
- Botón "Iniciar sesión" con loading spinner

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
│   └── AuthPage.tsx             # UI de login solamente
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
signIn(email, password)             // Login
signOut()                           // Logout
```

**Nota:** `signUp()` y `resetPassword()` están definidos en AuthContext pero no están expuestos en la UI (registro desactivado).

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

**IMPORTANTE:** Antes de probar, crea un usuario de prueba desde Supabase Dashboard (ver sección "Para Administradores").

1. **Crear Usuario de Prueba:**
   - Dashboard → Authentication → Users → Add user
   - Email: test@persistenciastudio.com
   - Password: Test123456
   - Auto Confirm: ✅
   - Email Confirm: ✅

2. **Login:**
   - Abrir la app
   - Ingresar credenciales de prueba
   - Verificar que cargue la app correctamente
   - Recargar página → sesión persiste

3. **Logout:**
   - Click en botón logout (icono en header)
   - Verificar que vuelva a pantalla de auth
   - Intentar acceder directamente → redirige a auth

4. **Persistencia de Sesión:**
   - Hacer login
   - Cerrar y abrir navegador
   - Abrir la app → debe mantener sesión activa

5. **RLS (Row Level Security):**
   - Crear personaje/prop/location con usuario A
   - Hacer logout
   - Login con usuario B
   - Verificar que NO ve los datos de usuario A

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

### Problema: No puedo ver mis datos después de habilitar RLS

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
✅ **Rate limiting** → Supabase aplica límites automáticos  
✅ **HTTPS only** → Forzar SSL en producción  
✅ **Row Level Security** → Usuarios solo ven sus datos  
✅ **Registro controlado** → Solo administradores crean usuarios  

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

### 2026-07-08 - v1.1.0

🔒 **Cambio de Seguridad:**
- **Registro público DESACTIVADO** por seguridad y control de acceso
- Usuarios deben ser creados manualmente por administradores
- Eliminados formularios de signup y reset password de la UI

📖 **Documentación:**
- Agregada sección "Gestión de Usuarios (Solo Administradores)"
- Guía paso a paso para crear usuarios desde Supabase Dashboard
- Sección "Por Qué Está Desactivado el Registro Público"
- Actualizada checklist de implementación

### 2026-07-08 - v1.0.0

✨ **Nueva Funcionalidad:**
- Sistema completo de autenticación con Supabase Auth
- UI moderna con animaciones
- Login y logout funcionales
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
- [ ] Redirect URLs configuradas (si se implementa reset password en el futuro)
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS creadas (con cast ::text)
- [ ] Crear usuario de prueba desde Dashboard
- [ ] Testing de login completo
- [ ] Testing de logout completo
- [ ] Testing de persistencia de sesión
- [ ] Testing de RLS (usuarios no ven datos de otros)
- [ ] Monitoreo de logs habilitado
- [ ] Documentar proceso de creación de usuarios para administradores
- [ ] Documentación compartida con equipo

---

¡Disfruta del nuevo sistema de autenticación! 🎉
