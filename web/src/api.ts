import { HostRoomView, PlayerRoomView, QuestionInput } from './types';

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

  createRoom(questions?: QuestionInput[]) {
    return request<{ code: string; hostToken: string }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(questions ? { questions } : {}),
    });
  },

  joinRoom(code: string, name: string) {
    return request<{ playerId: string; playerToken: string }>(`/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  getHostView(code: string, token: string) {
    return request<HostRoomView>(`/rooms/${code}/host?token=${encodeURIComponent(token)}`);
  },

  getPlayerView(code: string, playerId: string, token: string) {
    return request<PlayerRoomView>(
      `/rooms/${code}/state?playerId=${encodeURIComponent(playerId)}&token=${encodeURIComponent(token)}`,
    );
  },

  startGame(code: string, token: string) {
    return request<void>(`/rooms/${code}/start?token=${encodeURIComponent(token)}`, { method: 'POST' });
  },

  advance(code: string, token: string) {
    return request<void>(`/rooms/${code}/advance?token=${encodeURIComponent(token)}`, { method: 'POST' });
  },

  submitAnswer(code: string, playerId: string, playerToken: string, value: number) {
    return request<void>(`/rooms/${code}/answer`, {
      method: 'POST',
      body: JSON.stringify({ playerId, playerToken, value }),
    });
  },
};
