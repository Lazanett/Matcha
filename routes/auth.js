import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";
import { v4 as uuidv4 } from 'uuid';
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

function isStrongPassword(password) {
    if (password.length < 8) {
        return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins une lettre minuscule." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins une lettre majuscule." };
    }
    if (!/\d/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre." };
    }
    if (!/[@$!%*?&]/.test(password)) {
        return { valid: false, message: "Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)." };
    }

    return { valid: true };
}

router.post("/signup", async (req, res) => {
    const { email, mot_de_passe, pseudo, nom, prenom } = req.body;

    // Vérifications des champs obligatoires
    if (!email || !mot_de_passe || !pseudo || !nom || !prenom) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    
    // Vérification de la force du mot de passe
    const passwordCheck = isStrongPassword(mot_de_passe);
    if (!passwordCheck.valid) {
        return res.status(400).json({ message: passwordCheck.message });
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

        // Vérifier si le pseudo est déjà utilisé
        const [existingPseudo] = await pool.query(
            "SELECT * FROM utilisateurs WHERE pseudo = ?",
            [pseudo]
        );
        if (existingPseudo.length > 0) {
            return res.status(400).json({ message: "Pseudo déjà utilisé" });
        }

        // Hash du mot de passe
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);  

        // Générer un UUID pour l'utilisateur
        const uuid = uuidv4();

        // Insertion dans la base de données
        const [result] = await pool.query(
            "INSERT INTO utilisateurs (uuid, email, mot_de_passe, pseudo, nom, prenom) VALUES (?, ?, ?, ?, ?, ?)",
            [uuid, email, hashedPassword, pseudo, nom, prenom]
        );

        // Répondre avec un message de succès
        res.status(201).json({ message: "Utilisateur créé avec succès", id: result.insertId });
    } catch (err) {
        console.error("❌ Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
});


// Connexion d'un utilisateur
router.post("/login", async (req, res) => {
    const { pseudo, mot_de_passe } = req.body;

    if (!pseudo || !mot_de_passe) {
        return res.status(400).json({ message: "Pseudo et mot de passe requis" });
    }
    else if (!pseudo) {
        return res.status(400).json({ message: "Pseudo requis" });
    }
    else if (!mot_de_passe) {
        return res.status(400).json({ message: "Mot de passe requis" });
    }

    try {
        // Rechercher l'utilisateur par son pseudo
        const [rows] = await pool.query(
            "SELECT * FROM utilisateurs WHERE pseudo = ?",
            [pseudo]
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



// REDIR QUAND TT CHAMPS FULL
router.get("/dashboard", verifyToken, async (req, res) => {
    const uuid = req.user.uuid;

    try {
        // Vérifier si le profil est complet
        const [rows] = await pool.query(
            "SELECT profil_complet FROM utilisateurs WHERE uuid = ?",
            [uuid]
        );

        const user = rows[0];
        if (!user.profil_complet) {
            return res.status(403).json({ message: "Veuillez remplir votre profil avant d'accéder à cette page" });
        }

        // Si le profil est complet, l'utilisateur peut accéder à cette route
        res.json({ message: "Bienvenue sur le dashboard !" });

    } catch (err) {
        console.error("❌ Erreur lors de l'accès au dashboard:", err);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
});


// Route protégée, nécessite un token JWT valide TEST SI UUID EST VALID
router.get("/protected", verifyToken, (req, res) => {
    // Une fois que le middleware `verifyToken` a vérifié le token, tu peux accéder à l'UUID
    res.json({
        message: `Bienvenue utilisateur avec UUID: ${req.user.uuid}`,
    });
});

export default router;
