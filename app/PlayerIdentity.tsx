"use client";
import { useState } from "react";

type Props={playerId:number;firstName:string;lastName:string;photoSrc?:string;size?:number;subtitle?:string};
export default function PlayerIdentity({playerId,firstName,lastName,photoSrc,size=64,subtitle}:Props){
  const [failed,setFailed]=useState(false);
  const src=photoSrc??`/api/player-photo/${playerId}`;
  const initials=`${firstName?.[0]??""}${lastName?.[0]??""}`.toUpperCase();
  return <div style={{display:"flex",alignItems:"center",gap:14,margin:"10px 0 22px"}}>
    {!failed?<img src={src} alt={`${firstName} ${lastName}`} onError={()=>setFailed(true)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",background:"#eee",flex:"0 0 auto"}}/>:<div aria-label={`${firstName} ${lastName}`} style={{width:size,height:size,borderRadius:"50%",display:"grid",placeItems:"center",background:"#eee",fontWeight:700,fontSize:Math.max(18,Math.round(size*.34)),flex:"0 0 auto"}}>{initials}</div>}
    <div><h2 style={{margin:0}}>{firstName} {lastName}</h2>{subtitle?<div className="muted" style={{marginTop:3}}>{subtitle}</div>:null}</div>
  </div>;
}
