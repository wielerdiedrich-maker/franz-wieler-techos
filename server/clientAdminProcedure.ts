import { TRPCError } from "@trpc/server";
import { publicProcedure } from "./_core/trpc";
import { getClientAdminFromRequest } from "./clientAdminAuth";

/** Every content mutation is guarded by the independent client session rather than a Manus account. */
export const clientAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const clientAdmin = await getClientAdminFromRequest(ctx.req);
  if (!clientAdmin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Iniciá sesión para administrar el sitio." });
  return next({ ctx: { ...ctx, clientAdmin } });
});
