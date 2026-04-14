jest.mock('@react-native-firebase/auth', () => {
  let currentUserValue: unknown = null;
  const authInstance = {
    get currentUser() {
      return currentUserValue;
    },
  };
  return {
    __esModule: true,
    __setCurrentUser: (u: unknown) => {
      currentUserValue = u;
    },
    getAuth: jest.fn(() => authInstance),
    signInWithCredential: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    GoogleAuthProvider: {
      credential: jest.fn(),
    },
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasPlayServices: jest.fn(),
  },
}));

jest.mock('../src/services/firestore', () => ({
  __esModule: true,
  createOrUpdateUserProfile: jest.fn(() => Promise.resolve()),
}));

import { createOrUpdateUserProfile } from '../src/services/firestore';
const createOrUpdateUserProfileMock = createOrUpdateUserProfile as jest.Mock;

import * as rnfbAuth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getCurrentUser,
  signInWithGoogle,
  signOutGoogle,
  onAuthStateChanged,
} from '../src/services/firebaseAuth';

const authMock = rnfbAuth as unknown as {
  __setCurrentUser: (u: unknown) => void;
  getAuth: jest.Mock;
  signInWithCredential: jest.Mock;
  signOut: jest.Mock;
  onAuthStateChanged: jest.Mock;
  GoogleAuthProvider: { credential: jest.Mock };
};

const gsiMock = GoogleSignin as unknown as {
  configure: jest.Mock;
  signIn: jest.Mock;
  signOut: jest.Mock;
  hasPlayServices: jest.Mock;
};

const sampleUser = {
  uid: 'abc123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

const successfulSignInResponse = {
  type: 'success' as const,
  data: {
    user: {
      id: 'g-id',
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      familyName: null,
      givenName: null,
    },
    scopes: [],
    idToken: 'mock-id-token',
    serverAuthCode: null,
  },
};

beforeEach(() => {
  authMock.__setCurrentUser(null);
  authMock.signInWithCredential.mockReset().mockResolvedValue({
    user: sampleUser,
    additionalUserInfo: null,
  });
  authMock.signOut.mockReset().mockResolvedValue(undefined);
  authMock.onAuthStateChanged.mockReset().mockImplementation(() => () => {});
  authMock.GoogleAuthProvider.credential
    .mockReset()
    .mockImplementation((idToken: string) => ({ providerId: 'google.com', idToken }));

  gsiMock.configure.mockReset();
  gsiMock.signIn.mockReset().mockResolvedValue(successfulSignInResponse);
  gsiMock.signOut.mockReset().mockResolvedValue(null);
  gsiMock.hasPlayServices.mockReset().mockResolvedValue(true);

  createOrUpdateUserProfileMock.mockReset().mockResolvedValue(undefined);
});

describe('getCurrentUser', () => {
  it('returns null when not signed in', () => {
    authMock.__setCurrentUser(null);
    expect(getCurrentUser()).toBeNull();
  });

  it('returns user object when signed in', () => {
    authMock.__setCurrentUser(sampleUser);
    expect(getCurrentUser()).toEqual(sampleUser);
  });
});

describe('signInWithGoogle', () => {
  it('calls GoogleSignin.signIn and auth().signInWithCredential', async () => {
    const result = await signInWithGoogle();
    expect(gsiMock.hasPlayServices).toHaveBeenCalled();
    expect(gsiMock.signIn).toHaveBeenCalled();
    expect(authMock.GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-id-token');
    expect(authMock.signInWithCredential).toHaveBeenCalled();
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws SIGN_IN_CANCELLED when user cancels', async () => {
    gsiMock.signIn.mockResolvedValueOnce({ type: 'cancelled' });
    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: 'SIGN_IN_CANCELLED',
    });
    expect(authMock.signInWithCredential).not.toHaveBeenCalled();
  });

  it('fires createOrUpdateUserProfile after successful sign-in', async () => {
    await signInWithGoogle();
    expect(createOrUpdateUserProfileMock).toHaveBeenCalledTimes(1);
    expect(createOrUpdateUserProfileMock).toHaveBeenCalledWith(sampleUser);
  });

  it('still resolves sign-in even if profile write rejects', async () => {
    createOrUpdateUserProfileMock.mockRejectedValueOnce(new Error('firestore down'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(signInWithGoogle()).resolves.toBeDefined();
    await new Promise((r) => setImmediate(r));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('throws when idToken is missing from the response', async () => {
    gsiMock.signIn.mockResolvedValueOnce({
      ...successfulSignInResponse,
      data: { ...successfulSignInResponse.data, idToken: null },
    });
    await expect(signInWithGoogle()).rejects.toThrow(/idToken/i);
    expect(authMock.signInWithCredential).not.toHaveBeenCalled();
  });
});

describe('signOutGoogle', () => {
  it('calls both auth().signOut and GoogleSignin.signOut', async () => {
    await signOutGoogle();
    expect(authMock.signOut).toHaveBeenCalled();
    expect(gsiMock.signOut).toHaveBeenCalled();
  });

  it('resolves even if Firebase signOut throws', async () => {
    authMock.signOut.mockRejectedValueOnce(new Error('no user'));
    await expect(signOutGoogle()).resolves.toBeUndefined();
    expect(gsiMock.signOut).toHaveBeenCalled();
  });

  it('resolves even if GoogleSignin.signOut throws', async () => {
    gsiMock.signOut.mockRejectedValueOnce(new Error('not signed in'));
    await expect(signOutGoogle()).resolves.toBeUndefined();
    expect(authMock.signOut).toHaveBeenCalled();
  });
});

describe('onAuthStateChanged', () => {
  it('subscribes and returns unsubscribe function', () => {
    const unsubscribeFn = jest.fn();
    authMock.onAuthStateChanged.mockImplementationOnce(() => unsubscribeFn);
    const callback = jest.fn();
    const unsub = onAuthStateChanged(callback);
    expect(authMock.onAuthStateChanged).toHaveBeenCalled();
    const args = authMock.onAuthStateChanged.mock.calls[0];
    expect(args[1]).toBe(callback);
    expect(typeof unsub).toBe('function');
    unsub();
    expect(unsubscribeFn).toHaveBeenCalled();
  });
});
