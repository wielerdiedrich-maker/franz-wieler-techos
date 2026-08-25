import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  clearClientAdminCookie,
  createClientPasswordResetToken,
  createClientAdminSession,
  getClientAdminFromRequest,
  resetClientAdminPassword,
  setClientAdminCookie,
  validateClientAdminCredentials,
} from "../clientAdminAuth";
import { sendPasswordRecoveryEmail } from "../passwordRecoveryEmail";

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
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ input }) => {
      const reset = await createClientPasswordResetToken(input.email);
      if (reset) {
        try {
          await sendPasswordRecoveryEmail({ to: reset.account.email, token: reset.token });
        } catch (error) {
          console.error("[Client password reset] Email delivery failed", error);
        }
      }
      // Always return the same response to avoid revealing whether this email has portal access.
      return { accepted: true } as const;
    }),
  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(40).max(200), password: z.string().min(12).max(256) }))
    .mutation(async ({ input }) => {
      const reset = await resetClientAdminPassword(input.token, input.password);
      if (!reset) throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace no es válido o ya venció. Solicitá uno nuevo." });
      return { success: true } as const;
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearClientAdminCookie(ctx.req, ctx.res);
    return { success: true } as const;
  }),
});
