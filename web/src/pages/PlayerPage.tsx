import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { HamLine, MultiSelectAnswer, PlateAnswer, TraceAnswer } from '../types';
import { usePolling } from '../hooks/usePolling';
import { audio } from '../audio';
import { MuteToggle } from '../components/MuteToggle';
import { ReactionBar } from '../components/ReactionBar';
import { PlayerJoin } from './player/PlayerJoin';
import { PlayerLobby } from './player/PlayerLobby';
import { PlayerQuestion } from './player/PlayerQuestion';
import { PlayerReveal } from './player/PlayerReveal';
import { PlayerLeaderboard } from './player/PlayerLeaderboard';
import { PlayerFinal } from './player/PlayerFinal';

interface Session {
  playerId: string;
  playerToken: string;
}

const STORAGE_KEY = 'perugia_player';

export function PlayerPage() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const lastStatus = useRef<string | null>(null);

  const fetchView = useCallback(() => {
    if (!session) return Promise.reject(new Error('no session'));
    return api.getPlayerView(session.playerId, session.playerToken);
  }, [session]);

  const { data: view, error } = usePolling(fetchView, 1000, Boolean(session));

  useEffect(() => {
    if (error && (error.message.includes('404') || error.message.includes('403'))) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }
  }, [error]);

  useEffect(() => {
    if (!view || view.status === lastStatus.current) return;
    const prev = lastStatus.current;
    lastStatus.current = view.status;
    if (prev === 'question' && view.status === 'reveal' && view.lastResult?.correct) {
      audio.play('correct');
    }
    if (view.status === 'ended') {
      audio.play(view.rank <= 3 ? 'victory' : 'funny');
    }
  }, [view]);

  const handleJoined = (playerId: string, playerToken: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ playerId, playerToken }));
    setSession({ playerId, playerToken });
  };

  const answer = (value: number | string[][] | PlateAnswer | HamLine | MultiSelectAnswer | TraceAnswer) => {
    if (!session) return;
    api.submitAnswer(session.playerId, session.playerToken, value).catch(() => {});
  };

  return (
    <>
      <MuteToggle />
      {!session || !view ? (
        <PlayerJoin onJoined={handleJoined} />
      ) : (
        <div className="with-reaction-bar">
          {view.status === 'lobby' && <PlayerLobby view={view} />}
          {view.status === 'question' && <PlayerQuestion view={view} onAnswer={answer} />}
          {view.status === 'reveal' && <PlayerReveal view={view} />}
          {view.status === 'leaderboard' && <PlayerLeaderboard view={view} />}
          {view.status === 'ended' && <PlayerFinal view={view} />}
          <ReactionBar playerId={session.playerId} playerToken={session.playerToken} />
        </div>
      )}
    </>
  );
}
