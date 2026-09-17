export function createSyncGuard() {
  let revision = 0;
  let pending = 0;
  return {
    markChanged: () => { revision += 1; },
    beginWrite: () => { revision += 1; pending += 1; },
    endWrite: () => { pending = Math.max(0, pending - 1); revision += 1; },
    isWriting: () => pending > 0,
    snapshot: () => revision,
    isCurrent: snapshot => revision === snapshot && pending === 0
  };
}
