
## Root Cause Analysis

There are **two distinct issues** to fix:

### Issue 1: Build Error — "no package.json found" / "no command found for task dev"

**What's happening:** The project code was pushed into a subdirectory `nutrivison-8c4e855e-main/` instead of the repository root. Lovable's dev server expects `package.json` at the root, so it can't find the app to run.

The build error message says to add a `lovable.toml` with a `[run]` section, and that file doesn't exist yet.

**Fix:** Create a `lovable.toml` at the project root that points the dev command into the correct subdirectory.

```text
[run]
dev = "cd nutrivison-8c4e855e-main && bun run dev --host"
```

---

### Issue 2: Auth Flow — Race Condition in `onAuthStateChange`

**What's happening:** In both `Auth.tsx` and `Dashboard.tsx`, there is a critical anti-pattern:

In `Auth.tsx` (line 64), the `onAuthStateChange` callback is `async` and `await`s a Supabase database query (`user_profiles`) **inside** the callback:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    const { data: profile } = await supabase   // ← DEADLOCK RISK
      .from("user_profiles")
      .select("onboarding_completed")
      ...
```

Per the stack overflow pattern provided, **awaiting Supabase API calls inside `onAuthStateChange` can cause deadlocks or block processing of subsequent auth events.** This is especially dangerous during sign-in because the auth system itself may be waiting for the callback to finish before it marks the session as established.

**Additionally**, in `Dashboard.tsx` (line 28), the `getSession()` handler does an `await` for the profile query inline — and the component renders `null` (line 81: `if (!user || !profile) return null`) while auth is restoring from `localStorage`. This causes a flash-to-blank followed by a redirect race.

**The specific auth log shows:** Login is completing successfully (HTTP 200 returned), but the client-side callback is doing async work that can block or race with subsequent events.

---

## Fix Plan

### 1. Create `lovable.toml` at project root

Point the dev server at the correct subdirectory where `package.json` lives.

### 2. Fix `Auth.tsx` — Remove async/await from `onAuthStateChange`

Move the profile-checking logic **out** of the callback into a separate async function, called fire-and-forget (no `await` in the callback body):

```typescript
// BEFORE (broken)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    const { data: profile } = await supabase.from("user_profiles")...
    navigate(...)
  }
});

// AFTER (correct)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) {
    checkProfileAndRedirect(session.user.id); // fire and forget, no await
  }
});
```

### 3. Fix `Dashboard.tsx` — Add auth readiness guard

Add an `isAuthReady` state initialized to `false`. Only set it to `true` after `getSession()` resolves. Keep all queries gated on `isReady && !!user`. Show a loading spinner instead of `null` while auth restores from storage:

```typescript
const [isAuthReady, setIsAuthReady] = useState(false);

useEffect(() => {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) { navigate("/auth"); return; }
    setUser(session.user);
    // fetch profile...
    setIsAuthReady(true);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    // No async/await here
    if (event === "SIGNED_OUT" || !session) navigate("/auth");
    else setUser(session.user);
  });
}, [navigate]);

if (!isAuthReady) return <LoadingSpinner />; // instead of null
```

---

## Files to Change

1. **`lovable.toml`** — Create at project root (fixes build error)
2. **`nutrivison-8c4e855e-main/src/pages/Auth.tsx`** — Remove `async`/`await` from `onAuthStateChange` callback
3. **`nutrivison-8c4e855e-main/src/pages/Dashboard.tsx`** — Add `isAuthReady` state, show loader instead of returning `null`
