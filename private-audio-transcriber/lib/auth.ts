import { compare } from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE_NAME = "pat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  exp: number;
  iat: number;
  username: string;
};

type AuthConfigStatus = {
  isConfigured: boolean;
  missing: string[];
  username: string | null;
  passwordHash: string | null;
  secret: string | null;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function getSecretBuffer(secret: string) {
  return Buffer.from(secret, "utf8");
}

export function getAuthConfigStatus(): AuthConfigStatus {
  const username = process.env.AUTH_USERNAME ?? null;
  const passwordHash = process.env.AUTH_PASSWORD_HASH ?? null;
  const secret = process.env.SESSION_SECRET ?? null;

  const missing = [
    !username ? "AUTH_USERNAME" : null,
    !passwordHash ? "AUTH_PASSWORD_HASH" : null,
    !secret ? "SESSION_SECRET" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    isConfigured: missing.length === 0,
    missing,
    passwordHash,
    secret,
    username,
  };
}

function signPayload(payload: SessionPayload, secret: string) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const encodedSignature = createHmac("sha256", getSecretBuffer(secret))
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${encodedSignature}`;
}

function verifySignedPayload(
  token: string,
  secret: string,
): SessionPayload | null {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSecretBuffer(secret))
    .update(encodedPayload)
    .digest("base64url");

  const left = Buffer.from(encodedSignature, "utf8");
  const right = Buffer.from(expectedSignature, "utf8");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload),
    ) as SessionPayload;

    if (!payload.username || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(username: string) {
  const config = getAuthConfigStatus();

  if (!config.secret) {
    throw new Error("SESSION_SECRET is missing.");
  }

  const now = Math.floor(Date.now() / 1000);
  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    signPayload(
      {
        exp: now + SESSION_TTL_SECONDS,
        iat: now,
        username,
      },
      config.secret,
    ),
    getCookieOptions(),
  );
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

export async function getSession() {
  const config = getAuthConfigStatus();

  if (!config.secret) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  return verifySignedPayload(sessionCookie, config.secret);
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function verifyCredentials(username: string, password: string) {
  const config = getAuthConfigStatus();

  if (!config.isConfigured || !config.username || !config.passwordHash) {
    return {
      ok: false as const,
      reason: `L’authentification n’est pas configurée. Variables manquantes : ${config.missing.join(", ")}`,
    };
  }

  if (username !== config.username) {
    return {
      ok: false as const,
      reason: "Identifiant ou mot de passe invalide.",
    };
  }

  const isValid = await compare(password, config.passwordHash);

  if (!isValid) {
    return {
      ok: false as const,
      reason: "Identifiant ou mot de passe invalide.",
    };
  }

  return {
    ok: true as const,
    username: config.username,
  };
}
