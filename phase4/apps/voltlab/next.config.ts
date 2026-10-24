import type {NextConfig} from 'next';
const config:NextConfig={...(process.env.VOLTLAB_DOCKER==='1'?{output:'standalone' as const}:{}),poweredByHeader:false,experimental:{cpus:2},async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}]}};
export default config;
