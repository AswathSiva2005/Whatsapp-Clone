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

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://whatsapp-clone-frontend-liart.vercel.app",
  process.env.CLIENT_ENDPOINT,
].filter(Boolean);

//dotEnv config
dotenv.config();

//create express app
const app = express();

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
app.use(express.json({ limit: "10mb" }));

//parse json request body
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
  })
);

//cors
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

//serve local upload fallback files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//api v1 routes
app.use("/api/v1", routes);

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
