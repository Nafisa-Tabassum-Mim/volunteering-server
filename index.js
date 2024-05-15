const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


// middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://volunteer-91281.web.app',
        'https://volunteer-91281.firebaseapp.com'
    ],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gnbvncz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



// middlewares
const logger = (req, res, next) => {
    console.log("log info - ", req.method, req.url)
    next()
}

const verifyToken = (req, res, next) => {
    // console.log(req.cookies)
    const token = req?.cookies?.token;
    console.log('token in the middleware -', token);
    // no token available 
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access - no token' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}
const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // for every data collection - all the volunteering post is here 
        const postCollection = client.db('volunteer-need').collection('post')
        // my own volunteering request 
        const requestCollection = client.db('volunteer-need').collection('request')

        // auth related api 
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body
            console.log('user for token', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.cookie('token', token, cookieOption).send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log('logging out', user)
            res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ success: true })
        })

        app.get('/post', async (req, res) => {
        
            const search = req.query?.search
            let query = {}
            if (search) {
               query = { 
                post_title: { $regex: search, $options: 'i' } ,}
            }

            if (req.query?.organizer_email) {
                query = { organizer_email: req.query.organizer_email }
            }
            console.log(query)

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
            // console.log(newPost);
            const result = await postCollection.insertOne(newPost);
            res.send(result);
        })
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query)
            res.send(result)
        })

        app.delete('/request/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await requestCollection.deleteOne(query)
            res.send(result)
        })


        app.post('/request', async (req, res) => {
            const newRequest = req.body;
            // console.log(newRequest);
            const result = await requestCollection.insertOne(newRequest);
            res.send(result);



        })

        // new one decrease the volunteer
        app.patch('/post/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const updateDoc = { $inc: { volunteers_needed: -1 } }
            const result = await postCollection.updateOne(query, updateDoc)
            res.send(result)

        })



        app.get('/request', logger, verifyToken, async (req, res) => {
            console.log("query email", req.query?.volunteer_email)
            console.log("user email", req.user)
            console.log('cook cookies', req.cookies)

            if (req.user.email !== req.query?.volunteer_email) {
                return res.status(403).send({ message: 'forbidden access!' })
            }
            let query = {}
            if (req.query?.volunteer_email) {
                query = { volunteer_email: req.query.volunteer_email }
            }
            const cursor = requestCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.put('/post/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedPost = req.body;
            // console.log(updatedPost)
            const post = {
                $set: {
                    thumbnail: updatedPost.thumbnail,
                    post_title: updatedPost.post_title,
                    description: updatedPost.description,
                    category: updatedPost.category,
                    location: updatedPost.location,
                    volunteers_needed: updatedPost.volunteers_needed,
                    deadline: updatedPost.deadline,
                    organizer_name: updatedPost.organizer_name,
                    organizer_email: updatedPost.organizer_email,
                }
            }

            const result = await postCollection.updateOne(filter, post, options);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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