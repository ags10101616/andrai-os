export const financeEntryTypes=['receipt','expense','refund'] as const;
export type FinanceEntryType=typeof financeEntryTypes[number];
export const financeMethods=['transfer','cash','card','other'] as const;
export type FinanceMethod=typeof financeMethods[number];
export const financeEntryLabels:Readonly<Record<FinanceEntryType,string>>={
 receipt:'Cobro registrado',expense:'Gasto registrado',refund:'Devolución registrada'
};
export const financeMethodLabels:Readonly<Record<FinanceMethod,string>>={
 transfer:'Transferencia',cash:'Efectivo',card:'Tarjeta (registro manual)',other:'Otro medio'
};
export function isFinanceEntryType(x:unknown):x is FinanceEntryType{
 return typeof x==='string'&&financeEntryTypes.includes(x as FinanceEntryType);
}
export function isFinanceMethod(x:unknown):x is FinanceMethod{
 return typeof x==='string'&&financeMethods.includes(x as FinanceMethod);
}
export function minorAmount(x:unknown):number{
 const n=Number(x);
 if(!Number.isSafeInteger(n)||n<0||n>999999999999)throw new Error('Invalid financial amount in response');
 return n;
}
export function signedMoneyMXN(cents:number):string{
 if(!Number.isSafeInteger(cents))return '—';
 return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
}
export interface FinanceSummary{
 receiptsMinor:number;expensesMinor:number;refundsMinor:number;
 netMovementMinor:number;acceptedTotalMinor:number;acceptedOpenMinor:number;
}
export interface FinanceEntry{
 id:string;type:FinanceEntryType;amountMinor:number;
 reference:string;note:string;method:FinanceMethod;happenedOn:string;
 quoteId:string|null;projectId:string|null;quoteTitle:string|null;
 projectName:string|null;
}
export interface QuoteBalance{
 quoteId:string;title:string;clientName:string;
 totalMinor:number;receivedMinor:number;refundedMinor:number;remainingMinor:number;
}
export interface FinanceOption{id:string;name:string;status?:string}
export interface FinanceReport {
 summary:FinanceSummary;
 entries:FinanceEntry[];
 quoteBalances:QuoteBalance[];
 eligibleQuotes:FinanceOption[];
 projects:FinanceOption[];
}
