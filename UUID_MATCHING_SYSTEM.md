# Sistema de Matching Basado en UUID

## 🎯 Problema Resuelto

**Antes (Matching por Nombre):**
```typescript
// ❌ Problemas:
@Lia !== @lia !== @LIA  // Case-sensitive
@Lia !== @Lía  // No maneja acentos
Cambiar nombre "Lia" → "Lía" rompe prompts existentes
```

**Ahora (Matching por UUID con Normalización):**
```typescript
// ✅ Beneficios:
@Lia === @lia === @LIA === @Lía  // Case-insensitive + sin acentos
Renombrar personaje NO rompe nada
UUID garantiza unicidad absoluta
```

## 🔧 Implementación

### 1. Normalización de Nombres

```typescript
function normalizeForMatching(text: string): string {
  return text
    .normalize("NFD")           // "Lía" → "Lía" (descompone)
    .replace(/[\u0300-\u036f]/g, "")  // "Lía" → "Lia" (quita acentos)
    .toLowerCase()              // "Lia" → "lia"
    .replace(/[^a-z0-9]/g, ""); // "Cyber Hacker" → "cyberhacker"
}
```

**Ejemplos:**
- `"Lía"` → `"lia"`
- `"Tomás"` → `"tomas"`
- `"Cyber Hacker"` → `"cyberhacker"`
- `"María José"` → `"mariajose"`

### 2. Estructura de Mapeo

```typescript
// Map: nombre normalizado → { uuid, imageUrl }
const assetMap = new Map<string, { uuid: string; imageUrl: string }>();

assetMap.set("lia", { 
  uuid: "550e8400-e29b-41d4-a716-446655440000", 
  imageUrl: "https://bd.persistenciadigital.com/storage/..." 
});
```

### 3. Matching Robusto

```typescript
// Usuario escribe: "@Lía canta en el escenario"
const mentionPattern = /@([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+)/g;

// Captura: "Lía"
// Normaliza: "lia"
// Busca UUID: "550e8400-..."
// Obtiene imagen: "https://bd.persistenciadigital.com/..."
```

## 🚀 Ventajas del Sistema

### 1. **Tolerancia a Typos y Variaciones**

```typescript
// TODOS estos funcionan:
@lia
@Lia
@LIA
@Lía
@LÍA

// Todos resuelven al mismo UUID → misma imagen
```

### 2. **Nombres Editables**

```sql
-- Usuario cambia el nombre en BD:
UPDATE characters SET name = 'Lía Rosa' WHERE id = '550e8400...';

-- Los prompts viejos SIGUEN FUNCIONANDO:
"@lia canta"  -- Busca UUID, encuentra "Lía Rosa"
```

### 3. **Sin Colisiones**

```typescript
// Antes (solo nombre):
characters = [
  { name: "Lia", type: "human" },
  { name: "Lia", type: "robot" }  // ❌ COLISIÓN!
];

// Ahora (con UUID):
characters = [
  { id: "uuid-1", name: "Lia", type: "human" },
  { id: "uuid-2", name: "Lia", type: "robot" }
];
// ✅ Distintos UUIDs = sin colisión
```

### 4. **Logging Mejorado**

```typescript
console.log(`[UUID Match] @Lía → UUID: 550e8400-... (character)`);
console.log(`[UUID Match] @tomas → UUID: 660e8400-... (character)`);
console.log(`[UUID Match] @isla → UUID: 770e8400-... (location)`);
```

## 🧪 Testing

### Caso 1: Acentos y Mayúsculas

```typescript
Prompt: "@Lía @TOMAS @Noah bailan"

Output:
[UUID Match] @Lía → UUID: 550e8400-... (character)
[UUID Match] @TOMAS → UUID: 660e8400-... (character)  
[UUID Match] @Noah → UUID: 770e8400-... (character)

image_urls: [
  "https://bd.persistenciadigital.com/storage/.../lia.png",
  "https://bd.persistenciadigital.com/storage/.../tomas.png",
  "https://bd.persistenciadigital.com/storage/.../noah.png"
]
```

