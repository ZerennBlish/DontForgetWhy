import {
  getFirestore,
  doc,
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

const USERS_COLLECTION = 'users';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  lastSignIn: FirebaseFirestoreTypes.Timestamp;
}

function isTimestamp(value: unknown): value is FirebaseFirestoreTypes.Timestamp {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { seconds?: unknown; nanoseconds?: unknown };
  return typeof v.seconds === 'number' && typeof v.nanoseconds === 'number';
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.uid === 'string' &&
    typeof v.email === 'string' &&
    (v.displayName === null || typeof v.displayName === 'string') &&
    (v.photoURL === null || typeof v.photoURL === 'string') &&
    isTimestamp(v.createdAt) &&
    isTimestamp(v.lastSignIn)
  );
}

export function firestoreTimestamp(): FirebaseFirestoreTypes.Timestamp {
  return Timestamp.now();
}

export async function createOrUpdateUserProfile(
  user: FirebaseAuthTypes.User,
): Promise<void> {
  const docRef = doc(collection(getFirestore(), USERS_COLLECTION), user.uid);
  const snap = await getDoc(docRef);
  const now = firestoreTimestamp();

  const payload: Record<string, unknown> = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    lastSignIn: now,
  };
  if (!snap.exists()) {
    payload.createdAt = now;
  }

  await setDoc(docRef, payload, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(collection(getFirestore(), USERS_COLLECTION), uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!isUserProfile(data)) return null;
  return data;
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(collection(getFirestore(), USERS_COLLECTION), uid));
}
