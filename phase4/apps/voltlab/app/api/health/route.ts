import {db} from '../../../server/db';
export const dynamic='force-dynamic';
export async function GET(){try{await db().query('SELECT 1');return Response.json({status:'ok',version:'2.4.0'});}catch{return Response.json({status:'unavailable'},{status:503});}}
