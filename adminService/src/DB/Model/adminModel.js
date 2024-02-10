import { model, Schema } from "mongoose";

const AdminSchema = new Schema({
  auth: {
    type: Schema.Types.ObjectId,
    ref: "Auth",
  },
  fullName: {
    type: String,
    default: "",
  },
});

export const AdminModel = model("Admin", AdminSchema);
