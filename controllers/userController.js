import { ObjectId } from 'mongodb';
import mongoclient from '../Database/db.js'; // Ensure the path is correct
import jwt from 'jsonwebtoken';

export const updateUserToken = async (req, res) => {
    const { token: fcmToken } = req.body;
    const userEmail = req.user.userEmail;
    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        await usersCollection.updateOne(
            { userEmail },
            { $set: { fcmToken } }
        );
        res.status(200).json({ message: "FCM token updated successfully" });
    } catch (error) {
        console.error("Error updating FCM token:", error);
        res.status(500).json({ message: "Failed to update FCM token" });
    }
};

export const getUserItems = async (req, res) => {
    const userEmail = req.user.userEmail;
    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const items = await itemsCollection.find({ userEmail }).toArray();
        res.status(200).json(items);
    } catch (error) {
        console.error("Error fetching items posted by the user:", error);
        res.status(500).json({ message: "Failed to fetch items" });
    }
};

export const checkLoginStatus = async (req, res) => {
    if (req.user) {
        res.json({ user: req.user });
    } else {
        res.json({ user: null });
    }
};

export const manageUserFavorites = async (req, res) => {
    const { itemId } = req.body;
    const userEmail = req.user.userEmail;
    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        const user = await usersCollection.findOne({ userEmail });
        const isFavorite = user.favouriteItems.includes(itemId);

        if (isFavorite) {
            await usersCollection.updateOne({ userEmail }, { $pull: { favouriteItems: itemId } });
        } else {
            await usersCollection.updateOne({ userEmail }, { $addToSet: { favouriteItems: itemId } });
        }

        res.status(200).json({ message: isFavorite ? 'Item removed from favorites' : 'Item added to favorites' });
    } catch (error) {
        console.error("Error updating user's favorite items:", error);
        res.status(500).json({ message: "Failed to update favorite items" });
    }
};

export const getUserFavorites = async (req, res) => {
    const userEmail = req.user.userEmail;
    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        const user = await usersCollection.findOne({ userEmail });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const favoriteItems = user.favouriteItems || [];
        res.json(favoriteItems);
    } catch (error) {
        console.error("Error retrieving user's favorite items:", error);
        res.status(500).json({ message: "Failed to retrieve favorite items" });
    }
};

export const registerOrUpdateUser = async (req, res) => {
    const { token, contactNumber } = req.body; // Assume token is the Google token and contactNumber is the phone number to update

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Check if the user already exists
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        let user = await usersCollection.findOne({ userEmail: payload.email });

        if (user) {
            // User exists, update phone number
            await usersCollection.updateOne({ userEmail: payload.email }, { $set: { contactNumber: contactNumber } });
        } else {
            // New user, insert new document
            user = {
                userName: payload.name,
                userEmail: payload.email,
                userPicture: payload.picture,
                contactNumber: contactNumber,
                favouriteItems: [],
                itemsPosted: [],
            };
            await usersCollection.insertOne(user);
        }

        // Sign JWT with updated information
        const userJwt = jwt.sign({
            userEmail: payload.email,
            userName: payload.name,
            userPicture: payload.picture,
            contactNumber: contactNumber,
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Set the JWT in a cookie
        res.cookie('token', userJwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });

        res.status(200).json({
            message: 'User registered/updated successfully',
            user: {
                userEmail: payload.email,
                userName: payload.name,
                userPicture: payload.picture,
                contactNumber: contactNumber,
            },
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: "Failed to register/update user" });
    }};

export const updatePhoneNumber = async (req, res) => {
    const { newPhoneNumber } = req.body;
    const userEmail = req.user.userEmail;

    if (!newPhoneNumber) {
        return res.status(400).json({ message: "New phone number is required" });
    }

    const usersCollection = mongoclient.db("Uniswap").collection("Users");
    const itemsCollection = mongoclient.db("Uniswap").collection("Items");

    try {
        await usersCollection.updateOne({ userEmail }, { $set: { contactNumber: newPhoneNumber } });

        const updateItemsResult = await itemsCollection.updateMany(
            { userEmail },
            { $set: { contactNumber: newPhoneNumber } }
        );

        const updatedJwt = jwt.sign({
            userEmail: userEmail,
            contactNumber: newPhoneNumber
        }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', updatedJwt, {
            httpOnly: true,
            secure: true, // Set to true if using https
            sameSite: 'None', // Adjust according to your requirements
        });

        res.json({
            message: "Phone number updated successfully",
            updatedItemsCount: updateItemsResult.modifiedCount,
        });
    } catch (error) {
        console.error('Error updating phone number:', error);
        res.status(500).json({ message: "Failed to update phone number" });
    }};

export const hasFcmToken = async (req, res) => {
    const userEmail = req.user.userEmail;

    try {
        const usersCollection = mongoclient.db("Uniswap").collection("Users");
        const user = await usersCollection.findOne({ userEmail }, { projection: { fcmToken: 1 } });

        if (user && user.fcmToken) {
            res.json({ hasFcmToken: true });
        } else {
            res.json({ hasFcmToken: false });
        }
    } catch (error) {
        console.error("Error checking FCM token:", error);
        res.status(500).json({ message: "Failed to check FCM token" });
    }};
