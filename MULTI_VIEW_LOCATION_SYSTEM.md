# Sistema de Locaciones Multi-Vista

## 📸 Concepto

Las **locaciones multi-vista** son imágenes de referencia que muestran una sola ubicación desde múltiples ángulos en una sola imagen (típicamente en formato de cuadrícula de 2x2 o similar).

### Ejemplo: @Isla
La imagen de referencia de `@Isla` contiene 4 paneles:
- 🛩️ **Vista Aérea**: Muestra la distribución general de la isla
- 🏠 **Vista Frontal**: Muestra la cabaña y el muelle de frente
- 🌴 **Vista Lateral**: Muestra la profundidad y perspectiva
- 🔍 **Vista Detalle**: Muestra texturas y materiales específicos

**IMPORTANTE**: Estos 4 paneles son todos de **LA MISMA isla**, NO son 4 islas diferentes.

---

## ⚠️ Problema Identificado

### Síntoma
Cuando el usuario generaba un video con `@Tomas en @Isla`, el AI creaba:
- 2 o más islas/casas en la misma escena
- Elementos de todos los paneles combinados simultáneamente
- Escenas incoherentes donde aparecía caminando al lado de la casa, luego el muelle donde debería ser agua, etc.

### Causa Raíz
El prompt compilado contenía:
```
... en la locación Isla [Image1] ⚠️ USAR ELEMENTOS DE LA IMAGEN ...
```

El AI interpretaba "USAR ELEMENTOS DE LA IMAGEN" como **"usar TODOS los elementos de TODAS las vistas simultáneamente en una sola escena"**.

Esto causaba que el AI tratara de renderizar los 4 paneles como si fueran elementos separados que debe combinar en una sola escena, creando una mezcla incoherente.

---

## ✅ Solución Implementada

### 1. Cambio en Token de Referencia

**Antes:**
```typescript
refToken = ` [Image${imageIndexForThisMention}] ⚠️ USAR ELEMENTOS DE LA IMAGEN`;
```

**Después:**
```typescript
const isMultiViewLocation = normalized === 'isla' || normalized === 'island';
const imageRef = isMultiViewLocation
  ? ` [Image${imageIndexForThisMention}] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada para la acción, NO combinar todas las vistas en una sola escena)`
  : ` [Image${imageIndexForThisMention}] ⚠️ USAR ELEMENTOS DE LA IMAGEN`;
refToken = imageRef;
```

### 2. Instrucción Global Crítica

Se agregó una instrucción GLOBAL que se activa cuando hay una locación multi-vista con imagen:

```typescript
const multiViewLocationInstruction = isSpanish
  ? "[🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: La imagen de referencia de la isla muestra 4 PANELES (vista aérea, frontal, lateral, detalle) que son DIFERENTES ÁNGULOS DE LA MISMA ISLA. Estos paneles son SOLO REFERENCIA DE DISEÑO para conocer cómo se ve la isla. PROHIBIDO renderizar los 4 paneles simultáneamente en la escena. PROHIBIDO crear 2 o más islas/casas. ELEGIR UNA vista apropiada para la acción (por ejemplo: si camina en la playa usar vista frontal/lateral, si vuela usar vista aérea). La escena debe mostrar UNA SOLA isla coherente, NO una mezcla de todos los paneles juntos.] "
  : "[🎬 CRITICAL MULTI-VIEW LOCATION INSTRUCTION: The island reference image shows 4 PANELS (aerial, frontal, lateral, detail) which are DIFFERENT ANGLES OF THE SAME ISLAND. These panels are ONLY DESIGN REFERENCE to know what the island looks like. FORBIDDEN to render all 4 panels simultaneously in the scene. FORBIDDEN to create 2 or more islands/houses. CHOOSE ONE appropriate view for the action (e.g., if walking on beach use frontal/lateral view, if flying use aerial view). The scene must show ONE SINGLE coherent island, NOT a mixture of all panels together.] ";
```

