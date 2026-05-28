import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const credentials = await request.json();
  const username = typeof credentials.username === 'string' ? credentials.username : '';
  const password = typeof credentials.password === 'string' ? credentials.password : '';
  
  // Temporary local gate until backend authentication is available.
  if (username === 'Atrevida' && password === 'Atrevida@123') {
    return NextResponse.json({ 
      success: true, 
      token: 'mock-admin-token-12345',
      user: { username, role: 'admin' }
    });
  }
  
  return NextResponse.json({ 
    success: false, 
    message: "Credenciales inválidas" 
  }, { status: 401 });
}
