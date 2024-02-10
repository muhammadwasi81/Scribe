import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Auth",
    },
   userId: { 
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    subject: {
      type: String,
      required: true,
    },
    image: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Media",
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
