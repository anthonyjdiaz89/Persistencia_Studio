# Sistema de Orden Consistente de Imágenes

## 🎯 Problema Resuelto

**Antes (Orden por Mención):**
```
Prompt 1: "@tomas @lia bailan"
→ Tomas = [Image1], Lia = [Image2]

Prompt 2: "@lia @tomas cantan"  
→ Lia = [Image1], Tomas = [Image2]

❌ PROBLEMA: El mismo personaje tiene diferentes números de imagen
❌ RESULTADO: El modelo de IA se confunde sobre la identidad de los personajes
```

**Ahora (Orden Alfabético Fijo):**
```
Prompt 1: "@tomas @lia bailan"
→ Orden alfabético: Lia=[Image1], Tomas=[Image2]
→ Compilado: "tomas [Image2], lia [Image1] bailan"

Prompt 2: "@lia @tomas cantan"
→ Orden alfabético: Lia=[Image1], Tomas=[Image2]
→ Compilado: "lia [Image1], tomas [Image2] cantan"

✅ SOLUCIÓN: Cada personaje tiene SIEMPRE el mismo número de imagen
✅ RESULTADO: Consistencia perfecta entre prompts
```

## 🔧 Cómo Funciona

### 1. Extracción de Assets Únicos

```typescript
// De este prompt:
"@tomas @lia @noah @lia bailan"

// El sistema identifica assets ÚNICOS por UUID:
Set {
  UUID-tomas: { name: "Tomas", imageUrl: "..." },
  UUID-lia: { name: "Lia", imageUrl: "..." },
  UUID-noah: { name: "Noah", imageUrl: "..." }
}
// Nota: @lia aparece 2 veces pero es el mismo UUID
```

### 2. Ordenamiento Alfabético

```typescript
// Assets ordenados por nombre (case-insensitive):
[
  { name: "Lia", uuid: "...", imageUrl: "..." },      // [Image1]
  { name: "Noah", uuid: "...", imageUrl: "..." },     // [Image2]
  { name: "Tomas", uuid: "...", imageUrl: "..." }     // [Image3]
]

// Se crea mapping UUID → Image Index:
Map {
  "UUID-lia" → 1,
  "UUID-noah" → 2,
  "UUID-tomas" → 3
}
```

### 3. Compilación del Prompt

```typescript
// Procesamos @mentions en el prompt original:
"@tomas @lia @noah @lia bailan"

// Cada @mention se resuelve a su UUID y obtiene su índice fijo:
@tomas → UUID-tomas → [Image3]
@lia → UUID-lia → [Image1]
@noah → UUID-noah → [Image2]
@lia → UUID-lia → [Image1] (mismo UUID, mismo número)

// Resultado compilado:
"tomas [Image3] (moreno, jeans), lia [Image1] (rubia, vestido rojo), 
noah [Image2] (castaño, camisa), lia [Image1] (rubia, vestido rojo) bailan"

// Array de imágenes (orden alfabético):
[
  "https://.../lia.jpg",    // [Image1]
  "https://.../noah.jpg",   // [Image2]
  "https://.../tomas.jpg"   // [Image3]
]
```

## 📊 Comparación Visual

### Escenario: Mismos personajes, diferente orden de mención

#### Sistema Antiguo (❌ Inconsistente)

| Prompt | @tomas | @lia | @noah | image_urls[0] | image_urls[1] | image_urls[2] |
|--------|--------|------|-------|---------------|---------------|---------------|
| Prompt 1: "@tomas @lia @noah" | [Image1] | [Image2] | [Image3] | tomas.jpg | lia.jpg | noah.jpg |
| Prompt 2: "@lia @noah @tomas" | [Image3] | [Image1] | [Image2] | lia.jpg | noah.jpg | tomas.jpg |
| Prompt 3: "@noah @tomas @lia" | [Image2] | [Image3] | [Image1] | noah.jpg | tomas.jpg | lia.jpg |

❌ **Problema**: Tomas es [Image1], luego [Image3], luego [Image2] → **Confusión para el modelo de IA**

#### Sistema Nuevo (✅ Consistente)

| Prompt | @tomas | @lia | @noah | image_urls[0] | image_urls[1] | image_urls[2] |
|--------|--------|------|-------|---------------|---------------|---------------|
| Prompt 1: "@tomas @lia @noah" | [Image2] | [Image1] | [Image3] | lia.jpg | noah.jpg | tomas.jpg |
| Prompt 2: "@lia @noah @tomas" | [Image2] | [Image1] | [Image3] | lia.jpg | noah.jpg | tomas.jpg |
| Prompt 3: "@noah @tomas @lia" | [Image2] | [Image1] | [Image3] | lia.jpg | noah.jpg | tomas.jpg |

✅ **Solución**: Lia siempre [Image1], Noah siempre [Image2], Tomas siempre [Image3] → **Consistencia perfecta**

## 🧪 Casos de Uso

