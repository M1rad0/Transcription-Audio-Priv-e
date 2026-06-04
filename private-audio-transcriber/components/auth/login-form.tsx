"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="grid gap-5">
      <TextField
        autoComplete="username"
        defaultValue={state.fields?.username}
        id="username"
        label="Identifiant"
        name="username"
        placeholder=""
        required
      />

      <TextField
        autoComplete="current-password"
        id="password"
        label="Mot de passe"
        name="password"
        placeholder=""
        required
        type="password"
      />

      <div className="space-y-3">
        {state.message ? (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {state.message}
          </p>
        ) : null}

        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Connexion..." : "Se connecter"}
        </Button>
      </div>
    </form>
  );
}
