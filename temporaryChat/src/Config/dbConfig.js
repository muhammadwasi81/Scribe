import { config } from "dotenv";

config();

const dbConfig = {
  // MongoDB connection string
  db: process.env.dbURI,
};

export default dbConfig;
