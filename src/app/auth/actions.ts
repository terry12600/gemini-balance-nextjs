"use server";

import { getSettings, updateSettings } from "@/lib/settings";
import logger from "@/lib/logger";
import * as bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.SESSION_SECRET || "your-fallback-secret-key";
if (secretKey === "your-fallback-secret-key") {
    logger.warn("SESSION_SECRET is not set, using fallback secret key.");
}
const key = new TextEncoder().encode(secretKey);

import type { JWTPayload } from "jose";

interface SessionPayload extends JWTPayload {
  user?: { username: string };
  expires?: Date;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function setInitialPassword(password: string) {
    const settings = await getSettings();
    if (settings.ADMIN_PASSWORD_HASH) {
        return { error: "Password has already been set." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await updateSettings({ ADMIN_PASSWORD_HASH: hashedPassword });

    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
    const session = await encrypt({ user: { username: "admin" }, expires });

    const cookieStore = await cookies();
    cookieStore.set("session", session, { expires, httpOnly: true });

    return { success: true };
}

export async function login(password: string) {
    const settings = await getSettings();
    const hashedPassword = settings.ADMIN_PASSWORD_HASH;

    if (!hashedPassword) {
        return { error: "Initial password has not been set." };
    }

    const isValid = await bcrypt.compare(password, hashedPassword);
    if (!isValid) {
        return { error: "Invalid password." };
    }

    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
    const session = await encrypt({ user: { username: "admin" }, expires });

    const cookieStore = await cookies();
    cookieStore.set("session", session, { expires, httpOnly: true });
    return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", { expires: new Date(0) });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  if (!parsed) {
    return;
  }

  const expires = new Date(Date.now() + 3600 * 1000);
  parsed.expires = expires;
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: expires,
  });
  return res;
}
