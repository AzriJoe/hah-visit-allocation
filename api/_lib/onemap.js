let cachedToken=null;
let cachedExpiry=0;
export async function getToken(){
  const now=Math.floor(Date.now()/1000);
  if(cachedToken&&cachedExpiry-now>300)return cachedToken;
  const email=process.env.ONEMAP_EMAIL,password=process.env.ONEMAP_PASSWORD;
  if(!email||!password)throw new Error('OneMap credentials are not configured.');
  const r=await fetch('https://www.onemap.gov.sg/api/auth/post/getToken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await r.json();
  if(!r.ok||!data.access_token)throw new Error(data.error||'Unable to authenticate with OneMap.');
  cachedToken=data.access_token;cachedExpiry=Number(data.expiry_timestamp)||now+250000;return cachedToken;
}
export function json(res,status,data){res.status(status).setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data))}
