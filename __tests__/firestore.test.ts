type SetCall = { payload: Record<string, unknown>; options: unknown };

const docState = {
  exists: false,
  data: undefined as Record<string, unknown> | undefined,
  setCalls: [] as SetCall[],
  deleteCalls: 0,
};

const docRefMock = {
  get: jest.fn(async () => ({
    exists: () => docState.exists,
    data: () => docState.data,
  })),
  set: jest.fn(async (payload: Record<string, unknown>, options: unknown) => {
    docState.setCalls.push({ payload, options });
  }),
  delete: jest.fn(async () => {
    docState.deleteCalls += 1;
  }),
};

const collectionMock = {
  doc: jest.fn(() => docRefMock),
};

const firestoreInstance = {
  collection: jest.fn(() => collectionMock),
};

const firestoreFn = jest.fn(() => firestoreInstance) as jest.Mock & {
  Timestamp: { now: jest.Mock };
};
firestoreFn.Timestamp = {
  now: jest.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
};

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: firestoreFn,
}));

import {
  createOrUpdateUserProfile,
  getUserProfile,
  deleteUserProfile,
  firestoreTimestamp,
  type UserProfile,
} from '../src/services/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

const sampleAuthUser = {
  uid: 'user-abc',
  email: 'jane@example.com',
  displayName: 'Jane Doe',
  photoURL: 'https://example.com/jane.png',
} as unknown as FirebaseAuthTypes.User;

beforeEach(() => {
  docState.exists = false;
  docState.data = undefined;
  docState.setCalls = [];
  docState.deleteCalls = 0;
  docRefMock.get.mockClear();
  docRefMock.set.mockClear();
  docRefMock.delete.mockClear();
  collectionMock.doc.mockClear();
  firestoreInstance.collection.mockClear();
  firestoreFn.mockClear();
  firestoreFn.Timestamp.now.mockClear();
});

describe('firestoreTimestamp', () => {
  it('returns a Timestamp from firestore.Timestamp.now()', () => {
    const ts = firestoreTimestamp();
    expect(firestoreFn.Timestamp.now).toHaveBeenCalled();
    expect(ts).toEqual({ seconds: 1700000000, nanoseconds: 0 });
  });
});

describe('createOrUpdateUserProfile', () => {
  it('writes to users/{uid} with merge:true and includes createdAt + lastSignIn on first write', async () => {
    docState.exists = false;
    await createOrUpdateUserProfile(sampleAuthUser);

    expect(firestoreInstance.collection).toHaveBeenCalledWith('users');
    expect(collectionMock.doc).toHaveBeenCalledWith('user-abc');
    expect(docState.setCalls).toHaveLength(1);

    const { payload, options } = docState.setCalls[0];
    expect(options).toEqual({ merge: true });
    expect(payload).toMatchObject({
      uid: 'user-abc',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: 'https://example.com/jane.png',
    });
    expect(payload.createdAt).toEqual({ seconds: 1700000000, nanoseconds: 0 });
    expect(payload.lastSignIn).toEqual({ seconds: 1700000000, nanoseconds: 0 });
  });

  it('omits createdAt on subsequent writes when doc already exists', async () => {
    docState.exists = true;
    await createOrUpdateUserProfile(sampleAuthUser);

    expect(docState.setCalls).toHaveLength(1);
    const { payload, options } = docState.setCalls[0];
    expect(options).toEqual({ merge: true });
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload.lastSignIn).toEqual({ seconds: 1700000000, nanoseconds: 0 });
    expect(payload).toMatchObject({
      uid: 'user-abc',
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: 'https://example.com/jane.png',
    });
  });

  it('coerces null email/displayName/photoURL safely', async () => {
    docState.exists = false;
    await createOrUpdateUserProfile({
      uid: 'user-min',
      email: null,
      displayName: null,
      photoURL: null,
    } as unknown as FirebaseAuthTypes.User);

    const { payload } = docState.setCalls[0];
    expect(payload.email).toBe('');
    expect(payload.displayName).toBeNull();
    expect(payload.photoURL).toBeNull();
  });
});

describe('getUserProfile', () => {
  const validProfile: UserProfile = {
    uid: 'user-abc',
    email: 'jane@example.com',
    displayName: 'Jane Doe',
    photoURL: null,
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as UserProfile['createdAt'],
    lastSignIn: { seconds: 1700000000, nanoseconds: 0 } as UserProfile['lastSignIn'],
  };

  it('returns null when doc does not exist', async () => {
    docState.exists = false;
    docState.data = undefined;
    const result = await getUserProfile('user-abc');
    expect(result).toBeNull();
    expect(collectionMock.doc).toHaveBeenCalledWith('user-abc');
  });

  it('returns typed UserProfile when doc exists with valid shape', async () => {
    docState.exists = true;
    docState.data = validProfile as unknown as Record<string, unknown>;
    const result = await getUserProfile('user-abc');
    expect(result).toEqual(validProfile);
  });

  it('returns null when doc exists but has malformed data', async () => {
    docState.exists = true;
    docState.data = { uid: 'user-abc', email: 42 } as unknown as Record<string, unknown>;
    const result = await getUserProfile('user-abc');
    expect(result).toBeNull();
  });

  it('returns null when timestamps are missing', async () => {
    docState.exists = true;
    docState.data = {
      uid: 'user-abc',
      email: 'jane@example.com',
      displayName: null,
      photoURL: null,
    };
    const result = await getUserProfile('user-abc');
    expect(result).toBeNull();
  });
});

describe('deleteUserProfile', () => {
  it('calls delete() on users/{uid}', async () => {
    await deleteUserProfile('user-abc');
    expect(firestoreInstance.collection).toHaveBeenCalledWith('users');
    expect(collectionMock.doc).toHaveBeenCalledWith('user-abc');
    expect(docState.deleteCalls).toBe(1);
  });
});
