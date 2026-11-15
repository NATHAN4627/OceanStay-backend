import express from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { MORGAN_FORMAT } from "./libs/config";
import router from "./router";
import cookieParser from "cookie-parser";

// 1.Entrance
const app = express();
//app.use(cors({ origin: process.env.FRONTEND_URL }));
//app.use("/uploads", express.static("./uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan(MORGAN_FORMAT)); //shows url info in console

// 2.Routers
app.use("/", router);

export default app;
