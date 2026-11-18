import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import app from "./app";

mongoose.set('strictQuery', true);

// TCP1
mongoose
  .connect(process.env.MONGO_URL as string)
  .then((data) => {
    console.log("Success on db");
    const PORT = process.env.PORT ?? 3333;
    app.listen(PORT, function () {
      console.info(`Server runnig on port: ${PORT}`);
      console.log(`Admin project on http://localhost:${PORT}/admin \n`);
    });
  })
  .catch((err) => {
    console.log("Error on connnecting to db", err);
  });