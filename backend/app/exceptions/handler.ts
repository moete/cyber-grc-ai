import app from '@adonisjs/core/services/app';
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http';
import { HttpStatusCode, IApiErrorResponse } from '@shared';

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction;

  /**
   * Handle errors and return a consistent JSON response matching IApiErrorResponse.
   *
   * Catches:
   *   - VineJS validation errors (422)
   *   - Custom errors with status codes
   *   - Generic unhandled errors (500)
   */
  async handle(error: any, ctx: HttpContext) {
    const status = error.status ?? error.statusCode ?? HttpStatusCode.INTERNAL_SERVER_ERROR;

    // VineJS validation errors have a `messages` array
    if (error.messages && Array.isArray(error.messages)) {
      const fieldErrors: Record<string, string[]> = {};
      for (const msg of error.messages) {
        const field = msg.field ?? 'unknown';
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(msg.message ?? 'Validation failed');
      }

      return ctx.response.status(HttpStatusCode.UNPROCESSABLE_ENTITY).send(<IApiErrorResponse>{
        success: false,
        message: 'Validation failed',
        errors: fieldErrors,
        statusCode: HttpStatusCode.UNPROCESSABLE_ENTITY
      });
    }

    // Structured error response for all other errors
    return ctx.response.status(status).send(<IApiErrorResponse>{
      success: false,
      message: error.message || 'Internal server error',
      statusCode: status,
      ...(this.debug && status === HttpStatusCode.INTERNAL_SERVER_ERROR ? { stack: error.stack } : {})
    });
  }

  /**
   * Report error to the logging service.
   * Only log 500s in production (not validation/auth errors).
   */
  async report(error: any, ctx: HttpContext) {
    const status = error.status ?? error.statusCode ?? 500;
    if (status >= 500) {
      return super.report(error, ctx);
    }
  }
}