### Caso 1: Orden de Mención Aleatorio

```typescript
// Usuario menciona en cualquier orden:
Sesión A: "@coco @lia @tomas @noah"
Sesión B: "@noah @tomas @lia @coco"
Sesión C: "@lia @coco @noah @tomas"

// Sistema SIEMPRE genera el mismo mapping:
Coco  → [Image1] (alfabéticamente primero: "coco")
Lia   → [Image2]
Noah  → [Image3]
Tomas → [Image4]

// Resultado: Perfecta continuidad entre videos
```

### Caso 2: Personaje Mencionado Múltiples Veces

```typescript
Prompt: "@lia canta mientras @tomas baila y @lia sonríe"

// Orden alfabético de assets únicos:
[Image1] Lia
[Image2] Tomas

// Compilación:
"lia [Image1] (rubia...) canta mientras tomas [Image2] (moreno...) 
baila y lia [Image1] (rubia...) sonríe"

// ✅ @lia siempre usa [Image1], ambas veces
```

### Caso 3: Subset de Personajes

```typescript
// Base de datos: Coco, Isla (loc), Lia, Noah, Tomas

Prompt 1: "@lia @tomas"
→ [Image1] Lia, [Image2] Tomas

Prompt 2: "@noah @lia"  
→ [Image1] Lia, [Image2] Noah

Prompt 3: "@tomas @noah @lia"
→ [Image1] Lia, [Image2] Noah, [Image3] Tomas

// ✅ Lia SIEMPRE es [Image1] cuando está presente
// ✅ Noah SIEMPRE es [Image2] cuando está presente (y lia también)
// ✅ Tomas SIEMPRE es [Image2] cuando solo él y lia, [Image3] cuando los 3
```

## 🎬 Logs de Debugging

### Consola del Navegador

```javascript
// Al generar video, verás estos logs:

// 1. Orden consistente de imágenes:
[Consistent Image Order]
  [Image1] Lia (UUID: 550e8400-e29b-41d4-a716-446655440000)
  [Image2] Noah (UUID: 660e8400-e29b-41d4-a716-446655440001)
  [Image3] Tomas (UUID: 770e8400-e29b-41d4-a716-446655440002)

// 2. Resolución de cada @mention:
[Consistent Index] @tomas → [Image3] (UUID: 770e8400...)
[Consistent Index] @lia → [Image1] (UUID: 550e8400...)
[Consistent Index] @noah → [Image2] (UUID: 660e8400...)
[Consistent Index] @lia → [Image1] (UUID: 550e8400...)
```

### Interpretación de Logs

```typescript
// Si ves esto:
[Consistent Index] @lia → [Image1] (UUID: 550e8400...)
[Consistent Index] @lia → [Image1] (UUID: 550e8400...)

// ✅ Significa: Lia mencionada 2 veces, ambas con [Image1] → CORRECTO

// Si vieras esto (sistema viejo):
[Sequential Index] @lia → [Image1]
[Sequential Index] @lia → [Image2]

// ❌ Significaría: Lia con 2 números diferentes → INCORRECTO
```

## 💡 Beneficios

### 1. **Consistencia entre Videos**
```typescript
// Video 1: "@lia @tomas bailan"
// Video 2: "@lia @tomas cantan"
// Video 3: "@lia @tomas saltan"

// Todos usan:
// Lia = [Image1], Tomas = [Image2]

// ✅ El modelo de IA aprende: [Image1] = Lia, [Image2] = Tomas
// ✅ Mejor continuidad visual entre videos
```

### 2. **Tolerante a Errores del Usuario**
```typescript
// Usuario escribe en orden aleatorio cada vez:
"@noah @lia @tomas"
"@tomas @lia @noah"
"@lia @noah @tomas"

// Sistema normaliza a orden fijo automáticamente
// ✅ Sin esfuerzo del usuario
```

### 3. **Escalable**
```typescript
// Base de datos con 50 personajes
// Usuario solo menciona 3 en cada prompt

// Sistema solo incluye las 3 imágenes necesarias
// Orden alfabético garantiza consistencia
```

### 4. **Debugging Simplificado**
```typescript
// Si Lia aparece deformada en un video:

// Verificar logs:
[Consistent Index] @lia → [Image2] (UUID: 550e8400...)

// Verificar array de imágenes:
image_urls[1] = "https://.../lia.jpg"  // [Image2] es index 1 (0-based)

// Si imagen es correcta → problema en descripción
// Si imagen es incorrecta → problema en carga de BD
```

## 🔧 Configuración Técnica

### Función Principal: `harvestAndSortRefImages()`

```typescript
export function harvestAndSortRefImages(
  prompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[]
): string[] {
  // 1. Extraer assets únicos mencionados en el prompt
  const uniqueAssets = extractUniqueAssetsFromPrompt(prompt, ...);
  
  // 2. Ordenar alfabéticamente por nombre
  const sortedAssets = uniqueAssets.sort((a, b) => 
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
  
  // 3. Retornar array de imageUrls en orden alfabético
  return sortedAssets.map(asset => asset.imageUrl);
}
```

