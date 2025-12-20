// DTOs cho Login và Register (Input)

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // Tùy chọn, chủ yếu dùng cho validation frontend
}