import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, isStaleSession } from '../api';
import { isLocalHost } from '../localHost';
import { keepAudioUnlocked } from '../audioSequencer';
import { preloadDragSounds } from '../components/DragCanvas';
import { HamLine, MultiSelectAnswer, SketchAnswer, TextAnswer, TextsAnswer, PinAnswer, TraceAnswer } from '../types';
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
import { PlayerFinale } from './player/PlayerFinale';
import { t } from '../texts';

interface Session {
  playerId: string;
  playerToken: string;
}

const STORAGE_KEY = 'perugia_player';
const JOIN_CODE_POLL_MS = 2000;

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

  // Keeps checking, so it picks up a room created (or restarted) after this page opened.
  useEffect(() => {
    if (urlJoinCode || session || !isLocalHost(window.location.hostname)) return;
    const check = () => api.getJoinCode().then(({ joinCode }) => setLocalJoinCode(joinCode), () => setLocalJoinCode(null));
    check();
    const id = setInterval(check, JOIN_CODE_POLL_MS);
    return () => clearInterval(id);
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

  const answer = (value: number | string[][] | SketchAnswer | HamLine | MultiSelectAnswer | TraceAnswer | TextAnswer | TextsAnswer | PinAnswer) => {
    if (!session) return;
    api.submitAnswer(session.playerId, session.playerToken, value).catch(() => {});
  };

  return (
    <>
      <MuteToggle />
      {session && !view ? (
        <div className="page">{t('common.loading')}</div>
      ) : !session || !view ? (
        joinCode ? (
          <PlayerJoin joinCode={joinCode} onJoined={handleJoined} />
        ) : (
          <div className="page">
            <h1 className="title">{t('player.scan.title')}</h1>
            <p className="subtitle">{t('player.scan.subtitle')}</p>
          </div>
        )
      ) : (
        <div className="with-reaction-bar">
          {view.status === 'lobby' && <PlayerLobby view={view} />}
          {view.status === 'intro' && <PlayerIntro view={view} />}
          {view.status === 'question' && <PlayerQuestion view={view} onAnswer={answer} />}
          {view.status === 'reveal' && <PlayerReveal view={view} />}
          {view.status === 'leaderboard' && <PlayerLeaderboard view={view} />}
          {view.status === 'finale' && <PlayerFinale />}
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
