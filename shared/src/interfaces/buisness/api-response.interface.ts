export interface IApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface IApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
