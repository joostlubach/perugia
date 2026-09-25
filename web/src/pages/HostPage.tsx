import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isStaleSession } from '../api'
import { audio } from '../audio'
import { MuteToggle } from '../components/MuteToggle'
import { ReactionCallouts } from '../components/ReactionCallouts'
import { usePolling } from '../hooks/usePolling'
import { t } from '../texts'
import { HostCategory } from './host/HostCategory'
import { HostFinal } from './host/HostFinal'
import { HostFinale } from './host/HostFinale'
import { HostIntro } from './host/HostIntro'
import { HostJumpBox } from './host/HostJumpBox'
import { HostLeaderboard } from './host/HostLeaderboard'
import { HostLobby } from './host/HostLobby'
import { HostQuestion } from './host/HostQuestion'
import { HostReveal } from './host/HostReveal'
import { HostSetup } from './host/HostSetup'

interface Session {
  hostToken: string;
}

const STORAGE_KEY = 'perugia_host';
const RESTART_KEY = 'perugia_host_restart';
const RUNTHROUGH = 'runthrough';
// The final-lap music announces the start of this many closing questions.
const FINAL_LAP_QUESTIONS = 1;
// Kept well under the lobby tarantella so it stays in the background.
const QUIZ_MUSIC_VOLUME = 0.2;

export function HostPage() {
  const [restarting, setRestarting] = useState(() => sessionStorage.getItem(RESTART_KEY) !== null);
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && !restarting ? JSON.parse(raw) : null;
  });
  const lastStatus = useRef<string | null>(null);
  const [jumping, setJumping] = useState(false);

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
    const previousStatus = lastStatus.current;
    lastStatus.current = view.status;
    if (view.status === 'lobby') audio.loop('background', 1);
    else audio.stop('background');
    const videoSplash = view.status === 'category' && Boolean(view.category?.videoUrl);
    if (view.status !== 'lobby' && view.status !== 'ended' && !videoSplash) {
      audio.loop('quizMusic', QUIZ_MUSIC_VOLUME);
    }
    else audio.stop('quizMusic');
    if (view.status === 'ended') audio.play('standings');
    else audio.stop('standings');
    // On the category splash if the question has one, else on its intro.
    const startsQuestion =
      view.status === 'category' || (view.status === 'intro' && previousStatus !== 'category');
    if (startsQuestion && view.currentQuestionIndex === view.totalQuestions - FINAL_LAP_QUESTIONS) {
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
    const restart = sessionStorage.getItem(RESTART_KEY);
    if (restart === null) return;
    sessionStorage.removeItem(RESTART_KEY);
    api.createRoom(restart === RUNTHROUGH).then(
      ({ hostToken }) => handleCreated(hostToken),
      () => {},
    ).finally(() => setRestarting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reloads into a fresh room; the flag tells the reloaded page to create it.
  const newRoom = (runthrough: boolean) => {
    sessionStorage.setItem(RESTART_KEY, runthrough ? RUNTHROUGH : '1');
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // Cmd+Shift+G opens the Go To box: a question, a new room, the finale or the results.
  const onShortcut = useRef<(e: KeyboardEvent) => void>(() => {});
  onShortcut.current = (e) => {
    if (!e.metaKey || !e.shiftKey) return;
    if (e.code === 'KeyG' && session) {
      e.preventDefault();
      setJumping(true);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onShortcut.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const start = () => session && api.startGame(session.hostToken);
  const advance = () => session && view && api.advance(session.hostToken, view.status);

  const onSpace = useRef<() => void>(() => {});
  onSpace.current = () => {
    if (!view) return;
    if (view.status === 'lobby') {
      if (view.playerCount > 0 || view.runthrough) start();
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
        <div className="page">{t('common.loading')}</div>
      ) : !session || !view ? (
        <HostSetup onCreated={handleCreated} />
      ) : (
        <>
          {view.runthrough && <div className="runthrough-badge">{t('host.runthrough')}</div>}
          {view.status === 'lobby' && <HostLobby view={view} onStart={start} />}
          {view.status === 'category' && <HostCategory view={view} onNext={advance} />}
          {view.status === 'intro' && <HostIntro view={view} onStart={advance} />}
          {view.status === 'question' && <HostQuestion view={view} />}
          {view.status === 'reveal' && (
            <HostReveal
              view={view}
              onNext={advance}
              onGrade={(correctAnswer) => session && api.grade(session.hostToken, correctAnswer)}
              loadAnswer={(playerId) => api.getPlayerAnswer(session!.hostToken, playerId)}
            />
          )}
          {view.status === 'leaderboard' && <HostLeaderboard view={view} onNext={advance} />}
          {view.status === 'finale' && <HostFinale onNext={advance} />}
          {view.status === 'ended' && <HostFinal view={view} />}
          <ReactionCallouts reactions={view.reactions ?? []} />
          {jumping && session && (
            <HostJumpBox
              totalQuestions={view.totalQuestions}
              onJump={(index) => api.goTo(session.hostToken, index)}
              inProgress={view.status !== 'lobby' && view.status !== 'ended'}
              onNewRoom={newRoom}
              onResume={() => api.resume(session.hostToken)}
              onFinale={() => api.finish(session.hostToken)}
              onResults={() => api.finish(session.hostToken, true)}
              onClose={() => setJumping(false)}
            />
          )}
        </>
      )}
    </>
  );
}
