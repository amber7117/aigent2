// Global error handling utilities

export interface AppError extends Error {
    code: string;
    statusCode: number;
    details?: any;
}

export class ValidationError extends Error implements AppError {
    code = 'VALIDATION_ERROR';
    statusCode = 400;

    constructor(message: string, public details?: any) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error implements AppError {
    code = 'AUTHENTICATION_ERROR';
    statusCode = 401;

    constructor(message: string = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error implements AppError {
    code = 'AUTHORIZATION_ERROR';
    statusCode = 403;

    constructor(message: string = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends Error implements AppError {
    code = 'NOT_FOUND_ERROR';
    statusCode = 404;

    constructor(resource: string = 'Resource') {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
    }
}

export class RateLimitError extends Error implements AppError {
    code = 'RATE_LIMIT_ERROR';
    statusCode = 429;

    constructor(message: string = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}

export class ExternalServiceError extends Error implements AppError {
    code = 'EXTERNAL_SERVICE_ERROR';
    statusCode = 502;

    constructor(service: string, message?: string) {
        super(message || `External service error: ${service}`);
        this.name = 'ExternalServiceError';
    }
}

export class DatabaseError extends Error implements AppError {
    code = 'DATABASE_ERROR';
    statusCode = 500;

    constructor(message: string = 'Database operation failed') {
        super(message);
        this.name = 'DatabaseError';
    }
}

// Error response formatter
export function formatErrorResponse(error: Error | AppError) {
    const appError = error as AppError;

    return {
        success: false,
        error: {
            code: appError.code || 'UNKNOWN_ERROR',
            message: error.message,
            details: appError.details,
            timestamp: new Date().toISOString()
        }
    };
}

// Error handler middleware for API routes
export function withErrorHandler(handler: Function) {
    return async (request: Request, ...args: any[]) => {
        try {
            return await handler(request, ...args);
        } catch (error) {
            console.error('API Error:', error);

            const appError = error as AppError;
            const statusCode = appError.statusCode || 500;
            const errorResponse = formatErrorResponse(error as Error);

            return new Response(JSON.stringify(errorResponse), {
                status: statusCode,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    };
}

// Validation utilities
export function validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
        throw new ValidationError(`${fieldName} is required`);
    }
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
    validateRequired(value, fieldName);

    const num = Number(value);
    if (isNaN(num)) {
        throw new ValidationError(`${fieldName} must be a valid number`);
    }

    if (min !== undefined && num < min) {
        throw new ValidationError(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
        throw new ValidationError(`${fieldName} must be at most ${max}`);
    }
}

export function validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): void {
    validateRequired(value, fieldName);

    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }

    if (minLength !== undefined && value.length < minLength) {
        throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
    }

    if (maxLength !== undefined && value.length > maxLength) {
        throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
    }
}

export function validateEmail(value: string, fieldName: string = 'Email'): void {
    validateString(value, fieldName);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        throw new ValidationError(`${fieldName} must be a valid email address`);
    }
}

export function validateEnum(value: any, validValues: any[], fieldName: string): void {
    validateRequired(value, fieldName);

    if (!validValues.includes(value)) {
        throw new ValidationError(`${fieldName} must be one of: ${validValues.join(', ')}`);
    }
}

// Async operation with timeout
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
}

// Retry mechanism for failed operations
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                break;
            }

            console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms:`, error);

            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
        }
    }

    throw lastError!;
}

// Safe JSON parsing with error handling
export function safeJsonParse<T>(jsonString: string, defaultValue?: T): T {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new ValidationError('Invalid JSON format');
    }
}

// Error boundary for React components
export class ErrorBoundaryState {
    hasError: boolean = false;
    error: Error | null = null;

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        };
    }
}

// Logging utilities
export function logError(error: Error, context?: string) {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? ` [${context}]` : '';

    console.error(`[${timestamp}]${contextInfo} Error:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
    });
}

export function logWarning(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? ` [${context}]` : '';

    console.warn(`[${timestamp}]${contextInfo} Warning:`, message);
}

export function logInfo(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? ` [${context}]` : '';

    console.info(`[${timestamp}]${contextInfo} Info:`, message);
}
