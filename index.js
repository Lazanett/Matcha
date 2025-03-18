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
import users from "./routes/users.js";
import pool from "./database.js"; // Import de la connexion MySQL

const port = process.env.PORT || 5000;
const app = express();

// Vérifier la connexion à MySQL au démarrage
async function checkDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Connexion réussie à MySQL !");
        connection.release();
    } catch (err) {
        console.error("❌ Erreur de connexion à MySQL:", err);
    }
}
checkDatabaseConnection();

app.get("/", (req, res) => {
    res.json({ message: "Bienvenue sur notre API en Node JS !" });
});

// Route users
app.use("/users", users);

// Route pour tester la connexion à MySQL
app.get("/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1");
        res.send("✅ Connexion réussie à MySQL !");
    } catch (err) {
        console.error("❌ Erreur lors de la requête:", err);
        res.status(500).send("❌ Erreur de connexion à la base de données");
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
});

