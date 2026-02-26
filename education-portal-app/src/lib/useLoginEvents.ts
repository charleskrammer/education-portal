"use client";

const STORAGE_KEY = "claude-training-logins.v1";

type LoginStore = {
  users: Record<string, string[]>; // userId -> array of ISO timestamps
};

const loadStore = (): LoginStore => {
  if (typeof window === "undefined") return { users: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { users: {} };
    const parsed = JSON.parse(raw) as LoginStore;
    if (!parsed?.users || typeof parsed.users !== "object") return { users: {} };
    return parsed;
  } catch {
    return { users: {} };
  }
};

const saveStore = (store: LoginStore) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

/** Record a login event for a user. */
export const recordLogin = (userId: string): void => {
  if (typeof window === "undefined") return;
  const store = loadStore();
  if (!store.users[userId]) store.users[userId] = [];
  store.users[userId].push(new Date().toISOString());
  saveStore(store);
};

/** Count distinct calendar days with at least one login in the past 7 days (including today). */
export const getLoginsInPast7Days = (userId: string): number => {
  const store = loadStore();
  const timestamps = store.users[userId] ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const uniqueDays = new Set(
    timestamps
      .filter((ts) => new Date(ts) >= cutoff)
      .map((ts) => new Date(ts).toDateString())
  );
  return uniqueDays.size;
};

/** Count total login events (not distinct days) in the past 7 days. */
export const getTotalLoginEventsPast7Days = (userId: string): number => {
  const store = loadStore();
  const timestamps = store.users[userId] ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return timestamps.filter((ts) => new Date(ts) >= cutoff).length;
};

/** Returns Record<userId, totalLoginEvents> for all users in the past 7 days. */
export const getAllUserTotalLoginEventsPast7Days = (): Record<string, number> => {
  const store = loadStore();
  return Object.fromEntries(
    Object.keys(store.users).map((id) => [id, getTotalLoginEventsPast7Days(id)])
  );
};

/** Returns Record<userId, loginCountLast7Days> for all users. */
export const getAllUserLoginsInPast7Days = (): Record<string, number> => {
  const store = loadStore();
  const result: Record<string, number> = {};
  for (const [userId] of Object.entries(store.users)) {
    result[userId] = getLoginsInPast7Days(userId);
  }
  return result;
};

/**
 * Compute learning streak for a user in days.
 * A streak is the number of consecutive calendar days (ending today) on which
 * the user logged in at least once.
 */
export const getLearningStreak = (userId: string): number => {
  const store = loadStore();
  const timestamps = store.users[userId] ?? [];
  if (timestamps.length === 0) return 0;

  const days = new Set(timestamps.map((ts) => new Date(ts).toDateString()));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) continue; // weekend → skip, do not break
    if (days.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/** Returns [Mon, Tue, Wed, Thu, Fri] booleans for the current calendar work week. */
export const getWorkWeekLoginDays = (userId: string): boolean[] => {
  const store = loadStore();
  const timestamps = store.users[userId] ?? [];
  const loginDays = new Set(timestamps.map((ts) => new Date(ts).toDateString()));

  const today = new Date();
  const dow = today.getDay(); // 0=Sun … 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return loginDays.has(d.toDateString());
  });
};

/** Returns Record<userId, boolean[5]> for the current work week, for all users. */
export const getAllUserWorkWeekLoginDays = (): Record<string, boolean[]> => {
  const store = loadStore();
  return Object.fromEntries(
    Object.keys(store.users).map((id) => [id, getWorkWeekLoginDays(id)])
  );
};
