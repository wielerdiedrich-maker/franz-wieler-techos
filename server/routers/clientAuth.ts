import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  clearClientAdminCookie,
  createClientAdminSession,
  getClientAdminFromRequest,
  setClientAdminCookie,
  validateClientAdminCredentials,
} from "../clientAdminAuth";

export const clientAuthRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const account = await getClientAdminFromRequest(ctx.req);
    return account ? { authenticated: true, email: account.email } : { authenticated: false, email: null };
  }),
  login: publicProcedure
    .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const account = await validateClientAdminCredentials(input.email, input.password);
      if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos." });
      setClientAdminCookie(ctx.req, ctx.res, await createClientAdminSession(account));
      return { authenticated: true, email: account.email } as const;
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearClientAdminCookie(ctx.req, ctx.res);
    return { success: true } as const;
  }),
});
