import { defineConfig } from "drizzle-kit";
import { readConfig } from "./src/config.js";

const config = readConfig();

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.dbUrl,
  },
});
