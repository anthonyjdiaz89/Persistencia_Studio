# Sistema de Balanceo de Carga con Múltiples API Keys

## 🎯 Descripción

Sistema avanzado de balanceo de carga que permite usar múltiples claves API de VideoGen simultáneamente. Cuando una clave alcanza su límite de rate limit (5 requests/10min), el sistema automáticamente cambia a la siguiente clave disponible, permitiendo generación continua sin interrupciones.

## ⚡ Beneficios

- **Generación Continua**: Nunca te detengas por rate limits
- **Multiplica tu Capacidad**: 2 keys = 10 requests/10min, 3 keys = 15 requests/10min
- **Failover Automático**: Cambio transparente entre keys sin intervención
- **Monitoreo en Tiempo Real**: Visualiza el estado de cada key en la UI
- **Round-Robin Inteligente**: Distribución equitativa de carga

## 📝 Configuración

### Paso 1: Obtener Múltiples API Keys

1. Visita [VideoGenAPI.com](https://videogenapi.com)
2. Crea 2-3 cuentas adicionales (o usa keys de compañeros de equipo)
3. Obtén las API keys de cada cuenta

### Paso 2: Configurar en .env

Edita tu archivo `.env` y agrega tus keys:

```bash
# Opción 1: Usar keys numeradas (recomendado)
VIDEOGEN_API_KEY_1="lannetech_tu_primera_key_aqui"
VIDEOGEN_API_KEY_2="lannetech_tu_segunda_key_aqui"
VIDEOGEN_API_KEY_3="lannetech_tu_tercera_key_aqui"

# Opción 2: Key única (fallback legacy)
# VIDEOGEN_API_KEY="lannetech_una_sola_key"
```

**Nota**: El sistema soporta hasta 10 keys (`VIDEOGEN_API_KEY_1` a `VIDEOGEN_API_KEY_10`)

### Paso 3: Reiniciar el Servidor

```bash
npm run dev
```

Verás en la consola:

```
[Multi-Key System] Loaded 3 API key(s) for load balancing
  [1] Key 1: lannetech_07cde6a6f9f...
  [2] Key 2: lannetech_a8b3c7d2e4f...
  [3] Key 3: lannetech_f5g9h2j4k6m...
```

## 🎨 UI - Monitor de Balanceo

Cuando el sistema está activo, verás un panel emerald en la UI:

```
🔄 Balanceo de Carga Activo | 2/3 Keys Disponibles

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Key 1     ACTIVA│  │ Key 2   LÍMITE  │  │ Key 3    ACTIVA │
│ 3/5 requests    │  │ 5/5 requests    │  │ 1/5 requests    │
│                 │  │ ⏱️ 6min          │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Interpretación:
- **Verde (ACTIVA)**: Key disponible para usar
- **Rojo (LÍMITE)**: Key en rate limit, esperando reset
- **Counter**: Requests usados / límite total
- **Timer**: Minutos hasta que la key se resetee

## 🔄 Funcionamiento del Sistema

### Algoritmo Round-Robin

1. **Request #1**: Usa Key 1 → 1/5 usado
2. **Request #2**: Usa Key 2 → 1/5 usado  
3. **Request #3**: Usa Key 3 → 1/5 usado
4. **Request #4**: Usa Key 1 → 2/5 usado
5. ...continúa rotando

### Manejo de Rate Limits

Cuando Key 2 alcanza 5/5:
```
Key 1: ✓ Disponible (3/5)
Key 2: ✗ Rate limited (5/5) - reset en 8min
Key 3: ✓ Disponible (2/5)
```

El sistema automáticamente salta Key 2 y alterna entre Key 1 y Key 3.

### Recuperación Automática

Después de 10 minutos, Key 2 se resetea:
```
Key 2: ✓ Disponible (0/5) - REACTIVADA
```

El sistema vuelve a incluirla en la rotación automáticamente.

## 🛠️ API Endpoints

### GET /api/keys/status

Consulta el estado actual de todas las keys:

```json
{
  "success": true,
  "totalKeys": 3,
  "availableKeys": 2,
  "loadBalancingActive": true,
  "keys": [
    {
      "index": 1,
      "alias": "Key 1",
      "keyPreview": "lannetech_07cde6...7337",
      "isAvailable": true,
      "currentUsage": 3,
      "limit": 5,
      "resetInSeconds": 0,
      "resetTime": null
    },
    {
      "index": 2,
      "alias": "Key 2",
      "keyPreview": "lannetech_a8b3c7...4f5g",
      "isAvailable": false,
      "currentUsage": 5,
      "limit": 5,
      "resetInSeconds": 480,
      "resetTime": "2026-07-07T03:00:00.000Z"
    }
  ]
}
```

## 📊 Capacidad de Generación

| Keys | Requests/10min | Requests/hora | Generaciones/día |
|------|----------------|---------------|------------------|
| 1    | 5              | ~30           | ~720             |
| 2    | 10             | ~60           | ~1,440           |
| 3    | 15             | ~90           | ~2,160           |
| 5    | 25             | ~150          | ~3,600           |

**Ejemplo práctico con 3 keys:**
- Proyecto de 50 escenas → ~34 minutos
- Proyecto de 100 escenas → ~67 minutos
- Sin multi-key: mismo proyecto de 100 escenas → **~334 minutos** (5.5 horas)

## 🔒 Seguridad

- ✅ Keys nunca se exponen al frontend
- ✅ Rotación automática sin intervención del usuario
- ✅ Cada key mantiene su propio tracking de rate limit
- ✅ Compatible con autenticación Bearer token

## 🐛 Troubleshooting

### "Multi-Key System not showing"

**Causa**: Solo una key configurada  
**Solución**: Agrega al menos 2 keys en `.env` con formato `VIDEOGEN_API_KEY_1`, `VIDEOGEN_API_KEY_2`

### "All keys rate-limited"

**Causa**: Todas las keys alcanzaron su límite simultáneamente  
**Solución**: Espera el reset (mostrado en UI) o agrega más keys

### "Key X not working"

**Causa**: Key inválida o revocada  
**Solución**: Verifica la key en VideoGenAPI dashboard

## 💡 Best Practices

1. **Distribuye Equipos**: Usa keys de diferentes miembros del equipo
2. **Monitorea Uso**: Revisa el panel de estado regularmente  
3. **Planifica Carga**: Proyectos grandes con 3+ keys
4. **Backup Key**: Mantén siempre 1 key de reserva sin usar

## 🚀 Próximas Mejoras

- [ ] Priorización por créditos restantes
- [ ] Estadísticas de uso por key
- [ ] Alertas por email cuando todas las keys estén limitadas
- [ ] Soporte para webhooks de reset automático

---

**Versión**: 1.0.0  
**Fecha**: 2026-07-06  
**Compatibilidad**: VideoGenAPI v1
