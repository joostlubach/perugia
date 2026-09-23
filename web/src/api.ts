import {
  HamLine,
  HostRoomView,
  MultiSelectAnswer,
  PlateAnswer,
  PlayerRoomView,
  QuestionInput,
  ReactionKind,
  RoomStatus,
  TraceAnswer,
} from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The session belongs to a room that's gone or was replaced.
export function isStaleSession(error: Error | null): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404);
}

export const api = {
  getQuestions() {
    return request<QuestionInput[]>('/questions');
  },

  getAvatars() {
    return request<string[]>('/avatars');
  },

  createRoom() {
    return request<{ hostToken: string }>('/room', { method: 'POST' });
  },

  // Only answered on localhost.
  getJoinCode() {
    return request<{ joinCode: string }>('/room/join-code');
  },

  joinRoom(joinCode: string, name: string, avatar: string) {
    return request<{ playerId: string; playerToken: string }>('/room/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode, name, avatar }),
    });
  },

  getHostView(token: string) {
    return request<HostRoomView>(`/room/host?token=${encodeURIComponent(token)}`);
  },

  getPlayerView(playerId: string, token: string) {
    return request<PlayerRoomView>(
      `/room/state?playerId=${encodeURIComponent(playerId)}&token=${encodeURIComponent(token)}`,
    );
  },

  startGame(token: string) {
    return request<void>(`/room/start?token=${encodeURIComponent(token)}`, { method: 'POST' });
  },

  // `from` is the status being advanced out of, so a double press only advances once.
  advance(token: string, from: RoomStatus) {
    return request<void>(`/room/advance?token=${encodeURIComponent(token)}&from=${from}`, { method: 'POST' });
  },

  goTo(token: string, index: number) {
    return request<void>(`/room/goto?token=${encodeURIComponent(token)}&index=${index}`, { method: 'POST' });
  },

  finish(token: string) {
    return request<void>(`/room/finish?token=${encodeURIComponent(token)}`, { method: 'POST' });
  },

  react(playerId: string, playerToken: string, kind: ReactionKind) {
    return request<void>('/room/react', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerToken, kind }),
    });
  },

  submitAnswer(
    playerId: string,
    playerToken: string,
    answer: number | string[][] | PlateAnswer | HamLine | MultiSelectAnswer | TraceAnswer,
  ) {
    let payload: object;
    if (Array.isArray(answer)) payload = { order: answer };
    else if (typeof answer !== 'object') payload = { value: answer };
    else if ('p1' in answer) payload = { line: answer };
    else if ('selected' in answer) payload = { multiSelect: answer.selected };
    else if ('strokes' in answer) payload = { strokes: answer.strokes };
    else payload = { plates: answer };
    return request<void>('/room/answer', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerToken, ...payload }),
    });
  },
};
