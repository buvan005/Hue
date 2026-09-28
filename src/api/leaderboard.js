import { request } from './client.js';

export async function getLeaderboard({ page = 1, limit = 50, period = 'all' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    period
  });
  return request(`/api/leaderboard?${params.toString()}`, {
    method: 'GET'
  });
}
