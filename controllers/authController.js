import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import mongoclient from "../Database/db.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

// Setup for Google OAuth2 client
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

// Setup for AWS S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Controller for uploading files to S3
export const uploadFile = async (req, res) => {
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
};

// Controller for Google Authentication
export const googleAuthentication = async (req, res) => {
    const { token, contactNumber } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        let firstTime = false;
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        let user = await usersCollection.findOne({ userEmail: payload.email });
        if (!user) {
            firstTime = true;
            user = {
                userName: payload.name,
                userEmail: payload.email,
                userPicture: payload.picture,
                contactNumber,
                favouriteItems: [],
                itemsPosted: [],
            };
            await usersCollection.insertOne(user);
        }

        const userJwt = jwt.sign({
            userEmail: user.userEmail,
            userName: user.userName,
            userPicture: user.userPicture,
            contactNumber: user.contactNumber,
        }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.cookie('token', userJwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });

        res.status(200).json({
            message: 'Google Authentication successful',
            user: user,
            firstTime: firstTime
        });
    } catch (error) {
        console.error('Error verifying Google token or interacting with the database:', error);
        res.status(500).json({ message: "Authentication failed" });
    }
};

// Controller for logging out
export const logoutUser = async (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
};

// Controller for verifying user
export const verifyUser = async (req, res) => {
    try {
        const userEmail = req.user.userEmail;
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        const user = await usersCollection.findOne({ userEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userJwt = jwt.sign({
            userEmail: user.userEmail,
            userName: user.userName,
            userPicture: user.userPicture,
            contactNumber: user.contactNumber,
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', userJwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });

        res.status(200).json({
            message: 'User verified successfully',
            user: user,
        });
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};
