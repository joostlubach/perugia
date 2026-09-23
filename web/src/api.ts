import {
  HamLine,
  HostRoomView,
  MultiSelectAnswer,
  PlateAnswer,
  PlayerRoomView,
  QuestionInput,
  ReactionKind,
  TraceAnswer,
} from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getQuestions() {
    return request<QuestionInput[]>('/questions');
  },

  getAvatars() {
    return request<string[]>('/avatars');
  },

  createRoom(questions?: QuestionInput[]) {
    return request<{ hostToken: string }>('/room', {
      method: 'POST',
      body: JSON.stringify(questions ? { questions } : {}),
    });
  },

  joinRoom(name: string, avatar: string) {
    return request<{ playerId: string; playerToken: string }>('/room/join', {
      method: 'POST',
      body: JSON.stringify({ name, avatar }),
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

  advance(token: string) {
    return request<void>(`/room/advance?token=${encodeURIComponent(token)}`, { method: 'POST' });
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
