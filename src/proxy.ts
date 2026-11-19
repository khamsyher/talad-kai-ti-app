import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const path = request.nextUrl.pathname;
  const role = request.auth?.user.role;
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const adminHostname =
    process.env.ADMIN_HOSTNAME?.trim().toLowerCase() || "admin.localhost";
  const port = request.nextUrl.port ? `:${request.nextUrl.port}` : "";
  const adminOrigin = `${request.nextUrl.protocol}//${adminHostname}${port}`;
  const isAdminHost = host === adminHostname;

  if (isAdminHost) {
    if (path === "/") {
      const destination = role === "administrator" ? "/admin" : "/login";
      return NextResponse.redirect(new URL(destination, adminOrigin));
    }

    if (
      path !== "/login" &&
      path !== "/api/auth" &&
      !path.startsWith("/api/auth/") &&
      !path.startsWith("/admin")
    ) {
      const destination = role === "administrator" ? "/admin" : "/login";
      return NextResponse.redirect(new URL(destination, adminOrigin));
    }

    if (
      path === "/admin" ||
      path.startsWith("/admin/")
    ) {
      if (!request.auth) {
        return NextResponse.redirect(new URL("/login", adminOrigin));
      }
      if (role !== "administrator") {
        return NextResponse.redirect(new URL("/login", adminOrigin));
      }
    }

    return NextResponse.next();
  }

  if (role === "administrator" && (path === "/" || path === "/login")) {
    return NextResponse.redirect(new URL(path === "/login" ? "/login" : "/admin", adminOrigin));
  }

  if ((path === "/admin" || path.startsWith("/admin/")) && role !== "administrator") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    (path === "/seller" || path.startsWith("/seller/")) &&
    role !== "seller" &&
    role !== "administrator"
  ) {
    const destination = request.auth ? "/" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (
    path === "/cart" ||
    path.startsWith("/cart/") ||
    path === "/checkout" ||
    path.startsWith("/checkout/") ||
    path === "/orders" ||
    path.startsWith("/orders/")
  ) {
    if (!request.auth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/seller/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
  ],
};
