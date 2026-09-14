import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-side provisioning helpers that do NOT need the service-role key.
 *
 * New logins are created with the ordinary public (publishable) key through
 * `auth.signUp`, on a throwaway client that never persists a session, so the
 * calling admin's own session is untouched. The `handle_new_user` database
 * trigger turns the signup metadata into the right tenant/profile/role rows.
 */
function publicAuthClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  if (!url || !key) throw new Error("Backend is not configured");

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Create a new login. Returns the new user's id. */
export async function signUpAppUser(input: {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const client = publicAuthClient();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: input.metadata },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Could not create the login");
  // Supabase returns a masked user with no identities when the email is taken.
  if ((data.user.identities ?? []).length === 0) {
    throw new Error("That email address already has a login. Use a different email.");
  }
  return data.user.id;
}

/** Email the user a link to set a new password. */
export async function sendPasswordResetEmail(email: string, redirectTo?: string) {
  const client = publicAuthClient();
  const { error } = await client.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  );
  if (error) throw new Error(error.message);
}

/**
 * Optional privileged client. Present on Lovable Cloud, usually absent on
 * self-hosted deployments — callers must handle `null`.
 */
export async function optionalAdminClient() {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}
