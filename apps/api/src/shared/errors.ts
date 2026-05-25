export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
