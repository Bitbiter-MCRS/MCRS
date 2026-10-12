"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPlus,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  Save,
  Settings,
  ShieldAlert,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

type Log = {
  id?: number;
  logDate: string;
  shift: string;
  timeSlot: string;
  kegFormat: string;
  targetKegs: number;
  actualKegs: number | "";
  rejectedKegs: number;
  reasonCode: string;
  reason: string;
  activityCategory: string;
  activityMinutes: number;
  machineName: string;
  downtimeMinutes: number;
  notes: string;
  createdAt?: string;
  scheduleItemId?: number | null;
};
type Item = {
  id: number;
  weekStart: string;
  scheduleDate: string;
  dayName: string;
  shift: string;
  startTime: string;
  endDate?: string;
  endTime: string;
  activityType?: "Production" | "CIP" | "Meal Break";
  kegFormat: string;
  brand: string;
  description: string;
  jobNumber: string;
  targetKegs: number;
  plannedMinutes: number;
  targetRate: number;
  actualStartedAt?: string | null;
  actualFinishedAt?: string | null;
};
type Option = { id: number; name: string };
type Priority = {id?:number;priorityDate:string;priorityRank:number;content:string;status:string;updatedAt?:string};
type Issue = {
  id?: number;
  issueDate: string;
  shift: string;
  issueType: "Safety" | "Quality";
  severity: string;
  description: string;
  action: string;
  status: string;
  createdAt?: string;
  resolvedAt?: string | null;
};
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const seed: Item[] = [
  {
    id: -1,
    weekStart: "2026-08-24",
    scheduleDate: "2026-08-24",
    dayName: "Monday",
    shift: "Late",
    startTime: "14:15",
    endTime: "21:10",
    kegFormat: "30L",
    brand: "Pale",
    description: "CAMDEN PALE KEG 30L",
    jobNumber: "123",
    targetKegs: 933,
    plannedMinutes: 415,
    targetRate: 135,
  },
  {
    id: -2,
    weekStart: "2026-08-24",
    scheduleDate: "2026-08-25",
    dayName: "Tuesday",
    shift: "Early",
    startTime: "06:15",
    endTime: "21:34",
    kegFormat: "30L",
    brand: "Pale",
    description: "CAMDEN PALE KEG 30L",
    jobNumber: "124",
    targetKegs: 2067,
    plannedMinutes: 919,
    targetRate: 135,
  },
  {
    id: -3,
    weekStart: "2026-08-24",
    scheduleDate: "2026-08-26",
    dayName: "Wednesday",
    shift: "Early",
    startTime: "06:15",
    endTime: "20:05",
    kegFormat: "30L",
    brand: "Eazy",
    description: "CAMD EAZY KEG 30L",
    jobNumber: "125",
    targetKegs: 1867,
    plannedMinutes: 830,
    targetRate: 135,
  },
  {
    id: -4,
    weekStart: "2026-08-24",
    scheduleDate: "2026-08-27",
    dayName: "Thursday",
    shift: "Early",
    startTime: "06:15",
    endTime: "20:05",
    kegFormat: "30L",
    brand: "Stout",
    description: "CAMDEN STOUT EN KEG 30L",
    jobNumber: "126",
    targetKegs: 1867,
    plannedMinutes: 830,
    targetRate: 135,
  },
];
const blank: Log = {
  logDate: "",
  shift: "Early",
  timeSlot: "",
  kegFormat: "30L",
  targetKegs: 135,
  actualKegs: "",
  rejectedKegs: 0,
  reasonCode: "",
  reason: "",
  activityCategory: "Production",
  activityMinutes: 0,
  machineName: "",
  downtimeMinutes: 0,
  notes: "",
};

