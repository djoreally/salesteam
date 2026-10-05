import { db } from "@/db";
import { connections, providerCertifications } from "@/db/schema";
import { missingCredentials, providerMode } from "@/lib/commerce/control-plane";
import { PROVIDERS } from "@/lib/commerce/registry";
import { BESPOKE_ADAPTERS } from "@/lib/commerce/adapters";
export async function ensureConnections(){const existing=await db.select().from(connections);const have=new Set(existing.map(c=>c.providerId));const missing=PROVIDERS.filter(p=>!have.has(p.id));if(missing.length)await db.insert(connections).values(missing.map(p=>({providerId:p.id,label:p.name,state:"registered" as const,mode:providerMode(p.id),scopes:p.scopes,credentialsPresent:missingCredentials(p.id).length===0,shopRef:process.env[`${p.id.toUpperCase()}_SHOP_ID`]??null})));return db.select().from(connections);}
export async function authorizedChannels(){const rows=await ensureConnections();return rows.filter(r=>r.state==="production_enabled"||r.state==="certified").map(r=>r.providerId);}
export async function ensureCertifications(){const existing=await db.select().from(providerCertifications);const have=new Set(existing.map(c=>c.providerId));const bespoke=BESPOKE_ADAPTERS.filter((id:string)=>!have.has(id));if(bespoke.length)await db.insert(providerCertifications).values(bespoke.map((id:string)=>({providerId:id,adapterType:"bespoke",certified:false,testsPassed:0,testsTotal:12,notes:"Requires full closed-loop certification before production enabled."})));return db.select().from(providerCertifications);}
