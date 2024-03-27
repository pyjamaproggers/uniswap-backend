import express from 'express';
import dotenv from 'dotenv';
import mongoclient from './Database/db.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const port = 8080;

app.use(express.json()); 
app.use(cors({
    origin: 'https://localhost:3000', // Specify the origin of the requests you want to allow
    credentials: true, // Set to true to allow cookies to be shared across origins
  }));
  app.use(cookieParser());


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body; // The token you receive from the frontend
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const user = {
            userEmail: payload.email,
            userName: payload.name,
            userPicture: payload.picture
        }
        const userJwt = jwt.sign({
            userEmail: payload.email,
            userName: payload.name

        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', userJwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development', // use secure in production
            sameSite: 'strict',
        });

        res.status(200).json({
            message: 'Authentication successful',
            user: user 
        });
    } catch (error) {
        console.error('Error verifying Google token:', error);
        res.status(401).send('Invalid authentication token');
    }
});

app.post('/api/auth/logout', (req, res) => {
    // If using JWT stored in HttpOnly cookies
    res.clearCookie('token');
    // Any other session or token invalidation logic here

    res.status(200).json({ message: 'Logged out successfully' });
});


// Adding items to DB
app.post('/items', async (req, res) => {
    console.log("Adding Item")
  try {
    const collection = mongoclient.db("Uniswap").collection("Items");
    const post = {
        name: req.body.name,
        releaseDate: req.body.releaseDate,
        totalStars: 0,
        totalReviews: 0
    };

    await collection.insertOne(post);
    return res.json("Sale has been created.");
    } catch (error) {
        console.error("Error executing query:", error);
        return res.status(500).json(error);
    }
});

// Fetching all  items from DB
app.get('/items', async (req, res) => {
    try {
        const cat = req.query.cat;
        const collection = mongoclient.db("Uniswap").collection("Items");
        const query = cat ? { cat } : {};
        
            const data = await collection.find(query).toArray();
            return res.status(200).json(data);
        } catch (error) {
            console.error("Error executing query:", error);
            return res.status(500).json(error);
        }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
