export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface Slide { id: number; pageIndex: number; }
export interface Placeholder {
  id?: number; slideId: number; type: string;
  x: number; y: number; width: number; height: number; zIndex: number;
  properties: string; label?: string; key?: string;
}