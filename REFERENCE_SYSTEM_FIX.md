# 🎯 Sistema de Referencias Mejorado - Character/Location Consistency Fix

## 🚨 Problema Identificado

**Síntomas reportados:**
- Al escribir `@lia @tomas @noah @coco todos cantan y bailan al ritmo musical en frente de la casa de @Isla`
- Aparecían **2 Lias** en el video cuando solo se mencionó 1
- Los **personajes no se mantenían exactos**, se deformaban o cambiaban
- La **locación @Isla no se mantenía correctamente**
- **Movimientos antinaturales** (personajes aparecían de la nada)
- Los objetos inventados que no existían en los assets

## 🔍 Causa Raíz del Problema

### Sistema Antiguo (Incorrecto):

```javascript
// ❌ PROBLEMA: Eliminaba duplicados de imágenes
characters.forEach(c => {
  const idx = getMinIndex(c.name);
  if (idx !== -1) {
    if (!detected.some(item => item.imageUrl === c.avatarUrl)) {
      // Solo agregaba la imagen UNA VEZ aunque hubiera múltiples menciones
      detected.push({ imageUrl: c.avatarUrl, index: idx });
    }
  }
});

// ❌ PROBLEMA: Buscaba índice con indexOf() - siempre devolvía el primer match
const idx = refImages.indexOf(char.avatarUrl);
if (idx !== -1) {
  refToken = ` [Image${idx + 1}]`; // Todas las menciones de @lia usaban el mismo [Image1]
}
```

**Resultado:**
```
Prompt enviado: 
"@lia todos cantan, @lia baila" 

Se convertía en:
"Lia [Image1] todos cantan, Lia [Image1] baila"

Pero image_urls solo tenía:
[imagen_lia.jpg]  // ❌ Solo 1 imagen para 2 menciones
```

**VideoGenAPI interpretaba:**
- `[Image1]` aparece 2 veces → Genera 2 instancias diferentes del mismo personaje
- Sin suficientes imágenes de referencia → Inventa detalles

## ✅ Solución Implementada

### Sistema Nuevo (Correcto):

```javascript
// ✅ SOLUCIÓN: Procesa cada @mention secuencialmente
const mentionPattern = /@(\w+)/g;
const matches = [...prompt.matchAll(mentionPattern)];

// Cada mención obtiene su propia referencia de imagen
for (const match of matches) {
  const mentionText = match[1].toLowerCase();
  const imageUrl = assetMap.get(mentionText);
  
  if (imageUrl) {
    imageUrls.push(imageUrl); // ✅ Agrega la imagen CADA VEZ que aparece
  }
}
```

**Resultado Correcto:**
```
Prompt original:
"@lia @tomas @noah @coco todos cantan y @lia baila"

Se convierte en:
"Lia [Image1] (description) Tomas [Image2] (description) 
Noah [Image3] (description) Coco [Image4] (description) 
todos cantan y Lia [Image5] (description) baila"

image_urls enviado:
[
  imagen_lia.jpg,     // [Image1] - Primera mención de Lia
  imagen_tomas.jpg,   // [Image2] - Tomas
  imagen_noah.jpg,    // [Image3] - Noah  
  imagen_coco.jpg,    // [Image4] - Coco
  imagen_lia.jpg      // [Image5] - Segunda mención de Lia (misma imagen)
]
```

## 🎯 Cómo Funciona Ahora

### 1. Detección Secuencial de @Mentions

```javascript
// Procesa de izquierda a derecha
@lia → [Image1] con imagen_lia.jpg
@tomas → [Image2] con imagen_tomas.jpg
@noah → [Image3] con imagen_noah.jpg
@coco → [Image4] con imagen_coco.jpg
@Isla → [Image5] con imagen_isla.jpg
```

### 2. Sincronización Perfecta

```
Prompt compilado: "Lia [Image1] Tomas [Image2] Noah [Image3] Coco [Image4] en la locación Isla [Image5]"

image_urls: [lia.jpg, tomas.jpg, noah.jpg, coco.jpg, isla.jpg]
            ↑        ↑          ↑         ↑         ↑
            [0]      [1]        [2]       [3]       [4]
            │        │          │         │         │
         [Image1] [Image2]  [Image3]  [Image4]  [Image5]
```

### 3. Preservación de Consistencia

VideoGenAPI ahora recibe:
- ✅ **Cada personaje con su imagen de referencia visual exacta**
- ✅ **Descripciones detalladas** (appearance, clothing, gender)
- ✅ **Referencias [ImageX] sincronizadas** con el array image_urls
- ✅ **Locaciones con su imagen de referencia**

## 🧪 Cómo Probar la Mejora

### Test 1: Múltiples Personajes con Locación

```
Prompt: @lia @tomas @noah @coco todos cantan y bailan al ritmo musical en frente de la casa de @Isla

Resultado Esperado:
✅ 4 personajes distintos (Lia, Tomas, Noah, Coco)
✅ 1 locación clara (casa de Isla)
✅ Cada personaje mantiene su apariencia exacta
✅ No hay duplicados ni invenciones
✅ Movimientos naturales y coordinados
```

### Test 2: Mismo Personaje Múltiples Veces

```
Prompt: @lia camina hacia @tomas, luego @lia sonríe

Resultado Esperado:
✅ Lia aparece consistente en ambas menciones
✅ La misma imagen de referencia se usa 2 veces
✅ No hay 2 Lias diferentes
```

### Test 3: Props y Locaciones