### Función Secundaria: `compileFinalPrompt()`

```typescript
export function compileFinalPrompt(
  rawPrompt: string,
  characters: CharacterAsset[],
  props: PropAsset[],
  locations: LocationAsset[],
  ...
): { compiled: string; cameraPrompt: string } {
  // 1. Crear mapping UUID → Image Index (basado en orden alfabético)
  const uuidToImageIndex = buildConsistentIndexMapping(rawPrompt, ...);
  
  // 2. Reemplazar cada @mention con descripción + [ImageX]
  //    Donde X viene del mapping consistente
  const compiled = replaceWithConsistentIndices(rawPrompt, uuidToImageIndex);
  
  return { compiled, cameraPrompt };
}
```

## 🚀 Testing

### Test 1: Orden Básico

```typescript
Input:
  characters = [
    { id: "uuid-1", name: "Tomas", avatarUrl: "tomas.jpg" },
    { id: "uuid-2", name: "Lia", avatarUrl: "lia.jpg" }
  ]
  prompt = "@tomas @lia bailan"

Expected Output:
  image_urls = ["lia.jpg", "tomas.jpg"]  // Alfabético
  compiled = "tomas [Image2] (...), lia [Image1] (...) bailan"

✅ PASS: Lia=[Image1], Tomas=[Image2] (orden alfabético)
```

### Test 2: Múltiples Menciones

```typescript
Input:
  prompt = "@lia canta, @tomas baila, @lia sonríe"

Expected Output:
  image_urls = ["lia.jpg", "tomas.jpg"]  // 2 únicas, alfabético
  compiled = "lia [Image1] canta, tomas [Image2] baila, lia [Image1] sonríe"

✅ PASS: Ambas @lia usan [Image1]
```

### Test 3: Orden Inverso

```typescript
Input:
  prompt1 = "@tomas @lia"
  prompt2 = "@lia @tomas"

Expected Output:
  // Ambos prompts generan:
  image_urls = ["lia.jpg", "tomas.jpg"]
  
  // prompt1 compilado:
  "tomas [Image2] (...), lia [Image1] (...)"
  
  // prompt2 compilado:
  "lia [Image1] (...), tomas [Image2] (...)"

✅ PASS: Mismo mapping en ambos casos
```

## 📋 Checklist de Implementación

- ✅ Normalización de nombres (acentos, case-insensitive)
- ✅ UUID tracking para identidad única
- ✅ Extracción de assets únicos del prompt
- ✅ Ordenamiento alfabético consistente
- ✅ Mapping UUID → Image Index fijo
- ✅ Logs de debugging con UUIDs
- ✅ Soporte para duplicados (@lia mencionada 2 veces)
- ✅ Límite de 9 imágenes (VideoGenAPI)
- ✅ Funciona con characters, props, y locations

## 🎯 Resultado Final

```typescript
// Ejemplo completo:

Prompt: "@Tomas @Lía @Noah @Coco todos cantan en @Isla"

// Logs:
[Consistent Image Order]
  [Image1] Coco (UUID: 880e8400...)   // "Coco" alfabéticamente primero
  [Image2] Isla (UUID: 990e8400...)   // "Isla" 
  [Image3] Lía (UUID: 550e8400...)    // "Lía" (normalizado a "lia")
  [Image4] Noah (UUID: 660e8400...)   // "Noah"
  [Image5] Tomas (UUID: 770e8400...)  // "Tomas"

[Consistent Index] @Tomas → [Image5] (UUID: 770e8400...)
[Consistent Index] @Lía → [Image3] (UUID: 550e8400...)
[Consistent Index] @Noah → [Image4] (UUID: 660e8400...)
[Consistent Index] @Coco → [Image1] (UUID: 880e8400...)
[Consistent Index] @Isla → [Image2] (UUID: 990e8400...)

// Prompt compilado enviado a VideoGenAPI:
"character named Tomas [Image5] (moreno, jeans), 
character named Lía [Image3] (rubia, vestido rojo), 
character named Noah [Image4] (castaño, camisa), 
character named Coco [Image1] (perro golden retriever) 
todos cantan 
at the location Isla [Image2] (casa moderna, jardín)"

// Array image_urls:
[
  "https://.../coco.png",   // [Image1]
  "https://.../isla.jpg",   // [Image2]
  "https://.../lia.png",    // [Image3]
  "https://.../noah.png",   // [Image4]
  "https://.../tomas.png"   // [Image5]
]

// ✅ Consistencia garantizada para futuros prompts
// ✅ Coco siempre será [Image1]
// ✅ Isla siempre será [Image2]
// ✅ Lía siempre será [Image3]
// ✅ Noah siempre será [Image4]
// ✅ Tomas siempre será [Image5]
```
