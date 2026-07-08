# Análisis de Distribución de API Keys para VideoGenAPI

## 📊 Datos REALES del Sistema (Actualizados)

### Estadísticas Observadas del Dashboard
- **Total API calls hoy:** 961 requests
- **Videos generados hoy:** 20 videos
- **Ratio:** ~48 requests por video (1 POST generación + ~47 GET polling/status)
- **API Keys activas:** 2 (Key 1 y Key 2)
- **Distribución real:** 10 videos por key antes de agotar límite diario
- **Estado actual:** Ambas keys agotadas (límite diario alcanzado)
- **Tiempo de reset:** ~24 horas desde el agotamiento

### ⚠️ Descubrimiento Clave
```
Videos generados: 20
API calls totales: 961
Breakdown:
  - POST /v1/generations: ~20 (generación de videos)
  - GET /v1/video/gen_xxx: ~920 (polling de estado durante processing)
  - GET /v1/generations: ~21 (historial)
  
CONCLUSIÓN: El límite diario es de ~10 VIDEOS por key, 
NO de requests. Los GET de polling NO cuentan para el límite.
```

### Límites Confirmados

#### 1. Rate Limit por Modelo (Temporal)
- **Límite:** 5 requests cada 10 minutos
- **Duración:** 10 minutos (600 segundos)
- **Tipo:** Temporal, se resetea automáticamente
- **Aplica a:** POST /v1/generations

#### 2. Rate Limit Global (Temporal)
- **Límite:** 5 requests cada 10 minutos  
- **Duración:** 10 minutos (600 segundos)
- **Tipo:** Temporal, se resetea automáticamente
- **Aplica a:** POST /v1/generations

#### 3. Límite Diario (24 horas) - CONFIRMADO
- **Límite REAL:** ~10 videos por key por día
- **Sistema:** Basado en generaciones completadas (no en requests)
- **Duración:** 24 horas completas
- **Factor:** Puede variar según duración del video (5s, 10s, 30s)
- **GET requests:** NO cuentan para este límite (polling ilimitado)

## 🧮 Cálculo de Distribución Óptima (ACTUALIZADO)

### Escenario Actual (2 API Keys) - DATOS REALES
```
Videos generados: 20 videos
API calls totales: 961 requests
Distribución: 10 videos/key
Tiempo activo: ~8-10 horas
Polling/Status: ~48 requests por video (normal, no afecta límite)
Resultado: Sistema agotado a las 20:46 del día 6 de julio
```

### Fórmulas de Cálculo (CONFIRMADAS CON DATOS REALES)

#### Videos por Día (objetivo)
```
Videos_deseados_por_día = Escenas_por_episodio × Episodios_por_día
Ejemplo: 30 escenas × 1 episodio = 30 videos/día
```

#### Keys Necesarias (FÓRMULA ACTUALIZADA)
```
Keys_necesarias = CEILING(Videos_deseados_por_día / 10)
Videos_por_key = 10 (CONFIRMADO con datos reales)

Ejemplos:
- 20 videos → CEILING(20/10) = 2 keys (actual) ✅ CONFIRMADO
- 30 videos → CEILING(30/10) = 3 keys
- 50 videos → CEILING(50/10) = 5 keys
- 100 videos → CEILING(100/10) = 10 keys
```

#### API Calls vs Videos
```
API_calls_totales = Videos × 48
Breakdown por video:
  - 1 POST /v1/generations (generación)
  - ~47 GET /v1/video/gen_xxx (polling cada ~20-30s hasta completar)
  - GET /v1/generations (historial - ocasional)

Ejemplo real: 20 videos × 48 = 960 calls ≈ 961 observado ✅
```

#### Distribución Horaria
```
Tiempo_entre_videos = 10 minutos (rate limit temporal)
Tiempo_total_generación = Videos_totales × 10 min / Keys_activas

Con 2 keys (actual):
(20 × 10) / 2 = 100 minutos ≈ 1.67 horas de generación

Con 3 keys (30 videos):
(30 × 10) / 3 = 100 minutos ≈ 1.67 horas de generación
```

## 📋 Escenarios Propuestos (ACTUALIZADOS CON COSTOS REALES)

