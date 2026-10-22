"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. The React build ships the `useSession`
 * hook whose store updates automatically after client-initiated
 * sign-in/sign-up/sign-out, which keeps the header and favorite buttons
 * in sync without touching server components (and therefore without
 * blocking Cache Components prerendering).
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
