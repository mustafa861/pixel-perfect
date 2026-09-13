import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Server-fn middleware: throws unless the caller has a valid session cookie. */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getAuth } = await import("./auth.server");
  const request = getRequest();
  if (!request || !request.headers) {
    throw new Error("Unauthorized: No request headers available");
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No valid session");
  }

  return next({
    context: {
      userId: session.user.id,
      role: (session.user as { role?: string }).role ?? "student",
      user: session.user,
    },
  });
});

/** Server-fn middleware: requires a valid session AND role === "teacher". */
export const requireTeacher = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getAuth } = await import("./auth.server");
  const request = getRequest();
  if (!request || !request.headers) {
    throw new Error("Unauthorized: No request headers available");
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No valid session");
  }
  const role = (session.user as { role?: string }).role ?? "student";
  if (role !== "teacher" && role !== "admin") {
    throw new Error("Forbidden: Teacher access required");
  }

  return next({
    context: {
      userId: session.user.id,
      role,
      user: session.user,
    },
  });
});
