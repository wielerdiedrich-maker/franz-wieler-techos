function getPublicSiteOrigin() {
  const configured = process.env.PUBLIC_SITE_URL || "https://franztechos-92lju5en.manus.space";
  const url = new URL(configured);
  if (url.protocol !== "https:") throw new Error("PUBLIC_SITE_URL must use HTTPS.");
  return url.origin;
}

export async function sendPasswordRecoveryEmail(input: { to: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Password-recovery email is not configured.");

  const recoveryUrl = `${getPublicSiteOrigin()}/admin/restablecer?token=${encodeURIComponent(input.token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Restablecé tu contraseña de Faro Estructuras",
      html: `<p>Recibimos una solicitud para restablecer la contraseña de acceso a Faro Estructuras.</p><p><a href="${recoveryUrl}">Crear una nueva contraseña</a></p><p>Este enlace vence en 60 minutos y solo puede usarse una vez. Si no solicitaste este cambio, podés ignorar este correo.</p>`,
      text: `Recibimos una solicitud para restablecer la contraseña de Faro Estructuras. Abrí este enlace para crear una nueva contraseña (vence en 60 minutos y solo se puede usar una vez): ${recoveryUrl}`,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Password-recovery email delivery failed with HTTP ${response.status}: ${detail}`);
  }
}
