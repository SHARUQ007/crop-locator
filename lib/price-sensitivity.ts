export type MarketAssumptions={price:number;yield:number;inputs:number;logistics:number;loss:number;discount:number};
export function sensitivityCase(base:MarketAssumptions,priceChange=0,yieldChange=0){
 const saleableYield=base.yield*(1+yieldChange/100)*(1-base.loss/100);
 const realisedPrice=base.price*(1+priceChange/100)*(1-base.discount/100);
 const cost=base.inputs+base.logistics;
 const revenue=saleableYield*realisedPrice;
 return {saleableYield,realisedPrice,cost,revenue,margin:revenue-cost,breakEvenPrice:saleableYield>0?cost/saleableYield/(1-base.discount/100):null,breakEvenYield:realisedPrice>0?cost/realisedPrice/(1-base.loss/100):null};
}
