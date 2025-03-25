import express from "express";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import matchRoutes from "./routes/match.js";
import pool from "./database.js"

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

// Pour accepter le JSON dans les requêtes
app.use(express.json());

// Route Home (de base)
app.get("/", (req, res) => {
    res.json({ message: "Bienvenue sur notre API en Node JS !" });
});

// OTHER Routes 
app.use("/auth", authRoutes); 
app.use('/profile', profileRoutes);
app.use('/match', matchRoutes);


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