### 3. Detección Automática

El sistema detecta automáticamente si hay locaciones multi-vista en el prompt:

```typescript
const mentionedLocations = Object.keys(mentioned).filter(key => assetLookup.get(key)?.type === 'location');
const hasMultiViewLocation = mentionedLocations.some(locKey => {
  const loc = assetLookup.get(locKey)?.asset as LocationAsset;
  const normalized = normalizeForMatching(loc?.name || '');
  return (normalized === 'isla' || normalized === 'island') && loc?.imageUrl;
});
```

### 4. Simplificación de LOCATION_PROPORTIONS

Ya no se incluye la instrucción multi-vista en `LOCATION_PROPORTIONS` (movida a instrucción global):

```typescript
const LOCATION_PROPORTIONS: Record<string, string> = {
  "isla": "isla tropical pequeña aprox 50m diámetro, playa arena blanca, agua turquesa, palmeras 8-10m altura, muelle madera 15m, cabaña rústica puerta 2m altura (más alta que Tomás), rocas volcánicas",
  "island": "small tropical island approx 50m diameter, white sand beach, turquoise water, palm trees 8-10m height, wooden dock 15m, rustic cabin door 2m tall (taller than Tomás), volcanic rocks",
  // ...
};
```

---

## 🎯 Resultado Esperado

### Escenario 1: Caminar en la Playa
**Prompt:** `@Tomas camina por la playa de @Isla`

**Prompt Compilado:**
```
[🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: ...] 
[⚠️ CONTEO EXACTO: SOLO 1 personaje(s) en escena: Tomas. ...] 
[🚫 REGLA GLOBAL ESTRICTA: ...] 
Tomás camina por la playa de en la locación Isla [Image1] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada para la acción, NO combinar todas las vistas en una sola escena) (isla tropical pequeña aprox 50m diámetro...)
```

**Video Generado:**
- ✅ 1 sola isla
- ✅ Vista frontal o lateral (apropiada para caminar en playa)
- ✅ Elementos coherentes: playa de arena blanca, palmeras, agua turquesa
- ❌ NO aparecen 2 islas
- ❌ NO aparecen todos los paneles simultáneamente

### Escenario 2: Vista Aérea
**Prompt:** `@Tomas vuela sobre @Isla en un dron`

**Video Generado:**
- ✅ 1 sola isla
- ✅ Vista aérea (apropiada para vuelo)
- ✅ Se ve la distribución general: playa, palmeras, cabaña, muelle

### Escenario 3: Entrada a la Cabaña
**Prompt:** `@Tomas entra a la cabaña en @Isla`

**Video Generado:**
- ✅ 1 sola cabaña (parte de la isla)
- ✅ Vista frontal/lateral de la cabaña
- ✅ Puerta de 2m altura (más alta que Tomás)
- ❌ NO aparecen múltiples casas

---

## 🧪 Casos de Prueba

### Test 1: Básico
```
@Tomas camina en @Isla
```
**Verifica:**
- ✅ 1 isla
- ✅ Vista coherente
- ❌ NO hay duplicación

### Test 2: Múltiples Personajes
```
@Tomas, @Lia y @Noah juegan en @Isla mientras @Coco nada
```
**Verifica:**
- ✅ 4 personajes (todos con [Image1])
- ✅ 1 isla
- ✅ Escena coherente

### Test 3: Estructura Específica
```
@Tomas entra a la cabaña en @Isla
```
**Verifica:**
- ✅ 1 cabaña
- ✅ Parte de la isla (NO separada)
- ❌ NO hay múltiples casas

### Test 4: Acción Aérea
```
@Tomas vuela sobre @Isla
```
**Verifica:**
- ✅ Vista aérea
- ✅ 1 isla desde arriba
- ✅ Muestra distribución general

---

## 🔧 Cómo Agregar Nuevas Locaciones Multi-Vista

