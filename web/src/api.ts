import {
  HamLine,
  HostPlayerAnswer,
  HostRoomView,
  MultiSelectAnswer,
  PinAnswer,
  TextsAnswer,
  PlayerRoomView,
  QuestionInput,
  ReactionKind,
  RoomStatus,
  SketchAnswer,
  TextAnswer,
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
  // POSTs that return nothing still come back 201, with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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

  createRoom(runthrough = false) {
    return request<{ hostToken: string }>(`/room${runthrough ? '?runthrough=1' : ''}`, { method: 'POST' });
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

  getPlayerAnswer(token: string, playerId: string) {
    return request<HostPlayerAnswer>(
      `/room/answer?token=${encodeURIComponent(token)}&playerId=${encodeURIComponent(playerId)}`,
    );
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

  grade(token: string, correctAnswer: string) {
    return request<void>(`/room/grade?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ correctAnswer }),
    });
  },

  // Back to the first question nobody has answered yet.
  resume(token: string) {
    return request<void>(`/room/resume?token=${encodeURIComponent(token)}`, { method: 'POST' });
  },

  // To the finale, or with `results` past it to the final results.
  finish(token: string, results = false) {
    return request<void>(`/room/finish?token=${encodeURIComponent(token)}${results ? '&results=1' : ''}`, {
      method: 'POST',
    });
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
    answer: number | string[][] | SketchAnswer | HamLine | MultiSelectAnswer | TraceAnswer | TextAnswer | TextsAnswer | PinAnswer,
  ) {
    let payload: object;
    if (Array.isArray(answer)) payload = { order: answer };
    else if (typeof answer !== 'object') payload = { value: answer };
    else if ('p1' in answer) payload = { line: answer };
    else if ('selected' in answer) payload = { multiSelect: answer.selected };
    else if ('strokes' in answer) payload = { strokes: answer.strokes };
    else if ('text' in answer) payload = { text: answer.text };
    else if ('texts' in answer) payload = { texts: answer.texts };
    else if ('pin' in answer) payload = { pin: answer.pin };
    else payload = { placements: answer.placements };
    return request<void>('/room/answer', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerToken, ...payload }),
    });
  },
};
