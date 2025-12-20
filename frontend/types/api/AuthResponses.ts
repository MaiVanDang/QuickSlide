// DTOs cho Login (Output)

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
}