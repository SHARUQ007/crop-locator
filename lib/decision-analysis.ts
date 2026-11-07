import { getRecord, getSite, type Candidate, type Context, type Evidence, type Observation } from './model';
export const candidateKey = (candidate: Candidate) => `${candidate.siteId}:${candidate.cropId}`;
export const candidateColors = ['#327653', '#517bb3', '#af7938'];
export type StressInputs = { pricePct: number; yieldPct: number; inputPct: number; logistics: number; transition: number; lossPct: number };
export const defaultStress: StressInputs = { pricePct: 0, yieldPct: 0, inputPct: 0, logistics: 6500, transition: 0, lossPct: 0 };
export type DecisionWeights = { fit: number; resilience: number; economics: number; evidence: number };
export const defaultWeights: DecisionWeights = { fit: 40, resilience: 30, economics: 20, evidence: 10 };
export function economics(record: Observation, inputs: StressInputs) {
  const price = record.priceINRTonne * (1 + inputs.pricePct / 100);
  const yieldMean = record.yieldTHa * (1 + inputs.yieldPct / 100);
  const sellableYield = yieldMean * (1 - inputs.lossPct / 100);
  const inputCost = record.inputCostINRHa * (1 + inputs.inputPct / 100);
  const totalCost = inputCost + inputs.logistics + inputs.transition;
  const margin = sellableYield * price - totalCost;
  return { price, yieldMean, sellableYield, inputCost, totalCost, margin, breakEvenYield: totalCost / (price * (1 - inputs.lossPct / 100)), lowMargin: record.yieldRange[0] * (1 + inputs.yieldPct / 100) * (1 - inputs.lossPct / 100) * price - totalCost, highMargin: record.yieldRange[1] * (1 + inputs.yieldPct / 100) * (1 - inputs.lossPct / 100) * price - totalCost };
}
export function analyseCandidates(candidates: Candidate[], context: Context, evidence: Evidence[], stress: StressInputs, weights: DecisionWeights, minFit = 60, maxDrought = 60) {
  const base = candidates.map(candidate => {
    const record = getRecord(candidate.siteId, context, candidate.cropId);
    const attached = evidence.filter(item => item.locationId === candidate.siteId && item.cropId === candidate.cropId);
    const evidenceChecks = [attached.some(e => /soil/i.test(e.type)), attached.some(e => /trial/i.test(e.type)), attached.some(e => e.yield !== undefined)];
    return { candidate, record, economic: economics(record, stress), attached, evidenceChecks, resilience: 100 - (record.heatRisk + record.droughtRisk) / 2 };
  });
  const margins = base.map(item => item.economic.margin), minMargin = Math.min(...margins), maxMargin = Math.max(...margins);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return base.map(item => {
    const scores = { fit: item.record.suitability, resilience: item.resilience, economics: maxMargin === minMargin ? 50 : 100 * (item.economic.margin - minMargin) / (maxMargin - minMargin), evidence: 100 * item.evidenceChecks.filter(Boolean).length / 3 };
    const contributions = Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, totalWeight ? score * weights[key as keyof DecisionWeights] / totalWeight : 0])) as DecisionWeights;
    const dominated = base.some(other => other !== item && other.record.suitability >= item.record.suitability && other.economic.margin >= item.economic.margin && other.resilience >= item.resilience && (other.record.suitability > item.record.suitability || other.economic.margin > item.economic.margin || other.resilience > item.resilience));
    const constraints = [item.record.suitability < minFit ? `Fit below ${minFit}` : '', item.record.droughtRisk > maxDrought ? `Drought above ${maxDrought}` : ''].filter(Boolean);
    return { ...item, scores, contributions, totalWeight, decisionScore: Object.values(contributions).reduce((a,b)=>a+b,0), frontier: !dominated, constraints };
  });
}
export function distanceKm(siteA: string, siteB: string) {
  const a = getSite(siteA).center, b = getSite(siteB).center, radians = Math.PI / 180;
  const value = Math.sin((b[0]-a[0])*radians/2)**2 + Math.cos(a[0]*radians)*Math.cos(b[0]*radians)*Math.sin((b[1]-a[1])*radians/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0,1-value)));
}
export function pairwiseExposure(candidates: Candidate[]) {
  return candidates.flatMap((a,index) => candidates.slice(index+1).map(b => ({ a,b,distance:distanceKm(a.siteId,b.siteId),sameSite:a.siteId===b.siteId,sameCountry:getSite(a.siteId).country===getSite(b.siteId).country,sameZone:getSite(a.siteId).aezId===getSite(b.siteId).aezId })));
}
