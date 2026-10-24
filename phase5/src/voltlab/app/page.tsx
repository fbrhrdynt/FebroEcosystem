import {redirect} from 'next/navigation';
import {currentUser} from '../server/auth';
import VoltLab from '../components/VoltLab';
import PublicHome from '../components/PublicHome';
export const dynamic='force-dynamic';
export default async function Page(){let user=null;try{user=await currentUser();}catch{redirect('/login?error=database');}return user?<VoltLab/>:<PublicHome/>;}
