#!/usr/bin/env node

/**
 * Script de Verificación de Producción
 * Verifica que todas las variables de entorno y endpoints estén configurados correctamente
 * 
 * Uso:
 *   node verify-production.js
 *   node verify-production.js https://tu-dominio.com
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.bold);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

async function checkEndpoint(name, url, expectedFields = []) {
  try {
    log(`\nVerificando: ${name}`, colors.cyan);
    log(`URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      logError(`HTTP ${response.status}: ${response.statusText}`);
      console.log('Respuesta:', JSON.stringify(data, null, 2));
      return false;
    }
    
    logSuccess('Endpoint accesible');
    console.log('Respuesta:', JSON.stringify(data, null, 2));
    
    // Check expected fields
    let allFieldsPresent = true;
    for (const field of expectedFields) {
      if (data[field] === undefined) {
        logWarning(`Campo faltante: ${field}`);
        allFieldsPresent = false;
      } else if (data[field] === false || data[field] === null || data[field] === '') {
        logWarning(`Campo ${field} = ${JSON.stringify(data[field])} (puede indicar problema)`);
      } else {
        logSuccess(`${field}: ${JSON.stringify(data[field])}`);
      }
    }
    
    return allFieldsPresent;
    
  } catch (error) {
    logError(`Error de conexión: ${error.message}`);
    return false;
  }
}

async function main() {
  logHeader(`Verificación de Producción - Persistencia Studio`);
  log(`Base URL: ${baseUrl}`, colors.bold);
  
  const results = {
    config: false,
    supabase: false,
    multiKey: false
  };
  
  // 1. Check /api/config
  logHeader('1. Configuración de API Keys');
  results.config = await checkEndpoint(
    'Server Configuration',
    `${baseUrl}/api/config`,
    ['status', 'hasApiKey', 'hasGeminiKey', 'multiKeyEnabled']
  );
  
  if (results.config) {
    const configRes = await fetch(`${baseUrl}/api/config`);
    const configData = await configRes.json();
    
    if (configData.hasApiKey === false) {
      logError('CRÍTICO: No se detectó VIDEOGEN_API_KEY');
      logWarning('El botón "Generar Shot" estará deshabilitado');
      logWarning('Configura VIDEOGEN_API_KEY en tu plataforma de hosting');
    }
    
    if (configData.multiKeyEnabled === false) {
      logWarning('Multi-key system deshabilitado (solo 1 API key configurada)');
      logWarning('Para mejor rendimiento, configura múltiples keys: VIDEOGEN_API_KEY_1, _2, etc.');
    }
  }
  
  // 2. Check /api/supabase-config
  logHeader('2. Configuración de Supabase');
  results.supabase = await checkEndpoint(
    'Supabase Configuration',
    `${baseUrl}/api/supabase-config`,
    ['url', 'anonKey']
  );
  
  if (!results.supabase) {
    logError('CRÍTICO: Configuración de Supabase faltante');
    logWarning('Los materiales (personajes, props, locaciones) no funcionarán');
    logWarning('Configura SUPABASE_URL y SUPABASE_ANON_KEY');
  }
  
  // 3. Check /api/keys/status (solo si multi-key está habilitado)
  logHeader('3. Estado del Sistema Multi-Key');
  results.multiKey = await checkEndpoint(
    'Multi-Key Status',
    `${baseUrl}/api/keys/status`,
    ['success', 'totalKeys', 'availableKeys', 'loadBalancingActive']
  );
  
  if (results.multiKey) {
    const keysRes = await fetch(`${baseUrl}/api/keys/status`);
    const keysData = await keysRes.json();
    
    if (keysData.totalKeys === 1) {
      logWarning('Solo 1 API key configurada');
      logWarning('Capacidad: 5 requests / 10 minutos');
      logWarning('Considera agregar más keys para multiplicar la capacidad');
    } else {
      logSuccess(`${keysData.totalKeys} API keys configuradas`);
      logSuccess(`Capacidad: ${keysData.totalKeys * 5} requests / 10 minutos`);
    }
    
    if (keysData.availableKeys < keysData.totalKeys) {
      logWarning(`${keysData.totalKeys - keysData.availableKeys} key(s) en rate limit`);
    }
  }
  
  // Summary
  logHeader('RESUMEN DE VERIFICACIÓN');
  
  const allPassed = results.config && results.supabase && results.multiKey;
  
  if (allPassed) {
    logSuccess('✓ Todos los endpoints funcionando correctamente');
    logSuccess('✓ La aplicación está lista para usarse');
  } else {
    logError('✗ Se detectaron problemas de configuración');
    log('\n📋 Acciones recomendadas:', colors.yellow);
    
    if (!results.config) {
      log('  1. Verifica que VIDEOGEN_API_KEY esté configurada', colors.yellow);
      log('     → En Vercel/Netlify: Settings → Environment Variables', colors.yellow);
      log('     → En Railway/Render: Variables tab', colors.yellow);
    }
    
    if (!results.supabase) {
      log('  2. Configura SUPABASE_URL y SUPABASE_ANON_KEY', colors.yellow);
      log('     → Obtén las credenciales de tu proyecto Supabase', colors.yellow);
      log('     → Agrégalas en las variables de entorno', colors.yellow);
    }
    
    log('\n  3. Después de agregar variables, redeploy la aplicación', colors.yellow);
    log('  4. Ejecuta este script nuevamente para verificar', colors.yellow);
    log('\n📖 Consulta PRODUCCION_ENV.md para instrucciones detalladas', colors.cyan);
  }
  
  log('\n');
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  logError(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
