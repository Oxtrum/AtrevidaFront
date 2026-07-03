import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

type LoginPayload = {
  token?: string;
  token_type?: string;
  username?: string;
  rol_codigo?: string;
  local_id?: number | string | null;
  nombre_local?: string | null;
  lugar_id?: number | string | null;
  nombre_lugar?: string | null;
  expires_in?: number;
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok && !data.error) {
    const login = (data.data ?? {}) as LoginPayload;
    const localId = login.local_id ?? login.lugar_id;
    const nombreLocal = login.nombre_local ?? login.nombre_lugar;
    const user: {
      username?: string;
      rol_codigo?: string;
      local_id?: number | string | null;
      nombre_local?: string | null;
      lugar_id?: number | string | null;
      nombre_lugar?: string | null;
    } = {
      username: login.username,
      rol_codigo: login.rol_codigo,
    };

    if (hasValue(localId)) {
      user.local_id = localId;
      user.lugar_id = localId;
    }
    if (hasValue(nombreLocal)) {
      user.nombre_local = nombreLocal;
      user.nombre_lugar = nombreLocal;
    }

    return NextResponse.json({
      success: true,
      token: login.token,
      token_type: login.token_type,
      expires_in: login.expires_in,
      username: login.username,
      rol_codigo: login.rol_codigo,
      ...(hasValue(localId) && { local_id: localId, lugar_id: localId }),
      ...(hasValue(nombreLocal) && { nombre_local: nombreLocal, nombre_lugar: nombreLocal }),
      user,
    });
  }

  return NextResponse.json(
    { success: false, message: data.message ?? "Credenciales inválidas" },
    { status: res.status },
  );
}
