import {json} from './_lib/onemap.js';
export default async function handler(req,res){json(res,200,{ok:true,configured:Boolean(process.env.ONEMAP_EMAIL&&process.env.ONEMAP_PASSWORD)})}
