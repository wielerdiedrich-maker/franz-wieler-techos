// Diagnostic only: validates deployed client authentication without printing credentials or session values.
const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;

if (!email || !password) throw new Error("Configured client credentials are unavailable to the diagnostic.");

const loginResponse = await fetch(`${origin}/api/trpc/clientAuth.login?batch=1`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ "0": { json: { email, password } } }),
});
const loginBody = await loginResponse.text();
if (!loginResponse.ok || loginBody.includes('"error"')) {
  throw new Error(`Deployed login was rejected with HTTP ${loginResponse.status}.`);
}

const setCookies = typeof loginResponse.headers.getSetCookie === "function"
  ? loginResponse.headers.getSetCookie()
  : [loginResponse.headers.get("set-cookie") || ""];
const sessionCookie = setCookies.find(cookie => cookie.startsWith("client_admin_session="))?.split(";")[0];
if (!sessionCookie) throw new Error("Deployed login did not issue a client session cookie.");

const meResponse = await fetch(`${origin}/api/trpc/clientAuth.me?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`, {
  headers: { cookie: sessionCookie },
});
const meBody = await meResponse.text();
if (!meResponse.ok || !meBody.includes('"authenticated":true')) {
  throw new Error(`Deployed protected-session check failed with HTTP ${meResponse.status}.`);
}

console.log("Deployed client login and protected session: passed.");
