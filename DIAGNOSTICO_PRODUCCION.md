# 🚨 Diagnóstico Rápido: "No toma ni la API ni la BD"

## Síntoma
La aplicación funciona en desarrollo (localhost) pero NO funciona en producción.

---

## 🔍 Diagnóstico Paso a Paso

### PASO 1: ¿El Backend está corriendo?

**Prueba:**
```bash
curl https://TU-URL-DE-PRODUCCION/api/config
```

**Resultado Esperado:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "multiKeyEnabled": true,
  "totalKeys": 2
}
```

**❌ Error 404 / Cannot GET /api/config**
```
PROBLEMA: El backend NO está desplegado o NO está corriendo
SOLUCIÓN: 
  1. Verifica que ejecutaste "npm run build" en tu plataforma
  2. Verifica que el comando de inicio sea "npm start"
  3. Revisa los logs de tu plataforma para ver errores
```

**❌ Respuesta: `{"hasApiKey": false}`**
```
PROBLEMA: Las API keys NO están configuradas
SOLUCIÓN: Configura las variables de entorno en tu plataforma:
  VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
  VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
```

---

### PASO 2: ¿El Frontend se conecta al Backend?

**Prueba:**
```
1. Abre la aplicación en producción
2. Abre la Consola del Navegador (F12)
3. Busca el mensaje: "[Config] API_BASE_URL:"
```

**Resultado Esperado:**
```
[Config] API_BASE_URL: https://tu-backend.com
[Config] Environment: production
```

**O si todo está junto:**
```
[Config] API_BASE_URL: same domain
[Config] Environment: production
```

**❌ No ves ningún mensaje**
```
PROBLEMA: El frontend no se cargó correctamente
SOLUCIÓN: Verifica que el build del frontend se ejecutó correctamente
```

**❌ Ves "API_BASE_URL: same domain" pero el backend está en otra URL**
```
PROBLEMA: Falta configurar VITE_API_URL
SOLUCIÓN: Agrega en tu plataforma de frontend:
  VITE_API_URL=https://tu-backend-real.com
  
Luego redeploy.
```

**❌ Ves errores de CORS en la consola**
```
PROBLEMA: El frontend no puede comunicarse con el backend (diferentes dominios)
SOLUCIÓN: 
  1. Verifica que VITE_API_URL esté configurado correctamente
  2. Verifica que el backend tenga CORS habilitado (ya está en server.ts)
```

---

### PASO 3: ¿Supabase está configurado?

**Prueba:**
```bash
curl https://TU-BACKEND/api/supabase-config
```

**Resultado Esperado:**
```json
{
  "url": "https://bd.persistenciadigital.com",
  "anonKey": "eyJh...tu_key_aqui"
}
```

**❌ Error 500 / "Supabase configuration missing"**
```
PROBLEMA: Variables de Supabase no configuradas
SOLUCIÓN: Agrega en tu plataforma:
  SUPABASE_URL=https://bd.persistenciadigital.com
  SUPABASE_ANON_KEY=tu_anon_key_real
```

---

### PASO 4: ¿Firebase está configurado?

**Prueba:**
```bash
curl https://TU-BACKEND/api/firebase-config
```

**Resultado Esperado:**
```json
{
  "apiKey": "AIza...",
  "authDomain": "...",
  ...
}
```

**❌ Error / "Firebase config not found"**
```
PROBLEMA: Archivo firebase-applet-config.json no incluido en el build
SOLUCIÓN: Verifica que el archivo existe en el repo y se incluye en el despliegue
```

---

## 📋 Checklist de Configuración

Marca cada uno cuando esté completo:

### Backend
- [ ] ✅ Backend desplegado (Render, Railway, Heroku, Cloud Run)
- [ ] ✅ Comando de build: `npm run build`
- [ ] ✅ Comando de inicio: `npm start`
- [ ] ✅ `/api/config` responde con `hasApiKey: true`
- [ ] ✅ `VIDEOGEN_API_KEY_1` configurada
- [ ] ✅ `VIDEOGEN_API_KEY_2` configurada
- [ ] ✅ `SUPABASE_URL` configurada
- [ ] ✅ `SUPABASE_ANON_KEY` configurada

### Frontend
- [ ] ✅ Frontend desplegado
- [ ] ✅ Si está separado del backend: `VITE_API_URL` configurada
- [ ] ✅ Si está junto con backend: `VITE_API_URL` NO configurada
- [ ] ✅ Consola del navegador muestra `[Config] API_BASE_URL` correctamente
- [ ] ✅ No hay errores de CORS en la consola

### Funcionalidad
- [ ] ✅ Historia de videos carga correctamente
- [ ] ✅ Puedes subir imágenes de referencia
- [ ] ✅ Personajes/Props/Locations se guardan y persisten
- [ ] ✅ Puedes generar un video de prueba

---

## 🎯 Escenarios Comunes

### Escenario A: Todo en Render/Railway/Heroku
```bash
# Variables necesarias:
VIDEOGEN_API_KEY_1=...
VIDEOGEN_API_KEY_2=...
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=...

# NO configurar:
VITE_API_URL (dejarlo vacío)
```

### Escenario B: Frontend en Vercel + Backend en Render
```bash
# En Render (Backend):
VIDEOGEN_API_KEY_1=...
VIDEOGEN_API_KEY_2=...
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=...

# En Vercel (Frontend):
VITE_API_URL=https://tu-backend.onrender.com
```

### Escenario C: Frontend en Netlify + Backend en Railway
```bash
# En Railway (Backend):
VIDEOGEN_API_KEY_1=...
VIDEOGEN_API_KEY_2=...
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=...

# En Netlify (Frontend):
VITE_API_URL=https://tu-backend.railway.app
```

---

## 🆘 Ayuda Adicional

Si después de seguir estos pasos aún tienes problemas:

1. **Verifica los logs de tu plataforma**
   - Render: Dashboard → Logs
   - Vercel: Dashboard → Deployments → View Function Logs
   - Railway: Service → Logs
   - Heroku: `heroku logs --tail`

2. **Prueba localmente primero**
   ```bash
   # Build local
   npm run build
   
   # Ejecutar producción local
   npm start
   
   # Prueba en http://localhost:3000
   ```

3. **Comparte los logs y errores específicos** para recibir ayuda más precisa.

---

**Última actualización:** 2026-07-08  
**Versión:** Seedance 2.0 Multi-Key System
