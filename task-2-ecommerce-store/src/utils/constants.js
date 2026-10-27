module.exports = {
  STATUS: {
    PENDING: "Pending verification",
    PAID: "Payment confirmed",
    REJECTED: "Payment rejected"
  },
  // Ethiopian mobile numbers: 09xxxxxxxx, 07xxxxxxxx, +2519xxxxxxxx, 2519xxxxxxxx
  PHONE_REGEX: /^(?:\+251|251|0)?[79]\d{8}$/
};