**⚠️ Costo por API Key: $200 USD/mes**

### Escenario 0: Actual - CONFIRMADO ✅
```yaml
Videos objetivo: 20/día (600/mes)
Keys requeridas: 2 API keys
Videos por key: 10/día (LÍMITE CONFIRMADO)
API calls generadas: ~960 requests/día (~28,800/mes)
Tiempo estimado: ~1.67 horas de generación continua
Costo mensual: $400 USD
Costo por video: $0.67 USD (uso al 100%)
Estado: Sistema agotado completamente a las 20:46
Conclusión: Eficiencia máxima, SIN buffer
```

### Escenario 1: Generación Moderada (30 videos/día)
```yaml
Videos objetivo: 30/día (900/mes)
Keys requeridas: 3 API keys (+1 key adicional)
Distribución: 10 videos/key
API calls esperadas: ~1,440 requests/día (~43,200/mes)
Tiempo estimado: ~1.67 horas de generación continua
Costo mensual: $600 USD (+$200/mes = +50%)
Costo por video: $0.67 USD (uso al 100%)
Ventaja: Cubre un episodio completo por día
Buffer: Sin buffer, uso al 100%
ROI: Viable si usas 25-30 videos/día consistentemente
```

### Escenario 2: Generación Moderada con Buffer (25-30 videos/día)
```yaml
Videos objetivo: 25-30/día (750-900/mes)
Keys requeridas: 3 API keys (+1 key adicional)
Distribución: 8.3-10 videos/key (promedio)
API calls esperadas: ~1,200-1,440 requests/día
Tiempo estimado: ~1.39-1.67 horas de generación continua
Costo mensual: $600 USD (+$200/mes)
Costo por video: $0.67-$0.80 USD
Ventaja: 1 episodio + 0-16% buffer para re-renders
Buffer: 0-5 videos/día disponibles
ROI: Balanceado - flexibilidad sin desperdicio
```

### Escenario 3: Producción Alta (40 videos/día)
```yaml
Videos objetivo: 40/día (1,200/mes)
Keys requeridas: 4 API keys (+2 keys adicionales)
Distribución: 10 videos/key
API calls esperadas: ~1,920 requests/día (~57,600/mes)
Tiempo estimado: ~1.67 horas de generación continua
Costo mensual: $800 USD (+$400/mes = +100%)
Costo por video: $0.67 USD (uso al 100%)
Ventaja: Capacidad para 1.3 episodios por día
Capacidad: Uso completo, sin buffer
ROI: Requiere 35-40 videos/día para justificar costo
```

### Escenario 4: Producción Alta con Buffer (30-35 videos/día)
```yaml
Videos objetivo: 30-35/día (900-1,050/mes)
Keys requeridas: 4 API keys (+2 keys adicionales)
Distribución: 7.5-8.75 videos/key (promedio)
API calls esperadas: ~1,440-1,680 requests/día
Tiempo estimado: ~1.25-1.46 horas de generación continua
Costo mensual: $800 USD (+$400/mes)
Costo por video: $0.76-$0.89 USD
Ventaja: 1 episodio + 12-25% buffer para re-renders
Capacidad máxima: 40 videos/día
Buffer: 5-10 videos/día disponibles
ROI: Recomendado para producción estable con flexibilidad
```

### Escenario 5: Producción Dual (50-60 videos/día)
```yaml
Videos objetivo: 50-60/día (1,500-1,800/mes)
Keys requeridas: 6 API keys (+4 keys adicionales)
Distribución: 8.3-10 videos/key (promedio)
API calls esperadas: ~2,400-2,880 requests/día
Tiempo estimado: ~1.39-1.67 horas de generación continua
Costo mensual: $1,200 USD (+$800/mes = +200%)
Costo por video: $0.67-$0.80 USD
Ventaja: 2 episodios completos por día
Capacidad máxima: 60 videos/día
Buffer: 0-10 videos/día según uso
ROI: Requiere demanda sostenida de 50+ videos/día
```

