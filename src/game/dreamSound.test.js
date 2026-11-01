import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDreamSound } from './dreamSound.js';

test('closing the dream sound while AudioContext.resume is pending does not leak a rejected promise', async () => {
  const previousWindow = globalThis.window;
  const unhandled = [];
  class PendingAudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    createOscillator() {
      return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
    }
    resume() {
      return new Promise((resolve, reject) => queueMicrotask(() => {
        if (this.state === 'closed') reject(new DOMException('AudioContext closed before resume', 'InvalidStateError'));
        else { this.state = 'running'; resolve(); }
      }));
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const onUnhandled = (reason) => unhandled.push(reason);
  globalThis.window = { AudioContext: PendingAudioContext };
  process.on('unhandledRejection', onUnhandled);
  try {
    const sound = createDreamSound();
    sound.fx('splash');
    sound.dispose();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
