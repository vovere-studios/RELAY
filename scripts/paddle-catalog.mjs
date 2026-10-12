import { pathToFileURL } from 'node:url';

/** Idempotent sandbox catalog setup. API keys never appear in output. No live writes. */
export async function createSandboxCatalog(env=process.env, transport=fetch) {
 if(env.PADDLE_ENVIRONMENT!=='sandbox'||!env.PADDLE_API_KEY?.startsWith('pdl_sdbx_apikey_'))throw new Error('A sandbox API key and PADDLE_ENVIRONMENT=sandbox are required. Live catalog writes are not supported.');
 const host='https://sandbox-api.paddle.com';
 async function request(path,payload){
  const response=await transport(host+path,{method:payload?'POST':'GET',headers:{Authorization:`Bearer ${env.PADDLE_API_KEY}`,'Content-Type':'application/json','Paddle-Version':'1'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`Paddle catalog request failed (${response.status}). Existing prices were not changed. Rerun after checking the sandbox catalog.`);
  return response.json();
 }
 async function list(path){
  const rows=[];let next=path;
  for(let page=0;page<20;page++){
   const result=await request(next);if(!Array.isArray(result.data))throw new Error('Invalid catalog response.');rows.push(...result.data);
   if(!result.meta?.pagination?.has_more)return rows;
   const url=new URL(result.meta.pagination.next);if(url.origin!==host||url.pathname!==path.split('?')[0])throw new Error('Invalid pagination URL.');next=url.pathname+url.search;
  }
  throw new Error('The catalog is too large for automatic setup.');
 }
 const existingProducts=await list('/products?per_page=200');const output={};
 for(const [plan,name,monthly,annual] of [['core','Core',2900,29000],['pro','Pro',7900,79000]]){
  const matching=existingProducts.filter(product=>product.custom_data?.relay_catalog==='relay-v1'&&product.custom_data.relay_plan===plan);
  if(matching.length>1)throw new Error(`More than one Relay ${name} product exists. Review the sandbox catalog.`);
  let product=matching[0];
  if(!product)product=(await request('/products',{name:`Relay ${name}`,description:`Company workspace subscription. ${plan==='core'?'500 active documents, 1 GB, 5 team members and 50 suppliers.':'5,000 active documents, 10 GB, 15 team members and 250 suppliers.'}`,tax_category:'saas',custom_data:{relay_catalog:'relay-v1',relay_plan:plan}})).data;
  if(!/^pro_[a-z0-9]{26}$/.test(product?.id)||product.status!=='active'||product.tax_category!=='saas')throw new Error('Invalid or archived Relay product.');
  const prices=await list(`/prices?product_id=${product.id}&per_page=200`);
  for(const [cycle,amount,setting] of [['month',monthly,'MONTHLY'],['year',annual,'ANNUAL']]){
   const matches=prices.filter(price=>price.custom_data?.relay_catalog==='relay-v1'&&price.custom_data.relay_cycle===cycle);
   if(matches.length>1)throw new Error(`Duplicate ${name} ${cycle} price. Review the catalog.`);
   let price=matches[0];
   if(!price)price=(await request('/prices',{product_id:product.id,description:`Relay ${name} ${cycle==='year'?'yearly':'monthly'}`,name:`${cycle==='year'?'Yearly':'Monthly'} company plan`,billing_cycle:{interval:cycle,frequency:1},trial_period:null,tax_mode:'external',unit_price:{amount:String(amount),currency_code:'EUR'},quantity:{minimum:1,maximum:1},custom_data:{relay_catalog:'relay-v1',relay_cycle:cycle}})).data;
   if(!/^pri_[a-z0-9]{26}$/.test(price?.id)||price.status!=='active'||price.unit_price?.amount!==String(amount)||price.unit_price.currency_code!=='EUR'||price.tax_mode!=='external'||price.billing_cycle?.interval!==cycle||price.billing_cycle.frequency!==1||price.quantity?.minimum!==1||price.quantity.maximum!==1||price.trial_period)throw new Error(`The existing ${name} ${cycle} price does not match the approved model. No price was overwritten.`);
   output[`PADDLE_${plan.toUpperCase()}_${setting}_PRICE_ID`]=price.id;
  }
 }
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const ids=await createSandboxCatalog();for(const [name,value] of Object.entries(ids))console.log(`${name}=${value}`);}catch(error){console.error(error instanceof Error?error.message:'Catalog setup failed.');process.exitCode=1;}
}
