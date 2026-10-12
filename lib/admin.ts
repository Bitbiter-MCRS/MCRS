import { env } from "cloudflare:workers";
const encoder = new TextEncoder();
export const adminConfig = () => env as unknown as {ADMIN_PASSWORD?:string;ADMIN_SESSION_SECRET?:string};
async function key(){const secret=adminConfig().ADMIN_SESSION_SECRET;if(!secret)throw new Error("Admin login unavailable");return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
export async function createSession(){const expires=String(Date.now()+8*60*60*1000);const signature=await crypto.subtle.sign("HMAC",await key(),encoder.encode(expires));return expires+"."+Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,"0")).join("")}
export async function isAdmin(request:Request){
 const token=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith("packaging_admin="))?.slice(16);
 if(!token)return false;
 const [expires,signature]=token.split(".");
 if(!/^[0-9]+$/.test(expires)||Number(expires)<=Date.now()||!/^[a-f0-9]{64}$/.test(signature||""))return false;
 try{return await crypto.subtle.verify("HMAC",await key(),Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16)),encoder.encode(expires))}catch{return false}
}
export async function adminOnly(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid request origin"},{status:403});
 return await isAdmin(request)?null:Response.json({error:"Admin login required"},{status:403});
}
