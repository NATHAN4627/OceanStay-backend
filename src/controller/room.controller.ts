import { Request, Response } from "express";
import Errors, { HttpCode } from "../libs/Errors";
import { T } from "../libs/types/common";
import RoomService from "../models/Room.service";
import { RoomInput, RoomInquery } from "../libs/types/room";
import { RoomType } from "../libs/enums/room.enum";

const roomController: T = {};

const roomService = new RoomService();

roomController.createRoom = async (req: Request, res: Response) => {
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

roomController.getRooms = async (req: Request, res: Response) => {
  try {
    const { page, limit, order, roomType, search } = req.query;

    const inquery: RoomInquery = {
      page: Number(page),
      limit: Number(limit),
      order: String(order),
    };

    if (roomType) {
      inquery.roomType = roomType as RoomType;
    }
    if (search) {
      inquery.search = String(search);
    }

    const result = await roomService.getRooms(inquery);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default roomController;
