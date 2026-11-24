import dotenv from "dotenv";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

dotenv.config({ path: new URL("./.env", import.meta.url), quiet: true });

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

createApp({ config }).listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
