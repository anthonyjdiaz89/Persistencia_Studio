/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { CharacterAsset, PropAsset, LocationAsset, VideoTask, ReferenceFrameAsset } from "../types";
import { DEFAULT_CHARACTERS, DEFAULT_PROPS, DEFAULT_LOCATIONS } from "../defaultData";

// Supabase Storage Utilities
let supabaseConfig: { url: string; anonKey: string } | null = null;

export async function getSupabaseConfig() {
  if (supabaseConfig) return supabaseConfig;
  
  const res = await fetch("/api/supabase-config");
  if (!res.ok) {
    throw new Error("Failed to load Supabase configuration from server.");
  }
  supabaseConfig = await res.json();
  return supabaseConfig;
}

/**
 * Upload image file to Supabase Storage and return public URL
 * @param file - Image file to upload
 * @param bucketName - Supabase Storage bucket name (default: 'video-assets')
 * @param folder - Optional folder path within bucket
 * @returns Public URL of uploaded image
 */
export async function uploadImageToSupabase(
  file: File,
  bucketName: string = "video-assets",
  folder: string = "images"
): Promise<string> {
  const config = await getSupabaseConfig();
  
  // Resize image before upload to keep storage efficient
  const resizedBlob = await resizeImage(file, 1024);
  
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${timestamp}_${randomStr}.${extension}`;
  
  // Upload to Supabase Storage
  const uploadUrl = `${config.url}/storage/v1/object/${bucketName}/${fileName}`;
  
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.anonKey}`,
      'Content-Type': resizedBlob.type,
    },
    body: resizedBlob
  });
  
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.error("Supabase upload error:", errorText);
    throw new Error(`Failed to upload image to Supabase: ${uploadRes.status} ${errorText}`);
  }
  
  // Return public URL
  const publicUrl = `${config.url}/storage/v1/object/public/${bucketName}/${fileName}`;
  return publicUrl;
}

/**
 * Resize image file to max width while maintaining aspect ratio
 */
function resizeImage(file: File, maxWidth: number = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        file.type,
        0.85 // Quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

let dbInstance: any = null;
let authInstance: any = null;
let currentUser: any = null;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const serialized = JSON.stringify(errInfo);
  console.error("Firestore Error detail JSON:", serialized);
  throw new Error(serialized);
}

