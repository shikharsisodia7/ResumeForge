export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication required") {
    super(401, message, "unauthorized");
  }
}

/**
 * Used both for "not found" and "found but not owned by the caller" —
 * returning the same response for both prevents resource-existence enumeration.
 */
export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, message, "not_found");
  }
}

export class ValidationError extends HttpError {
  constructor(
    message = "Invalid request",
    public readonly issues?: unknown,
  ) {
    super(400, message, "validation_error");
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(409, message, "conflict");
  }
}

export class RateLimitError extends HttpError {
  constructor(message = "Too many requests, please slow down") {
    super(429, message, "rate_limited");
  }
}

export class AiOutputError extends HttpError {
  constructor(message = "The AI response could not be validated") {
    super(502, message, "ai_output_invalid");
  }
}
