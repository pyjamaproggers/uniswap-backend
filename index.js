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
import { ObjectId } from 'mongodb';
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
    // console.log("hi")
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

// Adjusted to handle POST requests for image uploads
app.post('/api/upload', authenticateToken, async (req, res) => {
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



app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Check if the user already exists in the database
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        let user = await usersCollection.findOne({ userEmail: payload.email });

        if (!user) {
            // If the user doesn't exist, create a new user entry
            user = {
                userName: payload.name,
                userEmail: payload.email,
                userPicture: payload.picture,
                favouriteItems: [], // Assuming you're tracking favorite items
                itemsPosted: [] // Assuming you're tracking items posted by the user
            };
            await usersCollection.insertOne(user);
        }

        // Regardless of new or existing user, sign a JWT for them
        const userJwt = jwt.sign({
            userEmail: user.userEmail,
            userName: user.userName,
            userPicture: user.userPicture
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', userJwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });

        res.status(200).json({
            message: 'Authentication successful',
            user: {
                userEmail: user.userEmail,
                userName: user.userName,
                userPicture: user.userPicture,
            },
        });
    } catch (error) {
        console.error('Error verifying Google token or interacting with the database:', error);
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
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
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

        const result = await itemsCollection.insertOne(item);

        // Assuming the item ID is needed to link with the user
        const itemId = result.insertedId;

        // Update the user's document to reference the new item
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        await usersCollection.updateOne(
            { userEmail: req.user.userEmail },
            { $push: { itemsPosted: itemId } } // Adds the item ID to the itemsPosted array
        );

        res.status(201).json({ message: "Item successfully posted", item });
    } catch (error) {
        console.error("Error adding item to DB or updating user document:", error);
        res.status(500).json({ message: "Failed to post item" });
    }
});


app.get('/api/user/items', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.userEmail;
        const collection = mongoclient.db("Uniswap").collection("Items");
        const itemsPostedByUser = await collection.find({ userEmail }).toArray();

        res.status(200).json(itemsPostedByUser);
    } catch (error) {
        console.error("Error fetching items posted by the user:", error);
        res.status(500).json({ message: "Failed to fetch items posted by the user" });
    }
});

app.post('/api/user/favorites', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    const userEmail = req.user.userEmail;

    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");

        // Check if the item is already in the user's favorites
        const user = await usersCollection.findOne({ userEmail });
        const isFavorite = user.favouriteItems.includes(itemId);

        if (isFavorite) {
            // Remove item from favorites
            await usersCollection.updateOne({ userEmail }, { $pull: { favouriteItems: itemId } });
        } else {
            // Add item to favorites
            await usersCollection.updateOne({ userEmail }, { $addToSet: { favouriteItems: itemId } }); // $addToSet avoids duplicates
        }

        res.status(200).json({ message: isFavorite ? 'Item removed from favorites' : 'Item added to favorites' });
    } catch (error) {
        console.error("Error updating user's favorite items:", error);
        res.status(500).json({ message: "Failed to update favorite items" });
    }
});

app.get('/api/user/favorites', authenticateToken, async (req, res) => {
    const userEmail = req.user.userEmail;
    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");

        // Find the user by email and only return the favouriteItems field
        const user = await usersCollection.findOne({ userEmail });

        if (!user) {
            // If no user is found, respond accordingly
            return res.status(404).json({ message: "User not found" });
        }
        // Respond with the favouriteItems array or an empty array if none exists
        res.json(user.favouriteItems || []);
    } catch (error) {
        console.error("Error retrieving user's favorite items:", error);
        res.status(500).json({ message: "Failed to retrieve favorite items" });
    }
});

app.patch('/api/items/:itemId', authenticateToken, async (req, res) => {
    const { itemId } = req.params; // Get the item ID from the request URL
    const { itemName, itemDescription, itemPrice, itemCategory, itemPicture, contactNumber, live } = req.body;
    const userEmail = req.user.userEmail; // Get the user's email from the authenticated user object

    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");

        // First, verify that the item belongs to the authenticated user
        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId) });
        if (!item) {
            console.log("not found")
            return res.status(404).json({ message: "Item not found" });
        }
        if (item.userEmail !== userEmail) {
            // Prevent users from updating items that do not belong to them
            return res.status(403).json({ message: "You do not have permission to update this item" });
        }

        // Perform the update operation
        const updatedItem = {
            ...(itemName && { itemName }),
            ...(itemDescription && { itemDescription }),
            ...(itemPrice && { itemPrice }),
            ...(itemCategory && { itemCategory }),
            ...(itemPicture && { itemPicture }),
            ...(contactNumber && { contactNumber }),
            ...(live && { live }),
        };

        await itemsCollection.updateOne({ _id: new ObjectId(itemId) }, { $set: updatedItem });

        res.status(200).json({ message: "Item updated successfully" });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ message: "Failed to update item" });
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
