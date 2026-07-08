/**
 * Configuration for API endpoints
 * 
 * En desarrollo: usa el servidor local (localhost:3000)
 * En producción: usa la variable VITE_API_URL o el mismo dominio
 */

// Detectar si estamos en desarrollo o producción
const isDevelopment = import.meta.env.DEV;

// URL base de la API
// En desarrollo: http://localhost:3000
// En producción: usa VITE_API_URL si está definida, sino usa el mismo dominio (para deployments monolíticos)
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3000'
  : (import.meta.env.VITE_API_URL || '');

console.log(`[Config] API_BASE_URL: ${API_BASE_URL || 'same domain'}`);
console.log(`[Config] Environment: ${isDevelopment ? 'development' : 'production'}`);
