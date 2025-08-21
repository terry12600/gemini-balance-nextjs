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

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
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

    cookies().set("session", session, { expires, httpOnly: true });

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

    cookies().set("session", session, { expires, httpOnly: true });
    return { success: true };
}

export async function logout() {
  cookies().set("session", "", { expires: new Date(0) });
}

export async function getSession() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 3600 * 1000); // 1 hour
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}
