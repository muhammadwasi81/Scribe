import mongoose from "mongoose";
import dbConfig from "../Config/dbConfig.js";

export const connectDB = async () => {
  try {
    mongoose.set({
      strictQuery: true,
    });
    await mongoose.connect(dbConfig.db, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("mongodb error", err.message);
    process.exit(1);
  }
};
