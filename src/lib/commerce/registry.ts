import type { Capability,ProviderDescriptor,ProviderKind,Priority,AuthKind } from "./types";
const FULL:Capability[]=["catalog.products.read","catalog.products.write","catalog.products.delete","catalog.variants.read","catalog.variants.write","catalog.media.read","catalog.media.write","catalog.categories.read","catalog.categories.write","catalog.collections.read","catalog.collections.write","pricing.read","pricing.write","pricing.promotions.write","inventory.read","inventory.write","listing.create","listing.update","listing.publish","listing.pause","listing.delete","orders.read","orders.acknowledge","orders.cancel","fulfillment.create","fulfillment.update","fulfillment.tracking","fulfillment.write","returns.read","returns.create","refunds.read","refunds.write","customers.read","customers.write","shipping.read","shipping.labels.write","analytics.sales.read","analytics.catalog.read","webhooks.read","webhooks.write","products.read","products.write","media.write","variants.write","price.write","publish","analytics.read"];
function p(id:string,name:string,kind:ProviderKind,priority:Priority,auth:AuthKind,protocol:ProviderDescriptor["protocol"],baseUrl:string,envKeys:string[],feeRate:number,adapterStatus:ProviderDescriptor["adapterStatus"]="simulated",extra:Capability[]=[]):ProviderDescriptor{return {id,name,kind,priority,auth,protocol,baseUrl,docs:"https://developer.mozilla.org/",control:"excellent",capabilities:[...FULL,...extra],scopes:[],envKeys,feeRate,notes:`${name} commerce adapter`,adapterStatus};}
export const PROVIDERS:ProviderDescriptor[]=[
 p("woocommerce","WooCommerce","oss","P0","basic","REST","https://{store}/wp-json/wc/v3",["WOO_STORE_URL","WOO_CONSUMER_KEY","WOO_CONSUMER_SECRET"],.029,"bespoke"),
 p("shopify","Shopify","storefront","P0","oauth2","GraphQL","https://{shop}.myshopify.com/admin/api/2025-01/graphql.json",["SHOPIFY_SHOP","SHOPIFY_ADMIN_TOKEN"],.029,"bespoke"),
 p("square","Square","storefront","P0","oauth2","REST","https://connect.squareup.com/v2",["SQUARE_ACCESS_TOKEN","SQUARE_LOCATION_ID"],.026,"bespoke"),
 p("ebay","eBay","marketplace","P0","oauth2","REST","https://api.ebay.com/sell/inventory/v1",["EBAY_ACCESS_TOKEN","EBAY_MERCHANT_LOCATION_KEY"],.1325,"bespoke"),
 p("etsy","Etsy","marketplace","P0","oauth2","REST","https://openapi.etsy.com/v3/application",["ETSY_API_KEY","ETSY_ACCESS_TOKEN","ETSY_SHOP_ID"],.065,"bespoke"),
 p("printify","Printify","pod","P0","api_key","REST","https://api.printify.com/v1",["PRINTIFY_API_TOKEN","PRINTIFY_SHOP_ID"],0,"bespoke",["pod.manufacture","manufacturing.catalog.read","manufacturing.product.write","manufacturing.order.write","manufacturing.status.read"]),
 p("printful","Printful","pod","P0","api_key","REST","https://api.printful.com",["PRINTFUL_API_KEY","PRINTFUL_STORE_ID"],0,"bespoke",["pod.manufacture","manufacturing.catalog.read","manufacturing.product.write","manufacturing.order.write","manufacturing.status.read"]),
 p("amazon","Amazon SP-API","marketplace","P1","lwa","REST","https://sellingpartnerapi-na.amazon.com",["AMZ_LWA_CLIENT_ID","AMZ_LWA_CLIENT_SECRET","AMZ_REFRESH_TOKEN","AMZ_SELLER_ID"],.15,"bespoke"),
 p("walmart","Walmart Marketplace","marketplace","P1","oauth2","REST","https://marketplace.walmartapis.com/v3",["WMT_CLIENT_ID","WMT_CLIENT_SECRET"],.15,"bespoke"),
 p("tiktok","TikTok Shop","marketplace","P1","oauth2","REST","https://open-api.tiktokglobalshop.com",["TIKTOK_APP_KEY","TIKTOK_APP_SECRET","TIKTOK_SHOP_CIPHER"],.08,"bespoke"),
 p("bigcommerce","BigCommerce","storefront","P1","api_key","REST","https://api.bigcommerce.com/stores/{hash}/v3",["BIGCOMMERCE_STORE_HASH","BIGCOMMERCE_ACCESS_TOKEN"],.029,"bespoke"),
 p("wix","Wix Stores","storefront","P1","oauth2","REST","https://www.wixapis.com/stores/v1",["WIX_API_KEY","WIX_SITE_ID"],.029),
 p("ecwid","Ecwid / Lightspeed","storefront","P1","oauth2","REST","https://app.ecwid.com/api/v3/{storeId}",["ECWID_STORE_ID","ECWID_TOKEN"],.029),
 p("magento","Magento / Adobe Commerce","oss","P1","oauth2","REST","https://{store}/rest/V1",["MAGENTO_BASE_URL","MAGENTO_TOKEN"],.029),
 p("medusa","Medusa","oss","P1","api_key","REST","https://{host}/admin",["MEDUSA_URL","MEDUSA_ADMIN_TOKEN"],.029),
 p("saleor","Saleor","oss","P1","oauth2","GraphQL","https://{host}/graphql/",["SALEOR_URL","SALEOR_TOKEN"],.029),
 p("vendure","Vendure","oss","P1","api_key","GraphQL","https://{host}/admin-api",["VENDURE_URL","VENDURE_TOKEN"],.029),
 p("shopware","Shopware","oss","P2","oauth2","REST","https://{host}/api",["SHOPWARE_URL","SHOPWARE_TOKEN"],.029),
 p("gelato","Gelato","pod","P2","api_key","REST","https://order.gelatoapis.com/v4",["GELATO_API_KEY"],0,"simulated",["pod.manufacture"]),
 p("gooten","Gooten","pod","P2","api_key","REST","https://api.print.io/api/v/5",["GOOTEN_RECIPE_ID"],0,"simulated",["pod.manufacture"]),
 p("fourthwall","Fourthwall","pod","P2","api_key","REST","https://storefront-api.fourthwall.com/v1",["FOURTHWALL_TOKEN"],.05),
 p("lemonsqueezy","Lemon Squeezy","digital","P2","api_key","REST","https://api.lemonsqueezy.com/v1",["LEMONSQUEEZY_API_KEY"],.05),
 p("gumroad","Gumroad","digital","P2","oauth2","REST","https://api.gumroad.com/v2",["GUMROAD_ACCESS_TOKEN"],.1),
 p("mercadolibre","Mercado Libre","marketplace","P2","oauth2","REST","https://api.mercadolibre.com",["MELI_ACCESS_TOKEN","MELI_SITE_ID"],.13),
 p("allegro","Allegro","marketplace","P2","oauth2","REST","https://api.allegro.pl",["ALLEGRO_TOKEN"],.11),
 p("google_merchant","Google Merchant Center","channel","P1","oauth2","REST","https://shoppingcontent.googleapis.com/content/v2.1",["GMC_MERCHANT_ID","GMC_SERVICE_ACCOUNT_JSON"],0),
 p("meta_commerce","Meta Commerce","channel","P2","oauth2","REST","https://graph.facebook.com/v21.0",["META_CATALOG_ID","META_ACCESS_TOKEN"],.05),
 p("pinterest","Pinterest Catalogs","channel","P2","oauth2","Feed","https://api.pinterest.com/v5",["PINTEREST_TOKEN"],0),
 p("faire","Faire","marketplace","P3","api_key","REST","https://www.faire.com/external-api/v2",["FAIRE_ACCESS_TOKEN"],.15)
];
export const PROVIDER_MAP:Record<string,ProviderDescriptor>=Object.fromEntries(PROVIDERS.map(x=>[x.id,x]));
export function getProvider(id:string){const x=PROVIDER_MAP[id];if(!x)throw new Error(`Unknown provider: ${id}`);return x;}
export function supports(id:string,cap:Capability){return Boolean(PROVIDER_MAP[id]?.capabilities.includes(cap));}
export const SALES_CHANNELS=PROVIDERS.filter(x=>x.capabilities.includes("publish")&&x.kind!=="pod").map(x=>x.id);
export const POD_PROVIDERS=PROVIDERS.filter(x=>x.capabilities.includes("pod.manufacture")).map(x=>x.id);
