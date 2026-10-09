import { timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";

type ServiceAuthEnv = {
  Bindings: {
    HONO_SERVICE_TOKEN?: string;
  };
};

export function hasServiceAuthorization(authorization: string | undefined, serviceToken: string) {
  if (!authorization || !serviceToken) return false;

  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${serviceToken}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Apply to each internal route group. A browser-accessible route must never use this token. */
export const requireServiceAuth = createMiddleware<ServiceAuthEnv>(async (c, next) => {
  const serviceToken = c.env?.HONO_SERVICE_TOKEN ?? process.env.HONO_SERVICE_TOKEN;
  if (!serviceToken) {
    return c.json({ message: "Internal service is not configured" }, 503);
  }

  if (!hasServiceAuthorization(c.req.header("Authorization"), serviceToken)) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  await next();
});
