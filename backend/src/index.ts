// TEMPORARY probe - reverted in the next commit.
// Nothing but express, so a 200 here means express bundles fine and the
// failure is further down the import chain; a 500 means it does not.
import express from "express";

const app = express();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", probe: "express-only" });
});

export default app;
