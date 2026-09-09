import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, ChatMessage, Announcement, AppConfig } from '../types';
import { INITIAL_RESIDENTS, INITIAL_ANNOUNCEMENTS, INITIAL_MESSAGES } from '../data/seedData';
import { DEFAULT_APP_CONFIG, sanitizeAppConfig } from '../utils/appConfig';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: Initialize Firestore with the provisioned database ID
let firestoreDb: Firestore;
try {
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (err) {
  console.warn('Could not initialize named Firestore database, falling back to default:', err);
  firestoreDb = getFirestore(app);
}
export const db: Firestore = firestoreDb;

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Strip undefined values because Firestore does not allow undefined
function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
      return false;
    }
    return true;
  }
}

// ======================== RESIDENTS ========================
const RESIDENTS_COLLECTION = 'residents';

export function subscribeResidents(
  onUpdate: (residents: User[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, RESIDENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const residents: User[] = [];
      snapshot.forEach((docSnap) => {
        residents.push({ id: docSnap.id, ...(docSnap.data() as Omit<User, 'id'>) });
      });
      onUpdate(residents);
    },
    (error) => {
      console.warn('Firestore residents subscription note:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchResidentsFromFirestore(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, RESIDENTS_COLLECTION));
    const residents: User[] = [];
    snap.forEach((docSnap) => {
      residents.push({ id: docSnap.id, ...(docSnap.data() as Omit<User, 'id'>) });
    });
    return residents;
  } catch (error) {
    console.warn('Failed to fetch residents directly from Firestore:', error);
    return [];
  }
}

export async function saveResidentToFirestore(user: User): Promise<void> {
  const path = `${RESIDENTS_COLLECTION}/${user.id}`;
  try {
    const cleaned = cleanForFirestore(user);
    await setDoc(doc(db, RESIDENTS_COLLECTION, user.id), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteResidentFromFirestore(userId: string): Promise<void> {
  const path = `${RESIDENTS_COLLECTION}/${userId}`;
  try {
    await deleteDoc(doc(db, RESIDENTS_COLLECTION, userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ======================== MESSAGES ========================
const MESSAGES_COLLECTION = 'messages';

export function subscribeMessages(
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, MESSAGES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChatMessage, 'id'>) });
      });
      // Sort client-side so no document is ever skipped due to indexing
      messages.sort(
        (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );
      onUpdate(messages);
    },
    (error) => {
      console.warn('Firestore messages subscription note:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchMessagesFromFirestore(): Promise<ChatMessage[]> {
  try {
    const snap = await getDocs(collection(db, MESSAGES_COLLECTION));
    const messages: ChatMessage[] = [];
    snap.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChatMessage, 'id'>) });
    });
    messages.sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
    return messages;
  } catch (error) {
    console.warn('Failed to fetch messages directly from Firestore:', error);
    return [];
  }
}

export async function saveMessageToFirestore(message: ChatMessage): Promise<void> {
  const path = `${MESSAGES_COLLECTION}/${message.id}`;
  try {
    const cleaned = cleanForFirestore(message);
    await setDoc(doc(db, MESSAGES_COLLECTION, message.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMessageReactionsInFirestore(
  messageId: string,
  reactions: Record<string, string[]>
): Promise<void> {
  const path = `${MESSAGES_COLLECTION}/${messageId}`;
  try {
    await setDoc(doc(db, MESSAGES_COLLECTION, messageId), { reactions: cleanForFirestore(reactions) }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateMessageInFirestore(
  messageId: string,
  content: string,
  editedAt: string
): Promise<void> {
  const path = `${MESSAGES_COLLECTION}/${messageId}`;
  try {
    await setDoc(
      doc(db, MESSAGES_COLLECTION, messageId),
      { content, editedAt },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMessageFromFirestore(messageId: string): Promise<void> {
  const path = `${MESSAGES_COLLECTION}/${messageId}`;
  try {
    await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ======================== ANNOUNCEMENTS ========================
const ANNOUNCEMENTS_COLLECTION = 'announcements';

export function subscribeAnnouncements(
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, ANNOUNCEMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const announcements: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        announcements.push({ id: docSnap.id, ...(docSnap.data() as Omit<Announcement, 'id'>) });
      });
      // Sort client-side by date descending (newest first)
      announcements.sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
      onUpdate(announcements);
    },
    (error) => {
      console.warn('Firestore announcements subscription note:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchAnnouncementsFromFirestore(): Promise<Announcement[]> {
  try {
    const snap = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION));
    const announcements: Announcement[] = [];
    snap.forEach((docSnap) => {
      announcements.push({ id: docSnap.id, ...(docSnap.data() as Omit<Announcement, 'id'>) });
    });
    announcements.sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
    return announcements;
  } catch (error) {
    console.warn('Failed to fetch announcements directly from Firestore:', error);
    return [];
  }
}

export async function saveAnnouncementToFirestore(announcement: Announcement): Promise<void> {
  const path = `${ANNOUNCEMENTS_COLLECTION}/${announcement.id}`;
  try {
    const cleaned = cleanForFirestore(announcement);
    await setDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcement.id), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnnouncementFromFirestore(announcementId: string): Promise<void> {
  const path = `${ANNOUNCEMENTS_COLLECTION}/${announcementId}`;
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllAnnouncementsFromFirestore(): Promise<void> {
  const path = ANNOUNCEMENTS_COLLECTION;
  try {
    const snap = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION));
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ======================== APP CONFIG ========================
const CONFIG_COLLECTION = 'config';
const MAIN_CONFIG_DOC = 'main';

export function subscribeAppConfig(
  onUpdate: (config: AppConfig) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        onUpdate(sanitizeAppConfig(data));
      }
    },
    (error) => {
      console.warn('Firestore app config subscription note:', error);
      if (onError) onError(error);
    }
  );
}

export async function fetchAppConfigFromFirestore(): Promise<AppConfig | null> {
  try {
    const docSnap = await getDoc(doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC));
    if (docSnap.exists()) {
      return sanitizeAppConfig(docSnap.data() as AppConfig);
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch app config directly from Firestore:', error);
    return null;
  }
}

export async function saveAppConfigToFirestore(config: AppConfig): Promise<void> {
  const path = `${CONFIG_COLLECTION}/${MAIN_CONFIG_DOC}`;
  try {
    const cleaned = cleanForFirestore(sanitizeAppConfig(config));
    await setDoc(doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC), cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ======================== INITIAL SEEDING ========================
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    const seedRef = doc(db, CONFIG_COLLECTION, 'seed_status');
    const seedSnap = await getDoc(seedRef);
    if (seedSnap.exists() && seedSnap.data()?.seeded) {
      // Database has already been initialized previously.
      // Do NOT re-seed deleted announcements, messages, or residents!
      return;
    }

    // Check if the system is already configured or has residents
    const configSnap = await getDoc(doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC));
    const residentsSnap = await getDocs(collection(db, RESIDENTS_COLLECTION));
    if (configSnap.exists() || !residentsSnap.empty) {
      // Database is already initialized and in use by the SNT!
      // Mark seed_status as true so we never re-seed deleted items.
      await setDoc(seedRef, { seeded: true, initializedAt: new Date().toISOString() }, { merge: true });
      return;
    }

    // Brand new database initialization:
    console.log('Seeding initial brand-new Firestore database...');
    for (const resident of INITIAL_RESIDENTS) {
      await setDoc(doc(db, RESIDENTS_COLLECTION, resident.id), cleanForFirestore(resident));
    }
    for (const ann of INITIAL_ANNOUNCEMENTS) {
      await setDoc(doc(db, ANNOUNCEMENTS_COLLECTION, ann.id), cleanForFirestore(ann));
    }
    for (const msg of INITIAL_MESSAGES) {
      await setDoc(doc(db, MESSAGES_COLLECTION, msg.id), cleanForFirestore(msg));
    }
    await setDoc(
      doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC),
      cleanForFirestore(sanitizeAppConfig(DEFAULT_APP_CONFIG))
    );
    await setDoc(seedRef, { seeded: true, initializedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to check or seed Firestore data:', err);
  }
}
