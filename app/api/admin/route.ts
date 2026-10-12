import { isAdmin, adminConfig, createSession } from "@/lib/admin";
const headers={"cache-control":"no-store"};
export async function GET(request:Request){return Response.json({isAdmin:await isAdmin(request)},{headers})}
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Invalid request origin"},{status:403,headers});
 try{const p=await request.json() as {username?:string;password?:string};
 const expected=adminConfig().ADMIN_PASSWORD;
 if(!expected)return Response.json({error:"Admin login unavailable"},{status:503,headers});
 if(p.username!=="admin"||p.password!==expected)return Response.json({error:"Incorrect login ID or password"},{status:401,headers});
 const token=await createSession();
 return Response.json({isAdmin:true},{headers:{...headers,"set-cookie":`packaging_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
 }catch{return Response.json({error:"Unable to sign in"},{status:400,headers})}
}
export async function DELETE(){return Response.json({isAdmin:false},{headers:{...headers,"set-cookie":"packaging_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"}})}
