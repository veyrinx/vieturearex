import { createClient } from "@supabase/supabase-js";

const [, , emailArg, passwordArg, roleArg = "admin"] = process.argv;

if (!emailArg || !passwordArg) {
  console.error("Usage: node --env-file=.env.local scripts/ensure-supabase-admin.mjs <email> <password> [super_admin|admin|manager|support|user]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase service role environment.");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg.trim();
const VALID_ROLES = ["super_admin", "admin", "manager", "support", "user"];
const role = VALID_ROLES.includes(roleArg) ? roleArg : "admin";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getExistingUserByEmail(targetEmail) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (found) {
      return found;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

const existingUser = await getExistingUserByEmail(email);

let authUserId;

if (existingUser) {
  const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    app_metadata: {
      ...(existingUser.app_metadata ?? {}),
      role,
    },
  });

  if (error) {
    throw error;
  }

  authUserId = data.user.id;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role,
    },
  });

  if (error) {
    throw error;
  }

  authUserId = data.user.id;
}

const { error: profileError } = await supabase.from("users").upsert(
  {
    id: authUserId,
    email,
    role,
  },
  {
    onConflict: "id",
  },
);

if (profileError) {
  throw profileError;
}

const { error: settingError } = await supabase.from("settings").upsert(
  {
    key: "social.email",
    value: email,
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "key",
  },
);

if (settingError) {
  throw settingError;
}

console.log(`ENSURED_SUPABASE_${role.toUpperCase()} ${email}`);
