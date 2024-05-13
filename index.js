const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000


// middlewares
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gnbvncz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // for just one data collection show
        // const showCollection = client.db('volunteer-need').collection('show')

        // for every data collection - all the volunteering post is here 
        const postCollection = client.db('volunteer-need').collection('post')

        // my own volunteering request 
        const requestCollection = client.db('volunteer-need').collection('request')



        app.get('/post', async (req, res) => {
            let query = {}
            if (req.query?.organizer_email) {
                query = { organizer_email: req.query.organizer_email }
            }
            const cursor = postCollection.find(query).sort({ deadline: 1 })
            const result = await cursor.toArray()
            res.send(result)
        })


        app.get('/post/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.findOne(query);
            res.send(result);
        })

        app.post('/post', async (req, res) => {
            const newPost = req.body;
            console.log(newPost);
            const result = await postCollection.insertOne(newPost);
            res.send(result);
        })
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query)
            res.send(result)
        })


        app.post('/request', async (req, res) => {
            const newRequest = req.body;
            console.log(newRequest);
            const result = await requestCollection.insertOne(newRequest);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('volunteer server is running perfectly')
})

app.listen(port, () => {
    console.log(`volunteer server is running on port ${port}`)
})