import json, math, random
from pathlib import Path
rng=random.Random(42)
crops=[
 dict(id='cotton',name='Cotton',scientificName='Gossypium hirsutum',category='Fibre',season='Kharif',icon='cotton',temperature=[21,32],rainfall=[600,1100],ph=[6,8],baseYield=2.6,price=72000,inputCost=94500,description='Explore warm, well-drained growing environments for fibre sourcing and variety trials.'),
 dict(id='maize',name='Maize',scientificName='Zea mays',category='Cereal',season='Kharif',icon='maize',temperature=[18,30],rainfall=[500,900],ph=[5.8,7.5],baseYield=6.2,price=23500,inputCost=82500,description='Screen environments for grain production, seed multiplication and sourcing.'),
 dict(id='soybean',name='Soybean',scientificName='Glycine max',category='Oilseed',season='Kharif',icon='soybean',temperature=[20,30],rainfall=[600,1000],ph=[6,7.5],baseYield=2.4,price=49000,inputCost=61000,description='Find suitable monsoon environments and compare diversification opportunities.'),
 dict(id='sorghum',name='Sorghum',scientificName='Sorghum bicolor',category='Cereal',season='Rabi',icon='sorghum',temperature=[25,34],rainfall=[400,750],ph=[5.5,8],baseYield=3.1,price=34000,inputCost=54000,description='Explore resilient cereal options in warmer, lower-rainfall environments.'),
 dict(id='wheat',name='Wheat',scientificName='Triticum aestivum',category='Cereal',season='Rabi',icon='wheat',temperature=[12,25],rainfall=[450,650],ph=[6,7.5],baseYield=4.8,price=26500,inputCost=73500,description='Compare cool-season growing environments and irrigation trade-offs.'),
 dict(id='rice',name='Rice',scientificName='Oryza sativa',category='Cereal',season='Kharif',icon='rice',temperature=[20,35],rainfall=[1000,1800],ph=[5.5,7],baseYield=5.4,price=25000,inputCost=94000,description='Screen wetter environments with explicit water and soil constraints.')]
locs=[
 ('jalgaon','Jalgaon','Maharashtra',21.0077,75.5626,35,92,763,27.2,7.3,32),
 ('akola','Akola','Maharashtra',20.7002,77.0082,35,89,825,26.7,7.1,48),
 ('wardha','Wardha','Maharashtra',20.7453,78.6022,41,87,1018,26.4,6.8,54),
 ('amravati','Amravati','Maharashtra',20.9374,77.7796,35,85,901,26.1,7.0,42),
 ('yavatmal','Yavatmal','Maharashtra',20.3899,78.1307,41,82,1051,26.5,6.6,67),
 ('nashik','Nashik','Maharashtra',20.0063,73.7898,27,77,728,24.5,6.5,84),
 ('dharwad','Dharwad','Karnataka',15.4589,75.0078,52,88,841,25.7,6.7,38),
 ('raichur','Raichur','Karnataka',16.212,77.3439,58,84,654,28.3,7.6,51),
 ('belagavi','Belagavi','Karnataka',15.8497,74.4977,52,81,1167,24.8,6.3,64),
 ('adilabad','Adilabad','Telangana',19.6765,78.5322,41,90,1062,27.3,7.2,40),
 ('warangal','Warangal','Telangana',17.9689,79.5941,63,86,992,28.1,6.9,57),
 ('nizamabad','Nizamabad','Telangana',18.6725,78.0941,63,83,1035,27.8,7.1,46)]

# Representative global growing regions, not exhaustive global coverage.
locs.extend([
 ('mato-grosso','Mato Grosso','Mato Grosso',-13.05,-55.91,81,96,1350,26.1,6.4,28),
 ('bahia','Western Bahia','Bahia',-12.09,-45.79,81,93,1120,25.9,6.2,44),
 ('mississippi','Mississippi Delta','Mississippi',33.4,-90.8,82,91,1280,23.7,6.8,22),
 ('texas','Texas High Plains','Texas',33.58,-101.85,35,79,480,23.2,7.3,36),
 ('namoi','Namoi Valley','New South Wales',-30.32,149.78,35,83,630,24.6,7.2,25),
 ('darling-downs','Darling Downs','Queensland',-27.18,151.25,35,86,680,24.1,7.0,30),
 ('xinjiang','Aksu, Xinjiang','Xinjiang',41.16,80.26,83,65,120,23.5,7.7,41),
 ('punjab','Southern Punjab','Punjab',29.4,71.7,83,81,410,28.2,7.6,35),
 ('adana','Çukurova','Adana',37.0,35.32,84,85,650,24.0,7.3,20),
 ('nile-delta','Nile Delta','Nile Delta',30.9,31.0,83,61,190,25.3,7.5,18),
 ('alibori','Alibori','Alibori',11.13,2.93,81,89,1010,27.3,6.4,58),
 ('sikasso','Sikasso','Sikasso',11.32,-5.67,81,87,1120,27.0,6.2,67),
])
country_by_id={'mato-grosso':'Brazil','bahia':'Brazil','mississippi':'United States','texas':'United States','namoi':'Australia','darling-downs':'Australia','xinjiang':'China','punjab':'Pakistan','adana':'Turkey','nile-delta':'Egypt','alibori':'Benin','sikasso':'Mali'}
season_windows={'Brazil':'Nov–May','United States':'Apr–Oct','Australia':'Oct–Apr','China':'Apr–Oct','Pakistan':'Apr–Nov','Turkey':'Apr–Nov','Egypt':'Mar–Oct','Benin':'May–Nov','Mali':'May–Nov','India':'Jun–Jan'}

