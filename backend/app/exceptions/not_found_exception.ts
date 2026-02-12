import { Exception } from '@adonisjs/core/exceptions'
import { HttpStatusCode } from '@shared'

export default class NotFoundException extends Exception {
  constructor(message = 'Resource not found') {
    super(message, { status: HttpStatusCode.NOT_FOUND, code: 'E_NOT_FOUND' })
  }
}
