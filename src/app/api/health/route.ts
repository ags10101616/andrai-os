import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({status:'ok',application:'andrai-os',spec:'os-07',mode:'quotes-review-preview-readonly'},{headers:{'Cache-Control':'no-store'}}); }
