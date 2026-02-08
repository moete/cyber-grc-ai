import { Roles } from '../../enums';

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Roles;
    organizationId: string;
    organizationName: string;
  };
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role: Roles;
  organizationId: string;
  iat?: number;
  exp?: number;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRefreshTokenResponse {
  token: string;
  refreshToken: string;
}
