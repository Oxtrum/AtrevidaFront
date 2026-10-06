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
  const token = body['cf-turnstile-response'];
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!token || !secret) {
    return NextResponse.json({ message: 'Turnstile verification is required' }, { status: 400 });
  }

  const verificationBody = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (remoteIp) verificationBody.set('remoteip', remoteIp);

  const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verificationBody,
    cache: 'no-store',
  });
  const verification = await verificationResponse.json() as {
    success?: boolean;
    action?: string;
    hostname?: string;
  };
  const allowedHostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map(hostname => hostname.trim())
    .filter(Boolean);
  const hostnameValid = allowedHostnames.length > 0
    && Boolean(verification.hostname && allowedHostnames.includes(verification.hostname));

  if (!verification.success || verification.action !== 'reservation_create' || !hostnameValid) {
    return NextResponse.json({ message: 'Turnstile verification failed' }, { status: 403 });
  }

  const reservation = { ...body };
  delete reservation['cf-turnstile-response'];
  const reservaPendiente = {
    ...reservation,
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
