    import { HttpStatusCode } from 'shared';

/**
 * Custom error meant to be thrown in the controller layer
 */
export abstract class HTTPClientError extends Error {
  readonly statusCode!: HttpStatusCode;
  readonly name!: string;
  readonly data!: unknown;

  protected constructor(_statusCode: HttpStatusCode, message: Record<string, unknown> | string, data?: unknown) {
    if (message instanceof Object) {
      super(JSON.stringify(message));
    } else {
      super(message);
    }
    this.name = this.constructor.name;
    this.data = data;
        // @ts-ignore
    Error.captureStackTrace(this, this.constructor);
  }
}

export class HTTP400Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.BAD_REQUEST;
  constructor(message: string | Record<string, unknown> = 'Bad Request', data?: unknown) {
    super(HttpStatusCode.BAD_REQUEST, message, data);
  }
}

export class HTTP401Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.UNAUTHORIZED;
  constructor(message: string | Record<string, unknown> = 'Unauthorized', data?: unknown) {
    super(HttpStatusCode.UNAUTHORIZED, message, data);
  }
}

export class HTTP403Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.FORBIDDEN;
  constructor(message: string | Record<string, unknown> = 'Forbidden', data?: unknown) {
    super(HttpStatusCode.FORBIDDEN, message, data);
  }
}

export class HTTP404Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.NOT_FOUND;
  constructor(message: string | Record<string, unknown> = 'Not found', data?: unknown) {
    super(HttpStatusCode.NOT_FOUND, message, data);
  }
}

export class HTTP409Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.CONFLICT;
  constructor(message: string | Record<string, unknown> = 'Conflict', data?: unknown) {
    super(HttpStatusCode.CONFLICT, message, data);
  }
}

export class HTTP422Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.UNPROCESSABLE_ENTITY;
  constructor(message: string | Record<string, unknown> = 'Unprocessable entity', data?: unknown) {
    super(HttpStatusCode.UNPROCESSABLE_ENTITY, message, data);
  }
}

export class HTTP428Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.PRECONDITION_REQUIRED;
  constructor(message: string | Record<string, unknown> = 'Precondition failed', data?: unknown) {
    super(HttpStatusCode.PRECONDITION_REQUIRED, message, data);
  }
}

export class HTTP503Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.SERVICE_UNAVAILABLE;
  constructor(message: string | Record<string, unknown> = 'Service unavailable', data?: unknown) {
    super(HttpStatusCode.SERVICE_UNAVAILABLE, message, data);
  }
}

export class HTTP520Error extends HTTPClientError {
  readonly statusCode = HttpStatusCode.SERVICE_UNAVAILABLE;
  constructor(message: string | Record<string, unknown> = 'Unknown error', data?: unknown) {
    super(HttpStatusCode.UNKNOWN_ERROR, message, data);
  }
}
