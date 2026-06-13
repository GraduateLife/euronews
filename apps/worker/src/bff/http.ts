import type { Context } from "hono";

export async function readJson<T extends object>(c: Context): Promise<Partial<T>> {
  return c.req.json<T>().catch(() => ({}));
}
