import path from "path";
import { mkdir } from "node:fs";
import { readFile } from "node:fs/promises";
import multer from "multer";
import { v4 } from "uuid";
import Errors, { HttpCode, Message } from "./Errors";

const imageMimeExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);

const imageSignatures = new Map([
  ["image/jpeg", Buffer.from("ffd8ff", "hex")],
  ["image/png", Buffer.from("89504e470d0a1a0a", "hex")],
]);

function getTargetImageStorage(address: string) {
  const directory = path.resolve("uploads", address);

  return multer.diskStorage({
    destination(_req, _file, cb) {
      mkdir(directory, { recursive: true }, (err) => cb(err, directory));
    },
    filename(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, v4() + extension);
    },
  });
}

const makeUploader = (address: string) => {
  return multer({
    storage: getTargetImageStorage(address),
    limits: { files: 1, fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      if (imageMimeExtensions.get(extension) !== file.mimetype) {
        cb(new Errors(HttpCode.BAD_REQUEST, Message.INVALID_MEMBER_IMAGE));
        return;
      }
      cb(null, true);
    },
  });
};

export default makeUploader;
