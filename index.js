import express from 'express'
const app = express()
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import dotenv from "dotenv"
import cors from "cors"
const port = 5000
dotenv.config()


app.use(express.json())
app.use(cors())
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

        app.get('/all-classes', async (req, res) => {
            const email = req.query.email;
            // console.log(email);

            if (!email) {
                return res.status(400).send("Email is required");
            }

            // Search in the students array
            const classes = await classCollection.find({
                students: email  // MongoDB automatically searches in arrays
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
