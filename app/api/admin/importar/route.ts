import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Mock import - in production this would call the backend
    // const body = await request.json();
    // const url = `${BACKEND_URL}/admin/importar`;
    // const res = await fetch(url, { method: "POST", ... });
    
    // Simulate successful import
    return NextResponse.json({ 
      success: true, 
      message: "Datos importados correctamente desde Sheets" 
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      message: "Error al importar datos" 
    }, { status: 500 });
  }
}
