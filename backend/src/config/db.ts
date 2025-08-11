import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config()

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string)
    console.log('connected to mongodb')
  } catch (error) {
    console.error("error connecting to mongodb", error)
    process.exit(1) // exiting with failure 
  }
}
