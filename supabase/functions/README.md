# Edge Functions

## create-user

Creates new auth users (admin only). Used by the Add User form.

### Deploy

```bash
supabase functions deploy create-user
```

### Settings (Supabase Dashboard)

1. Go to **Edge Functions** → **create-user** → **Settings**
2. Turn **OFF** "Enforce JWT Verification" (the function validates the user token itself)
3. Save

### Secrets

The function uses `SUPABASE_SERVICE_ROLE_KEY` which is automatically available in deployed functions. No extra setup needed.

---

## delete-user

Deletes user(s) (admin only). **Deletes the auth user first, then the row in `public.users`**, so any trigger on `public.users` that runs on delete won’t cause “Database error deleting user”. Used by the Delete Users page.

- **Body:** `{ user_ids: string[] }` (or `user_id: string` for one).
- Reassign or remove all clients from a user before deleting (otherwise the function returns an error).

### Deploy

```bash
supabase functions deploy delete-user
```

### Settings

Same as create-user: turn **OFF** “Enforce JWT Verification” for **delete-user** in Edge Functions → delete-user → Settings.

### Trigger-safe order

If you have a trigger on `public.users` (e.g. that deletes the auth user when a row is removed), do **not** delete from `public.users` from the client or Table Editor. Use this edge function so that auth is deleted first; then deleting the row won’t make the trigger try to delete an auth user that’s already gone.