export default function DashboardApp() {
  const [loginId,setLoginId]=useState(""),[password,setPassword]=useState(""),[loginBusy,setLoginBusy]=useState(false),[loginError,setLoginError]=useState("");
  async function login(e:FormEvent){e.preventDefault();setLoginBusy(true);setLoginError("");try{const r=await fetch("/api/admin",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:loginId,password})});const d=await r.json();if(!r.ok)throw new Error(d.error);setIsAdmin(true);setPassword("")}catch(error){setLoginError(error instanceof Error?error.message:"Unable to sign in")}finally{setLoginBusy(false)}}
  async function logout(){const r=await fetch("/api/admin",{method:"DELETE"});if(r.ok)setIsAdmin(false)}
  const [pendingScheduleDelete, setPendingScheduleDelete] = useState<Item | null>(null);
  const [now, setNow] = useState(new Date()),
    [activeTab, setActiveTab] = useState("overview"),
    [selectedWeek, setSelectedWeek] = useState(
      weekStartSunday(localDate(new Date())),
    ),
    [selectedJobId, setSelectedJobId] = useState<number | null>(null),
    [logs, setLogs] = useState<Log[]>([]),
    [items, setItems] = useState<Item[]>(seed),
    [issues, setIssues] = useState<Issue[]>([]),
    [priorities,setPriorities]=useState<Priority[]>([]),
    [priorityDrafts,setPriorityDrafts]=useState<Record<number,string>>({1:"",2:"",3:""}),
    [form, setForm] = useState<Log>(blank),
    [issueForm, setIssueForm] = useState<Issue>({
      issueDate: localDate(new Date()),
      shift: "Early",
      issueType: "Safety",
      severity: "Medium",
      description: "",
      action: "",
      status: "Open",
    }),
    [isAdmin, setIsAdmin] = useState(false),
    [options, setOptions] = useState<Option[]>([]),
    [notice, setNotice] = useState(""),
    [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle"),
    [scheduleSaveState, setScheduleSaveState] = useState<
      "idle" | "saving" | "saved"
    >("idle"),
    [activitySaveState, setActivitySaveState] = useState<
      "idle" | "saving" | "saved"
    >("idle"),
    [issueAction, setIssueAction] = useState<{
      id: number;
      status: "Closed" | "Cancelled";
      phase: "saving" | "saved";
    } | null>(null),
    [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null),
    [deletedScheduleId, setDeletedScheduleId] = useState<number | null>(null);
  const [jobAction, setJobAction] = useState<{id:number;action:"start"|"finish";phase:"saving"|"saved"}|null>(null);
  const [newActivity, setNewActivity] = useState(""),
    [adminItem, setAdminItem] = useState<Partial<Item>>({
      scheduleDate: "2026-08-24",
      dayName: "Monday",
      startTime: "06:15",
      activityType: "Production",
      kegFormat: "30L",
      brand: "",
      description: "",
      jobNumber: "",
      targetKegs: 0,
      plannedMinutes: 30,
    });
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    Promise.all([
      fetch("/api/logs").then((r) => r.json()),
      fetch("/api/schedule").then((r) => r.json()),
      fetch("/api/admin").then((r) => r.json()),
      fetch("/api/activity-options").then((r) => r.json()),
      fetch("/api/issues").then((r) => r.json()),
    ])
      .then(([a, b, c, d, e]) => {
        setLogs(a.logs || []);
        if (b.items?.length)
          setItems(
            b.items.map((i: Item) => ({
              ...i,
              targetKegs:
                i.targetKegs ||
                Math.round((i.plannedMinutes / 60) * i.targetRate),
            })),
          );
        setIsAdmin(Boolean(c.isAdmin));
        setOptions(d.options || []);
        setIssues(e.issues || []);
      })
      .catch(() => undefined);
    return () => clearInterval(t);
  }, []);
  const activityNames = useMemo(() => options.map((o) => o.name), [options]);
  const calculatedDowntime = calculateDowntime(
    form.targetKegs,
    form.actualKegs,
  );
  const kegShortfall = Math.max(
    0,
    Number(form.targetKegs) - Number(form.actualKegs),
  );
  const previous = logs[0];
  const due = useMemo(() => nextDue(now), [now]);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 60000);
  const reminder = diff <= 10;
  const inputIntervalMinutes = calculateInputInterval(
      now,
      previous,
      form.shift,
    ),
    autoActivityMinutes = Math.max(
      0,
      inputIntervalMinutes - calculatedDowntime,
    );
  const currentShift = shiftForTime(now);
  useEffect(() => {
    // The live clock is the external source of truth for the default shift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) =>
      current.shift === currentShift ? current : { ...current, shift: currentShift },
    );
  }, [currentShift]);
  const weekEnd = useMemo(() => addDays(selectedWeek, 6), [selectedWeek]);
  const weekLogs = useMemo(
    () => logs.filter((l) => inDateRange(l.logDate, selectedWeek, weekEnd)),
    [logs, selectedWeek, weekEnd],
  );
  const performanceLogs = useMemo(
    () => weekLogs.filter((l) => isWeekday(l.logDate)),
    [weekLogs],
  );
  const productionPerformanceLogs = useMemo(
    () => performanceLogs.filter(countsTowardProduction),
    [performanceLogs],
  );
  const effectiveItems = useMemo(() => calculateEffectiveSchedule(items), [items]);
  const weekItems = useMemo(
    () => effectiveItems.filter((i) => inDateRange(i.scheduleDate, selectedWeek, weekEnd)),
    [effectiveItems, selectedWeek, weekEnd],
  );
  const performanceItems = useMemo(
    () => effectiveItems.filter((i) =>
      (i.activityType === "Production" || !i.activityType) &&
      i.scheduleDate <= weekEnd &&
      (i.endDate || i.scheduleDate) >= selectedWeek,
    ),
    [effectiveItems, selectedWeek, weekEnd],
  );
  const weekIssues = useMemo(
    () => issues.filter((i) =>
      inDateRange(i.issueDate, selectedWeek, weekEnd) ||
      (i.status === "Open" && i.issueDate <= weekEnd),
    ),
    [issues, selectedWeek, weekEnd],
  );
  const openIssues = weekIssues.filter((i) => i.status === "Open"),
    historyCutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    caseHistory = issues
      .filter((i) => {
        if (!["Closed", "Cancelled"].includes(i.status) || !i.resolvedAt) return false;
        const resolved = new Date(i.resolvedAt.replace(" ", "T") + (i.resolvedAt.includes("Z") ? "" : "Z"));
        return !Number.isNaN(resolved.getTime()) && resolved >= historyCutoff && resolved <= now;
      })
      .sort((a, b) => String(b.resolvedAt).localeCompare(String(a.resolvedAt))),
    undatedResolvedCount = issues.filter((i) => ["Closed", "Cancelled"].includes(i.status) && !i.resolvedAt).length;
  const weekOptions = useMemo(
    () =>
      Array.from(
        new Set([
          weekStartSunday(localDate(new Date())),
          ...logs.map((l) => weekStartSunday(l.logDate)),
          ...items.map((i) => weekStartSunday(i.scheduleDate)),
          ...issues.map((i) => weekStartSunday(i.issueDate)),
        ]),
      )
        .sort()
        .reverse(),
    [logs, items, issues],
  );
  const downtime = useMemo(
    () =>
      Object.entries(
        performanceLogs.reduce(
          (a, l) => {
            if (l.downtimeMinutes > 0) {
              const k = l.machineName || "Unspecified";
              a[k] = (a[k] || 0) + Number(l.downtimeMinutes);
            }
            return a;
          },
          {} as Record<string, number>,
        ),
      ).map(([machine, minutes]) => ({ machine, minutes })),
    [performanceLogs],
  );
  const activities = useMemo(
    () =>
      Object.entries(
        performanceLogs.reduce(
          (a, l) => {
            const m = Number(l.activityMinutes) || 0;
            a[l.activityCategory] = (a[l.activityCategory] || 0) + m;
            return a;
          },
          {} as Record<string, number>,
        ),
      ).map(([name, minutes]) => ({ name, minutes })),
    [performanceLogs],
  );
  const shiftPerformance = useMemo(
    () => buildDailyShiftPerformance(selectedWeek, performanceItems, productionPerformanceLogs),
    [selectedWeek, performanceItems, productionPerformanceLogs],
  );
  const planned = performanceItems.reduce(
      (n, i) => n + (Number(i.targetKegs) || 0),
      0,
    ),
    actual = productionPerformanceLogs.reduce(
      (n, l) => n + (Number(l.actualKegs) || 0),
      0,
    ),
    downTotal = downtime.reduce((n, d) => n + d.minutes, 0);
  const safetyIssues = weekIssues.filter((i) => i.issueType === "Safety" && i.status === "Open"),
    qualityIssues = weekIssues.filter((i) => i.issueType === "Quality" && i.status === "Open");
  const today = localDate(now),
    activeJob = effectiveItems
      .filter((i) => i.actualStartedAt && !i.actualFinishedAt)
      .sort((a,b)=>String(b.actualStartedAt).localeCompare(String(a.actualStartedAt)))[0],
    scheduledJobs = useMemo(
      () =>
        effectiveItems
          .filter(
            (i) =>
              i.activityType !== "CIP" &&
              i.activityType !== "Meal Break" &&
              (jobOverlapsShift(i, today, form.shift) ||
                i.id === activeJob?.id),
          )
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      [effectiveItems, today, form.shift, activeJob?.id],
    ),
    selectedJob = effectiveItems.find((i) => i.id === selectedJobId);
  const currentTime=now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}),
    todayProductionJobs=effectiveItems.filter(i=>(i.activityType==="Production"||!i.activityType)&&i.scheduleDate<=today&&(i.endDate||i.scheduleDate)>=today),
    currentScheduleJob=todayProductionJobs.find(i=>scheduleStamp(i.scheduleDate,i.startTime)<=scheduleStamp(today,currentTime)&&scheduleStamp(i.endDate||i.scheduleDate,i.endTime)>=scheduleStamp(today,currentTime)),
    latestFinishedJob=todayProductionJobs.filter(i=>i.actualFinishedAt).sort((a,b)=>String(b.actualFinishedAt).localeCompare(String(a.actualFinishedAt)))[0],
    overviewJob=activeJob||currentScheduleJob||latestFinishedJob||todayProductionJobs.sort((a,b)=>a.startTime.localeCompare(b.startTime))[0],
    overviewActual=overviewJob?logs.filter(l=>l.scheduleItemId===overviewJob.id&&countsTowardProduction(l)).reduce((n,l)=>n+(Number(l.actualKegs)||0),0):0,
    overviewExpectedMinutes=overviewJob?productiveMinutesUntil(overviewJob,now,effectiveItems):0,
    overviewExpected=overviewJob?Math.min(overviewJob.targetKegs,Math.round(overviewExpectedMinutes*overviewJob.targetRate/60)):0,
    liveVarianceMinutes=overviewJob?.actualFinishedAt
      ? finishVarianceMinutes(overviewJob.endDate||overviewJob.scheduleDate,overviewJob.endTime,overviewJob.actualFinishedAt)
      : overviewJob?.targetRate?Math.round((overviewActual-overviewExpected)/overviewJob.targetRate*60):0;
  useEffect(()=>{
    fetch(`/api/priorities?date=${today}`).then(r=>r.json()).then(p=>{
      setPriorities(p.priorities||[]);
      setPriorityDrafts(Object.fromEntries([1,2,3].map(rank=>[rank,(p.priorities||[]).find((x:Priority)=>x.priorityRank===rank)?.content||""])) as Record<number,string>);
    }).catch(()=>undefined);
  },[today]);
  useEffect(() => {
    if (!scheduledJobs.length) {
      // Keep the controlled selector empty when the selected day has no jobs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedJobId(null);
      return;
    }
    if (activeJob) {
      if (selectedJobId !== activeJob.id) selectScheduleJob(activeJob);
      return;
    }
    if (
      selectedJobId !== null &&
      scheduledJobs.some((i) => i.id === selectedJobId)
    )
      return;
    const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      job =
        scheduledJobs.find((i) => time >= i.startTime && time <= i.endTime) ||
        scheduledJobs.find((i) => i.startTime >= time) ||
        scheduledJobs[0];
    selectScheduleJob(job);
  }, [scheduledJobs, selectedJobId, activeJob?.id]);
  const f = (key: keyof Log, value: string | number) =>
    setForm((v) => ({
      ...v,
      [key]: value,
      ...(key === "kegFormat"
        ? { targetKegs: value === "50L" ? 120 : 135 }
        : {}),
    }));
  function selectScheduleJob(job: Item) {
    setSelectedJobId(job.id);
    setForm((v) => ({
      ...v,
      kegFormat: job.kegFormat,
      targetKegs: job.targetRate || (job.kegFormat === "50L" ? 120 : 135),
    }));
  }
  async function updateJobStatus(job:Item,action:"start"|"finish"){
    if(!job.id || job.id < 1 || jobAction) return;
    setJobAction({id:job.id,action,phase:"saving"});
    try{
      const r=await fetch("/api/schedule",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:job.id,action})}),d=await r.json();
      if(!r.ok){setNotice(d.error||`Unable to ${action} job`);setJobAction(null);return;}
      setJobAction({id:job.id,action,phase:"saved"});
      setItems(v=>v.map(i=>i.id===job.id?d.item:i));
      if(action==="start") selectScheduleJob(d.item);
      setNotice(`Job ${action === "start" ? "started" : "finished"} at ${new Date(action === "start" ? d.item.actualStartedAt : d.item.actualFinishedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`);
      window.setTimeout(()=>setJobAction(null),1000);
    }catch{setNotice(`Unable to ${action} job`);setJobAction(null);}
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saveState === "saving") return;
    setSaveState("saving");
    const stamp = new Date(),
      payload = {
        ...form,
        scheduleItemId:selectedJob?.id && selectedJob.id>0 ? selectedJob.id : null,
        activityMinutes: autoActivityMinutes,
        downtimeMinutes: calculatedDowntime,
        logDate: localDate(stamp),
        timeSlot: stamp.toLocaleTimeString("en-GB", { hour12: false }),
      };
    try {
      const r = await fetch("/api/logs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        d = await r.json();
      if (r.ok) {
        setLogs((v) => [d.log, ...v]);
        setNotice(
          `Record saved at ${payload.timeSlot} · activity ${autoActivityMinutes} min · downtime ${d.log.downtimeMinutes} min`,
        );
        setForm((v) => ({
          ...v,
          actualKegs: "",
          rejectedKegs: 0,
          activityMinutes: 0,
          downtimeMinutes: 0,
          notes: "",
        }));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1800);
      } else {
        setNotice(d.error || "Unable to save");
        setSaveState("idle");
      }
    } catch {
      setNotice("Unable to save record");
      setSaveState("idle");
    }
  }
  async function deleteLog(log: Log) {
    if (
      !log.id ||
      !window.confirm(
        `Delete the entry at ${log.logDate} ${log.timeSlot}? This is intended for incorrect or duplicate records.`,
      )
    )
      return;
    const r = await fetch("/api/logs", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: log.id }),
    });
    if (r.ok) {
      setLogs((v) => v.filter((x) => x.id !== log.id));
      setNotice("Incorrect hourly entry deleted");
    } else setNotice("Unable to delete record");
  }
  async function updateLog(log: Log) {
    if (!log.id) return false;
    const r = await fetch("/api/logs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(log),
    });
    const d = await r.json();
    if (!r.ok) {
      setNotice(d.error || "Unable to update record");
      return false;
    }
    setLogs((current) =>
      current.map((item) => (item.id === log.id ? d.log : item)),
    );
    setNotice(`Hourly record updated · downtime ${d.log.downtimeMinutes} min`);
    return true;
  }
  async function submitIssue(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(issueForm),
      }),
      d = await r.json();
    if (r.ok) {
      setIssues((v) => [d.issue, ...v]);
      setIssueForm((v) => ({ ...v, description: "" }));
      setNotice(`${issueForm.issueType} message saved`);
    } else setNotice(d.error || "Unable to save issue");
  }
  async function updateIssueStatus(issue: Issue, nextStatus: "Closed" | "Cancelled") {
    if (!issue.id) return;
    if (issueAction?.id === issue.id) return;
    setIssueAction({ id: issue.id, status: nextStatus, phase: "saving" });
    const r = await fetch("/api/issues", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: issue.id, status: nextStatus }),
      });
    const d = await r.json();
    if (!r.ok) {
      setIssueAction(null);
      setNotice(d.error || "Unable to update issue status");
      return;
    }
    setIssueAction({ id: issue.id, status: nextStatus, phase: "saved" });
    setNotice(`${issue.issueType} case ${nextStatus.toLowerCase()}`);
    window.setTimeout(() => {
      setIssues((v) => v.map((i) => (i.id === issue.id ? d.issue : i)));
      setIssueAction(null);
    }, 850);
  }
  async function savePriority(rank:number){
    const content=(priorityDrafts[rank]||"").trim(),existing=priorities.find(p=>p.priorityRank===rank);
    if(!content){setNotice("Priority content is required");return;}
    const r=await fetch("/api/priorities",{method:existing?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(existing?{id:existing.id,content,status:existing.status}:{priorityDate:localDate(now),priorityRank:rank,content,status:"Not Started"})}),d=await r.json();
    if(r.ok)setPriorities(v=>existing?v.map(p=>p.id===existing.id?d.priority:p):[...v,d.priority].sort((a,b)=>a.priorityRank-b.priorityRank));
    else setNotice(d.error||"Unable to save priority");
  }
  async function updatePriorityStatus(priority:Priority,status:string){
    const r=await fetch("/api/priorities",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:priority.id,status})}),d=await r.json();
    if(r.ok)setPriorities(v=>v.map(p=>p.id===priority.id?d.priority:p));else setNotice(d.error||"Unable to update priority");
  }
  async function movePriority(priority:Priority,direction:-1|1){
    const targetRank=priority.priorityRank+direction;if(targetRank<1||targetRank>3)return;
    const other=priorities.find(p=>p.priorityRank===targetRank),order=[{id:priority.id!,priorityRank:targetRank},...(other?.id?[{id:other.id,priorityRank:priority.priorityRank}]:[])];
    const r=await fetch("/api/priorities",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({order})});
    if(r.ok){setPriorities(v=>v.map(p=>p.id===priority.id?{...p,priorityRank:targetRank}:p.id===other?.id?{...p,priorityRank:priority.priorityRank}:p).sort((a,b)=>a.priorityRank-b.priorityRank));setPriorityDrafts(d=>({...d,[priority.priorityRank]:d[targetRank]||"",[targetRank]:d[priority.priorityRank]||""}));}
  }
  async function deletePriority(priority:Priority){
    const r=await fetch("/api/priorities",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:priority.id})});
    if(r.ok){setPriorities(v=>v.filter(p=>p.id!==priority.id));setPriorityDrafts(d=>({...d,[priority.priorityRank]:""}));}
  }
  async function saveSchedule(payload: Partial<Item>) {
    if (scheduleSaveState === "saving") return false;
    setScheduleSaveState("saving");
    const scheduleDate = String(payload.scheduleDate || localDate(now));
    try {
      const r = await fetch("/api/schedule", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...payload,
            weekStart: weekStartSunday(scheduleDate),
          }),
        }),
        d = await r.json();
      if (r.ok) {
        setItems((v) => [...v, d.item]);
        setNotice("Schedule item added");
        setScheduleSaveState("saved");
        setTimeout(() => setScheduleSaveState("idle"), 1600);
        return true;
      }
      setNotice(d.error || "Unable to save");
      setScheduleSaveState("idle");
      return false;
    } catch {
      setNotice("Unable to save schedule");
      setScheduleSaveState("idle");
      return false;
    }
  }
  async function deleteSchedule(i: Item) {
    if (i.id <= 0 || deletingScheduleId !== null) return;
    setDeletingScheduleId(i.id);
    try {
      const r = await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: i.id }),
      });
      const d = await r.json();
      if (!r.ok) return setNotice(d.error || "Unable to delete schedule job");
      setDeletedScheduleId(i.id);
      setTimeout(() => {
        setItems((v) => v.filter((x) => x.id !== i.id));
        setDeletedScheduleId(null);
      }, 450);
      setNotice("Schedule job deleted");
    } catch {
      setNotice("Unable to delete schedule job");
    } finally {
      setDeletingScheduleId(null);
    }
  }
  async function addActivity() {
    if (!newActivity.trim() || activitySaveState === "saving") return;
    setActivitySaveState("saving");
    try {
      const r = await fetch("/api/activity-options", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: newActivity }),
        }),
        d = await r.json();
      if (r.ok) {
        setOptions((v) =>
          [...v, d.option].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setNewActivity("");
        setActivitySaveState("saved");
        setTimeout(() => setActivitySaveState("idle"), 1600);
      } else {
        setNotice(d.error || "Unable to add");
        setActivitySaveState("idle");
      }
    } catch {
      setNotice("Unable to add activity");
      setActivitySaveState("idle");
    }
  }
  async function deleteActivity(o: Option) {
    await fetch("/api/activity-options", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: o.id }),
    });
    setOptions((v) => v.filter((x) => x.id !== o.id));
  }
  async function importCsv(file: File) {
    const text = await file.text(),
      lines = text.trim().split(/\r?\n/),
      headers = lines[0].split(",").map((x)=>x.trim().toLowerCase()),
      rows = lines.slice(1).map((line) => line.split(",").map(x=>x.trim()));
    let count = 0;
    for (const r of rows) {
      const value=(...names:string[])=>{const index=headers.findIndex(h=>names.includes(h));return index>=0?r[index]||"":""},
        date=value("date","scheduledate"),
        startTime=value("starttime","start time"),
        activityType=value("activitytype","activity type")||"Production",
        format=value("format","kegformat"),
        targetKegs=value("targetkegs","target kegs"),
        durationMinutes=value("durationminutes","duration minutes","plannedminutes"),
        brand=value("brand"),
        description=value("description"),
        jobNumber=value("jobnumber","job number");
      if (!date) continue;
      const saved = await saveSchedule({
        scheduleDate: date,
        dayName: new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "long",
        }),
        startTime,
        activityType: (activityType || "Production") as Item["activityType"],
        kegFormat: format,
        targetKegs: Number(targetKegs),
        plannedMinutes: Number(durationMinutes) || undefined,
        brand,
        description,
        jobNumber,
      });
      if (saved) count++;
    }
    setNotice(`${count} schedule rows imported`);
  }
  return (
    <main className="min-h-screen bg-[#f3f5f2] text-[#10241c]">
      <header className="no-print bg-[#10241c] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-36 items-center justify-center rounded-sm bg-white px-2">
              <img
                src="/ab-inbev-logo.png"
                alt="AB InBev"
                className="h-auto max-h-9 w-full object-contain"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b4c2bb]">
                Enfield · Large Pack
              </p>
              <h1 className="text-lg font-semibold">
                Packaging Management Control and Routine System
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-black">
              {now.toLocaleTimeString("en-GB")}
            </p>
            <p className="text-[10px] text-[#b4c2bb]">
              Next hourly entry{" "}
              {due.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </header>
      {reminder && (
        <div
          className={`no-print flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold ${diff <= 0 ? "bg-[#d94a3a] text-white" : "bg-[#d7ff45]"}`}
        >
          <BellRing size={18} />
          {diff > 0
            ? `Hourly entry due in ${diff} minutes — prepare the SIC update`
            : `Hourly entry is due now — operator input required`}
        </div>
      )}
      <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <WeekSelector
            value={selectedWeek}
            options={weekOptions}
            onChange={setSelectedWeek}
          />
          <TabsList className="no-print mb-5 h-auto flex-wrap bg-white p-1">
            <TabsTrigger value="overview">
              <Gauge />
              Overview
            </TabsTrigger>
            <TabsTrigger value="issues">
              <ShieldAlert />
              Safety & quality
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays />
              Weekly calendar
            </TabsTrigger>
            <TabsTrigger value="entry">
              <ClipboardPlus />
              New record
            </TabsTrigger>
            <TabsTrigger value="hourly">
              <Activity />
              Hourly log
            </TabsTrigger>
            <TabsTrigger value="downtime">
              <Wrench />
              Machine downtime
            </TabsTrigger>
            <TabsTrigger value="summary">
              <Printer />
              Weekly summary
            </TabsTrigger>
              <TabsTrigger value="admin">
                <Settings />
                Admin portal
              </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Planned kegs"
                value={planned.toLocaleString()}
                detail="Weekly calendar target"
              />
              <Kpi
                label="Actual kegs"
                value={actual.toLocaleString()}
                detail={`${planned ? Math.round((actual / planned) * 100) : 0}% attainment`}
              />
              <Kpi
                label="Machine downtime"
                value={`${downTotal} min`}
                detail={`${(downTotal / 60).toFixed(1)} hours`}
              />
              <Kpi
                label="Shift pattern"
                value="06:15 / 14:15"
                detail="Early / Late start"
              />
            </div>
            <div className="grid gap-3 xl:grid-cols-4">
              <section className="border border-[#d6dfd8] bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-end justify-between"><div><h2 className="font-bold">Today&apos;s Top 3</h2><p className="text-xs text-[#68766e]">{today}</p></div><Badge variant="outline">Team edit</Badge></div>
                <div className="space-y-2">
                  {[1,2,3].map(rank=>{const priority=priorities.find(p=>p.priorityRank===rank);return <div key={rank} className="flex items-center gap-2 border-l-4 border-[#e0aa00] bg-[#f7f9f7] p-2">
                    <span className="w-5 text-center text-lg font-black">{rank}</span>
                    <div className="min-w-0 flex-1">
                      <Input className="h-8" value={priorityDrafts[rank]||""} placeholder={`Priority ${rank}`} onChange={e=>setPriorityDrafts(d=>({...d,[rank]:e.target.value}))}/>
                      {priority&&<Select value={priority.status} onChange={v=>updatePriorityStatus(priority,v)} options={["Not Started","In Progress","Completed","Cancelled"]}/>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button aria-label={`Move priority ${rank} up`} title="Move up" size="icon-xs" variant="ghost" onClick={()=>priority&&movePriority(priority,-1)} disabled={!priority||rank===1}><ChevronUp/></Button>
                      <Button aria-label={`Save priority ${rank}`} title="Save" size="icon-xs" variant="ghost" onClick={()=>savePriority(rank)}><Save/></Button>
                      <Button aria-label={`Move priority ${rank} down`} title="Move down" size="icon-xs" variant="ghost" onClick={()=>priority&&movePriority(priority,1)} disabled={!priority||rank===3}><ChevronDown/></Button>
                      {priority&&<Button aria-label={`Delete priority ${rank}`} title="Delete" size="icon-xs" variant="ghost" className="text-red-700" onClick={()=>deletePriority(priority)}><Trash2/></Button>}
                    </div>
                  </div>})}
                </div>
              </section>
              <section className="border border-[#d6dfd8] bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-start justify-between"><div><h2 className="font-bold">Live schedule performance</h2><p className="text-xs text-[#68766e]">{overviewJob?`${overviewJob.jobNumber||"Job"} · ${overviewJob.brand||overviewJob.kegFormat}`:"No production job today"}</p></div>{overviewJob&&<Badge className={!overviewJob.actualStartedAt?"bg-[#68766e]":liveVarianceMinutes<0?"bg-red-700":"bg-[#178c55]"}>{!overviewJob.actualStartedAt?"Awaiting start":liveVarianceMinutes<0?"Delay":"On time"}</Badge>}</div>
                {overviewJob?<div className="grid grid-cols-2 gap-2 text-sm">
                  <Info label="Schedule" value={`${overviewJob.startTime}–${overviewJob.endTime}`}/>
                  <Info label="Speed target" value={`${overviewJob.targetRate} kegs/hr`}/>
                  <Info label="Expected now" value={`${overviewExpected.toLocaleString()} kegs`}/>
                  <Info label="Actual linked" value={`${overviewActual.toLocaleString()} kegs`}/>
                  <div className={`col-span-2 border-l-4 p-3 ${!overviewJob.actualStartedAt?"border-[#8a9890] bg-[#f3f5f2]":liveVarianceMinutes<0?"border-red-600 bg-red-50":"border-[#178c55] bg-[#edf8f1]"}`}><p className="text-[10px] font-bold uppercase">Time difference</p><p className="text-2xl font-black">{!overviewJob.actualStartedAt?"Start job to compare":liveVarianceMinutes<0?`${Math.abs(liveVarianceMinutes)} min delay`:liveVarianceMinutes>0?`${liveVarianceMinutes} min ahead`:"On time"}</p></div>
                </div>:<p className="py-10 text-center text-sm text-[#68766e]">Add or start today&apos;s schedule job to begin comparison.</p>}
              </section>
              <IssueMessageBox
                title="Safety issues"
                issues={safetyIssues}
                onNavigate={() => setActiveTab("issues")}
                compact
              />
              <IssueMessageBox
                title="Quality issues"
                issues={qualityIssues}
                onNavigate={() => setActiveTab("issues")}
                compact
              />
            </div>
            <Panel
              title="Daily shift performance"
              subtitle="Planned vs produced by shift and keg format · Monday to Friday"
            >
              <DailyShiftChart data={shiftPerformance} />
            </Panel>
          </TabsContent>
          <TabsContent value="calendar">
            <Panel
              title="Weekly production calendar"
              subtitle="Planned time includes CIP, meal breaks and carry-over to the next working day"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {days.map((day) => (
                  <section
                    key={day}
                    className="min-h-[380px] border bg-[#f7f9f7]"
                  >
                    <div className="border-b bg-[#e8ede9] p-4 text-lg font-black">
                      {day}
                    </div>
                    <div className="space-y-3 p-3">
                      {weekItems
                        .filter((i) => i.dayName === day)
                        .map((i) => (
                          <article
                            className={`border-l-4 bg-white p-4 text-base shadow-sm ${i.activityType === "Meal Break" ? "border-[#e0aa00]" : i.activityType === "CIP" ? "border-[#2874a6]" : "border-[#178c55]"}`}
                            key={i.id}
                          >
                            <div className="flex justify-between">
                              <Badge variant="outline">{i.activityType || "Production"}</Badge>
                              <span className="text-sm font-bold">
                                {i.activityType === "Production" || !i.activityType ? `${i.kegFormat} · ${i.targetRate}/hr` : `${i.plannedMinutes} min`}
                              </span>
                            </div>
                            <p className="mt-2 font-bold">
                              {i.brand || i.description}
                            </p>
                            <p className="text-sm text-[#66766d]">
                              {i.activityType === "Production" || !i.activityType ? `Job ${i.jobNumber || "—"}` : i.description || i.activityType}
                            </p>
                            <div className="mt-4 border-t pt-3 text-sm">
                              {(i.activityType === "Production" || !i.activityType) && <p><b>{i.targetKegs.toLocaleString()} kegs</b></p>}
                              <p>
                                {i.scheduleDate} {i.startTime} → <b>{i.endDate && i.endDate !== i.scheduleDate ? `${i.endDate} ` : ""}{i.endTime}</b>
                              </p>
                              {i.actualStartedAt && <p className="mt-2 text-xs"><b>Actual start:</b> {formatActualTime(i.actualStartedAt)} · {timeVariance(i.scheduleDate,i.startTime,i.actualStartedAt)}</p>}
                              {i.actualFinishedAt && <p className="text-xs"><b>Actual finish:</b> {formatActualTime(i.actualFinishedAt)} · {timeVariance(i.endDate || i.scheduleDate,i.endTime,i.actualFinishedAt)}</p>}
                            </div>
                            {i.id > 0 && <div className="mt-3 flex gap-2">
                              <Button size="sm" type="button" disabled={Boolean(i.actualStartedAt)||Boolean(jobAction)} onClick={()=>updateJobStatus(i,"start")} className="transition active:scale-95">
                                {jobAction?.id===i.id&&jobAction.action==="start"?(jobAction.phase==="saving"?<LoaderCircle className="animate-spin"/>:<Check className="animate-in zoom-in"/>):<Activity/>}
                                {i.actualStartedAt?"Started":"Start"}
                              </Button>
                              <Button size="sm" type="button" variant="outline" disabled={!i.actualStartedAt||Boolean(i.actualFinishedAt)||Boolean(jobAction)} onClick={()=>updateJobStatus(i,"finish")} className="transition active:scale-95">
                                {jobAction?.id===i.id&&jobAction.action==="finish"?(jobAction.phase==="saving"?<LoaderCircle className="animate-spin"/>:<Check className="animate-in zoom-in"/>):<Check/>}
                                {i.actualFinishedAt?"Finished":"Finish"}
                              </Button>
                            </div>}
                          </article>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </Panel>
          </TabsContent>
          <TabsContent value="hourly">
            <Panel
              title="Short Interval Control"
              subtitle="Real-time operator entries · delete is available for incorrect or duplicate records"
            >
              <DataTable
                logs={weekLogs}
                onDelete={deleteLog}
                onSave={updateLog}
                activityOptions={activityNames}
              />
            </Panel>
          </TabsContent>
          <TabsContent value="downtime">
            <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
              <Panel
                title="Machine downtime by equipment"
                subtitle="Weekly downtime minutes"
              >
                <Chart data={downtime.filter(d => d.machine.trim() && d.machine.trim().toLowerCase() !== "unspecified")} keyName="machine" />
              </Panel>
              <Panel title="Downtime events" subtitle="Latest machine stops">
                <DowntimeEvents logs={performanceLogs.filter(l=>l.downtimeMinutes>0)} onSave={updateLog}/>
              </Panel>
            </div>
          </TabsContent>
          <TabsContent value="summary">
            <section className="summary-print bg-white p-6">
              <div className="mb-5 flex justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.2em]">
                    Enfield Large Pack
                  </p>
                  <h2 className="text-3xl font-black">
                    Weekly Performance Summary
                  </h2>
                  <p className="mt-1 text-sm text-[#68766e]">
                    {formatWeekRange(selectedWeek)}
                  </p>
                </div>
                <div className="no-print flex items-center gap-3">
                  <WeekSelector
                    compact
                    value={selectedWeek}
                    options={weekOptions}
                    onChange={setSelectedWeek}
                  />
                  <Button
                    className="no-print bg-[#10241c]"
                    onClick={() => window.print()}
                  >
                    <Printer />
                    Print / Save PDF
                  </Button>
                </div>
              </div>
              <div className="mb-6 grid grid-cols-4 gap-3">
                <Kpi
                  label="Planned"
                  value={planned.toLocaleString()}
                  detail="kegs"
                />
                <Kpi
                  label="Actual"
                  value={actual.toLocaleString()}
                  detail="kegs"
                />
                <Kpi
                  label="Attainment"
                  value={`${planned ? Math.round((actual / planned) * 100) : 0}%`}
                  detail="actual vs plan"
                />
                <Kpi
                  label="Machine downtime"
                  value={`${downTotal} min`}
                  detail={`${(downTotal / 60).toFixed(1)} hours`}
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <SummaryTable
                  title="Activity utilisation"
                  rows={activities.map((a) => [
                    a.name,
                    String(a.minutes),
                    (a.minutes / 60).toFixed(1),
                  ])}
                />
                <SummaryTable
                  title="Machine downtime"
                  rows={downtime.map((d) => [
                    d.machine,
                    String(d.minutes),
                    (d.minutes / 60).toFixed(1),
                  ])}
                />
              </div>
            </section>
          </TabsContent>
          <TabsContent value="entry">
            <Panel
              title="Real-time hourly record"
              subtitle="Entry point is every hour at :30 from 06:30 to 22:30; reminder begins 10 minutes before"
            >
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Info
                  label="Current clock"
                  value={now.toLocaleTimeString("en-GB")}
                />
                <Info
                  label="Previous input"
                  value={
                    previous
                      ? `${previous.logDate} ${previous.timeSlot}`
                      : "No previous record"
                  }
                />
                <Info
                  label="Next due"
                  value={due.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </div>
              {selectedJob ? (
                <div className="mb-5 grid gap-3 border-l-4 border-[#e0aa00] bg-[#fffbea] p-4 sm:grid-cols-4">
                  <Info
                    label="Scheduled job"
                    value={
                      selectedJob.brand ||
                      selectedJob.description ||
                      "Unnamed job"
                    }
                  />
                  <Info
                    label="Job number"
                    value={selectedJob.jobNumber || "—"}
                  />
                  <Info
                    label="Schedule target"
                    value={`${selectedJob.targetKegs.toLocaleString()} kegs`}
                  />
                  <Info
                    label="Planned time"
                    value={`${selectedJob.scheduleDate} ${selectedJob.startTime}–${selectedJob.endDate && selectedJob.endDate !== selectedJob.scheduleDate ? selectedJob.endDate + " " : ""}${selectedJob.endTime}`}
                  />
                  {activeJob?.id === selectedJob.id && <div className="sm:col-span-4"><Badge className="bg-[#178c55]">Active job · remains selected until Finish is pressed</Badge></div>}
                </div>
              ) : (
                <div className="mb-5 border border-dashed border-[#cbd5ce] bg-[#f7f9f7] p-4 text-sm text-[#68766e]">
                  No schedule job matches today and the selected shift. The
                  format and speed target can still be entered manually.
                </div>
              )}
              <form
                onSubmit={submit}
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <Field label="Shift">
                  <Select
                    value={form.shift}
                    onChange={(v) => f("shift", v)}
                    options={["Early 06:15–14:15", "Late 14:15–22:00"]}
                  />
                </Field>
                <Field label="Schedule job">
                  <select
                    className="h-9 w-full rounded-md border bg-white px-2 text-xs"
                    value={selectedJobId ?? ""}
                    disabled={!scheduledJobs.length || Boolean(activeJob)}
                    onChange={(e) => {
                      const job = scheduledJobs.find(
                        (i) => i.id === Number(e.target.value),
                      );
                      if (job) selectScheduleJob(job);
                    }}
                  >
                    {scheduledJobs.length ? (
                      scheduledJobs.map((job) => (
                        <option value={job.id} key={job.id}>
                          {job.startTime} · {job.brand || job.description} · Job{" "}
                          {job.jobNumber || "—"}
                        </option>
                      ))
                    ) : (
                      <option value="">No matching job</option>
                    )}
                  </select>
                </Field>
                <Field label="Live entry time">
                  <Input readOnly value={now.toLocaleTimeString("en-GB")} />
                </Field>
                <Field label="Keg format">
                  <Select
                    value={form.kegFormat}
                    onChange={(v) => f("kegFormat", v)}
                    options={["30L", "50L"]}
                  />
                </Field>
                <Field label="Speed target">
                  <Input readOnly value={`${form.targetKegs} kegs/hour`} />
                </Field>
                <Field label="Actual kegs">
                  <Input
                    type="number"
                    min="0"
                    value={form.actualKegs}
                    placeholder="Enter actual output"
                    onChange={(e) =>
                      f(
                        "actualKegs",
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Rejected kegs">
                  <Input
                    type="number"
                    min="0"
                    value={form.rejectedKegs}
                    onChange={(e) => f("rejectedKegs", Number(e.target.value))}
                  />
                </Field>
                <Field label="Activity">
                  <Select
                    value={form.activityCategory}
                    onChange={(v) => f("activityCategory", v)}
                    options={activityNames}
                  />
                </Field>
                <Field label="Activity minutes">
                  <div className="rounded-md border border-[#b9d9c6] bg-[#edf8f1] px-3 py-2">
                    <p className="text-lg font-black">
                      {autoActivityMinutes} min
                    </p>
                    <p className="text-[11px] text-[#66766d]">
                      {inputIntervalMinutes} min since previous input −{" "}
                      {calculatedDowntime} min downtime
                    </p>
                  </div>
                </Field>
                <Field label="Machine">
                  <Input
                    value={form.machineName}
                    onChange={(e) => f("machineName", e.target.value)}
                    placeholder="e.g. Filler line 1"
                  />
                </Field>
                <Field label="Calculated downtime">
                  <div
                    className={`rounded-md border px-3 py-2 ${calculatedDowntime > 0 ? "border-[#e5a72b] bg-[#fff8e6]" : "border-[#b9d9c6] bg-[#edf8f1]"}`}
                  >
                    <p className="text-lg font-black">
                      {calculatedDowntime} min
                    </p>
                    <p className="text-[11px] text-[#66766d]">
                      {kegShortfall > 0
                        ? `${kegShortfall} kegs below target · calculated automatically`
                        : "Target achieved · no downtime"}
                    </p>
                  </div>
                </Field>
                <Field label="Reason">
                  <Input
                    value={form.reason}
                    onChange={(e) => f("reason", e.target.value)}
                  />
                </Field>
                <Field label="Notes" wide>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => f("notes", e.target.value)}
                  />
                </Field>
                <Button
                  disabled={saveState === "saving"}
                  className={`min-w-52 bg-[#10241c] transition-all duration-200 active:scale-95 ${saveState === "saved" ? "scale-105 bg-[#178c55]" : ""}`}
                >
                  {saveState === "saving" ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Saving record…
                    </>
                  ) : saveState === "saved" ? (
                    <>
                      <Check className="animate-in zoom-in" />
                      Record saved
                    </>
                  ) : (
                    <>
                      <Save />
                      Save at current time
                    </>
                  )}
                </Button>
              </form>
              {notice && (
                <p className="mt-4 text-sm font-semibold text-[#178c55]">
                  {notice}
                </p>
              )}
            </Panel>
          </TabsContent>
          <TabsContent value="issues">
            <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
              <Panel
                title="Safety & quality message"
                subtitle="Enter a free-text message with date and status"
              >
                <form
                  onSubmit={submitIssue}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <Field label="Date">
                    <Input
                      required
                      type="date"
                      value={issueForm.issueDate}
                      onChange={(e) =>
                        setIssueForm((x) => ({
                          ...x,
                          issueDate: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Issue type">
                    <Select
                      value={issueForm.issueType}
                      onChange={(v) =>
                        setIssueForm((x) => ({
                          ...x,
                          issueType: v as Issue["issueType"],
                        }))
                      }
                      options={["Safety", "Quality"]}
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={issueForm.status}
                      onChange={(v) =>
                        setIssueForm((x) => ({ ...x, status: v }))
                      }
                      options={["Open", "Closed", "Cancelled"]}
                    />
                  </Field>
                  <Field label="Message" wide>
                    <Textarea
                      required
                      className="min-h-32"
                      value={issueForm.description}
                      onChange={(e) =>
                        setIssueForm((x) => ({
                          ...x,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Type the safety or quality message here"
                    />
                  </Field>
                  <Button className="bg-[#10241c]">
                    <Save />
                    Save message
                  </Button>
                </form>
              </Panel>
              <Panel
                title="Safety & quality messages"
                subtitle="Open cases carry forward each week until they are closed or cancelled"
              >
                <div className="space-y-3">
                  {openIssues.map((i) => (
                    <article
                      className={`border-l-4 bg-[#f8faf8] p-4 ${i.issueType === "Safety" ? "border-[#d94a3a]" : "border-[#2874a6]"}`}
                      key={i.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline">{i.issueType}</Badge>
                            <span className="text-xs font-bold">
                              {i.issueDate}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm">
                            {i.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" disabled={issueAction?.id === i.id} onClick={() => updateIssueStatus(i,"Closed")}>
                            {issueAction?.id === i.id && issueAction.status === "Closed" ? (issueAction.phase === "saving" ? <LoaderCircle className="animate-spin" /> : <Check className="animate-in zoom-in duration-300" />) : <Check />}
                            {issueAction?.id === i.id && issueAction.status === "Closed" && issueAction.phase === "saved" ? "Closed" : "Close case"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={issueAction?.id === i.id} onClick={()=>updateIssueStatus(i,"Cancelled")}>
                            {issueAction?.id === i.id && issueAction.status === "Cancelled" ? (issueAction.phase === "saving" ? <LoaderCircle className="animate-spin" /> : <X className="animate-in zoom-in duration-300" />) : <X />}
                            {issueAction?.id === i.id && issueAction.status === "Cancelled" && issueAction.phase === "saved" ? "Cancelled" : "Cancel case"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {openIssues.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#68766e]">
                      No open safety or quality cases.
                    </p>
                  )}
                </div>
              </Panel>
            </div>
            <Panel
              title="Closed / cancelled case history"
              subtitle="Cases resolved in the last 3 months, sorted by close or cancel date"
            >
              <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                {caseHistory.map((i) => (
                  <article className={`border-l-4 bg-[#f8faf8] p-4 ${i.issueType === "Safety" ? "border-[#d94a3a]" : "border-[#2874a6]"}`} key={i.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{i.issueType}</Badge>
                          <Badge variant="secondary">{i.status}</Badge>
                          <span className="text-xs font-bold">Opened {i.issueDate}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{i.description}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#3f4f46]">
                        {i.status} {new Date(String(i.resolvedAt).replace(" ", "T") + (String(i.resolvedAt).includes("Z") ? "" : "Z")).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </article>
                ))}
                {caseHistory.length === 0 && <p className="py-8 text-center text-sm text-[#68766e]">No cases were closed or cancelled in the last 3 months.</p>}
              </div>
              {undatedResolvedCount > 0 && <p className="mt-3 text-xs text-[#68766e]">{undatedResolvedCount} older resolved {undatedResolvedCount === 1 ? "case has" : "cases have"} no recorded resolution date and {undatedResolvedCount === 1 ? "is" : "are"} not included.</p>}
            </Panel>
          </TabsContent>
          {!isAdmin && <TabsContent value="admin"><Panel title="Admin login" subtitle="Sign in to manage schedules and activity options"><form onSubmit={login} className="max-w-sm space-y-4"><Field label="Login ID"><Input required autoComplete="username" value={loginId} onChange={e=>setLoginId(e.target.value)}/></Field><Field label="Password"><Input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></Field>{loginError&&<p role="alert" className="text-red-700">{loginError}</p>}<Button disabled={loginBusy}>{loginBusy?<LoaderCircle className="animate-spin"/>:<LockKeyhole/>}Sign in</Button></form></Panel></TabsContent>}
          {isAdmin && (
            <TabsContent value="admin">
              <Button variant="outline" className="mb-4" onClick={logout}>Sign out of admin</Button>
              {notice && <p role="status" className="mb-4 rounded border bg-white p-3 text-sm">{notice}</p>}
              <AlertDialog open={pendingScheduleDelete !== null} onOpenChange={open => {if (!open) setPendingScheduleDelete(null)}}>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete schedule job?</AlertDialogTitle><AlertDialogDescription>{pendingScheduleDelete?.scheduleDate} · {pendingScheduleDelete?.brand} · Job {pendingScheduleDelete?.jobNumber || "—"}. This removes the schedule job permanently; hourly records are retained.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-700 text-white hover:bg-red-800" onClick={() => {if(pendingScheduleDelete) void deleteSchedule(pendingScheduleDelete)}}>Delete job</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel
                  title="Admin schedule input"
                  subtitle="Only the admin account can write or import schedule data"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Date">
                      <Input
                        type="date"
                        value={adminItem.scheduleDate}
                        onChange={(e) =>
                          setAdminItem((v) => ({
                            ...v,
                            scheduleDate: e.target.value,
                            dayName: new Date(
                              e.target.value + "T12:00:00",
                            ).toLocaleDateString("en-GB", { weekday: "long" }),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Start time">
                      <Input
                        type="time"
                        lang="en-GB"
                        step="60"
                        aria-label="Start time in 24-hour format"
                        value={adminItem.startTime || "06:15"}
                        onChange={(e) =>
                          setAdminItem((v) => ({
                            ...v,
                            startTime: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Schedule type">
                      <Select
                        value={adminItem.activityType || "Production"}
                        onChange={(v) => setAdminItem((x) => ({...x,activityType:v as Item["activityType"],plannedMinutes:v === "Meal Break" ? 30 : v === "CIP" ? 60 : x.plannedMinutes}))}
                        options={["Production","CIP","Meal Break"]}
                      />
                    </Field>
                    {(adminItem.activityType === "Production" || !adminItem.activityType) && <Field label="Format">
                      <Select
                        value={adminItem.kegFormat || "30L"}
                        onChange={(v) =>
                          setAdminItem((x) => ({ ...x, kegFormat: v }))
                        }
                        options={["30L", "50L"]}
                      />
                    </Field>}
                    {(adminItem.activityType === "Production" || !adminItem.activityType) ? <Field label="Target kegs">
                      <Input
                        type="number"
                        min="0"
                        value={adminItem.targetKegs || 0}
                        onChange={(e) =>
                          setAdminItem((x) => ({
                            ...x,
                            targetKegs: Number(e.target.value),
                          }))
                        }
                      />
                    </Field> : <Field label="Duration (minutes)">
                      <Input type="number" min="1" value={adminItem.plannedMinutes || (adminItem.activityType === "Meal Break" ? 30 : 60)} onChange={(e)=>setAdminItem(x=>({...x,plannedMinutes:Number(e.target.value)}))}/>
                    </Field>}
                    <Field label="Brand">
                      <Input
                        value={adminItem.brand || ""}
                        onChange={(e) =>
                          setAdminItem((x) => ({ ...x, brand: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Job number">
                      <Input
                        value={adminItem.jobNumber || ""}
                        onChange={(e) =>
                          setAdminItem((x) => ({
                            ...x,
                            jobNumber: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Description" wide>
                      <Input
                        value={adminItem.description || ""}
                        onChange={(e) =>
                          setAdminItem((x) => ({
                            ...x,
                            description: e.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Button
                      disabled={scheduleSaveState === "saving"}
                      className={`min-w-40 bg-[#10241c] transition-all duration-200 active:scale-95 ${scheduleSaveState === "saved" ? "scale-105 bg-[#178c55]" : ""}`}
                      onClick={() => saveSchedule(adminItem)}
                    >
                      {scheduleSaveState === "saving" ? (
                        <>
                          <LoaderCircle className="animate-spin" />
                          Adding…
                        </>
                      ) : scheduleSaveState === "saved" ? (
                        <>
                          <Check className="animate-in zoom-in" />
                          Schedule added
                        </>
                      ) : (
                        <>
                          <Plus />
                          Add schedule
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-5 border-t pt-4">
                    <p className="mb-2 text-xs font-bold uppercase">
                      Import weekly schedule CSV
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) =>
                        e.target.files?.[0] && importCsv(e.target.files[0])
                      }
                    />
                    <p className="mt-2 text-xs text-[#66766d]">
                      Columns: date, startTime, activityType, format, targetKegs,
                      durationMinutes, brand, description, jobNumber
                    </p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <WeekSelector
                      compact
                      value={selectedWeek}
                      options={weekOptions}
                      onChange={setSelectedWeek}
                    />
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {items
                        .filter(
                          (i) =>
                            i.id > 0 &&
                            inDateRange(i.scheduleDate, selectedWeek, weekEnd),
                        )
                        .sort(
                          (a, b) =>
                            a.scheduleDate.localeCompare(b.scheduleDate) ||
                            a.startTime.localeCompare(b.startTime) ||
                            a.id - b.id,
                        )
                        .map((i) => (
                          <div
                            key={i.id}
                            className={`flex items-center justify-between border p-3 text-sm transition-all duration-300 ${deletedScheduleId === i.id ? "-translate-x-4 scale-95 opacity-0" : "opacity-100"}`}
                          >
                            <span>
                              {i.scheduleDate} · {i.startTime} · {i.activityType || "Production"} · {i.brand || i.description} ·{" "}
                              {i.activityType === "Production" || !i.activityType ? `${i.targetKegs} kegs` : `${i.plannedMinutes} min`}
                            </span>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              disabled={deletingScheduleId === i.id}
                              className="text-[#b83232] transition active:scale-90"
                              onClick={() => {setNotice("");setPendingScheduleDelete(i)}}
                            >
                              {deletingScheduleId === i.id ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="Activity dropdown manager"
                  subtitle="Add or remove the options shown to operators"
                >
                  <div className="flex gap-2">
                    <Input
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      placeholder="New activity"
                    />
                    <Button
                      disabled={activitySaveState === "saving"}
                      className={`min-w-28 transition-all duration-200 active:scale-95 ${activitySaveState === "saved" ? "scale-105 bg-[#178c55] text-white" : ""}`}
                      onClick={addActivity}
                    >
                      {activitySaveState === "saving" ? (
                        <>
                          <LoaderCircle className="animate-spin" />
                          Adding…
                        </>
                      ) : activitySaveState === "saved" ? (
                        <>
                          <Check className="animate-in zoom-in" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {options.map((o) => (
                      <div
                        className="flex items-center justify-between border-b py-2"
                        key={o.id}
                      >
                        <span>{o.name}</span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => deleteActivity(o)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    {options.length === 0 && (
                      <p className="py-4 text-center text-sm text-[#68766e]">
                        No activity options. Add one above.
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex gap-2 bg-[#edf3ee] p-3 text-xs">
                    <LockKeyhole size={16} />
                    <p>
                      Write access is checked on the server against the
                      authenticated admin account.
                    </p>
                  </div>
                </Panel>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}

function nextDue(now: Date) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  const hour=now.getHours(),minute=now.getMinutes();
  if(hour<6){
    d.setHours(6,30,0,0);
  }else if(hour>22 || (hour===22 && minute>30)){
    d.setDate(d.getDate()+1);
    d.setHours(6,30,0,0);
  }else{
    d.setMinutes(30);
    if(minute>30)d.setHours(d.getHours()+1);
    if(d.getHours()>22){
      d.setDate(d.getDate()+1);
      d.setHours(6,30,0,0);
    }
  }
  return d;
}
function shiftForTime(now:Date){
  const minutes=now.getHours()*60+now.getMinutes();
  return minutes>=855&&minutes<=1350
    ? "Late 14:15–22:00"
    : "Early 06:15–14:15";
}
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return localDate(d);
}
function weekStartSunday(date: string) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return localDate(d);
}
function inDateRange(date: string, start: string, end: string) {
  return Boolean(date) && date >= start && date <= end;
}
function isWeekday(date: string) {
  const day = new Date(date + "T12:00:00").getDay();
  return day >= 1 && day <= 5;
}
function normaliseShift(shift: string) {
  return shift.startsWith("Late") ? "Late" : "Early";
}
function countsTowardProduction(log: Log) {
  return log.activityCategory === "Production" || log.activityCategory === "Machine Downtime";
}
function jobOverlapsShift(job:Item,date:string,shift:string){
  const endDate=job.endDate||job.scheduleDate;
  if(job.scheduleDate>date||endDate<date)return false;
  const jobStart=date===job.scheduleDate?minutesFromTime(job.startTime):375,
    jobEnd=date===endDate?minutesFromTime(job.endTime):1320,
    window=normaliseShift(shift)==="Late"?{start:855,end:1320}:{start:375,end:855};
  return Math.min(jobEnd,window.end)>Math.max(jobStart,window.start);
}
function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
function scheduleStamp(date:string,time:string){
  return Math.floor(Date.parse(date+"T00:00:00Z")/86400000)*1440+minutesFromTime(time);
}
function stampParts(stamp:number){
  const day=Math.floor(stamp/1440),minute=((stamp%1440)+1440)%1440;
  return {date:new Date(day*86400000).toISOString().slice(0,10),time:`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`};
}
function normaliseWorkStamp(stamp:number){
  let day=Math.floor(stamp/1440),minute=((stamp%1440)+1440)%1440,weekday=new Date(day*86400000).getUTCDay();
  while(weekday===0||weekday===6){day++;weekday=new Date(day*86400000).getUTCDay();minute=375;}
  if(minute<375) minute=375;
  if(minute>=1320){do{day++;weekday=new Date(day*86400000).getUTCDay();}while(weekday===0||weekday===6);minute=375;}
  return day*1440+minute;
}
function advanceSchedule(date:string,time:string,duration:number,pauses:{start:number;end:number}[]=[]){
  let cursor=normaliseWorkStamp(scheduleStamp(date,time)),remaining=Math.max(0,Math.round(duration));
  while(remaining>0){
    cursor=normaliseWorkStamp(cursor);
    const activePause=pauses.filter(p=>cursor>=p.start&&cursor<p.end).sort((a,b)=>a.end-b.end)[0];
    if(activePause){cursor=activePause.end;continue;}
    const dayEnd=Math.floor(cursor/1440)*1440+1320,
      nextPause=pauses.filter(p=>p.start>cursor&&p.start<dayEnd).sort((a,b)=>a.start-b.start)[0],
      boundary=Math.min(dayEnd,nextPause?.start??dayEnd),
      step=Math.min(remaining,Math.max(0,boundary-cursor));
    if(step===0){cursor=boundary===dayEnd?dayEnd:((nextPause?.end)??cursor+1);continue;}
    cursor+=step;remaining-=step;
  }
  return stampParts(cursor);
}
function calculateEffectiveSchedule(items:Item[]){
  const activities=items.filter(i=>i.activityType==="CIP"||i.activityType==="Meal Break").map(i=>{
    const end=advanceSchedule(i.scheduleDate,i.startTime,Number(i.plannedMinutes)||0);
    return {...i,endDate:end.date,endTime:end.time};
  });
  const pauses=activities.map(i=>({start:scheduleStamp(i.scheduleDate,i.startTime),end:scheduleStamp(i.endDate||i.scheduleDate,i.endTime)}));
  return items.map(i=>{
    if(i.activityType==="CIP"||i.activityType==="Meal Break") return activities.find(a=>a.id===i.id) || i;
    const end=advanceSchedule(i.scheduleDate,i.startTime,Number(i.plannedMinutes)||0,pauses);
    return {...i,activityType:i.activityType||"Production",endDate:end.date,endTime:end.time};
  });
}
function productiveMinutesUntil(job:Item,now:Date,items:Item[]){
  const start=scheduleStamp(job.scheduleDate,job.startTime),
    plannedEnd=scheduleStamp(job.endDate||job.scheduleDate,job.endTime),
    nowStamp=scheduleStamp(localDate(now),now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false})),
    end=Math.min(plannedEnd,nowStamp);
  if(end<=start)return 0;
  const pauses=items.filter(i=>i.activityType==="CIP"||i.activityType==="Meal Break").map(i=>({start:scheduleStamp(i.scheduleDate,i.startTime),end:scheduleStamp(i.endDate||i.scheduleDate,i.endTime)}));
  let minutes=0;
  for(let stamp=start;stamp<end;stamp++){
    const day=Math.floor(stamp/1440),minute=stamp-day*1440,weekday=new Date(day*86400000).getUTCDay();
    if(weekday>=1&&weekday<=5&&minute>=375&&minute<1320&&!pauses.some(p=>stamp>=p.start&&stamp<p.end))minutes++;
  }
  return Math.min(Number(job.plannedMinutes)||0,minutes);
}
function finishVarianceMinutes(date:string,time:string,actual:string){
  const planned=new Date(date+"T"+time+":00");
  return Math.round((planned.getTime()-parseActual(actual).getTime())/60000);
}
function parseActual(value:string){
  return new Date(value.replace(" ","T")+(value.includes("Z")?"":"Z"));
}
function formatActualTime(value:string){
  return parseActual(value).toLocaleString("en-GB",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
}
function timeVariance(date:string,time:string,actual:string){
  const planned=new Date(date+"T"+time+":00"),difference=Math.round((parseActual(actual).getTime()-planned.getTime())/60000);
  if(Math.abs(difference)<1) return "on plan";
  return `${Math.abs(difference)} min ${difference>0?"late":"early"}`;
}
function calculateInputInterval(
  now: Date,
  previous: Log | undefined,
  shift: string,
) {
  if (
    !previous ||
    previous.logDate !== localDate(now) ||
    normaliseShift(previous.shift) !== normaliseShift(shift)
  )
    return 60;
  const [hours, minutes, seconds = 0] = previous.timeSlot
    .split(":")
    .map(Number);
  const previousTime = new Date(now);
  previousTime.setHours(hours, minutes, seconds, 0);
  const elapsed = Math.round((now.getTime() - previousTime.getTime()) / 60000);
  return elapsed > 0 && elapsed <= 480 ? elapsed : 60;
}
function buildDailyShiftPerformance(
  weekStart: string,
  items: Item[],
  logs: Log[],
) {
  const shiftWindows = [
    { name: "Early", start: 375, end: 855 },
    { name: "Late", start: 855, end: 1320 },
  ];
  return [1, 2, 3, 4, 5].flatMap((offset) => {
    const date = addDays(weekStart, offset),
      dayItems = items.filter((i) => (i.activityType === "Production" || !i.activityType) && i.scheduleDate <= date && (i.endDate || i.scheduleDate) >= date),
      dayBreaks = items.filter((i)=>i.activityType==="CIP"||i.activityType==="Meal Break"),
      dayLogs = logs.filter((l) => l.logDate === date),
      dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });
    return shiftWindows.flatMap((window) => {
      const plannedByFormat: Record<string, number> = {};
      for (const item of dayItems) {
        const start = date === item.scheduleDate ? minutesFromTime(item.startTime) : 375,
          end = date === (item.endDate || item.scheduleDate) ? minutesFromTime(item.endTime) : 1320,
          elapsedOverlap = Math.max(
            0,
            Math.min(end, window.end) - Math.max(start, window.start),
          ),
          pausedMinutes = dayBreaks.reduce((total,pause)=>{
            const pauseEndDate=pause.endDate||pause.scheduleDate;
            if(pause.scheduleDate>date||pauseEndDate<date)return total;
            const pauseStart=date===pause.scheduleDate?minutesFromTime(pause.startTime):375,
              pauseEnd=date===pauseEndDate?minutesFromTime(pause.endTime):1320;
            return total+Math.max(0,Math.min(end,window.end,pauseEnd)-Math.max(start,window.start,pauseStart));
          },0),
          productiveMinutes=Math.max(0,elapsedOverlap-pausedMinutes);
        if (productiveMinutes)
          plannedByFormat[item.kegFormat] =
            (plannedByFormat[item.kegFormat] || 0) +
            Math.min(Number(item.targetKegs)||0,productiveMinutes*(Number(item.targetRate)||0)/60);
      }
      const producedByFormat = dayLogs
        .filter((l) => normaliseShift(l.shift) === window.name)
        .reduce(
          (totals, l) => {
            totals[l.kegFormat] =
              (totals[l.kegFormat] || 0) + (Number(l.actualKegs) || 0);
            return totals;
          },
          {} as Record<string, number>,
        );
      const formats = Array.from(
        new Set([
          ...Object.keys(plannedByFormat),
          ...Object.keys(producedByFormat),
        ]),
      ).sort();
      if (!formats.length) formats.push("—");
      return formats.map((format) => {
        const planned = Math.round(plannedByFormat[format] || 0),
          produced = Math.round(producedByFormat[format] || 0);
        return {
          date,
          label: `${dayLabel}|${window.name} ${format}`,
          shift: window.name,
          format,
          planned,
          produced,
          completion: planned ? Math.round((produced / planned) * 100) : 0,
        };
      });
    });
  });
}
function formatWeekRange(start: string) {
  return `${new Date(start + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} – ${new Date(addDays(start, 6) + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}
function calculateDowntime(target: number, actual: number) {
  const rate = Math.max(0, Number(target) || 0),
    output = Math.max(0, Number(actual) || 0);
  return rate > 0 && output < rate
    ? Math.round(((rate - output) / rate) * 60)
    : 0;
}
function Chart({
  data,
  keyName,
}: {
  data: Record<string, unknown>[];
  keyName: string;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#dce3de" vertical={false} />
          <XAxis dataKey={keyName} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="minutes" fill="#178c55" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function DailyShiftChart({
  data,
}: {
  data: {
    date: string;
    label: string;
    shift: string;
    format: string;
    planned: number;
    produced: number;
    completion: number;
  }[];
}) {
  const hasData = data.some((d) => d.planned || d.produced);
  return (
    <div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 18, left: 8, bottom: 54 }}
            barGap={2}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke="#dce3de" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              angle={-35}
              textAnchor="end"
              tick={{ fontSize: 10, fontWeight: 600 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: "Kegs", angle: -90, position: "insideLeft" }}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value, name, item) => {
                const row = item.payload as (typeof data)[number],
                  completion = name === "Produced" ? row.completion : null;
                return [
                  completion === null
                    ? Number(value).toLocaleString()
                    : `${Number(value).toLocaleString()} (${completion}%)`,
                  name,
                ];
              }}
            />
            <Legend verticalAlign="top" align="center" height={40} wrapperStyle={{ paddingBottom: 12 }} />
            <Bar
              dataKey="planned"
              name="Planned"
              fill="#8a9890"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="produced"
              name="Produced"
              fill="#178c55"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasData && (
        <p className="-mt-4 pb-3 text-center text-sm font-semibold text-[#68766e]">
          No planned or produced kegs recorded for this week.
        </p>
      )}
    </div>
  );
}
function DowntimeEvents({logs,onSave}:{logs:Log[];onSave:(log:Log)=>Promise<boolean>}){
 const [editing,setEditing]=useState<Log|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function save(e:FormEvent){e.preventDefault();if(!editing)return;setBusy(true);setMessage("");try{if(await onSave(editing)){setEditing(null);setMessage("Downtime details saved")}else setMessage("Unable to save. Please try again.")}catch{setMessage("Unable to save. Please try again.")}finally{setBusy(false)}}
 return <div>{editing&&<form onSubmit={save} className="mb-4 space-y-3 rounded border bg-[#f7f9f7] p-3"><p className="font-bold">{editing.logDate} {editing.timeSlot}</p><Field label="Machine"><Input value={editing.machineName} onChange={e=>setEditing({...editing,machineName:e.target.value})} placeholder="Equipment name"/></Field><Field label="Downtime reason"><Textarea required value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></Field><div className="flex gap-2"><Button disabled={busy}>{busy?<LoaderCircle className="animate-spin"/>:<Save/>}Save</Button><Button type="button" variant="outline" onClick={()=>setEditing(null)}>Cancel</Button></div></form>}{message&&<p role="status" className="mb-3 text-sm">{message}</p>}<div className="max-h-[480px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b text-left"><th>Time</th><th>Machine</th><th>Minutes</th><th>Reason</th><th>Edit</th></tr></thead><tbody>{logs.map(l=><tr key={l.id} className="border-b"><td className="py-3">{l.logDate} {l.timeSlot}</td><td>{l.machineName.trim()||"Unspecified"}</td><td>{l.downtimeMinutes}</td><td className="max-w-64 whitespace-pre-wrap break-words">{l.reason||l.notes||"—"}</td><td><Button size="icon-sm" variant="ghost" aria-label="Edit downtime details" onClick={()=>{setEditing({...l});setMessage("")}}><Pencil/></Button></td></tr>)}</tbody></table>{!logs.length&&<p className="py-5 text-center">No downtime events this week.</p>}</div></div>
}
function DataTable({
  logs,
  onDelete,
  onSave,
  activityOptions,
}: {
  logs: Log[];
  onDelete: (log: Log) => void;
  onSave: (log: Log) => Promise<boolean>;
  activityOptions: string[];
}) {
  const [editing, setEditing] = useState<Log | null>(null),
    [saving, setSaving] = useState(false);
  const edit = (key: keyof Log, value: string | number) =>
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  async function saveEdit() {
    if (!editing || saving) return;
    setSaving(true);
    if (await onSave(editing)) setEditing(null);
    setSaving(false);
  }
  return (
    <div>
      {editing && (
        <section className="mb-4 border-l-4 border-[#e0aa00] bg-[#fffbea] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-black">Edit hourly record</p>
              <p className="text-xs text-[#66766d]">
                {editing.logDate} · {editing.timeSlot}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              <X />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Actual kegs">
              <Input
                type="number"
                min="0"
                value={editing.actualKegs}
                onChange={(e) => edit("actualKegs", Number(e.target.value))}
              />
            </Field>
            <Field label="Shift">
              <Select
                value={normaliseShift(editing.shift)}
                onChange={(v) => edit("shift", v)}
                options={["Early", "Late"]}
              />
            </Field>
            <Field label="Rejected kegs">
              <Input
                type="number"
                min="0"
                value={editing.rejectedKegs}
                onChange={(e) => edit("rejectedKegs", Number(e.target.value))}
              />
            </Field>
            <Field label="Activity">
              <Select
                value={editing.activityCategory}
                onChange={(v) => edit("activityCategory", v)}
                options={activityOptions}
              />
            </Field>
            <Field label="Activity minutes">
              <Input
                type="number"
                min="0"
                value={editing.activityMinutes}
                onChange={(e) =>
                  edit("activityMinutes", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Machine">
              <Input
                value={editing.machineName}
                onChange={(e) => edit("machineName", e.target.value)}
              />
            </Field>
            <Field label="Downtime reason">
              <Input
                value={editing.reason}
                onChange={(e) => edit("reason", e.target.value)}
              />
            </Field>
            <Field label="Notes" wide>
              <Textarea
                value={editing.notes}
                onChange={(e) => edit("notes", e.target.value)}
              />
            </Field>
          </div>
          <Button
            type="button"
            disabled={saving}
            className="mt-4 bg-[#10241c]"
            onClick={saveEdit}
          >
            {saving ? (
              <>
                <LoaderCircle className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save />
                Save changes
              </>
            )}
          </Button>
        </section>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase">
              {[
                "Date",
                "Real time",
                "Shift",
                "Format",
                "Target",
                "Actual",
                "Performance",
                "Activity",
                "Minutes",
                "Machine",
                "Downtime",
                "Reason",
                "Notes",
                "Correct",
              ].map((h) => (
                <th className="px-2 py-3" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => {
              const performance =
                  l.targetKegs > 0
                    ? Math.round((l.actualKegs / l.targetKegs) * 100)
                    : 0,
                low = performance < 85;
              return (
                <tr
                  className={`border-b ${low ? "bg-[#fff1ef]" : ""}`}
                  key={l.id || i}
                >
                  <td className="px-2 py-3">{l.logDate}</td>
                  <td>{l.timeSlot}</td>
                  <td>{l.shift}</td>
                  <td>{l.kegFormat}</td>
                  <td>{l.targetKegs}</td>
                  <td className="font-bold">{l.actualKegs}</td>
                  <td>
                    <div
                      className={`inline-flex min-w-16 items-center justify-center gap-1 rounded-full px-2 py-1 font-black ${low ? "bg-[#c9342f] text-white" : "bg-[#dff4e6] text-[#17643c]"}`}
                    >
                      {low && <AlertTriangle size={13} />} {performance}%
                    </div>
                    {low && (
                      <p className="mt-1 text-[10px] font-bold uppercase text-[#b52c28]">
                        Performance warning
                      </p>
                    )}
                  </td>
                  <td>{l.activityCategory}</td>
                  <td>{l.activityMinutes}</td>
                  <td>{l.machineName || "—"}</td>
                  <td>{l.downtimeMinutes || 0}</td>
                  <td>{l.reason || "—"}</td>
                  <td>{l.notes || "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-[#17643c] hover:bg-[#edf8f1]"
                        aria-label={`Edit entry at ${l.timeSlot}`}
                        title="Edit hourly record"
                        onClick={() => setEditing({ ...l })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-[#b83232] hover:bg-[#fff0ee] hover:text-[#8f2020]"
                        aria-label={`Delete entry at ${l.timeSlot}`}
                        title="Delete incorrect or duplicate entry"
                        onClick={() => onDelete(l)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function SummaryTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <Panel title={title} subtitle="Weekly total">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Category</th>
            <th>Minutes</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr className="border-b" key={r[0]}>
              {r.map((c, i) => (
                <td
                  className={`py-3 ${i === 0 ? "font-semibold" : ""}`}
                  key={i}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#d6dfd8] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-[#68766e]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border-l-4 border-[#178c55] bg-white p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#65756c]">
        {label}
      </p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-[#68766e]">{detail}</p>
    </article>
  );
}
function WeekSelector({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "" : "no-print mb-4"} flex flex-wrap items-center gap-3 rounded-sm border border-[#d6dfd8] bg-white ${compact ? "p-2" : "p-3"}`}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#607067]">
          Selected week
        </p>
        {!compact && (
          <p className="text-xs text-[#68766e]">
            Sunday to Saturday · performance uses Monday to Friday only
          </p>
        )}
      </div>
      <select
        aria-label="Select week"
        className="h-9 min-w-56 rounded-md border bg-white px-3 text-sm font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((start) => (
          <option value={start} key={start}>
            {formatWeekRange(start)}
          </option>
        ))}
      </select>
    </div>
  );
}
function IssueMessageBox({
  title,
  issues,
  onNavigate,
  compact=false,
}: {
  title: string;
  issues: Issue[];
  onNavigate: () => void;
  compact?:boolean;
}) {
  if(compact)return <section className="border border-[#d6dfd8] bg-white p-3 shadow-sm"><h2 className="font-bold">{title}</h2><p className="mb-2 text-xs text-[#68766e]">Open messages</p><div className="max-h-[210px] space-y-2 overflow-y-auto">{issues.slice(0,3).map(i=><button type="button" onClick={onNavigate} className="block w-full border-l-4 border-red-500 bg-[#fff5f3] p-2 text-left" key={i.id}><span className="text-[10px] font-bold">{i.issueDate}</span><p className="line-clamp-2 text-sm">{i.description}</p></button>)}{!issues.length&&<p className="py-8 text-center text-sm text-[#68766e]">No open messages.</p>}</div></section>;
  return (
    <Panel title={title} subtitle="Latest free-text messages">
      <div className="max-h-64 space-y-3 overflow-y-auto">
        {issues.map((i) => (
          <button
            type="button"
            onClick={onNavigate}
            className={`block w-full rounded-sm border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#178c55] ${i.status === "Open" ? "border-[#e3b3ad] bg-[#fff5f3]" : "border-[#cbd5ce] bg-[#f7f9f7]"}`}
            key={i.id}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold">{i.issueDate}</span>
              <Badge variant={i.status === "Open" ? "destructive" : "outline"}>
                {i.status}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm">{i.description}</p>
          </button>
        ))}
        {issues.length === 0 && (
          <p className="py-6 text-center text-sm text-[#68766e]">
            No messages recorded.
          </p>
        )}
      </div>
    </Panel>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#edf3ee] p-3">
      <p className="text-[10px] font-bold uppercase">{label}</p>
      <p className="font-mono font-bold">{value}</p>
    </div>
  );
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`space-y-1 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-[#607067]">
        {label}
      </span>
      {children}
    </label>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      className="h-9 w-full rounded-md border bg-white px-2 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
