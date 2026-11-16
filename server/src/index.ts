import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { z } from "zod";
import "./config.js";
import { pool } from "./db.js";

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const sessionSecret = process.env.SESSION_SECRET;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters");
}

const app = express();
if (isProduction) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "10kb" }));

const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true, ttl: 7 * 24 * 60 * 60 }),
  name: "login.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  },
}));

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(10, "Usa al menos 10 caracteres").max(128, "Usa como máximo 128 caracteres");
const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80).regex(/^[\p{L}\p{M} .'-]+$/u, "El nombre contiene caracteres no válidos"),
  email: emailSchema,
  password: passwordSchema,
}).strict();
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128), remember: z.boolean().optional() }).strict();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
});

function ensureCsrf(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  const origin = req.get("origin");
  if (origin && origin !== clientOrigin) return res.status(403).json({ error: "Origen no permitido" });

  const token = req.get("x-csrf-token");
  const expected = req.session.csrfToken;
  if (!token || !expected) return res.status(403).json({ error: "Sesión de seguridad vencida. Recarga e inténtalo de nuevo." });

  const provided = Buffer.from(token);
  const stored = Buffer.from(expected);
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return res.status(403).json({ error: "Sesión de seguridad vencida. Recarga e inténtalo de nuevo." });
  }
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.get("/api/auth/csrf", (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
  req.session.save((error) => error ? next(error) : res.json({ csrfToken: req.session.csrfToken }));
});

app.get("/api/auth/me", async (req, res, next) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const result = await pool.query(
      "SELECT id, email, display_name AS name, created_at AS \"createdAt\" FROM users WHERE id = $1",
      [req.session.userId],
    );
    if (!result.rowCount) {
      req.session.userId = undefined;
      return res.json({ user: null });
    }
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});

app.post("/api/auth/register", authLimiter, ensureCsrf, async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados" });
  const { name, email, password } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await pool.query(
      "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id, email, display_name AS name, created_at AS \"createdAt\"",
      [email, passwordHash, name],
    );
    if (!inserted.rowCount) return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = inserted.rows[0].id;
      req.session.csrfToken = randomBytes(32).toString("hex");
      req.session.save((saveError) => saveError
        ? next(saveError)
        : res.status(201).json({ user: inserted.rows[0], csrfToken: req.session.csrfToken }));
    });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", authLimiter, ensureCsrf, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ingresa un correo y contraseña válidos" });
  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, display_name AS name, created_at AS \"createdAt\" FROM users WHERE email = $1",
      [parsed.data.email],
    );
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(parsed.data.password, user.password_hash) : false;
    if (!valid) return res.status(401).json({ error: "El correo o la contraseña no son correctos" });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      if (parsed.data.remember === false) {
        req.session.cookie.maxAge = undefined;
        req.session.cookie.expires = null;
      } else {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
      }
      req.session.csrfToken = randomBytes(32).toString("hex");
      req.session.save((saveError) => saveError
        ? next(saveError)
        : res.json({ user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }, csrfToken: req.session.csrfToken }));
    });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", ensureCsrf, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("login.sid", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/" });
    res.status(204).end();
  });
});

const clientBuild = resolve(dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (isProduction && existsSync(clientBuild)) {
  app.use(express.static(clientBuild, { index: false, maxAge: "1d" }));
  app.get("*", (_req, res) => res.sendFile(resolve(clientBuild, "index.html")));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Request failed", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "Ocurrió un error inesperado. Inténtalo de nuevo." });
});

const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
