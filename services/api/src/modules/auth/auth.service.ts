import type { SessionUser } from '@dolcove/shared';

import type { AuthMeResponseData, Session } from './types';

export interface SessionStore {
  getSessionByToken(token: string): Promise<Session | null>;
}

export class PlaceholderSessionStore implements SessionStore {
  async getSessionByToken(token: string): Promise<Session | null> {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      return null;
    }

    const user: SessionUser = {
      userId: `usr_${normalizedToken.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      sessionToken: normalizedToken
    };

    return {
      token: normalizedToken,
      user
    };
  }
}

export class AuthService {
  constructor(private readonly sessionStore: SessionStore = new PlaceholderSessionStore()) {}

  async resolveSession(authorizationHeader?: string): Promise<Session | null> {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return this.sessionStore.getSessionByToken(token);
  }

  buildAuthenticatedIdentity(user: SessionUser): AuthMeResponseData {
    return {
      id: user.userId,
      displayName: 'Dev User',
      email: null,
      avatarUrl: null,
      createdAt: '2026-04-12T00:00:00.000Z'
    };
  }
}
