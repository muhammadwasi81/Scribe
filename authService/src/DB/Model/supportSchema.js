import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Auth",
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true
     },
  },
  {
    timestamps: true,
  },
);

const SupportTicket = mongoose.model("SupportTicket", SupportTicketSchema);

export default SupportTicket;
