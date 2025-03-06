import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`Setting destination for file: ${file.originalname}`);
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    console.log(`Setting filename for file: ${file.originalname}`);
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  console.log(`Processing file: ${file.originalname}`);
  // Optionally, you can filter files based on mime types or other criteria
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept file
  } else {
    console.log(`Rejected file: ${file.originalname} (Invalid type: ${file.mimetype})`);
    cb(new Error("Invalid file type"), false); // Reject file
  }
};

export const multerUpload = multer({ 
  storage,
  fileFilter
});