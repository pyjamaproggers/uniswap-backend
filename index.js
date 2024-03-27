import express from 'express';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import client from './Database/db.js';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); 
app.use(cors()); // Enable CORS for all routes

// Adding movies to DB
// app.post('/movies', async (req, res) => {
//     console.log("Adding Movie")
//   try {
//     const collection = client.db("SaasMonk_Movies").collection("Movies");
//     const post = {
//         name: req.body.name,
//         releaseDate: req.body.releaseDate,
//         totalStars: 0,
//         totalReviews: 0
//     };

//     await collection.insertOne(post);
//     return res.json("Movie has been created.");
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });

// Fetching movies from DB
app.get('/items', async (req, res) => {
    try {
        const cat = req.query.cat;
        const collection = client.db("Uniswap").collection("Items");
        const query = cat ? { cat } : {};
        
            const data = await collection.find(query).toArray();
            return res.status(200).json(data);
        } catch (error) {
            console.error("Error executing query:", error);
            return res.status(500).json(error);
        }
});

// Fetching reviews from DB
// app.get('/reviews', async (req, res) => {
//     try {
//         const cat = req.query.cat;
//         const collection = client.db("SaasMonk_Movies").collection("Reviews");
//         const query = cat ? { cat } : {};
        
//             const data = await collection.find(query).toArray();
//             return res.status(200).json(data);
//         } catch (error) {
//             console.error("Error executing query:", error);
//             return res.status(500).json(error);
//         }
// });

// // Adding review to DB
// app.post('/reviews', async (req, res) => {
//     try {
//         const reviewsCollection = client.db("SaasMonk_Movies").collection("Reviews");
//         const moviesCollection = client.db("SaasMonk_Movies").collection("Movies");

//         const review = {
//             movieId: new ObjectId(req.body.movieID),
//             name: req.body.name,
//             rating: req.body.rating,
//             comment: req.body.comment
//         };

//         const reviewResult = await reviewsCollection.insertOne(review);

//         const updateResult = await moviesCollection.updateOne(
//             { _id: review.movieId },
//             {
//                 $inc: { totalStars: parseInt(review.rating), totalReviews: 1 }
//             }
//         );

//         if (updateResult.matchedCount === 0) {
//             return res.status(404).json({ message: "Movie not found" });
//         }

//         return res.json({ message: "Review has been added and movie updated." });
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });


// // Delete a movie by ID
// app.delete('/movies/:id', async (req, res) => {
//     try {
//         const collection = client.db("SaasMonk_Movies").collection("Movies");
//         const { id } = req.params;
//         const result = await collection.deleteOne({ _id: new ObjectId(id) });

//         if (result.deletedCount === 0) {
//             return res.status(404).json({ message: "Movie not found" });
//         }

//         const reviewsCollection = client.db("SaasMonk_Movies").collection("Reviews");
//         await reviewsCollection.deleteMany({ movieId: new ObjectId(id) });

//         return res.json({ message: "Movie and associated reviews deleted" });
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });

// // Delete a review by ID
// app.delete('/reviews/:id', async (req, res) => {
//     try {
//         const reviewsCollection = client.db("SaasMonk_Movies").collection("Reviews");
//         const moviesCollection = client.db("SaasMonk_Movies").collection("Movies");
//         const { id } = req.params;

//         const reviewToDelete = await reviewsCollection.findOne({ _id: new ObjectId(id) });
//         if (!reviewToDelete) {
//             return res.status(404).json({ message: "Review not found" });
//         }

//         const deleteResult = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });
//         if (deleteResult.deletedCount === 0) {
//             return res.status(404).json({ message: "Review not found" });
//         }

//         await moviesCollection.updateOne(
//             { _id: reviewToDelete.movieId },
//             {
//                 $inc: { totalStars: parseInt(-reviewToDelete.rating), totalReviews: -1 }
//             }
//         );

//         return res.json({ message: "Review deleted and movie updated." });
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });

// // Edit a movie by ID
// app.patch('/movies/:id', async (req, res) => {
//     console.log("Im ehre")
//     try {
//         const collection = client.db("SaasMonk_Movies").collection("Movies");
//         const { id } = req.params;
//         const update = { $set: req.body };

//         const result = await collection.updateOne({ _id: new ObjectId(id) }, update);

//         if (result.matchedCount === 0) {
//             return res.status(404).json({ message: "Movie not found" });
//         }

//         return res.json({ message: "Movie updated successfully." });
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });

// // Edit a review by ID and update associated movie's rating
// app.patch('/reviews/:id', async (req, res) => {
//     try {
//         const reviewsCollection = client.db("SaasMonk_Movies").collection("Reviews");
//         const moviesCollection = client.db("SaasMonk_Movies").collection("Movies");
//         const { id } = req.params;

//         const updateResult = await reviewsCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });

//         if (updateResult.matchedCount === 0) {
//             return res.status(404).json({ message: "Review not found" });
//         }
//         const updatedReview = await reviewsCollection.findOne({ _id: new ObjectId(id) });
//         const movieId = updatedReview.movieId;

//         const reviews = await reviewsCollection.find({ movieId: movieId }).toArray();
//         const totalStars = reviews.reduce((acc, { rating }) => acc + rating, 0);
//         const averageRating = totalStars / reviews.length;

//         await moviesCollection.updateOne(
//             { _id: movieId },
//             {
//                 $set: {
//                     averageRating: averageRating,
//                     totalStars: totalStars
//                 }
//             }
//         );

//         return res.json({ message: "Review and movie updated successfully." });
//     } catch (error) {
//         console.error("Error executing query:", error);
//         return res.status(500).json(error);
//     }
// });






app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
