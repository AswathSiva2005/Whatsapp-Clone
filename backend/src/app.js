import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import compression from "compression";
import fileUpload from "express-fileupload";
import cors from "cors";
import createHttpError from "http-errors";
import routes from "./routes/index.js";
import path from "path";

//dotEnv config
dotenv.config();

const normalizeOrigin = (value = "") => value.replace(/\/$/, "");

const envOrigins = [process.env.CLIENT_ENDPOINT, process.env.CLIENT_ENDPOINTS]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => normalizeOrigin(value.trim()))
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3002",
  "https://whatsapp-clone-frontend-liart.vercel.app",
  ...envOrigins,
]);

//create express app
const app = express();

//trust reverse proxy (Render) so protocol/host are resolved correctly
app.set("trust proxy", 1);

//morgan
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

//helmet
app.use(
  helmet({
    // Frontend runs on a different origin in development and needs to load avatars from backend /uploads.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

//parse json request url
app.use(express.json({ limit: "25mb" }));

//parse json request body
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

//sanitize request data
app.use(mongoSanitize());

//enable cookie parser
app.use(cookieParser());

//gzip compression
app.use(compression());

//file upload
app.use(
  fileUpload({
    useTempFiles: false,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  })
);

//cors
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const cleanedOrigin = normalizeOrigin(origin);
      const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(
        cleanedOrigin
      );

      if (allowedOrigins.has(cleanedOrigin) || isVercelPreview) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

//serve local upload fallback files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//basic health route for Render root URL
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WhatsApp backend is running",
    apiBase: "/api/v1",
  });
});

//api v1 routes
app.use("/api/v1", routes);

//compat routes for clients missing /api/v1 prefix
app.use("/", routes);

app.use(async (req, res, next) => {
  next(createHttpError.NotFound("This route does not exist."));
});

//error handling
app.use(async (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

export default app;
