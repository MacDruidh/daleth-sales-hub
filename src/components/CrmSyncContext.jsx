import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {supabase} from '../lib/supabase';

const CrmSyncContext = createContext(null);
const REQUIRED_DATA = ['companies','contacts','opportunities','activities','notes','contracts','products',
  'dsh-v1-interactions','dsh-v1-opportunity-files','dsh-v1-company-segments','dsh-v1-pipedrive-import-meta',
  'dsh-v1-stages','dsh-v1-stage-history','dsh-v1-loss-reasons','dsh-v1-loss-reason-options',
  'dsh-v1-workspace-items','dsh-v1-workspace-comments'];

export function CrmSyncProvider({children}) {
  const [userId, setUserId] = useState(null);
  const [syncState, setSyncState] = useState({userId:null, statuses:{}});
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const statuses = syncState.userId === userId ? syncState.statuses : {};
  const [loadedUser, setLoadedUser] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (active) setUserId(session?.user?.id || null);
    });
    supabase.auth.getSession().then(({data, error}) => {
      if (active && !receivedEvent && !error) setUserId(data?.session?.user?.id || null);
    }).catch(error => console.warn('Falha ao verificar sessão para sincronização:', error));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const dataReady = REQUIRED_DATA.every(key => statuses[key] === 'ready');
  useEffect(() => {
    if(userId && dataReady) setLoadedUser(userId);
    if(!userId) setLoadedUser(null);
  }, [userId, dataReady]);
  const value = useMemo(() => ({
    userId, retry, statuses, dataReady, hydrated: Boolean(userId && loadedUser === userId),
    report: (key, status) => {
      if(currentUser.current !== userId) return;
      setSyncState(current => {
        const previous = current.userId === userId ? current.statuses : {};
        return previous[key] === status ? current : {userId, statuses:{...previous, [key]:status}};
      });
    },
    retryNow: () => setRetry(current => current + 1)
  }), [userId, retry, statuses, dataReady, loadedUser]);
  return <CrmSyncContext.Provider value={value}>{children}</CrmSyncContext.Provider>;
}

export function useCrmSync() { return useContext(CrmSyncContext); }

export function CrmSyncNotice() {
  const {statuses, retryNow, dataReady} = useCrmSync();
  const failedSave = Object.entries(statuses).some(([key, status]) => key.startsWith('save-') && status === 'error');
  const failedLoad = Object.entries(statuses).some(([key, status]) => !key.startsWith('save-') && status === 'error');
  const failed = failedSave || failedLoad;
  if (!failed && dataReady) return null;
  return <div role={failed ? 'alert' : 'status'} style={{padding:'12px 16px', marginBottom:'16px', borderRadius:'12px', background:failed ? '#fff1f2' : '#eaf6ff', color:failed ? '#9f1239' : '#075985'}}>
    {failedSave ? 'Uma alteração não pôde ser salva no servidor. Salve novamente antes de sair.' : failedLoad ? 'Alguns dados não puderam ser sincronizados. A tela pode estar incompleta ou desatualizada.' : 'Carregando os dados atualizados do CRM...'}
    {failedLoad && <button className="mini" onClick={retryNow} style={{marginLeft:'12px'}}>Tentar novamente</button>}
  </div>;
}
