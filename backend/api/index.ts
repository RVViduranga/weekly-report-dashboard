import "dotenv/config";
import { createApp } from "../src/app";

// Vercel runs this file as a serverless function. An Express app is already a
// (req, res) handler, so the app itself can be the default export.
export default createApp();
