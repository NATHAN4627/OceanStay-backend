import { Request, Response } from "express";
import Errors, { HttpCode } from "../libs/Errors";
import { T } from "../libs/types/common";
import RoomService from "../models/Room.service";
import { ExtendedRequest } from "../libs/types/member";
import { RoomInput } from "../libs/types/room";

const roomController: T = {};

const roomService = new RoomService();

roomController.createRoom = async (req: ExtendedRequest, res: Response) => {
  try {
    const input: RoomInput = req.body;
    
    if (Array.isArray(req.files)) {
      input.roomImages = req.files.map(
        (file) => `uploads/room/${file.filename}`,
      );
    }
    const result = await roomService.createRoom(req.body);

    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default roomController;
