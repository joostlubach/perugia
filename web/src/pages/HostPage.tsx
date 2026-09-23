import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { usePolling } from '../hooks/usePolling';
import { audio } from '../audio';
import { MuteToggle } from '../components/MuteToggle';
import { ReactionCallouts } from '../components/ReactionCallouts';
import { HostSetup } from './host/HostSetup';
import { HostLobby } from './host/HostLobby';
import { HostQuestion } from './host/HostQuestion';
import { HostReveal } from './host/HostReveal';
import { HostLeaderboard } from './host/HostLeaderboard';
import { HostFinal } from './host/HostFinal';

interface Session {
  hostToken: string;
}

const STORAGE_KEY = 'perugia_host';

export function HostPage() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const lastStatus = useRef<string | null>(null);

  const fetchView = useCallback(() => {
    if (!session) return Promise.reject(new Error('no session'));
    return api.getHostView(session.hostToken);
  }, [session]);

  const { data: view, error } = usePolling(fetchView, 1200, Boolean(session));

  useEffect(() => {
    if (error && (error.message.includes('404') || error.message.includes('403'))) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }
  }, [error]);

  useEffect(() => {
    if (!view || view.status === lastStatus.current) return;
    lastStatus.current = view.status;
    if (view.status === 'lobby') audio.loopBackground();
    else audio.stopBackground();
    if (view.status === 'reveal') audio.play('reveal');
    if (view.status === 'ended') audio.play('victory');
  }, [view]);

  const handleCreated = (hostToken: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hostToken }));
    setSession({ hostToken });
  };

  const start = () => session && api.startGame(session.hostToken);
  const advance = () => session && api.advance(session.hostToken);

  return (
    <>
      <MuteToggle />
      {!session || !view ? (
        <HostSetup onCreated={handleCreated} />
      ) : (
        <>
          {view.status === 'lobby' && <HostLobby view={view} onStart={start} />}
          {view.status === 'question' && <HostQuestion view={view} onExpire={advance} />}
          {view.status === 'reveal' && <HostReveal view={view} onNext={advance} />}
          {view.status === 'leaderboard' && <HostLeaderboard view={view} onNext={advance} />}
          {view.status === 'ended' && <HostFinal view={view} />}
          <ReactionCallouts reactions={view.reactions ?? []} />
        </>
      )}
    </>
  );
}
