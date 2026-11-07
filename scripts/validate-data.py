import json, math
from pathlib import Path
from collections import Counter,defaultdict
root=Path(__file__).resolve().parents[1]
import gzip
raw_path=root/'data/mock-db.json'
raw_bytes=raw_path.read_bytes() if raw_path.exists() else gzip.decompress((root/'public/data/mock-db.json.gz').read_bytes())
db=json.loads(raw_bytes);catalog=json.loads((root/'data/catalog.json').read_text())
crops={x['id'] for x in db['crops']};aezs={x['id'] for x in db['aezs']};locations={x['id'] for x in db['locations']};cells={x['id']:x for x in db['cells']};sources={x['id'] for x in db['sources']}
assert len(crops)==6 and len(cells)==864 and len(locations)==24
assert Counter(c['locationId'] for c in cells.values())==Counter({s:36 for s in locations})
for c in cells.values():
 assert c['aezId'] in aezs and c['locationId'] in locations
 (y0,x0),(y1,x1)=c['bounds'];y,x=c['center']
 assert y0<y<y1 and x0<x<x1
 assert abs((y1-y0)*111320-1000)<1
 assert abs((x1-x0)*111320*math.cos(math.radians(y))-1000)<1
 assert 0<c['soil']['clay']+c['soil']['sand']<100
keys=set();groups=defaultdict(list)
for o in db['observations']:
 key=tuple(o[k] for k in db['meta']['observationKey'])
 assert key not in keys,key
 keys.add(key)
 assert o['cellId'] in cells and o['cropId'] in crops
 assert set(o['sourceIds']).issubset(sources)
 assert (o['periodId']=='baseline')==(o['scenarioId']=='historical')
 assert o['season'] in ['Main season','Kharif','Rabi'] and o['waterRegime'] in ['rainfed','irrigated']
 assert 0<=o['suitability']<=100 and 0<=o['confidence']<=100
 assert o['yieldRange'][0]<=o['yieldTHa']<=o['yieldRange'][1]
 groups[(cells[o['cellId']]['locationId'],o['cropId'],o['periodId'],o['scenarioId'],o['season'],o['waterRegime'])].append(o)
assert len(keys)==864*6*5*3*2==155520
assert len(groups)==4320
for s in catalog['summaries']:
 key=tuple(s[k] for k in ['locationId','cropId','periodId','scenarioId','season','waterRegime'])
 rows=groups[key];assert len(rows)==36
 for metric in ['suitability','yieldTHa','confidence','inputCostINRHa','annualRainfallMm','meanTemperatureC']:
  assert abs(s[metric]-sum(o[metric] for o in rows)/36)<.0051,(key,metric)
 assert round(sum(o['yieldRange'][0] for o in rows)/36,2)==s['yieldRange'][0]
assert raw_bytes==gzip.decompress((root/'public/data/mock-db.json.gz').read_bytes())
slices=list((root/'public/data/observations').glob('*.json'));assert len(slices)==30
for p in slices:
 rows=json.loads(p.read_text());assert len(rows)==5184
 for o in rows:assert p.stem=='-'.join([o['cropId'],o['periodId'],o['scenarioId']])
print('PASS: 155,520 unique records; complete context combinations; valid references; 864 approx. 1 km cells; 4,320 exact aggregates; 30 consistent observation slices.')

def luminance(h):
 vals=[int(h[i:i+2],16)/255 for i in [1,3,5]]
 vals=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals]
 return sum(a*b for a,b in zip(vals,[.2126,.7152,.0722]))
def ratio(a,b):
 x,y=sorted([luminance(a),luminance(b)]);return (y+.05)/(x+.05)
for name,fg,bg in [('Main text','#24372b','#f8f9f5'),('Secondary text','#5f6d58','#f8f9f5'),('Primary button','#ffffff','#24563c'),('Green status','#355f25','#e5eedb'),('Neutral status','#536346','#edf0e6'),('Warning status','#78571b','#faf0db'),('Result metrics','#344f2e','#ffffff'),('Map controls','#3c6030','#ffffff'),('Dark panel supporting text','#b7cba8','#214e3c')]:
 value=ratio(fg,bg);assert value>=4.5,(name,value)
 print(f'PASS: {name}: {value:.2f}:1 contrast')
