export class ApiError extends Error {
    constructor(message, { status = 0, code = 'unknown_error', details = {} } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
