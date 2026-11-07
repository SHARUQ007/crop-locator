const {buildSync}=require('esbuild');
const {JSDOM}=require('jsdom');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
buildSync({entryPoints:[path.join(root,'components/research-intelligence.tsx')],outfile:path.join(root,'outputs/test/intelligence.cjs'),bundle:true,platform:'node',format:'cjs',jsx:'automatic',packages:'external',logLevel:'silent'});
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLSelectElement','HTMLInputElement','Node','Event'])global[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');const {createRoot}=require('react-dom/client');const {act}=React;
const {ResearchIntelligence}=require(path.join(root,'outputs/test/intelligence.cjs'));
const catalog=require('../data/catalog.json');
const context={crop:'cotton',region:'Maharashtra',period:'baseline',scenario:'ssp245',season:'Kharif',water:'rainfed'};
async function set(el,value){await act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
(async()=>{
const app=createRoot(document.getElementById('root'));
await act(async()=>app.render(React.createElement(ResearchIntelligence,{site:catalog.locations[0],context,evidence:[],onEvidence(){},onScenario(){},onAnalogues(){}})));
assert.match(document.body.textContent,/Temperature change/);
const select=document.querySelector('select');await set(select,'sourcing');
assert.match(document.body.textContent,/Area for target volume/);
const harvest=()=>[...document.querySelectorAll('.intelligence-card')][0].querySelector('strong').textContent;
const original=harvest();await set(document.querySelector('input[type="number"]'),'200');assert.notEqual(harvest(),original,'planned area changes harvest estimate');
await set(select,'transition');assert.match(document.body.textContent,/Break-even yield/);
const breakEven=()=>[...document.querySelectorAll('.intelligence-card')][2].querySelector('strong').textContent;
const before=breakEven();await set(document.querySelector('input[type="number"]'),'50000');assert.ok(parseFloat(breakEven())>parseFloat(before),'higher transition cost raises break-even yield');
await set(select,'trials');assert.equal(document.querySelectorAll('.validation-list article').length,4);assert.match(document.body.textContent,/Variety-level validation/);
await act(async()=>app.unmount());console.log('PASS: decision tools switch focus; supply and break-even calculations respond to inputs; trial evidence gaps render.');
})().catch(e=>{console.error(e);process.exit(1)});