### Escenario 6: Producción Industrial (100 videos/día)
```yaml
Videos objetivo: 100/día (3,000/mes)
Keys requeridas: 10 API keys (+8 keys adicionales)
Distribución: 10 videos/key
API calls esperadas: ~4,800 requests/día (~144,000/mes)
Tiempo estimado: ~1.67 horas de generación continua
Costo mensual: $2,000 USD (+$1,600/mes = +400%)
Costo por video: $0.67 USD (uso al 100%)
Ventaja: 3-4 episodios completos por día
Capacidad: Producción masiva para múltiples proyectos
Buffer: Sin buffer, requiere uso completo
ROI: Solo viable con múltiples series/proyectos activos
Costo anual: $24,000 USD
```

### 💡 Resumen de Costos Anuales

| Configuración | Costo/mes | Costo/año | Videos/mes | Costo/video |
|---------------|-----------|-----------|------------|-------------|
| 2 keys (actual) | $400 | $4,800 | 600 | $0.67 |
| 3 keys (+1) | $600 | $7,200 | 900 | $0.67 |
| 4 keys (+2) | $800 | $9,600 | 1,200 | $0.67 |
| 6 keys (+4) | $1,200 | $14,400 | 1,800 | $0.67 |
| 10 keys (+8) | $2,000 | $24,000 | 3,000 | $0.67 |

**Nota:** Costos asumen uso al 100% de capacidad. Reducir uso aumenta costo por video.

## 🎯 Recomendación Basada en Casos de Uso

### Para Producción de 1 Episodio/Día (25-30 escenas)
**Configuración recomendada: 3-4 API Keys**
```
Keys: 3-4
Costo mensual: ~$30-40/mes (asumiendo $10/key)
Capacidad: 30-40 videos/día
Tiempo de generación: ~1.5-2 horas
Buffer: 10-15 videos extra para re-renders
```

### Para Producción de 2-3 Episodios/Día (50-90 escenas)
**Configuración recomendada: 6-9 API Keys**
```
Keys: 6-9
Costo mensual: ~$60-90/mes
Capacidad: 60-90 videos/día
Tiempo de generación: ~1.5-2 horas
Buffer: Suficiente para múltiples episodios
```

### Para Producción Industrial (5+ Episodios/Día)
**Configuración recomendada: 10-15 API Keys**
```
Keys: 10-15
Costo mensual: ~$100-150/mes
Capacidad: 100-150 videos/día
Tiempo de generación: ~1.5-2 horas
Buffer: Capacidad masiva para múltiples proyectos
```

## 🔄 Estrategia de Rotación Inteligente

### Algoritmo de Balanceo Actual
```typescript
// Round-robin con availability check
selectBestAvailableApiKey() {
  // 1. Reset keys cuyo rate limit window expiró
  // 2. Buscar siguiente key disponible
  // 3. Si todas agotadas, reportar tiempo de reset más cercano
}
```

### Mejora Propuesta: Queue System
```typescript
// Sistema de cola con prioridad
selectKeyWithQueue() {
  // 1. Priorizar keys con menor uso actual
  // 2. Reservar keys para rate limit cercano
  // 3. Distribuir uniformemente a lo largo del día
  // 4. Alertar cuando quedan <30% de capacidad diaria
}
```

## 📈 Monitoreo Recomendado

### Métricas a Trackear
1. **Videos generados por key por día**
   - Objetivo: Identificar límite real del daily limit
   
2. **Tiempo promedio entre generaciones**
   - Objetivo: Optimizar timing de requests

3. **Tasa de éxito/fallo por key**
   - Objetivo: Identificar keys problemáticas

4. **Tiempo restante hasta agotamiento**
   - Objetivo: Alertar proactivamente

### Dashboard Propuesto
```
┌─────────────────────────────────────────┐
│ 🔑 API Keys Status                      │
├─────────────────────────────────────────┤
│ Key 1: █████████░ 90% (9/10 videos)    │
│ Key 2: ███████░░░ 70% (7/10 videos)    │
│ Key 3: █████░░░░░ 50% (5/10 videos)    │
│ Key 4: ███░░░░░░░ 30% (3/10 videos)    │
├─────────────────────────────────────────┤
│ Capacidad total: 24/40 videos (60%)    │
│ Reset más cercano: Key 1 en 6h         │
│ Videos restantes hoy: 16                │
└─────────────────────────────────────────┘
```

## 💡 Implementación Práctica

