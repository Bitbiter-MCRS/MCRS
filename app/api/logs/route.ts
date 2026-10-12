import { env } from "cloudflare:workers";
type Statement = {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};
type D1 = { prepare(sql: string): Statement };
const db = () => (env as unknown as { DB: D1 }).DB;
const prune = () =>
  db()
    .prepare(
      "DELETE FROM hourly_logs WHERE log_date < date('now', '-364 days')",
    )
    .run();
export async function GET() {
  try {
    await prune();
    const { results } = await db()
      .prepare(
        "SELECT id, log_date AS logDate, shift, time_slot AS timeSlot, keg_format AS kegFormat, target_kegs AS targetKegs, actual_kegs AS actualKegs, rejected_kegs AS rejectedKegs, reason_code AS reasonCode, reason, activity_category AS activityCategory, activity_minutes AS activityMinutes, machine_name AS machineName, downtime_minutes AS downtimeMinutes, notes, schedule_item_id AS scheduleItemId, created_at AS createdAt FROM hourly_logs ORDER BY log_date DESC, id DESC",
      )
      .all();
    return Response.json({ logs: results });
  } catch (error) {
    return Response.json({
      logs: [],
      error: error instanceof Error ? error.message : "Database unavailable",
    });
  }
}
export async function POST(request: Request) {
  try {
    const p = (await request.json()) as Record<string, unknown>;
    for (const key of ["logDate", "shift", "timeSlot", "kegFormat"])
      if (!String(p[key] ?? "").trim())
        return Response.json({ error: `${key} is required` }, { status: 400 });
    const target = Math.max(0, Number(p.targetKegs) || 0),
      actual = Math.max(0, Number(p.actualKegs) || 0),
      downtime =
        target > 0 && actual < target
          ? Math.round(((target - actual) / target) * 60)
          : 0;
    const log = await db()
      .prepare(
        "INSERT INTO hourly_logs (log_date, shift, time_slot, keg_format, target_kegs, actual_kegs, rejected_kegs, reason_code, reason, activity_category, activity_minutes, machine_name, downtime_minutes, notes, schedule_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, log_date AS logDate, shift, time_slot AS timeSlot, keg_format AS kegFormat, target_kegs AS targetKegs, actual_kegs AS actualKegs, rejected_kegs AS rejectedKegs, reason_code AS reasonCode, reason, activity_category AS activityCategory, activity_minutes AS activityMinutes, machine_name AS machineName, downtime_minutes AS downtimeMinutes, notes, schedule_item_id AS scheduleItemId, created_at AS createdAt",
      )
      .bind(
        String(p.logDate),
        String(p.shift),
        String(p.timeSlot),
        String(p.kegFormat),
        target,
        actual,
        Number(p.rejectedKegs) || 0,
        String(p.reasonCode || ""),
        String(p.reason || ""),
        String(p.activityCategory || "Production"),
        Number(p.activityMinutes) || 0,
        String(p.machineName || ""),
        downtime,
        String(p.notes || ""),
        Number(p.scheduleItemId)>0?Number(p.scheduleItemId):null,
      )
      .first();
    return Response.json({ log }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to save record",
      },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const p = (await request.json()) as Record<string, unknown>,
      id = Number(p.id);
    if (!Number.isInteger(id) || id <= 0)
      return Response.json(
        { error: "Valid record id is required" },
        { status: 400 },
      );
    for (const key of ["logDate", "shift", "timeSlot", "kegFormat"])
      if (!String(p[key] ?? "").trim())
        return Response.json({ error: `${key} is required` }, { status: 400 });
    const target = Math.max(0, Number(p.targetKegs) || 0),
      actual = Math.max(0, Number(p.actualKegs) || 0),
      downtime =
        target > 0 && actual < target
          ? Math.round(((target - actual) / target) * 60)
          : 0;
    const log = await db()
      .prepare(
        "UPDATE hourly_logs SET log_date=?,shift=?,time_slot=?,keg_format=?,target_kegs=?,actual_kegs=?,rejected_kegs=?,reason_code=?,reason=?,activity_category=?,activity_minutes=?,machine_name=?,downtime_minutes=?,notes=?,schedule_item_id=? WHERE id=? RETURNING id, log_date AS logDate, shift, time_slot AS timeSlot, keg_format AS kegFormat, target_kegs AS targetKegs, actual_kegs AS actualKegs, rejected_kegs AS rejectedKegs, reason_code AS reasonCode, reason, activity_category AS activityCategory, activity_minutes AS activityMinutes, machine_name AS machineName, downtime_minutes AS downtimeMinutes, notes, schedule_item_id AS scheduleItemId, created_at AS createdAt",
      )
      .bind(
        String(p.logDate),
        String(p.shift),
        String(p.timeSlot),
        String(p.kegFormat),
        target,
        actual,
        Number(p.rejectedKegs) || 0,
        String(p.reasonCode || ""),
        String(p.reason || ""),
        String(p.activityCategory || "Production"),
        Number(p.activityMinutes) || 0,
        String(p.machineName || ""),
        downtime,
        String(p.notes || ""),
        Number(p.scheduleItemId)>0?Number(p.scheduleItemId):null,
        id,
      )
      .first();
    if (!log)
      return Response.json({ error: "Record not found" }, { status: 404 });
    return Response.json({ log });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update record",
      },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const p = (await request.json()) as { id?: number },
      id = Number(p.id);
    if (!Number.isInteger(id) || id <= 0)
      return Response.json(
        { error: "Valid record id is required" },
        { status: 400 },
      );
    await db().prepare("DELETE FROM hourly_logs WHERE id=?").bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete record",
      },
      { status: 500 },
    );
  }
}
