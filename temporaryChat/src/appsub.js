// Librarys
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import morganBody from "morgan-body";
import path from "path";
import { fileURLToPath } from "url";
// DB Connection
import { connectDB } from "./DB/index.js";
import { ChatRouter } from "./Router/chatRouter.js";

import { ResHandler } from "./Utils/ResponseHandler/ResHandler.js";

export const filename = fileURLToPath(import.meta.url);
export const dirname = path.dirname(filename);

export let app = express();

app.use("/Uploads", express.static("Uploads"));

var corsOptions = {
  origin: "*",
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
// Configure body-parser to handle post requests
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(morgan("dev"));

// morganBody(app, {
//   prettify: true,
//   logReqUserAgent: true,
//   logReqDateTime: true,
// });
// Connect To Database
connectDB();
// Running Seeder
// RunSeeder();

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the application." });
});
app.use("", ChatRouter);

app.use(ResHandler);
