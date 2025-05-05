export class CustomError extends Error {
    statusCode: number;
    message: string;
    details?: Record<string, unknown>;  

    constructor(message: string, statusCode: number = 400, details?: Record<string, unknown>) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}
