require("dotenv").config();
const path = require("path");

module.exports = {
  port: process.env.PORT || 3000,
  adminKey: process.env.ADMIN_KEY || "",
  ordersFile: path.join(__dirname, "..", "data", "orders.json"),
  uploadDir: path.join(__dirname, "..", "uploads"),
  maxScreenshotBytes: 5 * 1024 * 1024,
  payment: {
    bankName: process.env.BANK_NAME || "Commercial Bank of Ethiopia (CBE)",
    accountName: process.env.ACCOUNT_NAME || "Your Full Name",
    accountNumber: process.env.ACCOUNT_NUMBER || "1000000000000",
    telebirr: process.env.TELEBIRR_NUMBER || "0911000000"
  }
};
