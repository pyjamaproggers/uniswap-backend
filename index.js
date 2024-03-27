import express from 'express';
import dotenv from 'dotenv';
import mongoclient from './Database/db.js'; // Ensure db.js exports using ES6 modules
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import cookieParser from 'cookie-parser';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = 8080;

app.use(express.json());
app.use(cors({
  origin: 'https://localhost:3000', // Adjust according to your frontend setup
  credentials: true,
}));
app.use(cookieParser());

// Middleware for authenticating tokens
const authenticateToken = (req, res, next) => {
  const token = req.cookies['token'];
  if (!token) return res.sendStatus(401); // Unauthorized if no token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden if token is invalid
    req.user = user;
    next();
  });
};
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  app.get('/api/upload', authenticateToken, async (req, res) => {
    console.log("hi")
    const key = `uploads/${req.user.userEmail}/${uuidv4()}`;
    const bucketName = process.env.AWS_BUCKET_NAME;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
  
    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ url, key });
    } catch (err) {
      console.error("Error creating presigned URL", err);
      res.status(500).json({ message: "Error generating presigned URL" });
    }
  });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);



app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userJwt = jwt.sign({
      userEmail: payload.email,
      userName: payload.name,
    }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', userJwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });

    res.status(200).json({
      message: 'Authentication successful',
      user: {
        userEmail: payload.email,
        userName: payload.name,
        userPicture: payload.picture,
      },
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    res.status(401).send('Invalid authentication token');
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
});

app.post('/api/items', authenticateToken, async (req, res) => {
  const { itemName, itemDescription, itemPrice, itemCategory, itemPicture, contactNumber, live } = req.body;
  
  try {
    const collection = mongoclient.db("Uniswap").collection("Items");
    const item = {
      userName: req.user.userName,
      userEmail: req.user.userEmail,
      userPicture: req.user.userPicture,
      itemName,
      itemDescription,
      itemPrice,
      itemCategory,
      itemPicture,
      contactNumber,
      live,
      dateAdded: new Date(),
    };

    await collection.insertOne(item);
    res.status(201).json({ message: "Item successfully posted", item });
  } catch (error) {
    console.error("Error adding item to DB:", error);
    res.status(500).json({ message: "Failed to post item" });
  }
});

app.get('/items', async (req, res) => {
  try {
    const cat = req.query.cat;
    const collection = mongoclient.db("Uniswap").collection("Items");
    const query = cat ? { cat } : {};
    
    const data = await collection.find(query).toArray();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json(error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
