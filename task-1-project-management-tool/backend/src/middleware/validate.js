'use strict';

/**
 * validate({ params, query, body }) parses each part with a zod schema and replaces it
 * with the cleaned result (trimmed, coerced, defaults applied, unknown keys removed).
 * A failed parse becomes a ZodError, which the error handler turns into HTTP 400.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const part of ['params', 'query', 'body']) {
        if (schemas[part]) req[part] = schemas[part].parse(req[part] === undefined ? {} : req[part]);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
