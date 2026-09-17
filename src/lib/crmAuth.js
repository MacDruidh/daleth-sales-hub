export function subscribeCrmAuth({auth, loadProfile, isRecovery, onUser, onRecovery, onReady, onError}) {
  let active = true;
  let revision = 0;
  let receivedEvent = false;
  let pending;

  async function applySession(event, session, expectedRevision) {
    const isCurrent = () => active && revision === expectedRevision;
    if (!isCurrent()) return;
    try {
      if (session?.user && (event === 'PASSWORD_RECOVERY' || isRecovery())) {
        onRecovery(session);
        onUser(null);
      } else if (session?.user) {
        const profile = await loadProfile(session.user);
        if (isCurrent()) onUser(profile);
      } else {
        onUser(null);
      }
    } catch (error) {
      if (isCurrent()) onError(error);
    } finally {
      if (isCurrent()) onReady();
    }
  }

  const {data} = auth.onAuthStateChange((event, session) => {
    receivedEvent = true;
    const expectedRevision = ++revision;
    clearTimeout(pending);
    // Supabase holds its auth lock during callbacks. Query profiles only after it returns.
    pending = setTimeout(() => { void applySession(event, session, expectedRevision); }, 0);
  });

  auth.getSession().then(({data, error}) => {
    if (!active || receivedEvent) return;
    if (error) {
      onError(error);
      onReady();
      return;
    }
    void applySession('INITIAL_SESSION', data?.session, revision);
  }).catch(error => {
    if (active && !receivedEvent) {
      onError(error);
      onReady();
    }
  });

  return () => {
    active = false;
    ++revision;
    clearTimeout(pending);
    data?.subscription?.unsubscribe?.();
  };
}
