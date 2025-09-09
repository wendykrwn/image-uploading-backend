import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "./config/aws.js";
import cors from "cors";



const app = express();

app.use(cors());

// config mémoire
const storage = multer.memoryStorage();

// filtre pour les types d’images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Seulement les fichiers JPG, PNG ou GIF sont autorisés"), false);
  }
  cb(null, true);
};

// limite taille 2 Mo
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});


app.post("/api/upload", (req, res, next) => {
  upload.single("image")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Le fichier dépasse 2MB" });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier ou type invalide" });
    }
    next();
  });
}, async (req, res) => {

  const key = `uploads/${Date.now()}_${req.file.originalname}`;

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}_${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    });

    await s3.send(command);

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ url: fileUrl });
  } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
  }
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
