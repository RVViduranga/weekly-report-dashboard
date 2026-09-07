/**
 * Everything under /api reaches the same Express app.
 *
 * Vercel routes `api/health` to a file named `api/health.ts` and so on. None of
 * those files exist here - the app does its own routing - so this catch-all
 * takes every path that is not `/api` itself and hands it over unchanged.
 */
export { default } from "./index";
