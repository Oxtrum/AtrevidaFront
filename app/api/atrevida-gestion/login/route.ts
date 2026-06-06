import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok && !data.error) {
    return NextResponse.json({
      success: true,
      token: data.data.token,
      user: {
        username: data.data.username,
        rol_codigo: data.data.rol_codigo,
      },
    });
  }

  return NextResponse.json(
    { success: false, message: data.message ?? "Credenciales inválidas" },
    { status: res.status },
  );
}
