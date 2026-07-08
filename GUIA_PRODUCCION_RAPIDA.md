# 🎬 Seedance 2.0 Video Generator - Guía Rápida de Producción

## ⚠️ PROBLEMA COMÚN: "No funciona en producción"

Si tu aplicación funciona en **localhost** pero NO en **producción**, es porque falta configurar la conexión entre el frontend y el backend.

---

## 🏗️ Arquitectura de 2 Componentes

```
FRONTEND (React)  →  hace fetch a  →  BACKEND (Express)
                                      ↓
                               VideoGenAPI + Supabase
```

**El problema:** El frontend no sabe dónde está el backend en producción.

---

## ✅ Solución Rápida

### Opción 1: TODO EN UN SOLO SERVICIO (Recomendado)

**Plataformas:** Render, Railway, Heroku

1. Despliega TODO junto (un solo servicio)
2. Configura estas variables:
   ```bash
   VIDEOGEN_API_KEY_1=lannetech_07cde6a6f9f1a7df65331b46c65948498a1c7042e8ad1338c6fb25510fd15337
   VIDEOGEN_API_KEY_2=lannetech_a856d87d151fb8b5459fcc39ddb9957cb6809aa7f2559b8ab2763d63ef7384ee
   SUPABASE_URL=https://bd.persistenciadigital.com
   SUPABASE_ANON_KEY=tu_supabase_key_real
   ```
3. **NO configures** `VITE_API_URL`
4. ✅ Listo, debería funcionar

### Opción 2: FRONTEND Y BACKEND SEPARADOS

**Ejemplo:** Frontend en Vercel, Backend en Render

1. Despliega el **Backend** primero (Render/Railway/etc)
2. Anota la URL del backend: `https://tu-backend.onrender.com`
3. Despliega el **Frontend** (Vercel/Netlify/etc)
4. **CRÍTICO:** Configura en el frontend:
   ```bash
   VITE_API_URL=https://tu-backend.onrender.com
   ```
5. ✅ El frontend ahora sabe dónde está el backend

---

## 🔍 Diagnóstico Rápido

### ¿Cómo saber si está bien configurado?

1. **Prueba el backend:**
   ```bash
   curl https://TU-URL/api/config
   ```
   
   Deberías ver:
   ```json
   {
     "status": "ok",
     "hasApiKey": true,
     "totalKeys": 2
   }
   ```

2. **Abre la consola del navegador** en tu app:
   - Busca: `[Config] API_BASE_URL:`
   - Si todo está junto: `"same domain"` ✅
   - Si están separados: `"https://tu-backend.com"` ✅

3. **Prueba cargar el historial:**
   - Si ves videos → ✅ Funciona
   - Si ves error → ❌ Revisa la configuración

---

## 📚 Documentación Completa

- **[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)** - Guía completa de despliegue por plataforma
- **[DIAGNOSTICO_PRODUCCION.md](./DIAGNOSTICO_PRODUCCION.md)** - Diagnóstico paso a paso
- **[API_KEY_DISTRIBUTION_ANALYSIS.md](./API_KEY_DISTRIBUTION_ANALYSIS.md)** - Análisis de costos y capacidad

---

## 🚀 Comandos de Despliegue

```bash
# Build (genera frontend + backend)
npm run build

# Ejecutar en producción
npm start

# Desarrollo local
npm run dev
```

---

## 🆘 ¿Aún no funciona?

Revisa [DIAGNOSTICO_PRODUCCION.md](./DIAGNOSTICO_PRODUCCION.md) para un diagnóstico detallado paso a paso.

**Checklist rápido:**
- [ ] Backend desplegado y corriendo
- [ ] Variables de entorno configuradas (API keys + Supabase)
- [ ] `VITE_API_URL` configurada SI están separados
- [ ] `/api/config` responde correctamente
- [ ] Consola del navegador sin errores

---

**Sistema:** Multi-Key Load Balancer v2.0  
**Capacidad:** 20 videos/día (2 API keys × 10 videos)  
**Costo:** $400 USD/mes (2 keys × $200)
