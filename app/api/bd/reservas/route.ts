import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const url = `${BACKEND_URL}/bd/reservas${queryString ? `?${queryString}` : ""}`;
  const auth = request.headers.get("Authorization");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth && { Authorization: auth }),
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = `${BACKEND_URL}/bd/reservas`;
  const reservaPendiente = {
    ...body,
    estado: "PENDIENTE",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reservaPendiente),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// Sin proxy PATCH: editar una reserva requiere token y las mutaciones van
// directo al backend vía apiClient (lib/api/reservas.ts), que sí lo adjunta.
