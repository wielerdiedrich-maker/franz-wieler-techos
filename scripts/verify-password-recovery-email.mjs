// Explicit delivery check: sends a single genuine recovery email to the configured client account and never prints the token.
import { createClientPasswordResetToken } from "../server/clientAdminAuth.ts";
import { sendPasswordRecoveryEmail } from "../server/passwordRecoveryEmail.ts";

const email = process.env.CLIENT_ADMIN_EMAIL;
if (!email) throw new Error("CLIENT_ADMIN_EMAIL is not configured.");

const reset = await createClientPasswordResetToken(email);
if (!reset) throw new Error("A recent recovery request already exists. Wait one minute before running the delivery check again.");
await sendPasswordRecoveryEmail({ to: reset.account.email, token: reset.token });
console.log("Password-recovery email accepted for delivery by Resend.");
