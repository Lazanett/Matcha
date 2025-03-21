import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database.js";
import { v4 as uuidv4 } from 'uuid';
import verifyToken from "../middlewares/authMiddleware.js"; 

const router = express.Router();
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNzQwZDk2ODEtYTc5OC00Y2UwLWI2ZjItOGIyYzg1Y2MxOWM5IiwiaWF0IjoxNzQyNTY5NDM0LCJleHAiOjE3NDI1NzMwMzR9.M6uuJfw2960eOEgrWrSIt0WYbIZ1XfaESIFSyqQn3Hs
// creation script qui creer des faux profil (complet) pour faire le matching
router.post("/signup", async (req, res) => {
    const { email, mot_de_passe, pseudo, nom, prenom } = req.body;

    // Vérifications des champs obligatoires
    if (!email || !mot_de_passe || !pseudo || !nom || !prenom) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
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

// UPDATE_PROFILE
router.post("/update-profile", verifyToken, async (req, res) => {
    const { age, genre, orientation } = req.body;
    const uuid = req.user.uuid; // Récupère l'UUID depuis le token

    // Vérification que tous les champs obligatoires sont remplis
    if (!age || !genre || !orientation) {
        return res.status(400).json({ message: "L'âge, le genre et l'orientation sont requis" });
    }

    // Vérification des valeurs autorisées pour genre et orientation
    const genresValides = ["F", "M", "O"];
    if (!genresValides.includes(genre) || !genresValides.includes(orientation)) {
        return res.status(400).json({ message: "Valeurs de genre ou orientation invalides" });
    }

    try {
        // Mise à jour des champs modifiables
        await pool.query(
            "UPDATE utilisateurs SET age = ?, genre = ?, orientation = ? WHERE uuid = ?",
            [age, genre, orientation, uuid]
        );

        // Vérifier si l'utilisateur a des tags associés
        const [userTags] = await pool.query(
            "SELECT tagId FROM user_tags WHERE userId = (SELECT id FROM utilisateurs WHERE uuid = ?)",
            [uuid]
        );

        // Si des tags sont associés, mettre profil_complet à true
        if (userTags.length > 0) {
            await pool.query("UPDATE utilisateurs SET profil_complet = TRUE WHERE uuid = ?", [uuid]);
        }

        res.json({ message: "Profil mis à jour avec succès"});
    } catch (err) {
        console.error("❌ Erreur lors de la mise à jour du profil:", err);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
});



router.post('/:userId/tags', verifyToken, async (req, res) => {
    const { userId } = req.params; // Récupérer l'ID de l'utilisateur
    const { tags } = req.body; // Récupérer les tags à associer

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: 'Vous devez fournir une liste de tags.' });
    }

    try {
        // Vérifier si l'utilisateur existe
        const [userExists] = await pool.query('SELECT id FROM utilisateurs WHERE id = ?', [userId]);

        if (userExists.length === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        // Vérifier si les tags existent dans la base de données
        const [tagRows] = await pool.query('SELECT id FROM tags WHERE name IN (?)', [tags]);

        if (tagRows.length === 0) {
            return res.status(404).json({ error: "Aucun tag trouvé avec ces noms." });
        }

        // Insérer l'association dans la table `user_tags`
        const values = tagRows.map(tag => [userId, tag.id]);
        await pool.query('INSERT INTO user_tags (userId, tagId) VALUES ?', [values]);

        // Vérifier si l'utilisateur a maintenant des tags associés et mettre à jour profil_complet
        const [userTags] = await pool.query('SELECT tagId FROM user_tags WHERE userId = ?', [userId]);

        // Si des tags sont associés, mettre profil_complet à true
        if (userTags.length > 0) {
            await pool.query('UPDATE utilisateurs SET profil_complet = TRUE WHERE id = ?', [userId]);
        }

        res.status(201).json({ message: 'Tags associés avec succès à l\'utilisateur.' });
    } catch (error) {
        console.error('Erreur lors de l\'association des tags :', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
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
