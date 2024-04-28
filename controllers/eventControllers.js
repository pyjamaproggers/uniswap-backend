import { ObjectId } from 'mongodb';
import mongoclient from '../Database/db.js'; // Ensure the path is correct

export const createEvent = async (req, res) => {
    const { eventName, eventDescription, eventDate, eventTime, eventLocation, eventCategory, notifications, live } = req.body;
    const userEmail = req.user.userEmail;

    try {
        const eventsCollection = mongoclient.db("Uniswap").collection("Events");
        const event = {
            userName: req.user.userName,
            userEmail,
            userPicture: req.user.userPicture,
            eventName,
            eventDescription,
            eventDate,
            eventTime,
            eventLocation,
            eventCategory,
            notifications,
            live,
            dateAdded: new Date(),
        };

        const result = await eventsCollection.insertOne(event);
        res.status(201).json({ message: "Event successfully posted", event });
    } catch (error) {
        console.error("Error adding event to DB:", error);
        res.status(500).json({ message: "Failed to post event" });
    }
};

export const updateEventNotifications = async (req, res) => {
    const { eventId } = req.params;
    const fcmToken = req.body.fcmToken;

    try {
        const eventsCollection = mongoclient.db("Uniswap").collection("Events");
        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $addToSet: { notifications: fcmToken } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "FCM token added successfully to event" });
    } catch (error) {
        console.error("Error updating event with FCM token:", error);
        res.status(500).json({ message: "Failed to add FCM token to event" });
    }
};

export const getEvents = async (req, res) => {
    const cat = req.query.cat;
    try {
        const eventsCollection = mongoclient.db("Uniswap").collection("Events");
        const query = cat ? { cat } : {};
        const events = await eventsCollection.find(query).toArray();
        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Failed to retrieve events" });
    }
};
