/**
 * Vercel entry point.
 *
 * On Vercel every file under `api/` becomes a serverless function. An Express
 * app is already a `(req, res)` handler, so exporting it is all that is
 * needed - `vercel.json` rewrites every path here, and the app does its own
 * routing from the original URL.
 *
 * `src/index.ts` stays the entry point everywhere else: locally and on any
 * host that runs a long-lived process, that file is what listens on a port.
 */
import "dotenv/config";
import { createApp } from "../src/app";

export default createApp();
