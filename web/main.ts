import { start } from "./server.js";

// Cloud Run injects PORT; default 8080.
start(Number(process.env["PORT"] ?? "8080"));
