import { application, Router } from "express";
import * as NoteController from "../Controller/notesController.js";
import { authMiddleware } from "./Middleware/authMiddleware.js";

export const NoteRouter = Router();

application.prefix = Router.prefix = function (path, middleware, configure) {
  configure(NoteRouter);
  this.use(path, middleware, NoteRouter);
  return NoteRouter;
};

NoteRouter.post("/createnote", authMiddleware, NoteController.createNote);
NoteRouter.get("/getnote", authMiddleware, NoteController.getNote);
NoteRouter.get("/getnotebyid/:id", authMiddleware, NoteController.getNoteById);
NoteRouter.patch("/updatenotebyid/:id", authMiddleware, NoteController.updateNoteById);
NoteRouter.delete("/deletenotebyid/:id", authMiddleware, NoteController.deleteNoteById);
NoteRouter.get("/notecount", authMiddleware, NoteController.noteCount);
