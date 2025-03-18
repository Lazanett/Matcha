// import express from 'express';
// import { connection } from './connect.js';
// import users from './routes/users.js';

// const port = process.env.PORT || 5000;
// const app = express();

// app.use(express.json()); // Pour gérer le JSON dans les requêtes

// app.get("/", (req, res) => {
//     res.json({ message: "Bienvenue sur notre API en Node.js" });
// });
// // Routes
// app.use("/users", users);
// // try {
// //     app.use(connection);
// // } catch (e) {
// //     console.log(e);
// // }

// app.listen(port, () => {
//     console.log(`Serveur en ligne sur le port ${port} !`);
// });


import express from "express";
import users from "./routes/users.js"
import connection from './database.js';

const port = process.env.PORT || 5000;
const app = express();


app.get("/", (req, res) => {
    res.json({message: "Bienvenue sur notre API en Node JS !"})
});

app.use("/users", users);


app.listen(port, () => {
    console.log("Serveur est en ligne !");
});

