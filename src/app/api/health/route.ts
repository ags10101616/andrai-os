import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({status:'ok',application:'andrai-os',spec:'os-02',mode:'auth-enabled-no-business-data'},{headers:{'Cache-Control':'no-store'}}); }
