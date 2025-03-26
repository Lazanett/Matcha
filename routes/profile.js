import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";

const router = express.Router();

//lara : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNzhkZTI3ODktNjk0YS00NTlkLWI1YjUtY2NjZWZlOTI1NTA2IiwiaWF0IjoxNzQyOTg3NDYwLCJleHAiOjE3NDI5OTEwNjB9.6Afwyg7rhvSNoS13lg68FzSQr3dougM8T0E2mWReQt4
// test : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzNiZWI0NmEtMTZlOC00NzMzLWFjNjMtNTUxZThmYmZmNmY1IiwiaWF0IjoxNzQyOTkwMTgyLCJleHAiOjE3NDI5OTM3ODJ9.OQoKzFjPNGJxTMSSVMc62ks-I2P_qW7E_88dCOsWPas

// AJOUTER (genre, orientation, biographie, tags. 5 photos)
router.post("/addparams", verifyToken, async (req, res) => {
    const { age, genre, orientation, tags } = req.body;
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

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "Vous devez fournir une liste de tags." });
    }

    try {
        // Récupérer l'ID de l'utilisateur
        const [userResult] = await pool.query(
            "SELECT id FROM utilisateurs WHERE uuid = ?",
            [uuid]
        );

        if (userResult.length === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        const userId = userResult[0].id;

        // Mise à jour des champs modifiables
        await pool.query(
            "UPDATE utilisateurs SET age = ?, genre = ?, orientation = ? WHERE id = ?",
            [age, genre, orientation, userId]
        );

        // Vérifier si les tags existent dans la base de données
        const [tagRows] = await pool.query(
            "SELECT id FROM tags WHERE name IN (?)",
            [tags]
        );

        if (tagRows.length === 0) {
            return res.status(404).json({ error: "Aucun tag trouvé avec ces noms." });
        }

        // Insérer l'association dans la table `user_tags`
        const values = tagRows.map(tag => [userId, tag.id]);
        await pool.query("INSERT INTO user_tags (userId, tagId) VALUES ?", [values]);

        // Vérifier si l'utilisateur a maintenant des tags associés et mettre à jour profil_complet
        const [userTags] = await pool.query(
            "SELECT tagId FROM user_tags WHERE userId = ?",
            [userId]
        );

        if (userTags.length > 0) {
            await pool.query("UPDATE utilisateurs SET profil_complet = TRUE WHERE id = ?", [userId]);
        }

        res.json({ message: "Profil mis à jour avec succès et tags associés." });
    } catch (err) {
        console.error("❌ Erreur lors de la mise à jour du profil et de l'ajout des tags:", err);
        res.status(500).json({ message: "Erreur interne du serveur", details: err.message });
    }
});

export default router;
