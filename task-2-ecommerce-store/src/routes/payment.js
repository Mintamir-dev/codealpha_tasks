const router = require("express").Router();
const config = require("../config");

router.get("/", (req, res) => res.json(config.payment));

module.exports = router;
