import { env } from "cloudflare:workers";
type Statement={bind(...values:unknown[]):Statement;all<T>():Promise<{results:T[]}>;first<T>():Promise<T|null>;run():Promise<unknown>};
type D1={prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown>};
const db=()=>(env as unknown as {DB:D1}).DB;
const fields="id, priority_date AS priorityDate, priority_rank AS priorityRank, content, status, created_at AS createdAt, updated_at AS updatedAt";
const statuses=["Not Started","In Progress","Completed","Cancelled"];
export async function GET(request:Request){
  try{
    const date=new URL(request.url).searchParams.get("date")||"";
    const{results}=await db().prepare(`SELECT ${fields} FROM daily_priorities WHERE priority_date=? ORDER BY priority_rank,id`).bind(date).all();
    return Response.json({priorities:results});
  }catch(error){return Response.json({priorities:[],error:error instanceof Error?error.message:"Database unavailable"});}
}
export async function POST(request:Request){
  try{
    const p=await request.json() as Record<string,unknown>,date=String(p.priorityDate||""),content=String(p.content||"").trim(),rank=Number(p.priorityRank);
    if(!date||!content||!Number.isInteger(rank)||rank<1||rank>3)return Response.json({error:"Date, content and rank 1–3 are required"},{status:400});
    const priority=await db().prepare(`INSERT INTO daily_priorities(priority_date,priority_rank,content,status) VALUES(?,?,?,?) RETURNING ${fields}`).bind(date,rank,content,statuses.includes(String(p.status))?String(p.status):"Not Started").first();
    return Response.json({priority},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to save priority"},{status:500});}
}
export async function PATCH(request:Request){
  try{
    const p=await request.json() as Record<string,unknown>;
    if(Array.isArray(p.order)){
      const order=p.order as {id:number;priorityRank:number}[];
      await db().batch(order.map(x=>db().prepare("UPDATE daily_priorities SET priority_rank=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(x.priorityRank),Number(x.id))));
      return Response.json({ok:true});
    }
    const id=Number(p.id),status=String(p.status||"");
    if(!Number.isInteger(id)||id<=0)return Response.json({error:"Valid priority id is required"},{status:400});
    if(p.content!==undefined){
      const content=String(p.content).trim();if(!content)return Response.json({error:"Priority content is required"},{status:400});
      const priority=await db().prepare(`UPDATE daily_priorities SET content=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING ${fields}`).bind(content,statuses.includes(status)?status:"Not Started",id).first();
      return Response.json({priority});
    }
    if(!statuses.includes(status))return Response.json({error:"Invalid status"},{status:400});
    const priority=await db().prepare(`UPDATE daily_priorities SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING ${fields}`).bind(status,id).first();
    return Response.json({priority});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to update priority"},{status:500});}
}
export async function DELETE(request:Request){
  try{const p=await request.json() as {id?:number},id=Number(p.id);if(!Number.isInteger(id)||id<=0)return Response.json({error:"Valid priority id is required"},{status:400});await db().prepare("DELETE FROM daily_priorities WHERE id=?").bind(id).run();return Response.json({ok:true});}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to delete priority"},{status:500});}
}
