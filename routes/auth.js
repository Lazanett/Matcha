import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";  // Ta connexion à la base de données
import { v4 as uuidv4 } from 'uuid'; // Import de la librairie uuid
import verifyToken from "../middlewares/authMiddleware.js"; 
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMTMyMjc2OTYtMDU3NS00MzA0LTg1OGQtYjhmYzc1ZTBjY2ZjIiwiaWF0IjoxNzQyMzk1Njg2LCJleHAiOjE3NDIzOTkyODZ9.awwzUkLe7Usp17IjO7ucl4M1lIQlAd7CxE-qbWue6h4
const router = express.Router();

// Inscription d'un utilisateur (ajout middleware => decripetra le token )
//creer un UUID = identifint unique de l'utiisateur et generer un token sur JWT avec 

router.post("/signup", async (req, res) => {
    const { nom, mot_de_passe } = req.body;

    if (!nom || !mot_de_passe) {
        return res.status(400).json({ message: "Nom et mot de passe requis" });
    }

    try {
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);  // Hash du mot de passe

        // Générer un UUID pour l'utilisateur
        const uuid = uuidv4();

        // Insertion dans la base de données
        const [result] = await pool.query(
            "INSERT INTO utilisateurs (uuid, nom, mot_de_passe) VALUES (?, ?, ?)",
            [uuid, nom, hashedPassword]
        );

        // Répondre avec un message de succès
        res.status(201).json({ message: "Utilisateur créé avec succès", id: result.insertId });
    } catch (err) {
        console.error("❌ Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});


/// Connexion d'un utilisateur
router.post("/login", async (req, res) => {
    const { nom, mot_de_passe } = req.body;

    if (!nom || !mot_de_passe) {
        return res.status(400).json({ message: "Nom et mot de passe requis" });
    }

    try {
        // Rechercher l'utilisateur par son nom
        const [rows] = await pool.query(
            "SELECT * FROM utilisateurs WHERE nom = ?",
            [nom]
        );

        const user = rows[0];
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }

        // Comparer le mot de passe avec le mot de passe haché
        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) {
            return res.status(400).json({ message: "Mot de passe incorrect" });
        }

        // Générer un token JWT avec l'UUID seulement
        const token = jwt.sign(
            { uuid: user.uuid },  // Inclure uniquement l'UUID dans le token
            "ton_secret_jwt", // Remplace par un secret plus sécurisé
            { expiresIn: "1h" }  // Le token expire dans 1 heure
        );

        res.json({ message: "Connexion réussie", token });
    } catch (err) {
        console.error("❌ Erreur lors de la connexion:", err);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

// Route protégée, nécessite un token JWT valide
router.get("/protected", verifyToken, (req, res) => {
    // Une fois que le middleware `verifyToken` a vérifié le token, tu peux accéder à l'UUID
    res.json({
        message: `Bienvenue utilisateur avec UUID: ${req.user.uuid}`,
    });
});

export default router;