export async function initFirebase() {
  if (dbInstance && authInstance && currentUser) {
    return { db: dbInstance, auth: authInstance, user: currentUser };
  }

  const res = await fetch("/api/firebase-config");
  if (!res.ok) {
    throw new Error("Failed to load Firebase configuration from server.");
  }
  const config = await res.json();

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  // Ensure we set custom database ID if provided in config
  dbInstance = getFirestore(app, config.firestoreDatabaseId || "(default)");
  authInstance = getAuth(app);

  let localUid = localStorage.getItem("seedance_pseudo_uid");
  if (!localUid) {
    localUid = `local-usr-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("seedance_pseudo_uid", localUid);
  }

  try {
    await signInAnonymously(authInstance);
    currentUser = { uid: localUid, isAnonymous: true };
  } catch (err: any) {
    console.warn("Anonymous sign-in restricted or failed. Falling back to persistent local storage user identifier:", err.message);
    currentUser = { uid: localUid, isAnonymous: true };
  }

  return { db: dbInstance, auth: authInstance, user: currentUser };
}

// Ensure database has default items seeded for a fresh user
async function seedDefaultAssets(userId: string) {
  try {
    // 1. Seed Characters
    const charCollection = collection(dbInstance, "characters");
    for (const char of DEFAULT_CHARACTERS) {
      const docRef = doc(charCollection, `${userId}_${char.id}`);
      await setDoc(docRef, {
        ...char,
        userId,
        createdAt: Date.now()
      });
    }

    // 2. Seed Props
    const propsCollection = collection(dbInstance, "props");
    for (const prop of DEFAULT_PROPS) {
      const docRef = doc(propsCollection, `${userId}_${prop.id}`);
      await setDoc(docRef, {
        ...prop,
        userId,
        createdAt: Date.now()
      });
    }

    // 3. Seed Locations
    const locCollection = collection(dbInstance, "locations");
    for (const loc of DEFAULT_LOCATIONS) {
      const docRef = doc(locCollection, `${userId}_${loc.id}`);
      await setDoc(docRef, {
        ...loc,
        userId,
        createdAt: Date.now()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "seedDefaultAssets");
  }
}

export async function fetchUserAssets(userId: string) {
  const characters: CharacterAsset[] = [];
  const props: PropAsset[] = [];
  const locations: LocationAsset[] = [];

  let charSnap;
  try {
    const charQuery = query(collection(dbInstance, "characters"), where("userId", "==", userId));
    charSnap = await getDocs(charQuery);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "characters");
  }
  
  if (charSnap.empty) {
    // Fresh user, let's seed defaults
    await seedDefaultAssets(userId);
    
    // Fetch again after seeding
    let charSnap2;
    try {
      const charQuery = query(collection(dbInstance, "characters"), where("userId", "==", userId));
      charSnap2 = await getDocs(charQuery);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "characters");
    }
    
    charSnap2.forEach(doc => {
      const data = doc.data();
      characters.push({
        id: data.id,
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        appearance: data.appearance,
        clothing: data.clothing
      });
    });

    let propsSnap;
    try {
      propsSnap = await getDocs(query(collection(dbInstance, "props"), where("userId", "==", userId)));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "props");
    }
    
    propsSnap.forEach(doc => {
      const data = doc.data();
      props.push({
        id: data.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl
      });
    });

    let locSnap;
    try {
      locSnap = await getDocs(query(collection(dbInstance, "locations"), where("userId", "==", userId)));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "locations");
    }
    
    locSnap.forEach(doc => {
      const data = doc.data();
      locations.push({
        id: data.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl
      });
    });
  } else {
    charSnap.forEach(doc => {
      const data = doc.data();
      characters.push({
        id: data.id,
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        appearance: data.appearance,
        clothing: data.clothing
      });
    });

    let propsSnap;
    try {
      propsSnap = await getDocs(query(collection(dbInstance, "props"), where("userId", "==", userId)));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "props");
    }
    
    propsSnap.forEach(doc => {
      const data = doc.data();
      props.push({
        id: data.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl
      });
    });

    let locSnap;
    try {
      locSnap = await getDocs(query(collection(dbInstance, "locations"), where("userId", "==", userId)));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "locations");
    }
    
    locSnap.forEach(doc => {
      const data = doc.data();
      locations.push({
        id: data.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl
      });
    });
  }

  return { characters, props, locations };
}

export async function fetchUserReferenceFrames(userId: string) {
  const referenceFrames: ReferenceFrameAsset[] = [];
  try {
    const q = query(collection(dbInstance, "reference_frames"), where("userId", "==", userId));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const data = doc.data();
      referenceFrames.push({
        id: data.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl
      });
    });
  } catch (err) {
    console.warn("Failed to fetch reference frames from firestore, using fallback empty array:", err);
  }
  return referenceFrames;
}

export async function saveReferenceFrame(userId: string, frame: ReferenceFrameAsset) {
  const path = `reference_frames/${userId}_${frame.id}`;
  try {
    const docRef = doc(collection(dbInstance, "reference_frames"), `${userId}_${frame.id}`);
    await setDoc(docRef, {
      ...frame,
      userId,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteReferenceFrameDoc(userId: string, frameId: string) {
  const path = `reference_frames/${userId}_${frameId}`;
  try {
    const docRef = doc(collection(dbInstance, "reference_frames"), `${userId}_${frameId}`);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCharacter(userId: string, character: CharacterAsset) {
  const path = `characters/${userId}_${character.id}`;
  try {
    const docRef = doc(collection(dbInstance, "characters"), `${userId}_${character.id}`);
    await setDoc(docRef, {
      ...character,
      userId,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCharacterDoc(userId: string, characterId: string) {
  const path = `characters/${userId}_${characterId}`;
  try {
    const docRef = doc(collection(dbInstance, "characters"), `${userId}_${characterId}`);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveProp(userId: string, prop: PropAsset) {
  const path = `props/${userId}_${prop.id}`;
  try {
    const docRef = doc(collection(dbInstance, "props"), `${userId}_${prop.id}`);
    await setDoc(docRef, {
      ...prop,
      userId,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePropDoc(userId: string, propId: string) {
  const path = `props/${userId}_${propId}`;
  try {
    const docRef = doc(collection(dbInstance, "props"), `${userId}_${propId}`);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveLocation(userId: string, location: LocationAsset) {
  const path = `locations/${userId}_${location.id}`;
  try {
    const docRef = doc(collection(dbInstance, "locations"), `${userId}_${location.id}`);
    await setDoc(docRef, {
      ...location,
      userId,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLocationDoc(userId: string, locationId: string) {
  const path = `locations/${userId}_${locationId}`;
  try {
    const docRef = doc(collection(dbInstance, "locations"), `${userId}_${locationId}`);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

function parseTimestampToSeconds(val: any): number {
  if (!val) return Math.floor(Date.now() / 1000);
  
  if (typeof val === "number") {
    if (val > 99999999999) {
      return Math.floor(val / 1000);
    }
    return Math.floor(val);
  }
  
  if (typeof val === "string") {
    if (/^\d+$/.test(val)) {
      const parsed = parseInt(val, 10);
      if (parsed > 99999999999) {
        return Math.floor(parsed / 1000);
      }
      return parsed;
    }
    const parsedDate = new Date(val);
    if (!isNaN(parsedDate.getTime())) {
      return Math.floor(parsedDate.getTime() / 1000);
    }
  }
  
  return Math.floor(Date.now() / 1000);
}

export async function fetchUserTasks(userId: string) {
  const tasks: VideoTask[] = [];
  let taskSnap;
  try {
    // Query without orderBy to avoid needing a composite index
    const taskQuery = query(
      collection(dbInstance, "tasks"), 
      where("userId", "==", userId)
    );
    taskSnap = await getDocs(taskQuery);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "tasks");
  }
  
  taskSnap.forEach(doc => {
    const data = doc.data();
    tasks.push({
      id: data.id,
      status: data.status,
      created_at: parseTimestampToSeconds(data.created_at),
      model: data.model,
      credits: data.credits,
      failed_reason: data.failed_reason,
      input: data.input,
      sceneTitle: data.sceneTitle || null,
      clipNumber: data.clipNumber || null,
      data: data.data
    });
  });

  // Sort tasks locally on client to prevent any potential composite index failures!
  tasks.sort((a, b) => b.created_at - a.created_at);

  return tasks;
}

export async function saveTaskDoc(userId: string, task: VideoTask) {
  const path = `tasks/${userId}_${task.id}`;
  try {
    const docRef = doc(collection(dbInstance, "tasks"), `${userId}_${task.id}`);
    await setDoc(docRef, {
      ...task,
      userId,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTaskDoc(userId: string, taskId: string) {
  const path = `tasks/${userId}_${taskId}`;
  try {
    const docRef = doc(collection(dbInstance, "tasks"), `${userId}_${taskId}`);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

