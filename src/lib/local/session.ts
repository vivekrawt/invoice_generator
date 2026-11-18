import { cookies } from "next/headers";
import { isLocalSessionValid, LOCAL_SESSION_COOKIE } from "./auth.ts";

export async function hasCurrentLocalSession() {
  return isLocalSessionValid((await cookies()).get(LOCAL_SESSION_COOKIE)?.value);
}