locations=[];cells=[];observations=[]
aezs=[dict(id=f'AEZ-{n}',name=name,classification=cls,color=color) for n,name,cls,color in [(35,'Central Deccan plateau','Warm semi-arid · deep clay','#9188bc'),(41,'Eastern Deccan uplands','Warm sub-humid · mixed clay','#63a7a0'),(27,'Western plateau & hills','Mild semi-arid · loam','#ccad74'),(52,'Northern Karnataka plateau','Warm sub-humid · clay loam','#b4a2bc'),(58,'Krishna basin','Hot semi-arid · clay','#91a8bc'),(63,'Telangana plateau','Hot sub-humid · red loam','#b7a16e')]]
aezs.extend([dict(id='AEZ-81',name='Tropical savannah',classification='Warm seasonal tropics · mixed loam',color='#c18039'),dict(id='AEZ-82',name='Humid subtropical plains',classification='Warm humid · alluvial loam',color='#488da5'),dict(id='AEZ-83',name='Arid irrigated plains',classification='Hot arid · irrigation dependent',color='#ad6f8d'),dict(id='AEZ-84',name='Mediterranean lowlands',classification='Warm dry summer · alluvial clay',color='#8867b1')])
periods=[dict(id='baseline',label='Baseline',range='2021–2025',kind='historical',delta=0),dict(id='2030s',label='2030s',range='2026–2045',kind='projection',delta=1.1),dict(id='2050s',label='2050s',range='2046–2065',kind='projection',delta=2.3)]
for ix,(lid,name,region,lat,lon,aez,fit,rain,temp,ph,dist) in enumerate(locs):
 locations.append(dict(id=lid,name=name,region=region,country=country_by_id.get(lid,'India'),growingWindow=season_windows[country_by_id.get(lid,'India')],center=[lat,lon],aezId=f'AEZ-{aez}',sampledAreaHa=3600,cellCount=36,roadKm=dist,portKm=420+ix*43,processorCount=6+ix%5,soilType='Deep black clay' if aez in [35,41] else 'Clay loam',validated=ix in [0,2,6],description=f'A representative 36-cell sample near {name}. Coverage is illustrative, not a complete district assessment.'))
 for row in range(6):
  for col in range(6):
   cy=lat+(row-2.5)/111.32;cx=lon+(col-2.5)/(111.32*math.cos(math.radians(lat)))
   h=.5/111.32;w=.5/(111.32*math.cos(math.radians(cy)))
   prefix={'India':'IN','Brazil':'BR','United States':'US','Australia':'AU','China':'CN','Pakistan':'PK','Turkey':'TR','Egypt':'EG','Benin':'BJ','Mali':'ML'}[country_by_id.get(lid,'India')]
   cellid=f'{prefix}-{lid.upper()}-{row:02}{col:02}'
   soilph=round(ph+rng.uniform(-.3,.3),1)
   cells.append(dict(id=cellid,locationId=lid,aezId=f'AEZ-{aez}',resolutionM=1000,areaHa=100,center=[round(cy,6),round(cx,6)],bounds=[[round(cy-h,6),round(cx-w,6)],[round(cy+h,6),round(cx+w,6)]],soil=dict(ph=soilph,clay=round(38+rng.uniform(-7,10),1),sand=round(32+rng.uniform(-6,8),1),organicCarbon=round(.72+rng.uniform(-.15,.4),2),bulkDensity=round(1.31+rng.uniform(-.08,.12),2)),elevationM=round(260+ix*22+rng.uniform(-30,30)),slopePct=round(rng.uniform(.3,3.8),1)))
   cell_variation=rng.uniform(-6,4)
   for ci,crop in enumerate(crops):
    cropfit=fit if ci==0 else [0,fit-8+(ix%3)*5,fit-3+(ix%2)*6,fit-10+(ix%3)*4,fit-22+(ix%3)*8,fit-25+(ix%4)*7][ci]
    for pi,p in enumerate(periods):
     for scenario in (['historical'] if pi==0 else ['ssp245','ssp585']):
      for season in ['Main season','Kharif','Rabi']:
       for water in ['rainfed','irrigated']:
        penalty=0 if season=='Main season' or season==crop['season'] else (8 if ci==3 else 17)
        water_bonus=(19 if aez==83 else 8 if rain<700 else 3) if water=='irrigated' else 0
        dt=p['delta']*(1.35 if scenario=='ssp585' else 1)
        score=round(max(22,min(97,cropfit+cell_variation-penalty-dt*(2.3+ci*.2)+water_bonus)))
        expected=round(crop['baseYield']*(score/88)*(1.15 if water=='irrigated' else 1),2)
        irrigation=round(max(0,(crop['rainfall'][0]-rain*.68)+dt*45+(260 if ci==5 else 0))*(.35 if water=='rainfed' else 1))
        yieldlow=round(expected*.82,2);yieldhigh=round(expected*1.15,2)
        observations.append(dict(cellId=cellid,cropId=crop['id'],periodId=p['id'],scenarioId=scenario,season=season,waterRegime=water,suitability=score,confidence=round(77+(ix%3)*5+cell_variation/2),yieldTHa=expected,yieldRange=[yieldlow,yieldhigh],annualRainfallMm=round(rain*(1-pi*.04)+cell_variation*8),meanTemperatureC=round(temp+dt+cell_variation*.06,1),supplementalWaterMm=irrigation,heatRisk=round(max(8,min(90,15+max(0,temp-24)*4+dt*12+ci*2))),droughtRisk=round(max(8,min(95,55-(rain-500)/18+dt*9+ci*2-(12 if water=='irrigated' else 0)))),inputCostINRHa=round((crop['inputCost']+(15000 if water=='irrigated' else 0))*(1+pi*.1)),priceINRTonne=crop['price'],sourceIds=['mock-environment-v1','mock-florakb-v1'],modelVersion='demo-1.0'))
