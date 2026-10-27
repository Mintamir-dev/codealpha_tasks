const multer = require("multer");
const config = require("../config");

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE"
      ? `Screenshot is too large. Maximum is ${config.maxScreenshotBytes / 1024 / 1024} MB.`
      : "Invalid file upload.";
    return res.status(400).json({ error: msg, fields: { screenshot: msg } });
  }
  if (err.status) return res.status(err.status).json({ error: err.message, fields: err.fields });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
};
