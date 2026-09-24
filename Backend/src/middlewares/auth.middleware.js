const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");

async function authUser(req, res, next) {
    try {
        let token = req.cookies ? req.cookies.token : null;

        // Fallback to Authorization: Bearer <token> header
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const isBlacklisted = await tokenBlacklistModel.exists({ token });

        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Token has been invalidated. Please log in again."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.token = token;
        req.user = decoded;

        return next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

module.exports = { authUser };