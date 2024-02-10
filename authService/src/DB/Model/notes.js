import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  title: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  description: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdOn: {
    type: mongoose.Schema.Types.Date,
    default: Date.now,
  },
});

NoteSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

NoteSchema.set("toJSON", {
  virtuals: true,
});

const NoteModel = mongoose.model("note", NoteSchema);

export default NoteModel;
