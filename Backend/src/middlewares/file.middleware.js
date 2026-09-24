const multer = require("multer");
const { AppError } = require("./error.middleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Enforce PDF MIME type and extension
        const isPdfMime = file.mimetype === "application/pdf";
        const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");

        if (isPdfMime && isPdfExt) {
            return cb(null, true);
        }

        return cb(new AppError("Only PDF resume files are supported. Please upload a valid .pdf file.", 400), false);
    }
});

module.exports = upload;