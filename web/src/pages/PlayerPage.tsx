import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, isStaleSession } from '../api';
import { isLocalHost } from '../localHost';
import { keepAudioUnlocked } from '../audioSequencer';
import { preloadDragSounds } from '../components/DragCanvas';
import { HamLine, MultiSelectAnswer, PlateAnswer, TraceAnswer } from '../types';
import { usePolling } from '../hooks/usePolling';
import { audio } from '../audio';
import { MuteToggle } from '../components/MuteToggle';
import { ReactionBar } from '../components/ReactionBar';
import { PlayerJoin } from './player/PlayerJoin';
import { PlayerLobby } from './player/PlayerLobby';
import { PlayerIntro } from './player/PlayerIntro';
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
  const { joinCode: urlJoinCode } = useParams();
  const [localJoinCode, setLocalJoinCode] = useState<string | null>(null);
  const joinCode = urlJoinCode ?? localJoinCode;
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
    keepAudioUnlocked();
    preloadDragSounds();
  }, []);

  useEffect(() => {
    if (urlJoinCode || session || !isLocalHost(window.location.hostname)) return;
    api.getJoinCode().then(({ joinCode }) => setLocalJoinCode(joinCode), () => {});
  }, [urlJoinCode, session]);

  useEffect(() => {
    if (isStaleSession(error)) {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    }
  }, [error]);

  useEffect(() => {
    if (!view || view.status === lastStatus.current) return;
    lastStatus.current = view.status;
    if (view.status === 'ended' && view.rank !== 1) audio.play('died');
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
      {session && !view ? (
        <div className="page">Loading...</div>
      ) : !session || !view ? (
        joinCode ? (
          <PlayerJoin joinCode={joinCode} onJoined={handleJoined} />
        ) : (
          <div className="page">
            <h1 className="title">Scan to join 📷</h1>
            <p className="subtitle">Scan the QR code on the big screen to join the quiz.</p>
          </div>
        )
      ) : (
        <div className="with-reaction-bar">
          {view.status === 'lobby' && <PlayerLobby view={view} />}
          {view.status === 'intro' && <PlayerIntro view={view} />}
          {view.status === 'question' && <PlayerQuestion view={view} onAnswer={answer} />}
          {view.status === 'reveal' && <PlayerReveal view={view} />}
          {view.status === 'leaderboard' && <PlayerLeaderboard view={view} />}
          {view.status === 'ended' && <PlayerFinal view={view} />}
          <ReactionBar
            playerId={session.playerId}
            playerToken={session.playerToken}
            phase={view.status === 'lobby' ? 'lobby' : view.status === 'ended' ? 'final' : 'game'}
          />
        </div>
      )}
    </>
  );
}
