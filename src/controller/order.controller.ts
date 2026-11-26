import { Request, Response } from "express";
import { T } from "../libs/types/common";
import OrderService from "../models/Order.service";
import Errors, { HttpCode } from "../libs/Errors";
import { ExtendedRequest } from "../libs/types/member";

const orderController: T = {};

const orderService = new OrderService();

orderController.buyRoom = async (req: ExtendedRequest, res: Response) => {
  try {
    const { member } = req;
    const { id } = req.params;

    const result = await orderService.buyRoom(member._id, id as string);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;
