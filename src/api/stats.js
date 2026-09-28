import { request } from './client.js';

export async function getPlayerStats(userId) {
  return request(`/api/users/${userId}/stats`, {
    method: 'GET'
  });
}
