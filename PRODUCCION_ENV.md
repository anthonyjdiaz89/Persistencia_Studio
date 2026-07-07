# Configuración de Variables de Entorno en Producción

## 🚨 Problema Identificado

El botón "Generar Shot" está deshabilitado en producción porque faltan las variables de entorno necesarias.

---

## 📋 Variables de Entorno Requeridas

### 1. **API Keys de VideoGenAPI** (Obligatorias para generación)

```bash
# Clave principal (al menos una requerida)
VIDEOGEN_API_KEY=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337

# Sistema Multi-Key (opcional - para load balancing)
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fa8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
# ... hasta VIDEOGEN_API_KEY_10
```

### 2. **Supabase Database** (Obligatorias para materiales)

```bash
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MzM5NDgyMCwiZXhwIjo0OTM5MDY4NDIwLCJyb2xlIjoiYW5vbiJ9.4ktWrJVS538BO5nflaOq0_g4GMaKD3Qq0fY9v1lkR3w
```

### 3. **Gemini API** (Opcional - solo para AI Director)

```bash
GEMINI_API_KEY=tu_clave_de_gemini
```

---

## 🌐 Configuración por Plataforma

### **Vercel** ⚡
1. Ve a tu proyecto en https://vercel.com
2. Settings → Environment Variables
3. Agrega cada variable:
   - Key: `VIDEOGEN_API_KEY`
   - Value: `lannetech_07cde6a6f9...`
   - Environment: Production, Preview, Development
4. Click **Save**
5. Redeploy el proyecto

### **Netlify** 🌊
1. Ve a Site settings → Environment variables
2. Click **Add a variable**
3. Agrega cada variable
4. Click **Save**
5. Trigger a new deploy

### **Railway** 🚂
1. Selecciona tu servicio
2. Variables tab
3. Click **New Variable**
4. Agrega cada variable
5. Redeploy automático

### **Render** 🎨
1. Dashboard → tu servicio
2. Environment tab
3. Agrega cada variable
4. Save changes
5. Deploy automático

### **Coolify** 🧊 (Self-Hosted)
1. Ve a tu aplicación
2. Environment Variables
3. Agrega cada variable en formato `KEY=VALUE`
4. Save
5. Restart application

### **Docker / Docker Compose** 🐳
Crea un archivo `.env` en el servidor y usa `docker-compose`:

```yaml
services:
  app:
    env_file: .env
    # o directamente:
    environment:
      - VIDEOGEN_API_KEY=${VIDEOGEN_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

---

## ✅ Verificación de Configuración

### 1. **Verificar API Key**
```bash
curl https://tu-dominio.com/api/config
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "hasGeminiKey": false,
  "multiKeyEnabled": true
}
```

❌ Si `hasApiKey: false` → Las variables de entorno NO están configuradas

### 2. **Verificar Supabase**
```bash
curl https://tu-dominio.com/api/supabase-config
```

**Respuesta esperada:**
```json
{
  "url": "https://bd.persistenciadigital.com",
  "anonKey": "eyJ0eXAiOiJKV1Q..."
}
```

❌ Si obtienes error 500 → Faltan `SUPABASE_URL` o `SUPABASE_ANON_KEY`

### 3. **Verificar Multi-Key System**
```bash
curl https://tu-dominio.com/api/keys/status
```

**Respuesta esperada:**
```json
{
  "success": true,
  "totalKeys": 2,
  "availableKeys": 2,
  "loadBalancingActive": true
}
```

---

## 🔧 Troubleshooting

### Problema: Botón "Generar Shot" deshabilitado

**Causa:** `hasEnvApiKey = false`

**Solución:**
1. Verifica que `VIDEOGEN_API_KEY` esté configurada en producción
2. Redeploy la aplicación después de agregar las variables
3. Revisa los logs del servidor para confirmar que las variables se cargan

### Problema: Error "Supabase configuration missing"

**Causa:** Faltan variables de Supabase

**Solución:**
1. Agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY` en tu plataforma
2. Verifica que la URL sea correcta (debe incluir `https://`)
3. Redeploy

### Problema: Variables configuradas pero no funcionan

**Causa:** El servidor no reinició después de agregar variables

**Solución:**
1. Forzar un redeploy completo
2. En Vercel/Netlify: Settings → Deploys → Trigger deploy
3. En Railway/Render: Manual deploy

### Problema: Multi-key system no funciona

**Causa:** Solo `VIDEOGEN_API_KEY` configurada, faltan `VIDEOGEN_API_KEY_1`, `_2`, etc.

**Solución:**
1. Agrega al menos `VIDEOGEN_API_KEY_1` y `VIDEOGEN_API_KEY_2`
2. El sistema detecta automáticamente cuántas keys hay (hasta 10)

---

## 📝 Notas Importantes

1. **Nunca subas el archivo `.env` al repositorio** - Ya está en `.gitignore`
2. **Las variables de entorno deben configurarse en la plataforma de hosting**, no en el código
3. **Después de agregar variables, siempre redeploy** la aplicación
4. **Verifica con los endpoints de verificación** antes de probar en la UI
5. **Las API keys son sensibles** - no las compartas públicamente

---

## 🎯 Checklist de Deployment

- [ ] Variables de VideoGenAPI configuradas
- [ ] Variables de Supabase configuradas
- [ ] Verificado `/api/config` retorna `hasApiKey: true`
- [ ] Verificado `/api/supabase-config` retorna URL y key
- [ ] Tablas de Supabase creadas (ejecutar `supabase_schema.sql`)
- [ ] Aplicación redeployada
- [ ] Probado crear un personaje en la UI
- [ ] Probado generar un video

---

**Última actualización:** 2026-07-06  
**Versión:** Commit 42f6e84
