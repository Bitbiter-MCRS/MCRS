import { env } from "cloudflare:workers";
import { adminOnly } from "@/lib/admin";
type Statement = {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};
type D1 = { prepare(sql: string): Statement };
const db = () => (env as unknown as { DB: D1 }).DB;
const fields =
  "id, week_start AS weekStart, schedule_date AS scheduleDate, day_name AS dayName, shift, start_time AS startTime, end_date AS endDate, end_time AS endTime, activity_type AS activityType, keg_format AS kegFormat, brand, description, job_number AS jobNumber, target_kegs AS targetKegs, planned_minutes AS plannedMinutes, target_rate AS targetRate, actual_started_at AS actualStartedAt, actual_finished_at AS actualFinishedAt";
const select = `SELECT ${fields} FROM schedule_items`;
const prune = () =>
  db()
    .prepare(
      "DELETE FROM schedule_items WHERE schedule_date < date('now', '-364 days')",
    )
    .run();
export async function GET() {
  try {
    await prune();
    const { results } = await db()
      .prepare(`${select} ORDER BY schedule_date, start_time, id`)
      .all();
    return Response.json({ items: results });
  } catch (error) {
    return Response.json({
      items: [],
      error: error instanceof Error ? error.message : "Database unavailable",
    });
  }
}
export async function POST(request: Request) {
  const denied = await adminOnly(request);
  if (denied) return denied;
  try {
    const p = (await request.json()) as Record<string, unknown>,
      activityType = ["CIP", "Meal Break"].includes(String(p.activityType)) ? String(p.activityType) : "Production",
      rate = activityType === "Production" ? (String(p.kegFormat) === "50L" ? 120 : 135) : 0,
      start = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.startTime || ""))
        ? String(p.startTime)
        : "06:15",
      shift = start >= "14:15" ? "Late" : "Early",
      target = activityType === "Production" ? Number(p.targetKegs) || 0 : 0,
      minutes = activityType === "Production" ? Math.ceil((target / rate) * 60) : Math.max(1, Number(p.plannedMinutes) || (activityType === "Meal Break" ? 30 : 60));
    const end = finishAcrossShifts(String(p.scheduleDate), start, minutes);
    const item = await db()
      .prepare(
        "INSERT INTO schedule_items (week_start,schedule_date,day_name,shift,start_time,end_date,end_time,activity_type,keg_format,brand,description,job_number,target_kegs,planned_minutes,target_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id,week_start AS weekStart,schedule_date AS scheduleDate,day_name AS dayName,shift,start_time AS startTime,end_date AS endDate,end_time AS endTime,activity_type AS activityType,keg_format AS kegFormat,brand,description,job_number AS jobNumber,target_kegs AS targetKegs,planned_minutes AS plannedMinutes,target_rate AS targetRate,actual_started_at AS actualStartedAt,actual_finished_at AS actualFinishedAt",
      )
      .bind(
        String(p.weekStart || "2026-08-24"),
        String(p.scheduleDate),
        String(p.dayName),
        shift,
        start,
        end.date,
        end.time,
        activityType,
        String(p.kegFormat || "30L"),
        String(p.brand || ""),
        String(p.description || ""),
        String(p.jobNumber || ""),
        target,
        minutes,
        rate,
      )
      .first();
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to save" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const p = (await request.json()) as Record<string, unknown>;
    if (p.action === "start" || p.action === "finish") {
      const id = Number(p.id);
      if (!Number.isInteger(id) || id <= 0) return Response.json({error:"Valid schedule id is required"},{status:400});
      const sql = p.action === "start"
        ? `UPDATE schedule_items SET actual_started_at=COALESCE(actual_started_at,CURRENT_TIMESTAMP) WHERE id=? AND actual_finished_at IS NULL RETURNING ${fields}`
        : `UPDATE schedule_items SET actual_finished_at=CURRENT_TIMESTAMP WHERE id=? AND actual_started_at IS NOT NULL AND actual_finished_at IS NULL RETURNING ${fields}`;
      const item = await db().prepare(sql).bind(id).first();
      if (!item) return Response.json({error:p.action === "start" ? "Job has already finished" : "Start the job before finishing it"},{status:409});
      return Response.json({item});
    }
    const denied = await adminOnly(request);
    if (denied) return denied;
    const activityType = ["CIP", "Meal Break"].includes(String(p.activityType)) ? String(p.activityType) : "Production",
      rate = activityType === "Production" ? (String(p.kegFormat) === "50L" ? 120 : 135) : 0,
      start = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.startTime || ""))
        ? String(p.startTime)
        : "06:15",
      shift = start >= "14:15" ? "Late" : "Early",
      target = activityType === "Production" ? Number(p.targetKegs) || 0 : 0,
      minutes = activityType === "Production" ? Math.ceil((target / rate) * 60) : Math.max(1, Number(p.plannedMinutes) || (activityType === "Meal Break" ? 30 : 60)),
      end = finishAcrossShifts(String(p.scheduleDate), start, minutes);
    const item = await db()
      .prepare(
        "UPDATE schedule_items SET schedule_date=?,day_name=?,shift=?,start_time=?,end_date=?,end_time=?,activity_type=?,keg_format=?,brand=?,description=?,job_number=?,target_kegs=?,planned_minutes=?,target_rate=? WHERE id=? RETURNING id,week_start AS weekStart,schedule_date AS scheduleDate,day_name AS dayName,shift,start_time AS startTime,end_date AS endDate,end_time AS endTime,activity_type AS activityType,keg_format AS kegFormat,brand,description,job_number AS jobNumber,target_kegs AS targetKegs,planned_minutes AS plannedMinutes,target_rate AS targetRate,actual_started_at AS actualStartedAt,actual_finished_at AS actualFinishedAt",
      )
      .bind(
        String(p.scheduleDate),
        String(p.dayName),
        shift,
        start,
        end.date,
        end.time,
        activityType,
        String(p.kegFormat),
        String(p.brand || ""),
        String(p.description || ""),
        String(p.jobNumber || ""),
        target,
        minutes,
        rate,
        Number(p.id),
      )
      .first();
    return Response.json({ item });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  const denied = await adminOnly(request);
  if (denied) return denied;
  try {
    const p = (await request.json()) as { id?: number };
    await db()
      .prepare("DELETE FROM schedule_items WHERE id=?")
      .bind(Number(p.id))
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to delete" },
      { status: 500 },
    );
  }
}
function finishAcrossShifts(date: string, start: string, minutes: number) {
  const day = new Date(date + "T12:00:00Z");
  let cursor = timeMinutes(start), remaining = Math.max(0, minutes);
  const nextWorkingDay = () => { do day.setUTCDate(day.getUTCDate()+1); while(day.getUTCDay()===0 || day.getUTCDay()===6); cursor=375; };
  if (day.getUTCDay()===0 || day.getUTCDay()===6) { while(day.getUTCDay()===0 || day.getUTCDay()===6) day.setUTCDate(day.getUTCDate()+1); cursor=375; }
  if (cursor < 375) cursor=375;
  if (cursor >= 1320) nextWorkingDay();
  while (remaining > 0) {
    const available=1320-cursor, used=Math.min(remaining,available);
    cursor+=used; remaining-=used;
    if(remaining>0) nextWorkingDay();
  }
  return {date:day.toISOString().slice(0,10),time:`${String(Math.floor(cursor/60)).padStart(2,"0")}:${String(cursor%60).padStart(2,"0")}`};
}
function timeMinutes(time:string){const [h,m]=time.split(":").map(Number);return h*60+m;}
