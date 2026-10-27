const multer = require("multer");
const config = require("../config");
const HttpError = require("../utils/HttpError");

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Memory storage: nothing is written to disk until the whole order is validated.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxScreenshotBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, "Only JPG, PNG or WEBP images are allowed.", { screenshot: "Only JPG, PNG or WEBP images are allowed." }));
  }
});

module.exports = upload.single("screenshot");
