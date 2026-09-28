import prisma from '../utils/prisma.js';

export function normalizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
}

export function validateUsername(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Username must be a string.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must not exceed 20 characters.' };
  }
  const validChars = /^[a-zA-Z0-9_\-]+$/;
  if (!validChars.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores.' };
  }
  return {
    valid: true,
    username: trimmed,
    normalized: normalizeUsername(trimmed)
  };
}

export async function findOrCreateUser(rawUsername) {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const { username, normalized } = validation;

  // Search by normalized username
  let user = await prisma.user.findUnique({
    where: { username_normalized: normalized }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        username_normalized: normalized
      }
    });
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.created_at
  };
}
