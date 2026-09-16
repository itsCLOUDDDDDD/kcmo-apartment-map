import {recordedUnits} from './presentation.js?v=detail-gallery-20260915-r1';

const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const positive=value=>amount(value)&&value>0;
const dollars=value=>'$'+value.toLocaleString('en-US',{maximumFractionDigits:2});
const bedroomLabel=beds=>beds===0?'Studio':Number.isInteger(beds)&&beds>0?`${beds}BR`:'Beds unverified';

function optionsFor(property,selectedUnit) {
  if(selectedUnit)return [selectedUnit];
  const units=recordedUnits(property);
  if(units.length)return units;
  const research=property.oneBedroom?.offered===false
    ?property.threeBedroom||property.twoBedroom
    :property.oneBedroom;
  return research?[{...research,research:true}]:[];
}

function estimate(property,option) {
  const standard=property.oneBedroom?.standard, costs={...property.costs,...option.costs};
  const allowance=Object.hasOwn(option,'utilityAllowance')?option.utilityAllowance:property.oneBedroom?.utilityAllowance;
  const utility=amount(allowance)?allowance:costs.electricityEstimate;
  const utilityType=amount(allowance)?'recorded utility allowance':'recorded electricity planning estimate';
  const reasons=[];
  if(!Number.isInteger(option.beds)||option.beds<0)reasons.push('bedroom count unverified');
  if(!positive(option.rent))reasons.push('exact rent unverified');
  if(!positive(standard))reasons.push('recorded 1BR payment standard unverified');
  if(!amount(utility))reasons.push('utility amount unverified');
  if(!amount(costs.requiredMonthlyFees))reasons.push('required monthly fees unverified');
  if(option.offered===false||/UNCONFIRMED BUILDING|unconfirmed.*building/i.test(option.evidence||''))reasons.push('apartment attribution unverified');
  // A prose record containing several unit identifiers cannot safely assign its first rent to every unit.
  if(option.structured===false&&new Set([...String(option.evidence||'').matchAll(/#([\w-]+)/g)].map(match=>match[1])).size>1)reasons.push('individual apartment figures unverified');
  if(reasons.length)return {reasons};
  // Match the worksheet's rent + utility + monthly-fee calculation, but never turn unknown fees into zero.
  const gross=option.rent+utility+costs.requiredMonthlyFees;
  return {percent:gross/standard*100,gross,rent:option.rent,utility,utilityType,fees:costs.requiredMonthlyFees,standard};
}

export function paymentStandardBadge(property,selectedUnit=null) {
  const options=optionsFor(property,selectedUnit);
  const beds=[...new Set(options.map(option=>option.beds))];
  const bedrooms=beds.length?beds.map(bedroomLabel).join(' / '):'Beds unverified';
  const scope=options.length===1
    ?options[0].unit?`#${options[0].unit} · ${bedrooms}`:`${bedrooms} research`
    :`${options.length} options · ${bedrooms}`;
  const shortBasis=options.length===1&&options[0].unit?`#${options[0].unit} · ${bedrooms}`:options.length>1?`${bedrooms} options`:`${bedrooms} research`;
  const results=options.map(option=>estimate(property,option));
  const reasons=[...new Set(results.flatMap(result=>result.reasons||[]))];
  if(!options.length)reasons.push('apartment figures unverified');
  const basis=`Est. · ${scope}`;
  const qualification='Uses the recorded 1BR payment standard, including comparisons for other bedroom counts. Planning estimate only; not voucher approval.';
  if(reasons.length)return {
    label:'% of Std',value:'Unverified',basis,shortBasis,status:'unverified',
    description:`${scope}: ${reasons.join('; ')}. A saved worksheet percentage is not substituted for the selected apartment or its current options. ${qualification}`
  };
  const minimum=Math.min(...results.map(result=>result.percent)),maximum=Math.max(...results.map(result=>result.percent));
  const low=minimum.toFixed(1),high=maximum.toFixed(1);
  const value=low===high?`${low}%`:`${low}–${high}%`;
  const calculations=results.map((result,index)=>`${options[index].unit?'#'+options[index].unit:bedroomLabel(options[index].beds)}: (${dollars(result.rent)} rent + ${dollars(result.utility)} ${result.utilityType} + ${dollars(result.fees)} recorded monthly-fee planning assumption) ÷ ${dollars(result.standard)} recorded 1BR standard = ${result.percent.toFixed(1)}%`);
  return {label:'% of Std',value,basis,shortBasis,status:'estimate',minimum,maximum,description:`${calculations.join('; ')}. ${qualification}`};
}
