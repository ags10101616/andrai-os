import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({status:'ok',application:'andrai-os',spec:'os-08',mode:'manual-ledger-preview-readonly'},{headers:{'Cache-Control':'no-store'}}); }
