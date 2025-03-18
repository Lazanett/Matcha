import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";  // Ta connexion à la base de données

const router = express.Router();

// Inscription d'un utilisateur
router.post("/signup", async (req, res) => {
    const { nom, mot_de_passe } = req.body;
    if (!nom || !mot_de_passe) {
        return res.status(400).json({ message: "Nom et mot de passe requis" });
    }

    try {
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);  // Hash du mot de passe
        const [result] = await pool.query(
            "INSERT INTO utilisateurs (nom, mot_de_passe) VALUES (?, ?)",
            [nom, hashedPassword]
        );
        res.status(201).json({ message: "Utilisateur créé avec succès", id: result.insertId });
    } catch (err) {
        console.error("❌ Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});

// Connexion d'un utilisateur
router.post("/login", async (req, res) => {
    const { nom, mot_de_passe } = req.body;
    if (!nom || !mot_de_passe) {
        return res.status(400).json({ message: "Nom et mot de passe requis" });
    }

    try {
        const [rows] = await pool.query(
            "SELECT * FROM utilisateurs WHERE nom = ?",
            [nom]
        );

        const user = rows[0];
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }

        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) {
            return res.status(400).json({ message: "Mot de passe incorrect" });
        }

        // Générer un token JWT
        const token = jwt.sign(
            { id: user.id, nom: user.nom, role: user.role },
            "ton_secret_jwt", // Remplace par un secret plus sécurisé
            { expiresIn: "1h" }  // Le token expire dans 1 heure
        );

        res.json({ message: "Connexion réussie", token });
    } catch (err) {
        console.error("❌ Erreur lors de la connexion:", err);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

export default router;
