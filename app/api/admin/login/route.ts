import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const credentials = await request.json();
  
  // Mock authentication - accept any credentials for now
  // In production, this should validate against the backend
  if (credentials.username && credentials.password) {
    return NextResponse.json({ 
      success: true, 
      token: 'mock-admin-token-12345',
      user: { username: credentials.username, role: 'admin' }
    });
  }
  
  return NextResponse.json({ 
    success: false, 
    message: "Credenciales inválidas" 
  }, { status: 401 });
}
