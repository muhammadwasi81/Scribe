import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morganBody from "morgan-body";
import path from "path";
import { fileURLToPath } from "url";
// DB Connection
import { connectDB } from "./DB/index.js";
import { CommentRouter } from "./Router/commentRouter.js";
import { PostRouter } from "./Router/postRouter.js";
import { SocialProfileRouter } from "./Router/profileRouter.js";
import { ReactionRouter } from "./Router/reactionRouter.js";
// Routes
// Response Handler
import { ResHandler } from "./Utils/ResponseHandler/ResHandler.js";
import { NoteRouter } from "./Router/notesRouter.js";
import compression from "compression";
import { LibraryRouter } from "./Router/libraryRouter.js";
import { ReviewRouter } from "./Router/reviewRouter.js";
import { QuestionRouter } from "./Router/qaRouter.js";
import { AnswerRouter } from "./Router/answerRouter.js";
export const filename = fileURLToPath(import.meta.url);
export const dirname = path.dirname(filename);

export let app = express();

const API_PreFix = "";

app.use("/public/uploads", express.static("./public/uploads"));

var corsOptions = {
  origin: "*",
};
app.use(
  compression({
    level: 9,
    strategy: 3,
  }),
);
app.use(cors(corsOptions));

app.use(bodyParser.json());
// Configure body-parser to handle post requests
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(morgan("dev"));

morganBody(app, {
  prettify: true,
  logReqUserAgent: false,
  logReqDateTime: false,
  skip: function (req, res) {
    return res.statusCode < 400;
  },
});

// Connect To Database

await connectDB();
// Running Seeder
// RunSeeder();

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the application." });
});
// Routes
app.use(API_PreFix, PostRouter);
app.use(API_PreFix, SocialProfileRouter);
app.use(API_PreFix, CommentRouter);
app.use(API_PreFix, ReactionRouter);
app.use(API_PreFix, NoteRouter);
app.use(API_PreFix, LibraryRouter);
app.use(API_PreFix, ReviewRouter);
app.use(API_PreFix, QuestionRouter);
app.use(API_PreFix, AnswerRouter);
app.use(ResHandler);