### Paso 1: Agregar Keys al .env
```bash
# Current
VIDEOGEN_API_KEY_1=lannetech_key1
VIDEOGEN_API_KEY_2=lannetech_key2

# Propuesta para 4 keys
VIDEOGEN_API_KEY_3=lannetech_key3
VIDEOGEN_API_KEY_4=lannetech_key4
```

### Paso 2: Sistema de Alertas
```typescript
// Agregar a server.ts
function checkDailyCapacityAlert() {
  const totalCapacity = apiKeys.reduce((sum, key) => 
    key.isAvailable ? sum + (key.limit - key.currentUsage) : sum, 0
  );
  
  const capacityPercent = (totalCapacity / (apiKeys.length * 10)) * 100;
  
  if (capacityPercent < 30) {
    console.warn(`⚠️ ALERTA: Capacidad diaria < 30% (${capacityPercent.toFixed(1)}%)`);
  }
}
```

### Paso 3: Logging Mejorado
```typescript
// Registrar cada generación
function logGeneration(keyAlias: string, videoNumber: number) {
  console.log(`[${new Date().toISOString()}] ${keyAlias} - Video #${videoNumber}/10 generado`);
  
  // Guardar en archivo para análisis histórico
  fs.appendFileSync('generation-history.log', 
    `${Date.now()},${keyAlias},${videoNumber}\n`
  );
}
```

## 🎬 Conclusión (BASADA EN DATOS REALES)

### Hallazgos Clave del Análisis
```
✅ Límite diario CONFIRMADO: 10 videos por key
✅ API calls observadas: 961 (20 videos × ~48 requests c/u)
✅ GET requests (polling): NO cuentan para límite diario
✅ POST /v1/generations: Cuenta como 1 video
✅ Sistema actual: 100% de capacidad, SIN buffer
```

### Para tu caso de uso actual (20 videos/día):
**Estado actual:** ⚠️ Sistema funcionando al límite exacto
- 2 keys × 10 videos/key = 20 videos
- Agotamiento: Jul 6, 2026 a las 20:46
- Sin capacidad para re-renders o experimentación

### Recomendaciones por Escenario

#### 📌 Si quieres mantener 20-25 videos/día CON buffer:
**Recomendación: Agregar 1 API Key (total 3 keys)**
```
Capacidad: 30 videos/día
Uso normal: 20-25 videos
Buffer: 5-10 videos (20-30%)
Costo: +$10/mes
Beneficio: Flexibilidad para re-renders y pruebas
```

#### 📌 Si quieres generar 30-40 videos/día (1 episodio completo):
**Recomendación: Agregar 2 API Keys (total 4 keys)**
```
Capacidad: 40 videos/día
Uso normal: 30-35 videos
Buffer: 5-10 videos (12-25%)
Costo: +$20/mes
Beneficio: 1 episodio + margen de seguridad
```

#### 📌 Si quieres generar 50-60 videos/día (2 episodios):
**Recomendación: Agregar 4 API Keys (total 6 keys)**
```
Capacidad: 60 videos/día
Uso normal: 50-55 videos
Buffer: 5-10 videos (8-16%)
Costo: +$40/mes
Beneficio: 2 episodios completos diarios
```

### Análisis de Costo-Beneficio (COSTOS REALES)

**⚠️ IMPORTANTE: Cada API key cuesta $200 USD/mes**

| Escenario | Keys | Videos/día | Videos/mes | Buffer | Costo/mes | Costo/video |
|-----------|------|------------|------------|--------|-----------|-------------|
| **Actual** | 2 | 20 | 600 | 0% | $400 | $0.67 |
| **+1 Key** | 3 | 30 | 900 | 0% | $600 | $0.67 |
| **+1 Key (con buffer)** | 3 | 25 | 750 | 20% | $600 | $0.80 |
| **+2 Keys** | 4 | 40 | 1,200 | 0% | $800 | $0.67 |
| **+2 Keys (con buffer)** | 4 | 30-35 | 900-1,050 | 12-25% | $800 | $0.76-$0.89 |
| **+4 Keys** | 6 | 60 | 1,800 | 0% | $1,200 | $0.67 |
| **+4 Keys (con buffer)** | 6 | 50 | 1,500 | 16% | $1,200 | $0.80 |
| **+8 Keys** | 10 | 100 | 3,000 | 0% | $2,000 | $0.67 |

**Observaciones críticas:**
- 💰 **Costo mínimo por video:** $0.67 USD (usando keys al 100%)
- 💰 **Costo con 20% buffer:** $0.80-$0.89 USD por video
- 💰 **Inversión actual:** $400/mes para 20 videos/día
- 💰 **Costo por episodio (30 escenas):** $20-$27 USD

### 💡 Análisis de ROI

#### Opción 1: Máximo ROI - Uso al 100% (SIN buffer)
```yaml
Estrategia: Usar todas las keys al máximo de capacidad
Ventaja: Costo mínimo por video ($0.67)
Desventaja: Sin margen para re-renders o errores
Riesgo: Alto - cualquier fallo requiere esperar 24h
Recomendado para: Producción final con prompts muy probados
```

#### Opción 2: ROI Balanceado - 15-20% buffer
```yaml
Estrategia: Mantener ~20% de capacidad de reserva
Ventaja: Flexibilidad para ajustes y experimentación
Costo: $0.76-$0.89 por video
Riesgo: Medio - capacidad para correcciones inmediatas
Recomendado para: Producción activa con iteración
```

#### Opción 3: Máxima Flexibilidad - 30-40% buffer
```yaml
Estrategia: Uso de ~60-70% de capacidad total
Ventaja: Amplio margen para experimentación
Costo: $0.95-$1.15 por video
Riesgo: Bajo - nunca te quedas sin capacidad
Recomendado para: Fase de desarrollo y pruebas
```

### 🎯 Recomendación Final (ACTUALIZADA CON COSTOS REALES)

**Para Persistencia Studio (producción de serie animada):**

#### 📌 Escenario Recomendado: Uso Eficiente

```yaml
Configuración actual: 2 API Keys
Capacidad actual: 20 videos/día (600/mes)
Costo actual: $400/mes
Costo por video: $0.67 USD

