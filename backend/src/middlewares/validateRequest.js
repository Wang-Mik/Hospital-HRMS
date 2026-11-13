/**
 * Enterprise Request Validation Middleware using Zod
 * Pre-compiled schemas validate and sanitize req.params, req.query, and req.body.
 * Provides a Dual Error Contract: backwards-compatible 'message' string for existing tests
 * and structured 'errors' array for modern frontend forms.
 *
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
export function validateRequest(schemas) {
  return async (req, res, next) => {
    try {
      const errors = [];

      // 1. Validate route params (:id, :staff_id, etc.)
      if (schemas.params) {
        const result = await schemas.params.safeParseAsync(req.params);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: issue.path.length > 0 ? issue.path.join('.') : 'params',
              message: issue.message
            });
          });
        } else {
          req.params = result.data;
        }
      }

      // 2. Validate query parameters (?page=1&limit=20)
      if (schemas.query) {
        const result = await schemas.query.safeParseAsync(req.query);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: issue.path.length > 0 ? issue.path.join('.') : 'query',
              message: issue.message
            });
          });
        } else {
          req.query = result.data;
        }
      }

      // 3. Validate request payload body
      if (schemas.body) {
        const result = await schemas.body.safeParseAsync(req.body);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            errors.push({
              field: issue.path.length > 0 ? issue.path.join('.') : 'body',
              message: issue.message
            });
          });
        } else {
          req.body = result.data;
        }
      }

      // If any validation issues occurred, halt and respond with HTTP 400 Bad Request
      if (errors.length > 0) {
        const firstError = errors[0];

        // Format legacy-compatible primary message
        let primaryMessage = firstError.message;
        const missingFields = errors
          .filter((e) => e.message.toLowerCase().includes('mandatory') || e.message.toLowerCase().includes('required'))
          .map((e) => e.field);

        if (missingFields.length > 0) {
          primaryMessage = `Missing required fields: ${missingFields.join(', ')} are mandatory.`;
        }

        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: primaryMessage,
          errors
        });
      }

      return next();
    } catch (err) {
      console.error('[validateRequest Middleware Internal Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Internal server error during input request validation.'
      });
    }
  };
}

export default validateRequest;
