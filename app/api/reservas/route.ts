import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const local = searchParams.get("local");
  const semana = searchParams.get("semana");
  
  if (!local) {
    return NextResponse.json({ error: "local is required" }, { status: 400 });
  }

  const fechaDesde = searchParams.get("fecha_desde");
  const fechaHasta = searchParams.get("fecha_hasta");
  
  let url: string;
  const queryParams = new URLSearchParams();
  queryParams.set("local", local);
  
  if (fechaDesde && fechaHasta) {
    queryParams.set("fecha_desde", fechaDesde);
    queryParams.set("fecha_hasta", fechaHasta);
    url = `${BACKEND_URL}/bd/reservas?${queryParams.toString()}`;
  } else if (semana) {
    const weekNum = parseInt(semana);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + (weekNum - 1) * 7);
    monday.setHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 5);
    
    queryParams.set("fecha_desde", monday.toISOString().split("T")[0]);
    queryParams.set("fecha_hasta", friday.toISOString().split("T")[0]);
    url = `${BACKEND_URL}/bd/reservas?${queryParams.toString()}`;
  } else {
    return NextResponse.json({ error: "semana or fecha_desde/fecha_hasta required" }, { status: 400 });
  }

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = `${BACKEND_URL}/bd/reservas`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const url = `${BACKEND_URL}/bd/reservas`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
