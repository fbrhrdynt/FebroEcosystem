import {NextResponse} from 'next/server';
import {currentUser,errorResponse} from '../../../../server/auth';
import {publicUser} from '../../../../server/policy.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{const u=await currentUser();return NextResponse.json({user:u?publicUser(u):null},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
