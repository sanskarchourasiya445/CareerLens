class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
}

function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "An unexpected error occurred";

    // Handle Multer upload errors
    if (err.name === "MulterError") {
        statusCode = 400;
        if (err.code === "LIMIT_FILE_SIZE") {
            message = "File size exceeds the 5MB limit";
        } else {
            message = `File upload error: ${err.message}`;
        }
    }

    // Handle Mongoose cast errors (e.g. invalid ObjectId)
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid format for field '${err.path}'`;
    }

    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid authentication token";
    } else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Authentication token has expired";
    }

    // In production, mask non-operational 500 internal errors
    if (statusCode === 500 && process.env.NODE_ENV === "production" && !err.isOperational) {
        message = "Internal server error";
    }

    if (process.env.NODE_ENV !== "test" && statusCode === 500) {
        console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    }

    return res.status(statusCode).json({
        success: false,
        message
    });
}

module.exports = {
    AppError,
    notFoundHandler,
    errorHandler
};
