import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes'; // Adjust path as necessary
import itemRoutes from './routes/itemRoutes'; // Adjust path as necessary
import eventRoutes from './routes/eventRoutes'; // Adjust path as necessary
import userRoutes from './routes/userRoutes'; // Adjust path as necessary
import cron from "node-cron";
import admin from 'firebase-admin';
import fs from 'fs';
import { fileURLToPath, dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;

const serviceAccount = JSON.parse(fs.readFileSync(join(__dirname, 'path/to/your/serviceAccountKey.json'), 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(express.json());
app.use(cors({
    origin: ['https://main--uniswapashoka.netlify.app', 'https://localhost:3000', 'https://uniswapashoka.netlify.app', 'https://uniswap.co.in'],
    credentials: true,
}));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/user', userRoutes);

cron.schedule('* * * * *', async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const eventsCollection = mongoclient.db("Uniswap").collection("Events");
    const upcomingEvents = await eventsCollection.find({
        eventDate: { $gte: now, $lt: oneHourLater }
    }).toArray();

    upcomingEvents.forEach(event => {
        if (event.notifications && event.notifications.length > 0) {
            const message = {
                notification: {
                    title: 'Event Reminder',
                    body: `Event "${event.eventName}" is starting soon!`
                },
                tokens: event.notifications,
            };

            admin.messaging().sendMulticast(message)
                .then(response => console.log(event.eventName, ' is in one hour!'))
                .catch(error => console.log('Error sending notification:', error));
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