db=dict(meta=dict(version='1.0',generatedAt='2026-11-07',synthetic=True,notice='All numerical values and AEZ assignments are synthetic demo data. Not SBSF production outputs or FAO GAEZ estimates. Cell extents approximate 1 km square in local geographic coordinates. Real SBSF 1 km resolution is under development.',units=dict(yieldTHa='tonnes / hectare',rainfall='mm / year',temperature='°C',inputCost='INR / hectare / season'),observationKey=['cellId','cropId','periodId','scenarioId','season','waterRegime']),crops=crops,aezs=aezs,periods=periods,locations=locations,cells=cells,observations=observations,sources=[dict(id='mock-environment-v1',name='Environmental screening',version='demo-1.0',type='Synthetic',description='Seeded illustrative soil, climate and terrain values; no live external feed.'),dict(id='mock-florakb-v1',name='Crop requirements',version='demo-1.0',type='Synthetic',description='Illustrative species-level crop requirements inspired by the supplied SBSF leaflets. Not a production FloraKB connection.')])
Path('data/mock-db.json').write_text(json.dumps(db,separators=(',',':')))
print(f'{len(crops)} crops | {len(aezs)} AEZ classes | {len(cells)} 1 km cells | {len(observations)} observations')
from collections import defaultdict
Path('public/data/observations').mkdir(parents=True,exist_ok=True)
lookup={c['id']:c['locationId'] for c in cells}
groups=defaultdict(list)
slices=defaultdict(list)
for o in observations:
 groups[(lookup[o['cellId']],o['cropId'],o['periodId'],o['scenarioId'],o['season'],o['waterRegime'])].append(o)
 slices[(o['cropId'],o['periodId'],o['scenarioId'])].append(o)
metrics=['suitability','confidence','yieldTHa','annualRainfallMm','meanTemperatureC','supplementalWaterMm','heatRisk','droughtRisk','inputCostINRHa','priceINRTonne']
summaries=[]
for key,items in groups.items():
 v=dict(zip(['locationId','cropId','periodId','scenarioId','season','waterRegime'],key))
 for k in metrics: v[k]=round(sum(i[k] for i in items)/len(items),2)
 v['yieldRange']=[round(sum(i['yieldRange'][j] for i in items)/len(items),2) for j in [0,1]]
 summaries.append(v)
for key,items in slices.items(): Path('public/data/observations/'+'-'.join(key)+'.json').write_text(json.dumps(items,separators=(',',':')))
catalog={k:v for k,v in db.items() if k!='observations'}
catalog['summaries']=summaries
catalog['growingEvidence']=[dict(cropId='cotton',country=c,scope='Country',source='USDA Foreign Agricultural Service',url='https://fas.usda.gov/data/production/commodity/2631000',note='Documented cotton-producing country. This does not verify cultivation in any selected 1 km cell.') for c in sorted(set(l['country'] for l in locations))]
catalog['downloadBytes']=Path('data/mock-db.json').stat().st_size
Path('data/catalog.json').write_text(json.dumps(catalog,separators=(',',':')))
import shutil
import gzip
with gzip.open('public/data/mock-db.json.gz','wb',compresslevel=9) as f:f.write(Path('data/mock-db.json').read_bytes())
Path('public/data/mock-db.json').unlink(missing_ok=True)
print(f'{len(summaries)} location summaries, {len(slices)} lazy-loaded observation slices')
