import {
  getAuth,
  signInWithCredential,
  signOut,
  onAuthStateChanged as rnfbOnAuthStateChanged,
  GoogleAuthProvider,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = '190522733985-r50fan5ba955qv2ab1n0oqrgv7kak7ba.apps.googleusercontent.com';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success') {
    const cancelError: Error & { code?: string } = new Error('Sign-in cancelled');
    cancelError.code = 'SIGN_IN_CANCELLED';
    throw cancelError;
  }
  const idToken = result.data.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an idToken — check webClientId configuration');
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(getAuth(), credential);
}

export async function signOutGoogle(): Promise<void> {
  ensureConfigured();
  try {
    await signOut(getAuth());
  } catch {
    // No-op: Firebase signOut can fail when no user is signed in.
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // No-op: GoogleSignin.signOut throws if not currently signed in via Google.
  }
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return getAuth().currentUser;
}

export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return rnfbOnAuthStateChanged(getAuth(), callback);
}
