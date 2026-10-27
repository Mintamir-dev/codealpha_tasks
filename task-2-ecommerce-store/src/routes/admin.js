const router = require("express").Router();
const c = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");
const validate = require("../middleware/validate");
const { statusRules } = require("../middleware/validators");

router.use(adminAuth);
router.get("/orders", c.list);
router.get("/orders/:id/screenshot", c.screenshot);
router.patch("/orders/:id", statusRules, validate, c.review);

module.exports = router;