### Paso 1: Crear la Imagen
Crea una imagen con múltiples vistas (2x2, 3x1, etc.) de la misma ubicación desde diferentes ángulos.

### Paso 2: Actualizar Detección
En `utils.ts`, agregar la nueva locación a la detección:

```typescript
const isMultiViewLocation = normalized === 'isla' || normalized === 'island' 
  || normalized === 'casa' || normalized === 'house'  // <-- AGREGAR AQUÍ
  || normalized === 'ciudad' || normalized === 'city'; // <-- EJEMPLO
```

### Paso 3: Actualizar Instrucción Global (Opcional)
Si la nueva locación tiene características únicas, actualizar la instrucción global para incluir ejemplos específicos:

```typescript
ELEGIR UNA vista apropiada para la acción (por ejemplo: 
  si camina en la playa usar vista frontal/lateral, 
  si vuela usar vista aérea,
  si entra a edificio usar vista frontal,  // <-- EJEMPLO
  si observa ciudad usar vista panorámica  // <-- EJEMPLO
)
```

### Paso 4: Agregar Proporciones
Actualizar `LOCATION_PROPORTIONS` con las especificaciones de la nueva locación:

```typescript
const LOCATION_PROPORTIONS: Record<string, string> = {
  "isla": "...",
  "ciudad": "ciudad moderna 200m x 300m, edificios 20-50m altura, calles 8m ancho, plaza central 100m x 100m",
  // ...
};
```

---

## 📊 Comparación de Prompts

### Antes del Fix
```
Tomás en la locación Isla [Image1] ⚠️ USAR ELEMENTOS DE LA IMAGEN 
[📷 IMAGEN MULTI-VISTA: La imagen muestra 4 VISTAS DIFERENTES...] 
(UNA SOLA isla tropical pequeña de aprox 50m diámetro... 
⚠️ IMPORTANTE: Si la imagen muestra múltiples vistas, son TODAS 
de la MISMA isla vista desde diferentes ángulos, NO son múltiples islas)
```

**Problema:** La instrucción multi-vista estaba enterrada en el replacement de la locación, después de "USAR ELEMENTOS", lo cual causaba que el AI priorizara "usar elementos" sobre la aclaración.

### Después del Fix
```
[🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: La imagen de referencia 
de la isla muestra 4 PANELES (vista aérea, frontal, lateral, detalle) 
que son DIFERENTES ÁNGULOS DE LA MISMA ISLA. Estos paneles son SOLO 
REFERENCIA DE DISEÑO para conocer cómo se ve la isla. PROHIBIDO 
renderizar los 4 paneles simultáneamente en la escena. PROHIBIDO crear 
2 o más islas/casas. ELEGIR UNA vista apropiada para la acción 
(por ejemplo: si camina en la playa usar vista frontal/lateral, si 
vuela usar vista aérea). La escena debe mostrar UNA SOLA isla coherente, 
NO una mezcla de todos los paneles juntos.] 

[⚠️ CONTEO EXACTO: SOLO 1 personaje(s) en escena: Tomas. ...] 

[🚫 REGLA GLOBAL ESTRICTA: ...] 

Tomás en la locación Isla [Image1] 🎬 REFERENCIA DE DISEÑO 
(elegir UNA vista apropiada para la acción, NO combinar todas 
las vistas en una sola escena) (isla tropical pequeña aprox 50m diámetro...)
```

**Mejora:** La instrucción multi-vista está al PRINCIPIO del prompt (más peso), usa "REFERENCIA DE DISEÑO" en vez de "USAR ELEMENTOS", e incluye prohibiciones explícitas.

---

## 🎓 Lecciones Aprendidas

### 1. Orden de las Instrucciones Importa
Las instrucciones al inicio del prompt tienen más peso que las del final. La instrucción multi-vista DEBE estar al principio.

### 2. Lenguaje Explícito
El AI interpreta literalmente. "USAR ELEMENTOS" → usa todos los elementos. "REFERENCIA DE DISEÑO" → usa como guía, no literalmente.