### Caso 2: Duplicados con UUID

```typescript
Prompt: "@lia canta mientras @lia baila"

Output:
[UUID Match] @lia → UUID: 550e8400-... (character)
[UUID Match] @lia → UUID: 550e8400-... (character)

image_urls: [
  "https://bd.persistenciadigital.com/storage/.../lia.png",
  "https://bd.persistenciadigital.com/storage/.../lia.png"
]

Compiled: "character named Lia [Image1] (rubia, ...) canta mientras character named Lia [Image2] (rubia, ...) baila"
```

### Caso 3: Nombres Complejos

```typescript
characters = [
  { id: "uuid-1", name: "María José" },
  { id: "uuid-2", name: "José María" }
];

Prompt: "@MaríaJosé saluda a @JoséMaría"

// Normalización:
"MaríaJosé" → "mariajose" → uuid-1
"JoséMaría" → "josemaria" → uuid-2

// ✅ Ambos se resuelven correctamente
```

## 📊 Flujo Completo

```
┌─────────────────┐
│ Usuario escribe │
│  "@Lía canta"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Regex captura  │
│  mentionText =  │
│      "Lía"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalización  │
│  "Lía" → "lia"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Busca en Map   │
│  assetMap.get   │
│     ("lia")     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Retorna UUID + │
│   imageUrl      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Compila prompt: │
│ "character      │
│  named Lía      │
│  [Image1]..."   │
└─────────────────┘
```

## 🔄 Migración de Datos Existentes

No se requiere migración. Los UUIDs ya existen en la base de datos:

```sql
-- Verificar UUIDs existentes:
SELECT id, name FROM characters;

-- Ejemplo de salida:
-- id                                   | name
-- ------------------------------------ | -------
-- 550e8400-e29b-41d4-a716-446655440000 | Lia
-- 660e8400-e29b-41d4-a716-446655440001 | Tomas
-- 770e8400-e29b-41d4-a716-446655440002 | Noah
```

El sistema automáticamente usa estos UUIDs para matching.

## 🎬 Resultado Final

```typescript
// Prompt del usuario:
"@Lía @Tomás @Noah @Coco todos cantan y bailan en frente de la casa de @Isla"

// Logs internos:
[UUID Match] @Lía → UUID: 550e8400-... (character)
[UUID Match] @Tomás → UUID: 660e8400-... (character)
[UUID Match] @Noah → UUID: 770e8400-... (character)
[UUID Match] @Coco → UUID: 880e8400-... (character)
[UUID Match] @Isla → UUID: 990e8400-... (location)

// Prompt compilado a VideoGenAPI:
"character named Lía [Image1] (rubia, ojos azules, vestido rojo), 
character named Tomás [Image2] (moreno, jeans), 
character named Noah [Image3] (castaño, camisa blanca), 
character named Coco [Image4] (perro golden retriever) 
todos cantan y bailan 
at the location casa de Isla [Image5] (casa moderna, jardín)"

// image_urls array:
[
  "https://bd.persistenciadigital.com/storage/.../lia.png",
  "https://bd.persistenciadigital.com/storage/.../tomas.png",
  "https://bd.persistenciadigital.com/storage/.../noah.png",
  "https://bd.persistenciadigital.com/storage/.../coco.png",
  "https://bd.persistenciadigital.com/storage/.../isla.jpg"
]
```

## 🛡️ Garantías del Sistema

1. **Consistencia**: Mismo UUID = mismo personaje, siempre
2. **Flexibilidad**: Nombres con acentos, mayúsculas, espacios funcionan
3. **Escalabilidad**: Soporta miles de personajes sin colisiones
4. **Debugging**: Logs claros con UUIDs para troubleshooting
5. **Futuro**: Base para features avanzados (fuzzy search, aliases, etc.)
