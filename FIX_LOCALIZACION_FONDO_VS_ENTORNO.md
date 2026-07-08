# 🏝️ Fix: Localización como Entorno vs Fondo

## 🐛 Problema Reportado

**Síntoma:**
Cuando Tomas camina "en la isla", aparece caminando en un lugar diferente con la isla visible al fondo en el horizonte. El modelo interpreta la isla como un paisaje lejano en lugar del entorno donde el personaje está situado.

**Ejemplo:**
- **Prompt:** "@Tomas camina en @Isla"
- **Resultado incorrecto:** Tomas caminando en un lugar genérico, con la isla visible a lo lejos en el fondo
- **Resultado esperado:** Tomas caminando SOBRE la superficie de la isla (arena, muelle, camino)

## 🎯 Causa Raíz

El modelo de IA confunde dos conceptos diferentes:

1. **Localización como FONDO** (paisaje lejano, vista panorámica)
2. **Localización como ENTORNO** (lugar donde el personaje está físicamente)

Cuando decimos "en la isla", queremos decir que el personaje está **PARADO/CAMINANDO SOBRE** la isla, no que la isla esté visible en el fondo.

## ✅ Solución Implementada

### 1. Instrucción General de Localizaciones (NUEVA)

Se agregó una regla global que se aplica a TODAS las localizaciones:

```javascript
const locationInterpretationInstruction = isSpanish
  ? "[📍 REGLA DE LOCALIZACIONES: Cuando se menciona una localización (ej: 'en la isla', 'en la playa'), el personaje está SITUADO EN/SOBRE ese lugar, NO mirando hacia él. La localización es el SUELO/ENTORNO donde el personaje se encuentra parado/caminando/sentado. NO renderizar la localización como un paisaje lejano o isla al fondo. El personaje y la localización comparten el MISMO ESPACIO físico.] "
  : "[📍 LOCATION RULE: When a location is mentioned (e.g., 'on the island', 'at the beach'), the character is SITUATED IN/ON that place, NOT looking at it. The location is the GROUND/ENVIRONMENT where the character is standing/walking/sitting. DO NOT render the location as a distant landscape or island in the background. The character and location share the SAME physical SPACE.] ";
```

**Ubicación:** Se agrega al inicio del prompt final, antes del contenido del usuario.

### 2. Refuerzo en Token de Localización Multi-Vista

Se actualizó el texto inline que acompaña al `[ImageX]` de la isla:

**Antes:**
```
[Image2] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada para la acción, NO combinar todas las vistas en una sola escena)
```

**Después:**
```
[Image2] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada, el personaje está SITUADO EN/SOBRE esta localización, NO es un paisaje de fondo. El personaje CAMINA/ESTÁ PARADO EN este lugar)
```

### 3. Instrucción Crítica Multi-Vista Actualizada

Se mejoró el `multiViewLocationInstruction` para enfatizar el concepto de entorno:

**Antes:**
```
"[🎬 INSTRUCCIÓN CRÍTICA LOCACIÓN MULTI-VISTA: La imagen de referencia de la isla muestra 4 PANELES (vista aérea, frontal, lateral, detalle) que son DIFERENTES ÁNGULOS DE LA MISMA ISLA. Estos paneles son SOLO REFERENCIA DE DISEÑO para conocer cómo se ve la isla. PROHIBIDO renderizar los 4 paneles simultáneamente en la escena. PROHIBIDO crear 2 o más islas/casas. ELEGIR UNA vista apropiada para la acción (por ejemplo: si camina en la playa usar vista frontal/lateral, si vuela usar vista aérea). La escena debe mostrar UNA SOLA isla coherente, NO una mezcla de todos los paneles juntos.]"
```

**Después:**
```
"[🎬 INSTRUCCIÓN CRÍTICA DE LOCALIZACIÓN: La imagen de referencia de la isla muestra 4 PANELES (aéreo, frontal, lateral, detalle) que son DIFERENTES ÁNGULOS DE LA MISMA ISLA. ⚠️ CONCEPTO FUNDAMENTAL: La localización NO es el paisaje de fondo, es el ENTORNO DONDE EL PERSONAJE ESTÁ SITUADO. Si el personaje camina en la isla, él está PARADO/CAMINANDO SOBRE la superficie de la isla (arena, hierba, madera del muelle). La isla NO debe aparecer como un paisaje lejano al fondo. PROHIBIDO renderizar los 4 paneles simultáneamente. PROHIBIDO crear 2 o más islas. ELEGIR UNA vista apropiada para situar al personaje EN ese lugar. El personaje está EN/SOBRE la localización, NO mirando hacia ella desde otro lugar.]"
```

## 📊 Estructura del Prompt Final

El prompt compilado ahora tiene esta estructura:

```
[🎬 INSTRUCCIÓN CRÍTICA DE LOCALIZACIÓN: ...]  ← Multi-view instruction (si aplica)
[📍 REGLA DE LOCALIZACIONES: ...]              ← NUEVA: Regla general
[⚠️ CONTEO EXACTO: ...]                        ← Character count
[🚫 REGLA GLOBAL ESTRICTA: ...]                ← No extra elements
[⚠️ INSTRUCCIÓN CRÍTICA: ...]                  ← Reference images (si aplica)
<contenido del usuario>                         ← User prompt con @mentions reemplazados
```

## 🎯 Conceptos Clave Comunicados al Modelo

1. **"La localización es el ENTORNO donde el personaje está SITUADO"**
   - No es el fondo
   - No es un paisaje lejano
   - Es el lugar físico donde el personaje está parado/caminando

