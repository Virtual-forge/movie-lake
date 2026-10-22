import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/** Better Auth catch-all: GET routes render flows, POST handles auth verbs. */
export const { GET, POST } = toNextJsHandler(auth);
