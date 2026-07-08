/**
 * Supabase Database Client
 * Handles authentication and data storage for Persistencia Studio
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CharacterAsset, PropAsset, LocationAsset, ReferenceFrameAsset } from '../types';

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string;
  userId: string | null;
}

/**
 * Get Supabase client instance (singleton pattern)
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // Get Supabase config from server endpoint
    const res = await fetch('/api/supabase-config');
    if (!res.ok) {
      throw new Error('Failed to load Supabase configuration from server.');
    }
    const { url, anonKey } = await res.json();

    if (!url || !anonKey) {
      throw new Error('Supabase URL and ANON_KEY are required in .env');
    }

    // Create Supabase client with auth enabled
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    });

    return supabaseClient;
  })();

  return initPromise;
}

/**
 * Initialize Supabase (legacy function, kept for compatibility)
 */
export async function initSupabase() {
  const supabase = await getSupabaseClient();
  const userId = await getUserId();
  return { supabase, userId };
}

/**
 * Get current authenticated user ID
 */
export async function getUserId(): Promise<string> {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Fallback to local ID for backward compatibility
    let localUid = localStorage.getItem('seedance_user_id');
    if (!localUid) {
      localUid = `local-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('seedance_user_id', localUid);
    }
    return localUid;
  }
  
  return user.id;
}

/**
 * Error handler
 */
async function handleSupabaseError(error: unknown, operationType: OperationType, table: string): Promise<never> {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  let userId: string | null = null;
  try {
    userId = await getUserId();
  } catch {
    userId = null;
  }
  
  const errInfo: SupabaseErrorInfo = {
    error: errMessage,
    operationType,
    table,
    userId,
  };
  
  console.error('Supabase Error:', errInfo);
  throw new Error(JSON.stringify(errInfo));
}

// =====================
// CHARACTERS
// =====================

export async function saveCharacter(userId: string, character: CharacterAsset): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('characters')
      .upsert({
        id: character.id,
        user_id: userId,
        name: character.name,
        description: character.description,
        image_url: character.avatarUrl || null,  // Map avatarUrl to image_url
        gender: character.gender || null,
        appearance: character.appearance || null,
        clothing: character.clothing || null,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'characters');
  }
}

export async function getCharacters(userId: string): Promise<CharacterAsset[]> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { data, error } = await supabaseClient!
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      avatarUrl: row.image_url,  // Map image_url to avatarUrl
      gender: row.gender,
      appearance: row.appearance,
      clothing: row.clothing,
    }));
  } catch (error) {
    handleSupabaseError(error, OperationType.LIST, 'characters');
  }
}

export async function deleteCharacter(userId: string, characterId: string): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('characters')
      .delete()
      .eq('id', characterId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'characters');
  }
}

// =====================
// PROPS (OBJECTS)
// =====================

export async function saveProp(userId: string, prop: PropAsset): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('props')
      .upsert({
        id: prop.id,
        user_id: userId,
        name: prop.name,
        description: prop.description,
        image_url: prop.imageUrl || null,
        created_at: prop.createdAt || new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'props');
  }
}

export async function getProps(userId: string): Promise<PropAsset[]> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { data, error } = await supabaseClient!
      .from('props')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, OperationType.LIST, 'props');
  }
}

export async function deleteProp(userId: string, propId: string): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('props')
      .delete()
      .eq('id', propId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'props');
  }
}

// =====================
// LOCATIONS (SCENARIOS)
// =====================

export async function saveLocation(userId: string, location: LocationAsset): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('locations')
      .upsert({
        id: location.id,
        user_id: userId,
        name: location.name,
        description: location.description,
        image_url: location.imageUrl || null,
        created_at: location.createdAt || new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'locations');
  }
}

export async function getLocations(userId: string): Promise<LocationAsset[]> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { data, error } = await supabaseClient!
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, OperationType.LIST, 'locations');
  }
}

export async function deleteLocation(userId: string, locationId: string): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('locations')
      .delete()
      .eq('id', locationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'locations');
  }
}

// =====================
// REFERENCE FRAMES
// =====================

export async function saveReferenceFrame(userId: string, frame: ReferenceFrameAsset): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('reference_frames')
      .upsert({
        id: frame.id,
        user_id: userId,
        name: frame.name,
        image_url: frame.imageUrl,
        created_at: frame.createdAt || new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'reference_frames');
  }
}

export async function getReferenceFrames(userId: string): Promise<ReferenceFrameAsset[]> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { data, error } = await supabaseClient!
      .from('reference_frames')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    }));
  } catch (error) {
    handleSupabaseError(error, OperationType.LIST, 'reference_frames');
  }
}

export async function deleteReferenceFrame(userId: string, frameId: string): Promise<void> {
  try {
    if (!supabaseClient) await initSupabase();
    
    const { error } = await supabaseClient!
      .from('reference_frames')
      .delete()
      .eq('id', frameId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, 'reference_frames');
  }
}
