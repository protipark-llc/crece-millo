import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirección optimista: si no hay cookie de sesión, envía a /ingresar.
 * La verificación real de la sesión ocurre en el servidor (requireUser) en cada
 * página y acción; este middleware no es una barrera de seguridad por sí solo.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has("cm_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/universidad/:path*", "/configuracion/:path*", "/comunidad/:path*", "/comunidad"] };
