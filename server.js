import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "./config/aws.js";
import cors from "cors";



const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());


app.post("/upload", upload.single("image"), async (req, res) => {

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
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur upload");
  }
});

app.get('/upload',(req,res)=>{
    res.status(400).send("cool la vie n'est ce pas ?")
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
