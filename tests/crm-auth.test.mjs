import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribeCrmAuth} from '../src/lib/crmAuth.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
const session = id => ({user:{id}});

function harness(loadProfile = async user => user) {
  let listener, locked = false, resolveSession;
  const users = [], recoveries = [], errors = [];
  let ready = 0, unsubscribed = false;
  const cleanup = subscribeCrmAuth({
    auth: {
      onAuthStateChange: callback => {
        listener = callback;
        return {data:{subscription:{unsubscribe: () => {unsubscribed = true;}}}};
      },
      getSession: () => new Promise(resolve => {resolveSession = resolve;})
    },
    loadProfile: user => {
      assert.equal(locked, false, 'profile queries must run outside the auth lock');
      return loadProfile(user);
    },
    isRecovery: () => false,
    onUser: user => users.push(user),
    onRecovery: value => recoveries.push(value),
    onReady: () => {++ready;},
    onError: error => errors.push(error)
  });
  return {
    users, recoveries, errors, cleanup,
    get ready() {return ready;},
    get unsubscribed() {return unsubscribed;},
    restore: value => resolveSession(value),
    emit: (event, value) => {
      locked = true;
      try {assert.equal(listener(event, value), undefined, 'auth callback must be synchronous');}
      finally {locked = false;}
    }
  };
}

test('initial session and token refresh release auth lock before querying profile', async () => {
  const h = harness();
  h.emit('INITIAL_SESSION', session('a'));
  assert.deepEqual(h.users, []);
  h.restore({data:{session:session('old')}});
  await tick();
  assert.deepEqual(h.users, [{id:'a'}]);
  assert.equal(h.ready, 1);
  h.emit('TOKEN_REFRESHED', session('a'));
  await tick();
  assert.equal(h.users.length, 2);
  h.cleanup();
});

test('sign out discards an in-flight profile result', async () => {
  let resolveProfile;
  const h = harness(() => new Promise(resolve => {resolveProfile = resolve;}));
  h.emit('SIGNED_IN', session('a'));
  await tick();
  h.emit('SIGNED_OUT', null);
  await tick();
  resolveProfile({id:'a'});
  await tick();
  assert.deepEqual(h.users, [null]);
  assert.equal(h.ready, 1);
  h.cleanup();
});

test('password recovery does not query the profile and cleanup cancels queued work', async () => {
  const h = harness(() => {throw new Error('unexpected query');});
  h.emit('PASSWORD_RECOVERY', session('a'));
  await tick();
  assert.deepEqual(h.recoveries, [session('a')]);
  assert.deepEqual(h.users, [null]);
  assert.equal(h.ready, 1);
  h.emit('SIGNED_IN', session('a'));
  h.cleanup();
  await tick();
  assert.equal(h.unsubscribed, true);
  assert.equal(h.users.length, 1);
  assert.deepEqual(h.errors, []);
});

test('session restoration without auth events and profile failures finish loading', async () => {
  const h = harness(async () => {throw new Error('profile unavailable');});
  h.restore({data:{session:session('a')}});
  await tick();
  assert.equal(h.ready, 1);
  assert.equal(h.errors.length, 1);
  h.cleanup();
});
