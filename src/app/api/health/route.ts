import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({status:'ok',application:'andrai-os',spec:'os-09',mode:'role-scoped-reporting-preview-readonly'},{headers:{'Cache-Control':'no-store'}}); }
