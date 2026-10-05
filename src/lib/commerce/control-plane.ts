import { db } from "@/db";
import { apiCalls } from "@/db/schema";
import { getAdapter, type AdapterContext } from "./adapters";
import { getProvider } from "./registry";
import { providerIsAuthenticated } from "@/lib/auth/transports";
import type { Capability,FulfillmentResult,NormalizedProduct,ProviderRequest,ProviderResult } from "./types";
export interface CallContext { runId?:number|null; shopRef?:string; locationId?:string; }
function hashString(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h)}
export function providerMode(providerId:string):"live"|"sandbox" {const p=getProvider(providerId);return p.envKeys.every(k=>Boolean(process.env[k]))?"live":"sandbox";}
export function missingCredentials(providerId:string){return getProvider(providerId).envKeys.filter(k=>!process.env[k]);}
function adapterContext(providerId:string,ctx:CallContext):AdapterContext{return {shopRef:ctx.shopRef??process.env[`${providerId.toUpperCase()}_SHOP_ID`]??"{shop_id}",locationId:ctx.locationId??process.env.SQUARE_LOCATION_ID??"{location_id}"};}
async function execute(providerId:string,capability:Capability,request:ProviderRequest,ctx:CallContext,synth:(seed:number)=>{externalId?:string;url?:string;data:Record<string,unknown>}):Promise<ProviderResult>{
 const provider=getProvider(providerId),mode=providerMode(providerId),started=Date.now(),seed=hashString(`${providerId}:${request.endpoint}:${JSON.stringify(request.body??{})}`)%900000+100000;let result:ProviderResult;
 if(mode==="live"){
  if(!providerIsAuthenticated(providerId)) return {ok:false,mode:"sandbox",statusCode:401,data:{error:"Authentication required for live execution. Provider not certified or missing credentials.",provider:providerId},request,latencyMs:0,message:"Live blocked: authentication transport missing or failed.",simulated:true,plane:"commerce"};
  try{const url=`${provider.baseUrl.replace(/\/$/,"")}${request.endpoint}`;const res=await fetch(url,{method:request.method,headers:{"content-type":"application/json",...(request.headers??{})},body:request.body?JSON.stringify(request.body):undefined});const data=await res.json().catch(()=>({})) as Record<string,unknown>;result={ok:res.ok,mode,statusCode:res.status,data,request,latencyMs:Date.now()-started};}
  catch(err){result={ok:false,mode,statusCode:599,data:{error:String(err)},request,latencyMs:Date.now()-started,message:String(err)}}
 } else {const s=synth(seed);result={ok:true,mode,statusCode:request.method==="POST"?201:200,externalId:s.externalId,url:s.url,data:s.data,request,latencyMs:40+(seed%260),message:`sandbox: missing ${missingCredentials(providerId).join(", ")||"credentials"}`};}
 await db.insert(apiCalls).values({runId:ctx.runId??null,providerId,capability,method:request.method,endpoint:request.endpoint,mode:result.mode,statusCode:result.statusCode,request:(request.body??{}) as Record<string,unknown>,response:result.data,latencyMs:result.latencyMs});return result;
}
export const commerce={
 async createProduct(providerId:string,product:NormalizedProduct,ctx:CallContext={}){const a=getAdapter(providerId),actx=adapterContext(providerId,ctx);return execute(providerId,"products.write",a.createProduct(product,actx),ctx,seed=>{const ref=a.identify(product,seed);return {externalId:ref.externalId,url:ref.url,data:{id:ref.externalId,handle:product.slug,status:"draft"}}});},
 async uploadMedia(providerId:string,product:NormalizedProduct,ctx:CallContext={}){const a=getAdapter(providerId),actx=adapterContext(providerId,ctx);return execute(providerId,"media.write",a.uploadMedia(product,actx),ctx,seed=>({externalId:`media_${seed}`,data:{uploaded:product.images.length,ids:product.images.map((_i,n)=>`media_${seed+n}`)}}));},
 async setPrice(providerId:string,externalId:string,price:number,ctx:CallContext={}){const a=getAdapter(providerId);return execute(providerId,"price.write",a.setPrice(externalId,price,adapterContext(providerId,ctx)),ctx,()=>({externalId,data:{id:externalId,price}}));},
 async setInventory(providerId:string,externalId:string,qty:number,ctx:CallContext={}){const a=getAdapter(providerId);return execute(providerId,"inventory.write",a.setInventory(externalId,qty,adapterContext(providerId,ctx)),ctx,()=>({externalId,data:{id:externalId,available:qty}}));},
 async publish(providerId:string,product:NormalizedProduct,externalId:string,ctx:CallContext={}){const a=getAdapter(providerId);return execute(providerId,"publish",a.publish(externalId,adapterContext(providerId,ctx)),ctx,seed=>{const ref=a.identify(product,seed);return {externalId,url:ref.url,data:{id:externalId,status:"published",url:ref.url}}});},
 async unpublish(providerId:string,product:NormalizedProduct,externalId:string,ctx:CallContext={}){const a=getAdapter(providerId);return execute(providerId,"publish",a.unpublish(externalId,adapterContext(providerId,ctx)),ctx,()=>({externalId,data:{id:externalId,status:"unpublished"}}));},
 async listOrders(providerId:string,ctx:CallContext={}){const a=getAdapter(providerId);return execute(providerId,"orders.read",a.listOrders(adapterContext(providerId,ctx)),ctx,seed=>({data:{count:seed%4,orders:[]}}));},
 async fulfillOrder(providerId:string,orderRef:string,tracking:string,ctx:CallContext={}):Promise<ProviderResult & {fulfillment:FulfillmentResult}>{const a=getAdapter(providerId);const res=await execute(providerId,"fulfillment.write",a.fulfillOrder(orderRef,tracking,adapterContext(providerId,ctx)),ctx,seed=>({externalId:`ful_${seed}`,data:{id:`ful_${seed}`,status:"in_production",tracking}}));return {...res,fulfillment:{externalId:res.externalId??`ful_${orderRef}`,status:"in_production",carrier:"USPS",tracking,cost:0}};}
};
export type Commerce=typeof commerce;
