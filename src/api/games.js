import { request } from './client.js';

export async function startGame(userId, mode = 'standard') {
  return request('/api/games', {
    method: 'POST',
    body: JSON.stringify({ userId, mode })
  });
}

export async function submitRound(gameId, roundNumber, guess) {
  return request(`/api/games/${gameId}/rounds`, {
    method: 'POST',
    body: JSON.stringify({ roundNumber, guess })
  });
}

export async function completeGame(gameId) {
  return request(`/api/games/${gameId}/complete`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
