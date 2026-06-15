// auth.js — Auth helpers: signup, login, logout, session check
// Depends on: supabase-client.js (must be loaded first)

const AUTH = (() => {
  let client;

  function getClient() {
    if (!client) client = window.initSupabase();
    return client;
  }

  // ── Sign Up ──────────────────────────────────────────────
  async function signUp(email, password) {
    const sb = getClient();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  // ── Log In ───────────────────────────────────────────────
  async function logIn(email, password) {
    const sb = getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // ── Log Out ──────────────────────────────────────────────
  async function logOut() {
    const sb = getClient();
    await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  // ── Get Session ──────────────────────────────────────────
  async function getSession() {
    const sb = getClient();
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  // ── Get User ─────────────────────────────────────────────
  async function getUser() {
    const sb = getClient();
    const { data } = await sb.auth.getUser();
    return data.user;
  }

  // ── Require Auth (redirect to login if not authenticated)─
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  // ── Redirect if already logged in ────────────────────────
  async function redirectIfAuth() {
    const session = await getSession();
    if (session) {
      window.location.href = 'upload.html';
      return true;
    }
    return false;
  }

  return { signUp, logIn, logOut, getSession, getUser, requireAuth, redirectIfAuth };
})();

window.AUTH = AUTH;
