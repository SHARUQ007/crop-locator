export type HealthReference = {name:string;kind:'Pest'|'Disease';stage:'Establishment'|'Vegetative'|'Reproductive';check:string;source:string;url:string;geography:string};
const uc=(crop:string)=>`https://ipm.ucanr.edu/agriculture/${crop}/`;
// Curated reference watchlists, not detections or location-specific forecasts.
export const healthReferences:Record<string,HealthReference[]>={
 cotton:[
  {name:'Cotton aphid',kind:'Pest',stage:'Vegetative',check:'Inspect leaf undersides and record colonies, honeydew and beneficial insects.',source:'UC IPM',url:uc('cotton')+'cotton-aphid/',geography:'California, U.S.'},
  {name:'Pink bollworm',kind:'Pest',stage:'Reproductive',check:'Review boll sampling and local pest-surveillance guidance.',source:'UC IPM',url:uc('cotton'),geography:'California, U.S.'},
  {name:'Fusarium wilt',kind:'Disease',stage:'Vegetative',check:'Review field history, variety susceptibility and diagnostic sampling.',source:'UC IPM',url:uc('cotton'),geography:'California, U.S.'},
  {name:'Seedling diseases',kind:'Disease',stage:'Establishment',check:'Record stand establishment and investigate patchy seedling losses.',source:'UC IPM',url:uc('cotton'),geography:'California, U.S.'}
 ],
 maize:[
  {name:'Armyworms',kind:'Pest',stage:'Vegetative',check:'Use the reference guide to identify larvae and document feeding damage.',source:'UC IPM',url:uc('corn'),geography:'California, U.S.'},
  {name:'Corn earworm',kind:'Pest',stage:'Reproductive',check:'Review silk and ear monitoring with a local crop adviser.',source:'UC IPM',url:uc('corn'),geography:'California, U.S.'},
  {name:'Fusarium ear rot',kind:'Disease',stage:'Reproductive',check:'Inspect ears and arrange grain-quality testing where symptoms occur.',source:'UC IPM',url:uc('corn'),geography:'California, U.S.'},
  {name:'Seed rot and damping-off',kind:'Disease',stage:'Establishment',check:'Record germination and patchy stand losses for diagnosis.',source:'UC IPM',url:uc('corn'),geography:'California, U.S.'}
 ],
 soybean:[
  {name:'Soybean aphid',kind:'Pest',stage:'Vegetative',check:'Record live aphids and natural enemies; use the source scouting protocol.',source:'UMN Extension',url:'https://extension.umn.edu/agriculture/crop-production/soybean/soybean-aphid',geography:'Minnesota, U.S.'},
  {name:'Sudden death syndrome',kind:'Disease',stage:'Reproductive',check:'Leaf symptoms can resemble other disorders. Confirm with roots, stems and a diagnostic service.',source:'UMN Extension',url:'https://extension.umn.edu/agriculture/crop-production/soybean/sudden-death-syndrome-on-soybean',geography:'Midwestern U.S.'},
  {name:'Soybean cyst nematode',kind:'Pest',stage:'Establishment',check:'Review soil-test history and locally appropriate diagnostic sampling.',source:'UMN Extension',url:'https://extension.umn.edu/soybean/soybean-pest-management',geography:'Minnesota, U.S.'},
  {name:'Charcoal rot',kind:'Disease',stage:'Reproductive',check:'Use the diagnostic key to distinguish stem and root symptoms.',source:'UMN Extension',url:'https://apps.extension.umn.edu/agriculture/crop-diseases/soybean/diagnostic.html',geography:'Minnesota, U.S.'}
 ],
 sorghum:[
  {name:'Sorghum aphid',kind:'Pest',stage:'Vegetative',check:'Sample leaf populations and use current local thresholds, not presence alone.',source:'Texas A&M AgriLife',url:'https://extensionentomology.tamu.edu/resources/management-guides/sorghum/stem-and-leaf-feeding-insects/',geography:'Texas, U.S.'},
  {name:'Corn leaf aphid',kind:'Pest',stage:'Vegetative',check:'Inspect whorls and use the source to distinguish aphid species.',source:'Texas A&M AgriLife',url:'https://extensionentomology.tamu.edu/wp-content/uploads/2025/05/managing-insect-and-mite-pests-of-texas-sorghum.pdf',geography:'Texas, U.S.'},
  {name:'Anthracnose',kind:'Disease',stage:'Vegetative',check:'Inspect foliage and stems; confirm symptoms and hybrid susceptibility locally.',source:'Texas Plant Disease Handbook',url:'https://plantdiseasehandbook.tamu.edu/food-crops/cereal-crops/grain-sorghum/',geography:'Texas, U.S.'},
  {name:'Fusarium stalk rot',kind:'Disease',stage:'Reproductive',check:'Include stalk health and lodging in pre-harvest checks.',source:'Texas Plant Disease Handbook',url:'https://plantdiseasehandbook.tamu.edu/food-crops/cereal-crops/grain-sorghum/',geography:'Texas, U.S.'}
 ],
 wheat:[
  {name:'Aphids',kind:'Pest',stage:'Vegetative',check:'Identify species and record populations before applying local action thresholds.',source:'UC IPM',url:uc('small-grains'),geography:'California, U.S.'},
  {name:'Armyworms',kind:'Pest',stage:'Reproductive',check:'Review larval identification and damage assessment in the field guide.',source:'UC IPM',url:uc('small-grains'),geography:'California, U.S.'},
  {name:'Stripe rust',kind:'Disease',stage:'Vegetative',check:'Review leaf symptoms, variety resistance and local surveillance reports.',source:'UC IPM',url:uc('small-grains'),geography:'California, U.S.'},
  {name:'Septoria tritici blotch',kind:'Disease',stage:'Vegetative',check:'Use leaf symptoms and diagnostic support to distinguish other blotches.',source:'UC IPM',url:uc('small-grains'),geography:'California, U.S.'}
 ],
 rice:[
  {name:'Planthoppers',kind:'Pest',stage:'Vegetative',check:'Use a locally appropriate identification and field-sampling protocol.',source:'IRRI Rice Knowledge Bank',url:'https://education.irri.org/knowledge-platforms/',geography:'Rice-production reference'},
  {name:'Stem borers',kind:'Pest',stage:'Reproductive',check:'Review crop-stage symptoms and confirm the causal pest in the field.',source:'IRRI Rice Knowledge Bank',url:'https://education.irri.org/knowledge-platforms/',geography:'Rice-production reference'},
  {name:'Rice blast',kind:'Disease',stage:'Vegetative',check:'Consult diagnostic references and local advice on variety susceptibility.',source:'IRRI',url:'https://rice-diseases.irri.org/',geography:'Global rice reference'},
  {name:'Bacterial blight',kind:'Disease',stage:'Vegetative',check:'Distinguish look-alike leaf symptoms with diagnostic support.',source:'IRRI',url:'https://rice-diseases.irri.org/',geography:'Global rice reference'}
 ]
};