2. **"El personaje y la localización comparten el MISMO ESPACIO físico"**
   - No están separados
   - No hay distancia entre ellos
   - El personaje está EN/SOBRE la localización

3. **"PARADO/CAMINANDO SOBRE la superficie"**
   - Especifica la relación física
   - Menciona elementos tangibles (arena, hierba, madera)
   - Evita interpretaciones abstractas

4. **"NO es un paisaje de fondo"**
   - Negación explícita del comportamiento incorrecto
   - Previene la interpretación como vista panorámica

## 🧪 Testing

### Casos de Prueba

1. **Caso Simple:**
   - Prompt: "@Tomas camina en @Isla"
   - Esperado: Tomas caminando sobre la arena/muelle de la isla
   - No esperado: Tomas en otro lugar con la isla al fondo

2. **Caso con Acción:**
   - Prompt: "@Tomas recoge una concha en @Isla"
   - Esperado: Tomas agachado en la playa de la isla
   - No esperado: Tomas en un lugar genérico mirando hacia una isla distante

3. **Caso con Múltiples Personajes:**
   - Prompt: "@Tomas y @Lia juegan en @Isla"
   - Esperado: Ambos personajes sobre la superficie de la isla
   - No esperado: Personajes en un lugar diferente con isla al fondo

### Verificación Visual

✅ **Correcto:**
- Personaje tiene contacto con el suelo/superficie de la localización
- La localización es el entorno inmediato (primer plano)
- No hay otra versión de la localización visible a distancia

❌ **Incorrecto:**
- Personaje en un lugar genérico/neutral
- Localización visible como paisaje lejano en el horizonte
- Dos versiones de la misma localización (una donde está + una al fondo)

## 📁 Archivos Modificados

### src/utils.ts

**Líneas modificadas:**

1. **~486:** Token de referencia para localizaciones multi-vista
   ```typescript
   const imageRef = isMultiViewLocation
     ? ` [Image${imageIndexForThisMention}] 🎬 REFERENCIA DE DISEÑO (elegir UNA vista apropiada, el personaje está SITUADO EN/SOBRE esta localización, NO es un paisaje de fondo. El personaje CAMINA/ESTÁ PARADO EN este lugar)`
     : ` [Image${imageIndexForThisMention}] ⚠️ USAR ELEMENTOS DE LA IMAGEN`;
   ```

2. **~587:** Instrucción crítica multi-vista actualizada
   ```typescript
   multiViewLocationInstruction = isSpanish
     ? "[🎬 INSTRUCCIÓN CRÍTICA DE LOCALIZACIÓN: ... ⚠️ CONCEPTO FUNDAMENTAL: La localización NO es el paisaje de fondo, es el ENTORNO DONDE EL PERSONAJE ESTÁ SITUADO. ...]"
   ```

3. **~604:** Nueva instrucción general de localizaciones
   ```typescript
   const locationInterpretationInstruction = isSpanish
     ? "[📍 REGLA DE LOCALIZACIONES: ...]"
   ```

4. **~615:** Agregada al prompt final
   ```typescript
   finalPrompt = multiViewLocationInstruction + locationInterpretationInstruction + characterCountInstruction + noExtraElementsInstruction + finalPrompt;
   ```

## 🔄 Impacto

### ✅ Beneficios

1. **Mayor precisión espacial:** El modelo entiende correctamente la relación personaje-localización
2. **Menos iteraciones:** Reduce re-generaciones por errores de interpretación
3. **Consistencia:** Todas las localizaciones se interpretan de la misma manera
4. **Claridad:** Comunicación explícita del concepto de "entorno vs fondo"

### ⚠️ Consideraciones

- **Prompts largos:** Se agregan ~150-200 caracteres adicionales al prompt
- **Testing necesario:** Verificar que funciona en diferentes escenarios
- **Posible ajuste:** Puede requerir fine-tuning según resultados

## 📚 Contexto Técnico

### Por Qué Era Necesario

Los modelos de generación de video tienden a interpretar las localizaciones como:
1. Elementos compositivos (fondo, paisaje)
2. Referencias visuales (lo que se ve)
3. Contexto atmosférico (ambiente general)

En lugar de:
1. Espacio físico donde ocurre la acción
2. Suelo/superficie donde el personaje está
3. Entorno inmediato del personaje

Esta desconexión conceptual causa que el modelo renderice la localización como un elemento visual separado del personaje, generalmente como paisaje de fondo.

### Estrategia de Solución

1. **Múltiples niveles de instrucción:**
   - Regla general (todas las localizaciones)
   - Instrucción específica (multi-vista)
   - Token inline (mención individual)

2. **Lenguaje explícito y concreto:**
   - "SITUADO EN/SOBRE" (relación física clara)
   - "MISMO ESPACIO físico" (unidad espacial)
   - "arena, hierba, madera" (elementos tangibles)

3. **Negaciones explícitas:**
   - "NO es el paisaje de fondo"
   - "NO mirando hacia ella desde otro lugar"
   - "NO debe aparecer como paisaje lejano"

## 🎓 Aprendizajes

1. **Los modelos de IA necesitan conceptos espaciales explícitos**
   - No asumen relaciones físicas obvias para humanos
   - Requieren instrucciones sobre proximidad y contacto

2. **Las instrucciones multi-nivel son más efectivas**
   - Regla general + caso específico + token inline
   - Refuerzo a través de repetición en diferentes contextos

3. **El lenguaje concreto supera al abstracto**
   - "caminando sobre la arena" > "en la isla"
   - "MISMO ESPACIO físico" > "están juntos"

---

**Fecha:** 2026-07-08  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado y listo para testing