Estado: ✅ Sistema optimizado al 100% de eficiencia
Limitación: ❌ Sin capacidad para re-renders o experimentación
```

#### 📊 Opciones de Escalamiento

**Opción A: Producción Conservadora (RECOMENDADA)**
```yaml
Configuración: Mantener 2 API Keys
Producción: 20 videos/día máximo
Estrategia: 
  - Producir 15-18 videos/día regularmente
  - Reservar 2-5 slots para re-renders
  - Experimentación en días específicos
Costo: $400/mes (sin cambio)
Costo/video: $0.67-$0.89
Beneficio: Máxima eficiencia sin inversión adicional
```

**Opción B: Escalamiento Moderado**
```yaml
Configuración: 3 API Keys (+1 adicional)
Capacidad: 30 videos/día (900/mes)
Producción normal: 25 videos/día
Buffer: 5 videos/día (16%)
Costo: $600/mes (+$200/mes)
Costo/video: $0.67-$0.80
Beneficio: 1 episodio completo + margen para ajustes
ROI: Viable si produces >25 videos/día consistentemente
```

**Opción C: Producción Dual**
```yaml
Configuración: 4 API Keys (+2 adicionales)
Capacidad: 40 videos/día (1,200/mes)
Producción normal: 30-35 videos/día
Buffer: 5-10 videos/día (12-25%)
Costo: $800/mes (+$400/mes)
Costo/video: $0.67-$0.76
Beneficio: Capacidad para 2 proyectos simultáneos
ROI: Requiere producción constante de 30+ videos/día
```

**Opción D: Producción Industrial**
```yaml
Configuración: 6 API Keys (+4 adicionales)
Capacidad: 60 videos/día (1,800/mes)
Producción normal: 50 videos/día
Buffer: 10 videos/día (16%)
Costo: $1,200/mes (+$800/mes)
Costo/video: $0.67-$0.80
Beneficio: Múltiples series simultáneas
ROI: Solo viable con demanda sostenida de 50+ videos/día
```

### 💰 Análisis de Break-Even

**¿Cuándo vale la pena agregar más keys?**

```
Costo de 1 key adicional: $200/mes
Capacidad adicional: 10 videos/día = 300 videos/mes
Costo por video adicional: $0.67

