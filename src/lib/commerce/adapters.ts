import type { NormalizedProduct,ProviderRequest } from "./types";
import { getProvider } from "./registry";
export interface AdapterContext { shopRef:string; locationId:string; }
export interface ListingRef { externalId:string; url:string; }
export interface CommerceAdapter { id:string; createProduct(p:NormalizedProduct,ctx:AdapterContext):ProviderRequest; uploadMedia(p:NormalizedProduct,ctx:AdapterContext):ProviderRequest; setPrice(ref:string,price:number,ctx:AdapterContext):ProviderRequest; setInventory(ref:string,qty:number,ctx:AdapterContext):ProviderRequest; publish(ref:string,ctx:AdapterContext):ProviderRequest; unpublish(ref:string,ctx:AdapterContext):ProviderRequest; listOrders(ctx:AdapterContext):ProviderRequest; fulfillOrder(orderRef:string,tracking:string,ctx:AdapterContext):ProviderRequest; identify(p:NormalizedProduct,seed:number):ListingRef; }
const money=(n:number)=>n.toFixed(2);
function genericAdapter(id:string):CommerceAdapter { const p=getProvider(id); const root=p.protocol==="GraphQL"?"/graphql":""; return {id,
 createProduct:prod=>({method:"POST",endpoint:`${root}/products`,body:{title:prod.title,description:prod.description,price:money(prod.price),tags:prod.tags,variants:prod.variants}}),
 uploadMedia:prod=>({method:"POST",endpoint:`${root}/media`,body:{images:prod.images.map(i=>i.url)}}),
 setPrice:(ref,price)=>({method:"PATCH",endpoint:`${root}/products/${ref}`,body:{price:money(price)}}),
 setInventory:(ref,qty)=>({method:"PATCH",endpoint:`${root}/products/${ref}/inventory`,body:{quantity:qty}}),
 publish:ref=>({method:"POST",endpoint:`${root}/products/${ref}/publish`,body:{channel:"default"}}),
 unpublish:ref=>({method:"POST",endpoint:`${root}/products/${ref}/unpublish`,body:{}}),
 listOrders:()=>({method:"GET",endpoint:`${root}/orders?status=open`}),
 fulfillOrder:(orderRef,tracking)=>({method:"POST",endpoint:`${root}/orders/${orderRef}/fulfillments`,body:{tracking_number:tracking,carrier:"USPS"}}),
 identify:(prod,seed)=>{const ext=`${id.slice(0,3)}_${seed}`;return {externalId:ext,url:`https://${id}.example.com/products/${prod.slug}-${ext}`};}
 }; }
export const BESPOKE_ADAPTERS=["shopify","woocommerce","square","ebay","etsy","printify","printful","amazon","walmart","tiktok","bigcommerce"];
export function getAdapter(id:string):CommerceAdapter{return genericAdapter(id);}
