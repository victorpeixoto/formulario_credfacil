export interface JWTPayload {
  cpf: string;
  formCode: string;
  iat: number;
  exp: number;
}

export interface RegistrarRequest {
  cpf: string;
  senha: string;
}

export interface LoginRequest {
  cpf: string;
  senha: string;
}
