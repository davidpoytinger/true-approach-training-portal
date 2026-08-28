import { createHmac } from "crypto";
function secret(){return process.env.AUTH_SECRET||process.env.CASPIO_CLIENT_SECRET||"";}
export function createSignedPlayerPhotoUrl(playerId:number,ttlSeconds=3600){const exp=Math.floor(Date.now()/1000)+ttlSeconds;const payload=`${playerId}.${exp}`;const sig=createHmac("sha256",secret()).update(payload).digest("hex");return `/api/player-photo/${playerId}?exp=${exp}&sig=${sig}`;}
export function verifySignedPlayerPhoto(playerId:number,exp:number,sig:string){if(!secret()||!Number.isInteger(exp)||exp<Math.floor(Date.now()/1000)||!sig)return false;const expected=createHmac("sha256",secret()).update(`${playerId}.${exp}`).digest("hex");return sig.length===expected.length&&sig===expected;}
