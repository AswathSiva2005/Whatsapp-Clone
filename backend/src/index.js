import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import logger from "./configs/logger.config.js";
import SocketServer from "./SocketServer.js";

dotenv.config();
dns.setDefaultResultOrder("ipv4first");

//env variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGO_URI;
const PORT = process.env.PORT || 8000;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://whatsapp-clone-frontend-liart.vercel.app",
  process.env.CLIENT_ENDPOINT,
].filter(Boolean);

if (!DATABASE_URL) {
  logger.error("MongoDB URI missing. Set DATABASE_URL or MONGO_URI in .env");
  process.exit(1);
}

//exit on mognodb error
mongoose.connection.on("error", (err) => {
  logger.error(`Mongodb connection error : ${err}`);
  process.exit(1);
});

//mongodb debug mode
if (process.env.NODE_ENV !== "production") {
  mongoose.set("debug", true);
}

//mongodb connection
mongoose.connect(DATABASE_URL).then(() => {
  logger.info("Connected to Mongodb.");
});
let server;

server = app.listen(PORT, () => {
  logger.info(`Server is listening at ${PORT}.`);
});

//socket io
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
io.on("connection", (socket) => {
  logger.info("socket io connected successfully.");
  SocketServer(socket, io);
});

//handle server errors
const exitHandler = () => {
  if (server) {
    logger.info("Server closed.");
    process.exit(1);
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};
process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

//SIGTERM
process.on("SIGTERM", () => {
  if (server) {
    logger.info("Server closed.");
    process.exit(1);
  }
});