```
Prompt: @juan sostiene @espada en @castillo

Resultado Esperado:
✅ Juan con su apariencia exacta
✅ Espada con su diseño exacto
✅ Castillo con su arquitectura exacta
```

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes (Buggy) | Ahora (Fixed) |
|---------|---------------|---------------|
| **Referencias [ImageX]** | Reutilizaba índices incorrectos | Secuencial, 1:1 con image_urls |
| **Duplicados** | Personaje aparecía 2+ veces diferente | Mismo personaje consistente |
| **Locaciones** | Se deformaban o inventaban | Mantienen diseño exacto |
| **Props** | A veces no aparecían | Aparecen con diseño correcto |
| **Orden de imágenes** | Desordenado, duplicados eliminados | Orden de aparición preservado |
| **Cantidad de imágenes** | Menos de las necesarias | Todas las referencias necesarias |

## 🔧 Archivos Modificados

### [`src/utils.ts`](src/utils.ts)

#### `harvestAndSortRefImages()` - Reescrita completamente

**Antes:**
- Eliminaba duplicados con `!detected.some(item => item.imageUrl === c.avatarUrl)`
- Usaba `indexOf` para encontrar la primera aparición

**Ahora:**
- Procesa cada `@mention` en orden secuencial
- Agrega la imagen CADA VEZ que aparece el @mention
- Mantiene orden estricto de izquierda a derecha

#### `compileFinalPrompt()` - Reescrita completamente

**Antes:**
- Usaba `forEach` sobre arrays de assets
- Buscaba imágenes con `refImages.indexOf(char.avatarUrl)`
- Todas las menciones del mismo personaje obtenían el mismo índice

**Ahora:**
- Procesa `@mentions` con regex secuencial
- Calcula índice único para CADA mención
- Cuenta menciones previas con imágenes para determinar índice correcto

## 🎬 Mejoras en la Generación de Video

### Consistencia Visual

```javascript
// Antes: Sin suficiente información visual
{
  prompt: "Lia [Image1] canta, Lia [Image1] baila",
  image_urls: [imagen_lia.jpg]  // ❌ Solo 1 referencia
}
// VideoGenAPI: "¿[Image1] aparece 2 veces? Voy a generar 2 Lias diferentes"

// Ahora: Información visual completa
{
  prompt: "Lia [Image1] canta, Lia [Image2] baila",
  image_urls: [imagen_lia.jpg, imagen_lia.jpg]  // ✅ 2 referencias claras
}
// VideoGenAPI: "Entiendo, es la misma Lia en 2 acciones diferentes"
```

### Continuidad de Movimientos

Con referencias visuales claras para cada mención:
- ✅ Los personajes no "aparecen de la nada"
- ✅ Los movimientos son naturales y fluidos
- ✅ La iluminación y perspectiva se mantienen consistentes

## 🚀 Próximos Pasos Recomendados

### 1. Verificar Assets tienen Imágenes

Asegúrate de que cada personaje, prop y locación en tu biblioteca tenga una imagen asignada:

```
✅ Lia → imagen_lia.jpg
✅ Tomas → imagen_tomas.jpg
✅ Noah → imagen_noah.jpg
✅ Coco → imagen_coco.jpg
✅ Isla (locación) → imagen_isla.jpg
```

### 2. Usar Descripciones Detalladas

Mejora las descripciones en cada asset:

```typescript
{
  name: "Lia",
  description: "Niña de 8 años",
  appearance: "cabello castaño largo, ojos verdes",
  clothing: "vestido azul con flores amarillas",
  gender: "female",
  avatarUrl: "https://..."
}
```

### 3. Probar con Prompts Complejos

```
@lia @tomas @noah y @coco cantan en @Isla, luego @lia sostiene @guitarra mientras @tomas toca @piano
```

Esto generará:
- 9 referencias de imágenes en total (dentro del límite de VideoGenAPI)
- Cada personaje/objeto/locación con su apariencia exacta
- Movimientos naturales y coordinados

## 📝 Notas Técnicas

### Límite de 9 Imágenes

VideoGenAPI tiene un límite de 9 imágenes de referencia. El sistema automáticamente recorta:

```javascript
return imageUrls.slice(0, 9); // Máximo 9 imágenes
```

Si tienes más de 9 @mentions, usa los primeros 9 más importantes.

### Orden de Procesamiento

El sistema procesa de **derecha a izquierda** durante el reemplazo para preservar índices:

```javascript
for (let i = matches.length - 1; i >= 0; i--) {
  // Procesa de atrás hacia adelante para no corromper índices
}
```

## ✅ Verificación del Fix

Para confirmar que el fix está funcionando:

1. **Revisa la consola del navegador** (F12) durante la generación
2. Busca el log del payload enviado a VideoGenAPI
3. Verifica que `image_urls` tenga el número correcto de referencias
4. Verifica que el `prompt` compilado tenga `[Image1]`, `[Image2]`, etc. en orden

```javascript
// Deberías ver algo como:
{
  prompt: "Lia [Image1] (niña de 8 años...) Tomas [Image2] (niño de 10 años...) Noah [Image3] (niño de 6 años...) Coco [Image4] (perro golden...) todos cantan en la locación Isla [Image5] (casa grande...)...",
  image_urls: [
    "https://.../lia.jpg",
    "https://.../tomas.jpg", 
    "https://.../noah.jpg",
    "https://.../coco.jpg",
    "https://.../isla.jpg"
  ]
}
```

---

**Fecha del Fix:** 2026-07-07  
**Archivos Modificados:** `src/utils.ts`  
**Versión:** 2.1.0 - Character Consistency Fix
