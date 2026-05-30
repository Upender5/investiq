import { storage } from './storage';
import { AuthTokens, User } from '../types';

export const auth = {
  async getAccessToken(): Promise<string | null> {
    return storage.get(storage.keys.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return storage.get(storage.keys.REFRESH_TOKEN);
  },

  async saveTokens(tokens: AuthTokens): Promise<void> {
    await storage.set(storage.keys.ACCESS_TOKEN, tokens.accessToken);
    await storage.set(storage.keys.REFRESH_TOKEN, tokens.refreshToken);
  },

  async saveUser(user: User): Promise<void> {
    await storage.set(storage.keys.USER, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const raw = await storage.get(storage.keys.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async isLoggedIn(): Promise<boolean> {
    const token = await auth.getAccessToken();
    return token !== null;
  },

  async logout(): Promise<void> {
    await storage.clear();
  },
};
