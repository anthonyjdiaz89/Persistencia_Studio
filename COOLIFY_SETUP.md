# 🚨 Guía de Configuración para Coolify

## ⚠️ Problema: "CONFIGURACIÓN FALTANTE: No se detectó VIDEOGEN_API_KEY"

Este error significa que **las variables de entorno NO están configuradas** en Coolify.

---

## ✅ Solución Paso a Paso

### 1. Accede a tu Dashboard de Coolify

```
https://tu-coolify-domain.com/dashboard
```

### 2. Selecciona tu Aplicación

```
Applications → Persistencia_Studio
```

### 3. Ve a la Sección "Environment"

```
Click en la pestaña "Environment" o "Environment Variables"
```

### 4. Agrega las Variables de Entorno

**⚠️ IMPORTANTE:** Copia y pega **EXACTAMENTE** estas variables (una por línea):

```bash
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY_AQUI
```

**⚠️ REEMPLAZA** `TU_SUPABASE_ANON_KEY_AQUI` con tu clave real de Supabase.

**Opcional (para AI Director):**
```bash
GEMINI_API_KEY=tu_gemini_key_aqui
```

### 5. Formato en Coolify

Coolify acepta 2 formatos:

**Formato A: Key-Value Pairs (Recomendado)**
```
Variable Name: VIDEOGEN_API_KEY_1
Value: lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337

Variable Name: VIDEOGEN_API_KEY_2
Value: lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee

Variable Name: SUPABASE_URL
Value: https://bd.persistenciadigital.com

Variable Name: SUPABASE_ANON_KEY
Value: tu_clave_real_aqui
```

**Formato B: Archivo .env Style**
```
VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
SUPABASE_URL=https://bd.persistenciadigital.com
SUPABASE_ANON_KEY=tu_clave_real_aqui
```

### 6. Guarda y Redeploy

```
1. Click "Save" o "Update"
2. Click "Redeploy" o "Restart"
3. Espera 1-2 minutos a que el deploy termine
```

---

## 🔍 Verificación

### Método 1: Endpoint de Diagnóstico

Abre en tu navegador:
```
https://tu-dominio-coolify.com/api/config
```

**✅ Respuesta CORRECTA:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "totalKeys": 2,
  "apiKeyStatus": {
    "VIDEOGEN_API_KEY_1": true,
    "VIDEOGEN_API_KEY_2": true
  },
  "diagnostic": "✅ 2 API key(s) loaded successfully"
}
```

**❌ Respuesta INCORRECTA:**
```json
{
  "status": "ok",
  "hasApiKey": false,
  "totalKeys": 0,
  "apiKeyStatus": {
    "VIDEOGEN_API_KEY_1": false,
    "VIDEOGEN_API_KEY_2": false
  },
  "diagnostic": "❌ NO API KEYS DETECTED - Check environment variables"
}
```

### Método 2: Logs de Coolify

```
1. En Coolify Dashboard → Logs
2. Busca esta línea:
   "🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO"
3. Verifica que veas:
   ✅ VIDEOGEN_API_KEY_1: lannetech_...
   ✅ VIDEOGEN_API_KEY_2: lannetech_...
```

**Si ves:**
```
❌ VIDEOGEN_API_KEY_1: NO CONFIGURADA
❌ VIDEOGEN_API_KEY_2: NO CONFIGURADA
```
→ Las variables NO están configuradas correctamente.

### Método 3: Interfaz de Usuario

```
1. Abre tu aplicación: https://tu-dominio-coolify.com
2. Verifica que NO veas el mensaje:
   "⚠️ CONFIGURACIÓN FALTANTE: No se detectó VIDEOGEN_API_KEY"
3. El botón "Generar Shot" debe estar HABILITADO (no gris)
4. Deberías ver "Multi-Key Monitor" con "2 Keys disponibles"
```

---

## 🐛 Problemas Comunes

### Problema 1: Variables configuradas pero no se detectan

**Causa:** Coolify no las inyectó correctamente en el contenedor

**Solución:**
```bash
1. Elimina TODAS las variables de entorno
2. Vuelve a agregarlas UNA POR UNA
3. Guarda después de CADA variable
4. Redeploy al final
```

### Problema 2: Error de sintaxis en las variables

**Causa:** Espacios extra, comillas mal puestas, saltos de línea

**Solución:**
```bash
✅ CORRECTO:
VIDEOGEN_API_KEY_1=lannetech_abc123...

❌ INCORRECTO:
VIDEOGEN_API_KEY_1 = lannetech_abc123...  (espacios alrededor del =)
VIDEOGEN_API_KEY_1="lannetech_abc123..."  (comillas innecesarias)
VIDEOGEN_API_KEY_1=lannetech_abc123
...con_salto_de_linea  (NO debe tener saltos de línea)
```

### Problema 3: Deploy no se ejecutó después de configurar

**Causa:** Cambios no aplicados

**Solución:**
```bash
1. Después de agregar las variables, DEBES hacer redeploy
2. Coolify → Click "Redeploy" o "Restart"
3. NO basta con solo guardar las variables
```

### Problema 4: Archivo .env local interfiere

**Causa:** Si subes un .env local, puede causar conflictos

**Solución:**
```bash
1. Verifica que .env esté en .gitignore
2. NO subas .env al repositorio
3. Las variables deben estar SOLO en Coolify Dashboard
```

---

## 📋 Checklist de Configuración

Marca cada paso cuando esté completo:

- [ ] Accedí al Dashboard de Coolify
- [ ] Fui a mi aplicación → Environment
- [ ] Agregué `VIDEOGEN_API_KEY_1` con el valor completo
- [ ] Agregué `VIDEOGEN_API_KEY_2` con el valor completo
- [ ] Agregué `SUPABASE_URL` = `https://bd.persistenciadigital.com`
- [ ] Agregué `SUPABASE_ANON_KEY` con mi clave real
- [ ] Guardé los cambios
- [ ] Hice redeploy de la aplicación
- [ ] Esperé 1-2 minutos a que termine el deploy
- [ ] Verifiqué `/api/config` y dice `hasApiKey: true`
- [ ] Abrí la aplicación y NO veo el error
- [ ] El botón "Generar Shot" está habilitado

---

## 🆘 ¿Aún no funciona?

Si después de seguir todos los pasos el error persiste:

1. **Copia los logs de Coolify** (la sección que dice "🔍 DIAGNÓSTICO DE VARIABLES DE ENTORNO")
2. **Copia la respuesta de** `https://tu-dominio/api/config`
3. **Toma screenshot** de la sección Environment en Coolify Dashboard
4. Comparte esta información para obtener ayuda específica

---

## 📞 Soporte Adicional

- **Documentación Coolify:** https://coolify.io/docs
- **GitHub Issues:** https://github.com/anthonyjdiaz89/Persistencia_Studio/issues
- **Documentación Completa:** Ver [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

---

**Última actualización:** 2026-07-08  
**Sistema:** Multi-Key Load Balancer v2.0 para Coolify
