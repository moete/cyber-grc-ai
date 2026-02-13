import { Exception } from '@adonisjs/core/exceptions';
import { HttpStatusCode } from '@shared';

export default class ForbiddenException extends Exception {
  constructor(message = 'Forbidden') {
    super(message, { status: HttpStatusCode.FORBIDDEN, code: 'E_FORBIDDEN' });
  }
}
