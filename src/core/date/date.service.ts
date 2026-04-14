import { Injectable } from "@nestjs/common";

/**
 * Global date utility service for Bangkok (Asia/Bangkok, UTC+7) timezone operations.
 *
 * Prisma stores `@db.Date` columns using the UTC date part, so when querying
 * by "today" or "this week" relative to Bangkok time, we must first resolve
 * the current Bangkok date string and then build UTC-midnight Date objects
 * from it.  This service centralises that logic so every module uses the
 * same, tested helpers.
 */
@Injectable()
export class DateService {
  private static readonly TIMEZONE = "Asia/Bangkok";

  // ──────────────────────────────────────────────
  //  Core helpers
  // ──────────────────────────────────────────────

  /**
   * Returns the current date string in Bangkok timezone formatted as
   * `YYYY-MM-DD` (ISO-8601 date part).
   *
   * Uses `en-CA` locale which natively formats as `YYYY-MM-DD`.
   */
  getBangkokDateString(now: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: DateService.TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }

  /**
   * Returns a `Date` set to UTC midnight of the current Bangkok date.
   *
   * Useful for `@db.Date` column comparisons in Prisma where the stored
   * value is the UTC date part.
   */
  getBangkokTodayUTC(now: Date = new Date()): Date {
    return new Date(this.getBangkokDateString(now));
  }

  // ──────────────────────────────────────────────
  //  Day range
  // ──────────────────────────────────────────────

  /**
   * Returns `{ start, end }` representing the full Bangkok "today" as a
   * half-open UTC interval `[start, end)`.
   *
   * - `start` → UTC midnight of the Bangkok date
   * - `end`   → UTC midnight of the next Bangkok date
   */
  getTodayRange(now: Date = new Date()): { start: Date; end: Date } {
    const start = this.getBangkokTodayUTC(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  // ──────────────────────────────────────────────
  //  Week range (Monday–Sunday)
  // ──────────────────────────────────────────────

  /**
   * Returns `{ start, end }` representing the current ISO week
   * (Monday → Sunday) as a half-open UTC interval `[start, end)`.
   *
   * - `start` → UTC midnight of Monday of the current Bangkok week
   * - `end`   → UTC midnight of the following Monday
   */
  getWeekRange(now: Date = new Date()): { start: Date; end: Date } {
    const today = this.getBangkokTodayUTC(now);
    const dayOfWeek = today.getDay(); // 0 (Sun) – 6 (Sat)
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(today);
    start.setDate(today.getDate() - diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return { start, end };
  }

  // ──────────────────────────────────────────────
  //  Month range
  // ──────────────────────────────────────────────

  /**
   * Returns `{ start, end }` representing the current Bangkok month as a
   * half-open UTC interval `[start, end)`.
   *
   * - `start` → UTC midnight of the 1st of the current Bangkok month
   * - `end`   → UTC midnight of the 1st of the next Bangkok month
   */
  getMonthRange(now: Date = new Date()): { start: Date; end: Date } {
    const dateStr = this.getBangkokDateString(now);
    const [year, month] = dateStr.split("-").map(Number);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    return { start, end };
  }
}
