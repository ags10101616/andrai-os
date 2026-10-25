/** Pure synthetic model shared verbatim by the browser and vm-based unit tests. */
export const labModel = String.raw`
const DEMO_PROJECTS = Object.freeze([
 {name:'Plataforma digital',code:'ALFA',client:'Estudio de muestra A',kind:'Diseño + desarrollo',status:'En desarrollo',progress:72,tasks:5,due:'28 oct',budget:4860000,description:'Una plataforma de muestra para explorar jerarquía, navegación y un sistema de componentes. Este proyecto no representa a un cliente real.'},
 {name:'Identidad y sitio',code:'BETA',client:'Estudio de muestra B',kind:'Identidad + sitio web',status:'En revisión',progress:48,tasks:4,due:'30 oct',budget:3240000,description:'Una identidad editorial ficticia con un sitio de contenido. La revisión, los responsables y las fechas son únicamente escenarios de diseño.'},
 {name:'Sistema de reservas',code:'GAMMA',client:'Estudio de muestra C',kind:'Producto + experiencia',status:'En desarrollo',progress:84,tasks:3,due:'02 nov',budget:6100000,description:'Un sistema conceptual para revisar interacciones de producto. No está conectado a reservas, calendarios, cobros ni servicios externos.'}
]);
const DEMO_SERIES = Object.freeze({
 7:{values:[420000,640000,590000,1100000,820000,1240000,1510000],labels:['19 oct','20 oct','21 oct','22 oct','23 oct','24 oct','25 oct']},
 30:{values:[1200000,1780000,1340000,2410000,1870000,2920000,2680000],labels:['26 sep','01 oct','06 oct','11 oct','16 oct','21 oct','25 oct']},
 90:{values:[6300000,7100000,6800000,9200000,8100000,11300000,9900000],labels:['28 jul','12 ago','27 ago','11 sep','26 sep','11 oct','25 oct']}
});
function validQuantity(value){return Number.isSafeInteger(value)&&value>=1&&value<=20;}
function quoteTotals(quantity,support){
 if(!validQuantity(quantity)||typeof support!=='boolean')throw new RangeError('Invalid demo quote input');
 const design=1250000,development=1980000*quantity,care=support?280000:0;
 const subtotal=design+development+care,tax=Math.round(subtotal*1600/10000);
 return {design,development,care,subtotal,tax,total:subtotal+tax};
}
function periodData(period){
 if(![7,30,90].includes(period))throw new RangeError('Unknown demo period');
 const source=DEMO_SERIES[period];
 return {values:[...source.values],labels:[...source.labels],total:source.values.reduce((a,b)=>a+b,0)};
}
function money(cents,decimals=0){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(cents/100);}
function averageProgress(){return Math.round(DEMO_PROJECTS.reduce((n,p)=>n+p.progress,0)/DEMO_PROJECTS.length);}
`;
