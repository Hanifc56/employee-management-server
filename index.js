const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ntldpld.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("userDb").collection("users");
    const workCollection = client.db("userDb").collection("workSheet");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin use verify token then admin to verify them

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // verify Hr before using verify token
    const verifyHr = async (req, res, next) => {
      const email = req.decoded.email;

      const query = { email: email };

      const user = await userCollection.findOne(query);
      const isHr = user?.role === "Hr";

      if (!isHr) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // employee woorksheet ralated api
    // get work
    app.get("/workSheet", async (req, res) => {
      const result = await workCollection.find().toArray();
      res.send(result);
    });

    // post work
    app.post("/workSheet", async (req, res) => {
      const workInfo = req.body;
      const result = await workCollection.insertOne(workInfo);
      res.send(result);
    });

    // user related api
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get the email to verify admin
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // get the email to verify Hr
    app.get("/users/Hr/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let hr = false;

      if (user) {
        hr = user?.role === "Hr";
      }
      res.send({ hr });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // update a user to admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // update a user to Hr
    app.patch("/users/hr/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "Hr",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // verify a employee in hr routes
    app.patch(
      "/users/verifyUser/:id",
      verifyToken,
      verifyHr,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "verified",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // delete a user
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// inital oprations
app.get("/", (req, res) => {
  res.send("Employee managament server is runnig!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
