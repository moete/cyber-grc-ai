/**
 * Thin wrappers that build the standard API envelope.
 * Keep controllers free of `{ success: true, data: ... }` boilerplate.
 */

import { HttpStatusCode, type IApiResponse } from '@shared';
import type { Response } from '@adonisjs/core/http';

export function ok<T>(response: Response, data: T, message?: string) {
  return response.status(HttpStatusCode.OK).send(<IApiResponse<T>>{
    success: true,
    data,
    ...(message ? { message } : {})
  });
}

export function created<T>(response: Response, data: T) {
  return response.status(HttpStatusCode.CREATED).send(<IApiResponse<T>>{
    success: true,
    data
  });
}

export function deleted(response: Response, message = 'Resource deleted successfully') {
  return response.status(HttpStatusCode.OK).send(<IApiResponse<null>>{
    success: true,
    data: null,
    message
  });
}
