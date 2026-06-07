import { NextRequest, NextResponse } from 'next/server';

const getBackendUrl = () => {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return url && !url.startsWith('/') ? url : 'http://127.0.0.1:8080';
};
const BACKEND_TARGET = getBackendUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams?.path || [];
    const pathString = segments.join('/');
    const searchString = req.nextUrl.search;
    
    const targetUrl = `${BACKEND_TARGET}/${pathString}${searchString}`;
    
    // Configurar cabeceras básicas para reenviar
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': contentType },
      });
    }
  } catch (err: any) {
    console.error('Proxy GET Error:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: `Error de Proxy Next.js al conectar con el backend: ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams?.path || [];
    const pathString = segments.join('/');
    const searchString = req.nextUrl.search;
    
    const targetUrl = `${BACKEND_TARGET}/${pathString}${searchString}`;
    
    const bodyText = await req.text();
    
    const headers = new Headers();
    headers.set('Content-Type', req.headers.get('content-type') || 'application/json');
    headers.set('Accept', 'application/json');
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyText,
      cache: 'no-store',
    });
    
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': contentType },
      });
    }
  } catch (err: any) {
    console.error('Proxy POST Error:', err);
    return NextResponse.json(
      {
        status: 'error',
        message: `Error de Proxy Next.js al conectar con el backend: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
