import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isStaleSession } from '../api';
import { usePolling } from '../hooks/usePolling';
import { audio } from '../audio';
import { MuteToggle } from '../components/MuteToggle';
import { ReactionCallouts } from '../components/ReactionCallouts';
import { HostSetup } from './host/HostSetup';
import { HostLobby } from './host/HostLobby';
import { HostIntro } from './host/HostIntro';
import { HostQuestion } from './host/HostQuestion';
import { HostReveal } from './host/HostReveal';
import { HostLeaderboard } from './host/HostLeaderboard';
import { HostFinal } from './host/HostFinal';

interface Session {
  hostToken: string;
}

const STORAGE_KEY = 'perugia_host';
const RESTART_KEY = 'perugia_host_restart';
// The final-lap music announces the start of this many closing questions.
const FINAL_LAP_QUESTIONS = 3;
// Kept well under the lobby tarantella so it stays in the background.
const QUIZ_MUSIC_VOLUME = 0.2;

export function HostPage() {
  const [restarting, setRestarting] = useState(() => sessionStorage.getItem(RESTART_KEY) !== null);
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && !restarting ? JSON.parse(raw) : null;
  });
  const lastStatus = useRef<string | null>(null);

  const fetchView = useCallback(() => {
    if (!session) return Promise.reject(new Error('no session'));
    return api.getHostView(session.hostToken);
  }, [session]);

  const { data: view, error } = usePolling(fetchView, 1200, Boolean(session));

  useEffect(() => {
    if (isStaleSession(error)) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }
  }, [error]);

  useEffect(() => {
    if (!view || view.status === lastStatus.current) return;
    lastStatus.current = view.status;
    if (view.status === 'lobby') audio.loop('background', 0.5);
    else audio.stop('background');
    if (view.status !== 'lobby' && view.status !== 'ended') audio.loop('quizMusic', QUIZ_MUSIC_VOLUME);
    else audio.stop('quizMusic');
    if (view.status === 'intro' && view.currentQuestionIndex === view.totalQuestions - FINAL_LAP_QUESTIONS) {
      audio.play('finalLap');
    }
  }, [view]);

  const handleCreated = (hostToken: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hostToken }));
    setSession({ hostToken });
  };

  useEffect(() => {
    // Checks the flag itself rather than `restarting`, so StrictMode's double
    // effect run doesn't create two rooms.
    if (sessionStorage.getItem(RESTART_KEY) === null) return;
    sessionStorage.removeItem(RESTART_KEY);
    api.createRoom().then(
      ({ hostToken }) => handleCreated(hostToken),
      () => {},
    ).finally(() => setRestarting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cmd+Shift+Escape: reload into a fresh room. The flag tells the reloaded
  // page to create the room.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey || e.key !== 'Escape') return;
      e.preventDefault();
      sessionStorage.setItem(RESTART_KEY, '1');
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const start = () => session && api.startGame(session.hostToken);
  const advance = () => session && view && api.advance(session.hostToken, view.status);

  const onSpace = useRef<() => void>(() => {});
  onSpace.current = () => {
    if (!view) return;
    if (view.status === 'lobby') {
      if (view.playerCount > 0) start();
    } else if (view.status !== 'ended') {
      advance();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      onSpace.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <MuteToggle />
      {restarting || (session && !view) ? (
        <div className="page">Loading...</div>
      ) : !session || !view ? (
        <HostSetup onCreated={handleCreated} />
      ) : (
        <>
          {view.status === 'lobby' && <HostLobby view={view} onStart={start} />}
          {view.status === 'intro' && <HostIntro view={view} onStart={advance} />}
          {view.status === 'question' && <HostQuestion view={view} />}
          {view.status === 'reveal' && <HostReveal view={view} onNext={advance} />}
          {view.status === 'leaderboard' && <HostLeaderboard view={view} onNext={advance} />}
          {view.status === 'ended' && <HostFinal view={view} />}
          <ReactionCallouts reactions={view.reactions ?? []} />
        </>
      )}
    </>
  );
}
