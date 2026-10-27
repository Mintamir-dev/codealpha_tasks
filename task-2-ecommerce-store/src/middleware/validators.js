const { body, param } = require("express-validator");
const { PHONE_REGEX, STATUS } = require("../utils/constants");

exports.orderRules = [
  body("name").trim()
    .isLength({ min: 2, max: 60 }).withMessage("Name must be 2 to 60 characters.")
    .matches(/^[\p{L}\s.'-]+$/u).withMessage("Name can only contain letters, spaces, . ' and -."),
  body("phone").trim()
    .matches(PHONE_REGEX).withMessage("Enter a valid Ethiopian phone number, like 0911223344."),
  body("address").trim()
    .isLength({ min: 5, max: 200 }).withMessage("Address must be 5 to 200 characters."),
  body("reference").optional({ values: "falsy" }).trim()
    .matches(/^[A-Za-z0-9-]{4,30}$/).withMessage("Transaction reference must be 4 to 30 letters or numbers."),
  body("items").custom(value => {
    let items;
    try { items = JSON.parse(value); } catch { throw new Error("Cart data is invalid."); }
    if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error("Your cart is empty.");
    for (const i of items) {
      if (!Number.isInteger(i.id) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20)
        throw new Error("Each item needs a valid product and a quantity from 1 to 20.");
    }
    return true;
  }),
  // No screenshot = no order.
  body("screenshot").custom((_, { req }) => {
    if (!req.file) throw new Error("Upload a screenshot of your payment. You cannot order without paying.");
    return true;
  })
];

exports.statusRules = [
  param("id").matches(/^ORD-\d+$/).withMessage("Invalid order id."),
  body("status").isIn([STATUS.PAID, STATUS.REJECTED]).withMessage("Status must be Payment confirmed or Payment rejected.")
];
