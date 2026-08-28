export class ValidationError extends Error {
    constructor(field: string, message: string) {
        super(`Validation error: ${field} - ${message}`);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends Error {
    constructor(resource: string, id: string) {
        super(`Not found: ${resource} "${id}"`);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class ExecutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExecutionError';
    }
}
