import "dotenv/config";
import { createApp } from "./app";

const app = createApp();

/**
 * Always listen. Vercel runs this as a Node web service and connects to the
 * port it hands over in PORT, which is the same thing Render and a local
 * `npm start` do - so there is nothing to special-case.
 *
 * The default export is there for hosts that import the app instead of
 * starting it; it costs nothing and keeps both shapes available.
 */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
