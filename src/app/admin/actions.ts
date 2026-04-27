"use server";

import { cookies } from "next/headers";

export async function loginAdmin(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { success: false, error: "ADMIN_PASSWORD non configurata in Vercel" };
  }

  if (password === adminPassword) {
    cookies().set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    return { success: true };
  }

  return { success: false, error: "Password errata" };
}

export async function logoutAdmin() {
  cookies().delete("admin_session");
}
