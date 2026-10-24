import {db} from '../../../../server/db';
import {requireUser,errorResponse} from '../../../../server/auth';
export const dynamic='force-dynamic';
export async function GET(){try{await requireUser(true);const {rows}=await db().query('SELECT a.id,a.action,a.detail,a.created_at,u.email AS actor,t.email AS target FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users t ON t.id=a.target_id ORDER BY a.created_at DESC LIMIT 100');return Response.json({events:rows},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
