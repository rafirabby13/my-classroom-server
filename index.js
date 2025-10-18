import express from 'express'
const app = express()
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import dotenv from "dotenv"
import cors from "cors"
const port = 5000
dotenv.config()


app.use(express.json())
app.use(cors({
    origin: [
        'http://localhost:5173',     // Without slash
        'http://localhost:5173/',    // With slash (both variants)
        process.env.FRONTEND_URL?.replace(/\/$/, '')
    ],
    credentials: true
}))
const uri = process.env.DB_URL;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const classCollection = client.db("myClassroom").collection("classes");
        const userCollection = client.db("myClassroom").collection("users");
        const assignmentsCollection = client.db("myClassroom").collection("assignments");
        const feedbackCollection = client.db("myClassroom").collection("feedback");
        const postCollection = client.db("myClassroom").collection("post");
        const commentsCollection = client.db("myClassroom").collection("comments");

        app.get('/all-classes', async (req, res) => {
            const email = req.query.email;
            console.log(email);

            if (!email) {
                return res.status(400).send("Email is required");
            }

            // Search in the students array
            // const classes = await classCollection.find().toArray();
            const classes = await classCollection.find({
                students: email
            }).toArray();

            // console.log(classes);
            res.send(classes);
        });
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id;
            const singleClass = await classCollection.findOne({ _id: new ObjectId(id) })
            // console.log(classes)
            res.send(singleClass)
        })
        app.post('/create-class', async (req, res) => {
            const data = req.body
            console.log(data)
            const createClass = await classCollection.insertOne(data)
            // console.log(classes)
            res.send(createClass)
        })
        app.post('/create-user', async (req, res) => {
            const data = req.body
            console.log(data)
            const email = data.email
            if (!email) {
                res.send({ message: "Email Not found" })
            }

            const isUserExist = await userCollection.findOne({ email: email })
            if (isUserExist) {
                return res.send({ message: "user is alrady exist" })
            }
            const user = await userCollection.insertOne(data)
            // console.log(classes)
            res.send(user)
        })
        app.post('/join-class', async (req, res) => {
            const { joinCode, email } = req.body;
            console.log({ joinCode, email })

            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }

            const query = { joinCode };
            const selectedClass = await classCollection.findOne(query);

            if (!selectedClass) {
                return res.status(404).send({ message: "Class not found" });
            }

            if (selectedClass?.students?.includes(email)) {
                return res.status(400).send({ message: "Already Joined" });
            }

            await classCollection.updateOne(
                { joinCode },
                { $push: { students: email } }
            );

            const updatedClass = await classCollection.findOne(query);
            console.log(updatedClass)
            res.send(updatedClass);
        });

        app.post('/assignments', async (req, res) => {
            const data = req.body;
            console.log(data)
            if (!data) {
                return res.send("error")
            }

            const result = await assignmentsCollection.insertOne(data)
            res.send(result)

        });

        app.get('/all-assignments', async (req, res) => {
            const id = req.query.classId
            console.log(id)
            const assignments = await assignmentsCollection.find({ classId: id }).toArray()
            console.log(assignments)
            res.send(assignments)
        })



        app.delete('/delete-assignments/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            if (!id) {
                return res.send("error")
            }

            const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)

        });


        app.post("/submit-feedback", async (req, res) => {
            try {
                const data = req.body;

                // Basic validation
                if (!data.classId) {
                    return res.status(400).send({ message: "Class ID is required" });
                }
                if (!data.feedbackType) {
                    return res.status(400).send({ message: "Feedback type is required" });
                }
                if (!data.category) {
                    return res.status(400).send({ message: "Category is required" });
                }
                if (!data.rating || data.rating < 1 || data.rating > 5) {
                    return res.status(400).send({ message: "Rating must be between 1 and 5" });
                }
                if (!data.message || data.message.trim() === "") {
                    return res.status(400).send({ message: "Message is required" });
                }

                // Build feedback object
                const feedback = {
                    time: new Date().getTime().toString(), // simple unique ID; you can use UUID
                    ...data
                }
                console.log(feedback)


                const updatedfedddback = await feedbackCollection.insertOne(feedback);
                res.send(updatedfedddback);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get('/submit-feedback/:classId', async (req, res) => {
            const id = req.params.classId
            console.log(id)
            const assignments = await feedbackCollection.find({ classId: id }).toArray()
            console.log(assignments)
            res.send(assignments)
        })


        app.post("/posts", async (req, res) => {
            try {
                const data = req.body;



                if (!data.message || data.message.trim() === "") {
                    return res.status(400).send({ message: "Message is required" });
                }

                // Build feedback object
                const post = {
                    time: new Date(), // simple unique ID; you can use UUID
                    ...data
                }
                // console.log(post)


                const updatedfedddback = await postCollection.insertOne(post);
                res.send(updatedfedddback);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });
        app.get('/posts/:classId', async (req, res) => {
            const id = req.params.classId
            console.log(id)
            const assignments = await postCollection.find({ classId: id }).toArray()
            console.log(assignments)
            res.send(assignments)
        })
        app.put("/posts/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                console.log(updateData)

                // Validate ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid post ID" });
                }

                // Validate message if provided
                if (updateData.message && updateData.message.trim() === "") {
                    return res.status(400).send({ message: "Message cannot be empty" });
                }

                // Check if post exists
                const existingPost = await postCollection.findOne({ _id: new ObjectId(id) });
                if (!existingPost) {
                    return res.status(404).send({ message: "Post not found" });
                }

                // Update post with new data and updated timestamp
                const result = await postCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            ...updateData,
                            updatedAt: new Date()
                        }
                    },
                    { returnDocument: "after" }
                );

                res.status(200).send({
                    success: true,
                    message: "Post updated successfully",
                    data: result.value
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // DELETE - DELETE
        app.delete("/posts/:id", async (req, res) => {
            try {
                const { id } = req.params;

                // Validate ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid post ID" });
                }

                // Check if post exists before deleting
                const existingPost = await postCollection.findOne({ _id: new ObjectId(id) });
                if (!existingPost) {
                    return res.status(404).send({ message: "Post not found" });
                }

                // Delete the post
                const result = await postCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Post not found" });
                }

                res.status(200).send({
                    success: true,
                    message: "Post deleted successfully",
                    data: result
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // CREATE COMMENT
        app.post("/posts/:postId/comments", async (req, res) => {
            try {
                const { postId } = req.params;
                const { message } = req.body;

                if (!message || message.trim() === "") {
                    return res.status(400).send({ message: "Comment message is required" });
                }

                if (!ObjectId.isValid(postId)) {
                    return res.status(400).send({ message: "Invalid post ID" });
                }

                const comment = {
                    postId: new ObjectId(postId),
                    message: message.trim(),
                    time: new Date(),
                    userName: "Demo User" // You can get this from auth/request
                };

                const result = await commentsCollection.insertOne(comment);
                res.status(201).send({
                    success: true,
                    message: "Comment created successfully",
                    data: result
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // GET ALL COMMENTS FOR A POST
        app.get("/posts/:postId/comments", async (req, res) => {
            try {
                const { postId } = req.params;

                if (!ObjectId.isValid(postId)) {
                    return res.status(400).send({ message: "Invalid post ID" });
                }

                const comments = await commentsCollection
                    .find({ postId: new ObjectId(postId) })
                    .sort({ time: -1 })
                    .toArray();

                res.status(200).send({
                    success: true,
                    message: "Comments retrieved successfully",
                    data: comments
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // UPDATE COMMENT
        app.put("/comments/:commentId", async (req, res) => {
            try {
                const { commentId } = req.params;
                const { message } = req.body;

                if (!message || message.trim() === "") {
                    return res.status(400).send({ message: "Comment cannot be empty" });
                }

                if (!ObjectId.isValid(commentId)) {
                    return res.status(400).send({ message: "Invalid comment ID" });
                }

                const result = await commentsCollection.findOneAndUpdate(
                    { _id: new ObjectId(commentId) },
                    {
                        $set: {
                            message: message.trim(),
                            updatedAt: new Date()
                        }
                    },
                    { returnDocument: "after" }
                );

                if (!result.value) {
                    return res.status(404).send({ message: "Comment not found" });
                }

                res.status(200).send({
                    success: true,
                    message: "Comment updated successfully",
                    data: result.value
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // DELETE COMMENT
        app.delete("/comments/:commentId", async (req, res) => {
            try {
                const { commentId } = req.params;

                if (!ObjectId.isValid(commentId)) {
                    return res.status(400).send({ message: "Invalid comment ID" });
                }

                const result = await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Comment not found" });
                }

                res.status(200).send({
                    success: true,
                    message: "Comment deleted successfully",
                    data: result
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });



        // DELETE CLASS
        app.delete("/class/:classId", async (req, res) => {
            try {
                const { classId } = req.params;

                // Validate ID
                if (!ObjectId.isValid(classId)) {
                    return res.status(400).send({ message: "Invalid class ID" });
                }

                // Check if class exists before deleting
                const existingClass = await classCollection.findOne({ _id: new ObjectId(classId) });
                if (!existingClass) {
                    return res.status(404).send({ message: "Class not found" });
                }

                // Delete the class
                const result = await classCollection.deleteOne({ _id: new ObjectId(classId) });

                // Also delete all posts/comments associated with this class (optional but recommended)
                await postCollection.deleteMany({ classId: new ObjectId(classId) });
                await commentsCollection.deleteMany({ classId: new ObjectId(classId) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Class not found" });
                }

                res.status(200).send({
                    success: true,
                    message: "Class deleted successfully",
                    data: result
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.delete("/delete-assignments/:id", async (req, res) => {
            try {
                const { id } = req.params;

                // Validate ID format
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid assignment ID format"
                    });
                }

                // Check if assignment exists
                const assignment = await assignmentsCollection.findOne({
                    _id: new ObjectId(id)
                });

                if (!assignment) {
                    return res.status(404).json({
                        success: false,
                        message: "Assignment not found"
                    });
                }

                // Delete associated submissions
                await submissionsCollection.deleteMany({
                    assignmentId: new ObjectId(id)
                });

                // Delete the assignment
                const result = await assignmentsCollection.deleteOne({
                    _id: new ObjectId(id)
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Failed to delete assignment"
                    });
                }

                res.status(200).json({
                    success: true,
                    message: "Assignment deleted successfully",
                    data: result
                });

            } catch (error) {
                console.error("Delete assignment error:", error);
                res.status(500).json({
                    success: false,
                    message: "Server error",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to My Classroom')
})

app.listen(port, () => {
    console.log(`My Classroom running at ${port}`)
})
