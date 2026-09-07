import "dotenv/config";
import { createApp } from "./app";

const app = createApp();

/**
 * Vercel imports this module and serves the exported app itself, so opening a
 * port there would be wrong. Everywhere else - locally, and on any host that
 * runs a long-lived process - the server has to listen on its own.
 */
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

export default app;
