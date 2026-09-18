export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  defaultProvider: 'groq' | 'gemini' | 'ollama';
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  autoSaveContext: boolean;
  enableAgentTrace: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
}

export interface UserProfileUpdateRequest {
  name?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}
