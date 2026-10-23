import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({status:'ok',application:'andrai-os',spec:'os-01',mode:'preview-no-data'},{headers:{'Cache-Control':'no-store'}}); }
