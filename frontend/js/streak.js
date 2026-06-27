// streak.js — Daily study streak tracking
import { sb } from './supabase-client.js';

/**
 * Record a study activity for the current user.
 * Call this after uploading a PDF, reviewing flashcards, etc.
 * Returns the updated streak info or null if not authenticated.
 */
export async function recordActivity() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];

  // Fetch existing streak
  const { data: existing } = await sb
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  let currentStreak = 1;
  let longestStreak = 1;
  let lastDate = null;

  if (existing) {
    lastDate = existing.last_activity_date;

    if (lastDate === today) {
      // Already recorded today — no change needed
      return existing;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day — increment streak
      currentStreak = existing.current_streak + 1;
    } else {
      // Streak broken — reset to 1
      currentStreak = 1;
    }

    longestStreak = Math.max(currentStreak, existing.longest_streak || 0);
  }

  const { data: upserted, error } = await sb
    .from('user_streaks')
    .upsert({
      user_id: user.id,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to record streak:', error);
    return null;
  }

  return upserted;
}

/**
 * Get the current user's streak info.
 * Returns { current_streak, longest_streak } or { current_streak: 0, longest_streak: 0 }.
 */
export async function getStreak() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { current_streak: 0, longest_streak: 0 };

  const { data, error } = await sb
    .from('user_streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return { current_streak: 0, longest_streak: 0 };
  }

  return data;
}

/**
 * Render the streak flame into a DOM element.
 * Pass the element ID string.
 */
export async function renderStreak(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const streak = await getStreak();

  if (streak.current_streak > 0) {
    el.innerHTML = `<span class="streak-flame" title="Current streak: ${streak.current_streak} days&#10;Longest: ${streak.longest_streak} days">🔥 ${streak.current_streak}</span>`;
  } else {
    el.innerHTML = '';
  }
}
