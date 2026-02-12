import { Exception } from '@adonisjs/core/exceptions'
import { HttpStatusCode } from '@shared'

export default class UnauthorizedException extends Exception {
  constructor(message = 'Unauthorized') {
    super(message, { status: HttpStatusCode.UNAUTHORIZED, code: 'E_UNAUTHORIZED' })
  }
}
