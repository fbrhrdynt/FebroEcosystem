"use client";
import {useEffect,useState} from 'react';
export function FebroLink(){const [enabled,setEnabled]=useState(false);useEffect(()=>{fetch('/api/auth/febro-status').then(r=>r.json()).then(v=>setEnabled(v.enabled===true)).catch(()=>{});},[]);return enabled?<a className="btn" href="/api/auth/febro">Hubungkan Febro Space</a>:null;}
