import express from "express";
import multer from "multer";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "./config/aws.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import cors from "cors";
import dotenv from "dotenv";


const app = express();

const allowedOrigins = [
  "http://localhost:5173", 
  process.env.URL_FRONT
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// config mémoire
const storage = multer.memoryStorage();

// filtre pour les types d’images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Please upload a JPG, PNG, or GIF image."), false);
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
        return res.status(400).json({ error: "The file is too large. Please upload an image under 2MB." });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file selected or invalid file type. Please upload a JPG, PNG, or GIF under 2MB." });
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

app.get("/api/download/:filename",async (req,res)=>{
  try {
    const filename = req.params.filename;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${filename}`,
    });

    const data = await s3.send(command); 
    if (!data.Body) throw new Error("Body S3 vide");

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", data.ContentType || "application/octet-stream");

    const stream = data.Body; 
    stream.pipe(res);

  } catch (err) {
    console.error("Erreur download:", err);
    res.status(500).json({ error: "Unable to upload the image. Please try again." });
  }
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
