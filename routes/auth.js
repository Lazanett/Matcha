import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";  // Ta connexion à la base de données
import { v4 as uuidv4 } from 'uuid'; // Import de la librairie uuid
import verifyToken from "../middlewares/authMiddleware.js"; 

const router = express.Router();

// Inscription d'un utilisateur (ajout middleware => decripetra le token )
//creer un UUID = identifint unique de l'utiisateur et generer un token sur JWT avec 


//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNDUxMzhlMTYtMmUyNy00Mjk3LTkwMTEtOWQ0MjAxZDQwNmUzIiwiaWF0IjoxNzQyNDcyNzI2LCJleHAiOjE3NDI0NzYzMjZ9.yfLhZziDm--mEWZ48v1_5NQ4H2Rf3f8cBjTeSbwYZXs

// address mail et mot de passe ✅ 
// acces app si profil completer / ajout profil complet => default false
// enoir requete /nouvelle route proteger pour completer le profil = envoie token utlisateur et 
// body tu envoie integratilier des donnees en plus


// creation script qui creer des faux profil (complet) pour faire le matching
router.post("/signup", async (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    else if (!email) {
        return res.status(400).json({ message: "Email requis" });
    }
    else if (!mot_de_passe) {
        return res.status(400).json({ message: "Mot de passe requis" });
    }

    try {

        // Vérifier si l'email est déjà utilisé
        const [existingUsers] = await pool.query(
            "SELECT * FROM utilisateurs WHERE email = ?",
            [email]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email déjà utilisé" });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);  

        // Générer un UUID pour l'utilisateur
        const uuid = uuidv4();

        // Insertion dans la base de données
        const [result] = await pool.query(
            "INSERT INTO utilisateurs (uuid, email, mot_de_passe) VALUES (?, ?, ?)",
            [uuid, email, hashedPassword]
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
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    else if (!email) {
        return res.status(400).json({ message: "Email requis" });
    }
    else if (!mot_de_passe) {
        return res.status(400).json({ message: "Mot de passe requis" });
    }

    try {
        // Rechercher l'utilisateur par son email
        const [rows] = await pool.query(
            "SELECT * FROM utilisateurs WHERE email = ?",
            [email]
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
