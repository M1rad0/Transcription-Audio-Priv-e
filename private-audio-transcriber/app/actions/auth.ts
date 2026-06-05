"use server";

import { redirect } from "next/navigation";
import {
  clearSession,
  createSession,
  verifyCredentials,
} from "@/lib/auth";

export type LoginActionState = {
  fields?: {
    username?: string;
  };
  message?: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return {
      fields: { username },
      message: "L’identifiant et le mot de passe sont obligatoires.",
    };
  }

  const result = await verifyCredentials(username, password);

  if (!result.ok) {
    return {
      fields: { username },
      message: result.reason,
    };
  }

  await createSession(result.username);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
