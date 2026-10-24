import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {db} from '../../../../server/db';
import {checkOrigin,cookieName,cookieOptions,errorResponse} from '../../../../server/auth';
import {hashToken} from '../../../../server/crypto.mjs';
export async function POST(req:Request){try{checkOrigin(req);const token=(await cookies()).get(cookieName())?.value;if(token)await db().query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]);const response=NextResponse.json({ok:true});response.cookies.set(cookieName(),'',{...cookieOptions(),maxAge:0});return response;}catch(e){return errorResponse(e);}}
