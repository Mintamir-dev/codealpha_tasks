const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const c = require("../controllers/orderController");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { orderRules } = require("../middleware/validators");

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders from this device. Please try again later." }
});

// order matters: limit -> read upload -> validate fields -> controller
router.post("/", orderLimiter, upload, orderRules, validate, c.create);
router.get("/:id", c.track);

module.exports = router;
