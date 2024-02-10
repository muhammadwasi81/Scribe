import { Types } from "mongoose";
import NoteModel from "../DB/Model/notes.js";
import UserModel from "../DB/Model/userModel.js";
import CustomSuccess from "../Utils/ResponseHandler/CustomSuccess.js";
import CustomError from "../Utils/ResponseHandler/CustomError.js";
import { AddNoteValidator, UpdateNoteValidator } from "../Utils/Validator/noteValidator.js";

//create note
export const createNote = async (req, res, next) => {
  try {
    try {
      await AddNoteValidator.validateAsync(req.body);
    } catch (error) {
      return next(CustomError.createError(error.message, 200));
    }
    let createnote = new NoteModel({
      title: req.body.title,
      description: req.body.description,
      userId: req.user._id,
    });

    createnote = await createnote.save();

    if (!createnote) {
      return next(CustomError.internal("post not created"));
    }

    console.log(createnote._id.toHexString());
    const userupdatenote = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          NoteModel: createnote._id.toHexString(),
        },
      },
      { new: true },
    );

    if (!userupdatenote) {
      return next(CustomError.notFound("user update note not create"));
    }
    return next(CustomSuccess.createSuccess(createnote, "note creted successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

//get note
export const getNote = async (req, res, next) => {
  try {
    let getnote = await NoteModel.find({ userId: req.user._id });

    if (!getnote) {
      return next(CustomError.notFound("note not found"));
    }
    return next(CustomSuccess.createSuccess(getnote, "note found successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// get note by id
export const getNoteById = async (req, res, next) => {
  try {
    let getnotebyid = await NoteModel.findOne({ _id: Types.ObjectId(req.params.id) });

    if (!getnotebyid) {
      return next(CustomError.notFound("note not found"));
    }
    return next(CustomSuccess.createSuccess(getnotebyid, "note found successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// update note by id
export const updateNoteById = async (req, res, next) => {
  try {
    try {
      await UpdateNoteValidator.validateAsync(req.body);
    } catch (error) {
      return next(CustomError.createError(error.message, 200));
    }
    const findNote = await NoteModel.findOne({ _id: req.params.id });
    if (!findNote) {
      return next(CustomError.notFound("note not found"));
    }
    let updateNoteById = await NoteModel.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
      },
      {
        new: true,
      },
    );

    console.log("updateNoteById:", updateNoteById);
    if (!updateNoteById) {
      return next(CustomError.notFound("note not update"));
    }
    return next(CustomSuccess.createSuccess(updateNoteById, "Note Updated successfully", 200));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

// delete note by id

export const deleteNoteById = async (req, res, next) => {
  try {
    const findNote = await NoteModel.findOne({ _id: req.params.id });
    if (!findNote) {
      return next(CustomError.notFound("note not found"));
    }
    let deletenotebyid = await NoteModel.findByIdAndDelete(req.params.id);

    if (!deletenotebyid) {
      return next(CustomError.notFound("note not delete"));
    }
    return next(CustomSuccess.createSuccess(deletenotebyid, "note delete successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};

//count note

export const noteCount = async (req, res, next) => {
  try {
    let notecount = await NoteModel.estimatedDocumentCount();

    if (!notecount) {
      return next(CustomError.notFound("user profile not count"));
    }
    return next(CustomSuccess.createSuccess(notecount, "user profile count successfully", 201));
  } catch (error) {
    return next(CustomError.internal(error.message));
  }
};
