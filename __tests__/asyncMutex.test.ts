import { withLock } from '../src/utils/asyncMutex';

describe('withLock', () => {
  it('serializes operations on the same key', async () => {
    const order: number[] = [];

    const op1 = withLock('test', async () => {
      await new Promise(r => setTimeout(r, 50));
      order.push(1);
    });

    const op2 = withLock('test', async () => {
      order.push(2);
    });

    await Promise.all([op1, op2]);
    expect(order).toEqual([1, 2]);
  });

  it('allows concurrent operations on different keys', async () => {
    const order: string[] = [];

    const op1 = withLock('a', async () => {
      await new Promise(r => setTimeout(r, 50));
      order.push('a');
    });

    const op2 = withLock('b', async () => {
      order.push('b');
    });

    await Promise.all([op1, op2]);
    expect(order).toEqual(['b', 'a']);
  });

  it('returns the function result', async () => {
    const result = await withLock('key', async () => 42);
    expect(result).toBe(42);
  });

  it('propagates errors without blocking subsequent operations', async () => {
    await expect(
      withLock('err', async () => { throw new Error('fail'); })
    ).rejects.toThrow('fail');

    const result = await withLock('err', async () => 'ok');
    expect(result).toBe('ok');
  });
});