### 3. Prohibiciones Explícitas
Es más efectivo decir "PROHIBIDO hacer X" que "por favor no hacer X" o esperar que el AI infiera lo que NO debe hacer.

### 4. Ejemplos Concretos
Dar ejemplos específicos ("si camina en playa usar vista frontal, si vuela usar vista aérea") ayuda al AI a entender mejor que abstracciones genéricas.

### 5. Separación de Responsabilidades
Mover la instrucción multi-vista de `LOCATION_PROPORTIONS` a una instrucción global dedicada mejora la claridad y mantenibilidad del código.

---

## 🔍 Debugging

### Ver Prompt Compilado
Para verificar que el prompt se está generando correctamente, revisa la consola del navegador al generar un video. Deberías ver logs como:

```
[Prompt Compilation] Starting...
[Mentioned Assets] @Isla (Location) → [Image1]
[Mention Replacement] @isla (Isla) → [Image1] (UUID: ...)
[Multi-View Location Detected] Adding critical instruction
[Final Prompt Length] 1234 characters
```

### Verificar Instrucción Multi-Vista
Busca en el prompt compilado:
```
🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: ...
```

Si NO aparece, verifica que:
1. La locación está marcada como multi-vista en `isMultiViewLocation`
2. La locación tiene `imageUrl` definida
3. La locación está siendo mencionada en el prompt (ej: `@Isla`)

### Verificar Token de Referencia
Busca en el prompt compilado:
```
[Image1] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada...)
```

Si aparece `⚠️ USAR ELEMENTOS DE LA IMAGEN`, significa que la locación NO está siendo detectada como multi-vista.

---

## 📈 Métricas de Éxito

Para considerar el sistema exitoso, verifica:

- ✅ Videos con `@Isla` muestran 1 sola isla (no 2+)
- ✅ Vista elegida es coherente con la acción (playa → frontal, vuelo → aérea)
- ✅ NO aparecen elementos de múltiples vistas simultáneamente
- ✅ Escenas son coherentes y realistas
- ✅ Los usuarios no reportan "aparecen 2 islas" o "la casa está en el agua"

---

## 🚀 Versionado

- **v1.0** (2026-07-08): Implementación inicial con instrucción multi-vista en `LOCATION_PROPORTIONS`
- **v2.0** (2026-07-08): Refactor con instrucción global dedicada, token "REFERENCIA DE DISEÑO", prohibiciones explícitas

---

## 📚 Referencias

- [utils.ts](src/utils.ts) - Código fuente del compilador de prompts
- [LOCATION_PROPORTIONS](src/utils.ts#L46) - Especificaciones de proporciones de locaciones
- [compilePrompt()](src/utils.ts#L150) - Función principal de compilación
- [VideoGenAPI Docs](https://videogenapi.com/docs) - Documentación oficial del API

---

## 👤 Contacto

Para preguntas o reportar problemas con el sistema multi-vista:
- GitHub: [anthonyjdiaz89/Persistencia_Studio](https://github.com/anthonyjdiaz89/Persistencia_Studio)
- Email: Contact through GitHub issues

---

## 📝 Changelog

### 2026-07-08 - v2.0
- ✨ Agregada instrucción global crítica al inicio del prompt
- 🔧 Cambiado token de "USAR ELEMENTOS" a "REFERENCIA DE DISEÑO"
- 🚫 Agregadas prohibiciones explícitas de combinar paneles
- 📝 Agregados ejemplos concretos de selección de vista
- 🧹 Simplificado LOCATION_PROPORTIONS
- 📖 Creada documentación completa del sistema

### 2026-07-08 - v1.0
- 🎉 Implementación inicial del sistema multi-vista
- 📸 Soporte para @Isla con 4 vistas
- ⚠️ Instrucción multi-vista en LOCATION_PROPORTIONS
- ❌ Problema: AI combina todas las vistas simultáneamente
