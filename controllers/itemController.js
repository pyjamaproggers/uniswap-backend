import { ObjectId } from 'mongodb';
import mongoclient from '../Database/db.js'; // Ensure the path is correct

export const updateItem = async (req, res) => {
    const { itemId } = req.params;
    const { itemName, itemDescription, itemPrice, itemCategory, itemPicture, contactNumber, live } = req.body;
    const userEmail = req.user.userEmail;

    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId), userEmail });
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        if (item.userEmail !== userEmail) {
            return res.status(403).json({ message: "You do not have permission to update this item" });
        }

        const updatedItem = {
            itemName,
            itemDescription,
            itemPrice,
            itemCategory,
            itemPicture,
            contactNumber,
            live,
            dateAdded: new Date()
        };
        await itemsCollection.updateOne({ _id: new ObjectId(itemId) }, { $set: updatedItem });
        res.status(200).json({ message: "Item updated successfully" });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ message: "Failed to update item" });
    }
};

export const getItems = async (req, res) => {
    const cat = req.query.cat;
    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const query = cat ? { cat } : {};
        const data = await itemsCollection.find(query).toArray();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error executing query:", error);
        res.status(500).json({ message: "Failed to retrieve items" });
    }
};

export const deleteItem = async (req, res) => {
    const { itemId } = req.params;
    const userEmail = req.user.userEmail;
    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId), userEmail });
        if (!item) {
            return res.status(404).json({ message: "Item not found or you don't have permission to delete this item" });
        }

        await itemsCollection.deleteOne({ _id: new ObjectId(itemId) });
        res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error("Error deleting the item:", error);
        res.status(500).json({ message: "Failed to delete the item" });
    }
};

export const createItem = async (req, res) => {
    const { itemName, itemDescription, itemPrice, itemCategory, itemPicture, contactNumber, live } = req.body;
    const userEmail = req.user.userEmail;
    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const item = {
            userName: req.user.userName,
            userEmail,
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
        res.status(201).json({ message: "Item successfully posted", item });
    } catch (error) {
        console.error("Error adding item to DB:", error);
        res.status(500).json({ message: "Failed to post item" });
    }
};

export const toggleItemLive = async (req, res) => {
    const { itemId } = req.params;
    const userEmail = req.user.userEmail;
    try {
        const itemsCollection = mongoclient.db("Uniswap").collection("Items");
        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId), userEmail });
        if (!item) {
            return res.status(404).json({ message: "Item not found or you don't have permission to update this item" });
        }

        const newLiveStatus = item.live === "y" ? "n" : "y";
        await itemsCollection.updateOne({ _id: new ObjectId(itemId) }, { $set: { live: newLiveStatus } });
        res.status(200).json({ message: "Item live status updated successfully", live: newLiveStatus });
    } catch (error) {
        console.error("Error updating live status of the item:", error);
        res.status(500).json({ message: "Failed to update live status of the item" });
    }
};
