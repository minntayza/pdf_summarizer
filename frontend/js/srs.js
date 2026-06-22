// srs.js — Spaced Repetition System (SM-2 algorithm)
import { sb } from './supabase-client.js';

// SM-2 algorithm implementation
function sm2(quality, easeFactor, interval, reviewCount) {
  // quality: 1=Again, 2=Hard, 3=Good, 4=Easy
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF);

  let newInterval;
  if (quality < 3) {
    newInterval = 1; // reset
  } else if (reviewCount === 0) {
    newInterval = 1;
  } else if (reviewCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEF);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    ease_factor: newEF,
    interval_days: newInterval,
    next_review: nextReview.toISOString(),
    review_count: reviewCount + 1,
  };
}

export async function getDueCards(documentId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const now = new Date().toISOString();
  const { data, error } = await sb
    .from('flashcard_reviews')
    .select('*')
    .eq('document_id', documentId)
    .lte('next_review', now)
    .order('next_review', { ascending: true });

  if (error) { console.error('getDueCards:', error); return []; }
  return data || [];
}

export async function getDueCount(documentId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return 0;

  const now = new Date().toISOString();
  const { count, error } = await sb
    .from('flashcard_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .lte('next_review', now);

  if (error) return 0;
  return count || 0;
}

export async function getAllDueCount() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return 0;

  const now = new Date().toISOString();
  const { count, error } = await sb
    .from('flashcard_reviews')
    .select('*', { count: 'exact', head: true })
    .lte('next_review', now);

  if (error) return 0;
  return count || 0;
}

export async function recordReview(documentId, cardIndex, quality) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Fetch existing review
  const { data: existing } = await sb
    .from('flashcard_reviews')
    .select('*')
    .eq('document_id', documentId)
    .eq('card_index', cardIndex)
    .eq('user_id', user.id)
    .single();

  const result = sm2(
    quality,
    existing?.ease_factor || 2.5,
    existing?.interval_days || 0,
    existing?.review_count || 0,
  );

  if (existing) {
    const { error } = await sb
      .from('flashcard_reviews')
      .update(result)
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await sb
      .from('flashcard_reviews')
      .insert({
        user_id: user.id,
        document_id: documentId,
        card_index: cardIndex,
        ...result,
      });
    return { error };
  }
}

export async function getAllReviews(documentId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return {};

  const { data } = await sb
    .from('flashcard_reviews')
    .select('card_index, next_review, review_count')
    .eq('document_id', documentId);

  const map = {};
  (data || []).forEach(r => { map[r.card_index] = r; });
  return map;
}