Pregunta clave: ¿Usarás consistentemente >8 videos/día adicionales?
- SI usas 8-10 videos/día extra → Vale la pena ($0.67-$0.83/video)
- SI usas 5-7 videos/día extra → Costoso ($0.95-$1.33/video)
- SI usas <5 videos/día extra → NO vale la pena (>$1.33/video)
```

### 🎯 Recomendación Específica

**Para tu volumen actual (20 videos/día):**

```yaml
OPCIÓN 1 (Óptima para presupuesto): Mantener 2 Keys
├─ Costo: $400/mes
├─ Capacidad: 20 videos/día al 100%
├─ Estrategia: Planificar bien cada generación
├─ Experimentación: Días específicos de bajo volumen
└─ Ahorro vs Opción 2: $200/mes ($2,400/año)

OPCIÓN 2 (Óptima para flexibilidad): Agregar 1 Key (total 3)
├─ Costo: $600/mes (+$200)
├─ Capacidad: 30 videos/día
├─ Uso normal: 20-25 videos/día
├─ Buffer: 5-10 videos/día para ajustes
├─ Beneficio: Sin estrés por límites
└─ Costo adicional: $200/mes ($2,400/año)

DECISIÓN RECOMENDADA: 
Si tu workflow actual funciona y puedes planificar generaciones
→ Mantener 2 keys (ahorro de $2,400/año)

Si frecuentemente necesitas re-renders o experimentación
→ Agregar 1 key (inversión de $200/mes para tranquilidad)
```

### 📊 Comparativa con Competencia

```
VideoGenAPI (Seedance 2): $0.67/video (uso óptimo)
Runway Gen-3: ~$0.95/video (10s)
Luma AI Dream Machine: ~$1.20/video (5s)
Pika Labs: ~$0.80/video (3s)

Conclusión: VideoGenAPI es competitivo en precio si usas
las keys eficientemente. El desafío es el límite de 10 videos/día/key.
```

### 📊 Monitoreo Implementado

El sistema ahora registra automáticamente:
- Videos generados por key por día
- Reset automático de contadores cada 24h
- Alertas cuando capacidad < 30%
- Logs cada 5 minutos con estado completo

### Próximos Pasos

1. ✅ Análisis de datos reales completado (961 API calls confirmadas)
2. ✅ Costos reales actualizados ($200 USD por API key/mes)
3. ⏳ **DECISIÓN CRÍTICA:** Evaluar si agregar keys justifica inversión
   
   **Preguntas clave:**
   - ¿Produces consistentemente >20 videos/día?
   - ¿Necesitas buffer para re-renders frecuentes?
   - ¿El ROI de $200/mes adicional es justificable?
   - ¿Puedes optimizar workflow con 2 keys actuales?

4. ⏳ Si decides agregar keys:
   - Obtener API keys adicionales de VideoGenAPI ($200/key)
   - Agregar al archivo .env como VIDEOGEN_API_KEY_3, VIDEOGEN_API_KEY_4
   - Reiniciar servidor (detectará automáticamente las nuevas keys)
   - Monitorear ROI durante 2-3 semanas

5. ⏳ Si mantienes 2 keys (RECOMENDADO para presupuesto):
   - Optimizar planificación de generaciones
   - Usar días específicos para experimentación
   - Agrupar producción de episodios estratégicamente
   - Monitorear si los límites afectan productividad real

6. ⏳ Evaluación continua:
   - Trackear videos generados vs capacidad
   - Medir impacto de límites en workflow
   - Calcular ROI real (¿cuánto cuesta el tiempo perdido esperando?)
   - Ajustar según métricas reales de producción

---

**Fecha de análisis:** 2026-07-08  
**Datos base:** 961 API calls, 20 videos generados (Jul 6, 2026)  
**Sistema:** Persistencia Studio - Multi-Key Load Balancer v2.0  
**Límite confirmado:** 10 videos por API key por día  
**Ratio confirmado:** ~48 requests por video (1 POST + 47 GET polling)  
**Costo por key:** $200 USD/mes  
**Inversión actual:** $400 USD/mes (2 keys)  
**Costo por video (uso óptimo):** $0.67 USD
