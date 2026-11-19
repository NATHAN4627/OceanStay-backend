import path from "path";
import multer from "multer";
import { v4 } from "uuid";

const imageMimeExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);

//universal uploader
function getTargetImageStorage(address: any) {
  return multer.diskStorage({
    destination: () => {
      path.resolve("uploads", address);
    },
    filename: function (req, file, cb) {
      const extension = path.parse(file.originalname).ext;
      const random_name = v4() + extension;
      cb(null, random_name);
    },
  });
}

//bu function har xil mantiqlar uchun upload hosil qilib beradi
const makeUploader = (address: string) => {
  return multer({
    storage: getTargetImageStorage(address),
    limits: { files: 1, fields: 0, fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, imageMimeExtensions.get(extension) === file.mimetype);
    },
  });
};

export default makeUploader;
