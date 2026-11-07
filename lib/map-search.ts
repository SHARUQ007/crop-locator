export type SearchBounds={south:number;west:number;north:number;east:number};
/** Accept wrapped longitudes so a viewport crossing the dateline remains searchable. */
export function inSearchBounds(center:readonly number[],bounds:SearchBounds|null) {
 if(!bounds)return true;
 if(center[0]<bounds.south||center[0]>bounds.north)return false;
 if(bounds.east-bounds.west>=360)return true;
 const wrap=(n:number)=>((n+180)%360+360)%360-180;
 const west=wrap(bounds.west),east=wrap(bounds.east),longitude=wrap(center[1]);
 return west<=east?longitude>=west&&longitude<=east:longitude>=west||longitude<=east;
}

/** Weighted by the represented sample area, never by a fabricated district area. */
export function areaWeightedScore(items:readonly {score:number;areaHa:number}[]){
 const valid=items.filter(item=>Number.isFinite(item.score)&&Number.isFinite(item.areaHa)&&item.areaHa>0);
 const areaHa=valid.reduce((sum,item)=>sum+item.areaHa,0);
 return {score:areaHa?valid.reduce((sum,item)=>sum+item.score*item.areaHa,0)/areaHa:null,areaHa,count:valid.length};
}
