import { request } from './client.js';

export async function createUser(username) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify({ username })
  });
}
