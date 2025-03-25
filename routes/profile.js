import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";

const router = express.Router();
// sophie : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzZmOTU5MjEtMGQ4Mi00YWY0LWFlNjctNjE3NWU3YjExNzkyIiwiaWF0IjoxNzQyOTAyNzEzLCJleHAiOjE3NDI5MDYzMTN9.AmlBH0BGrrLMEJc_8ooNxlP7aFxuk84hICBeuc9s7bI
// julien : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiZjNlNGNhZTQtZWJiZS00YTJjLWEyMGQtZmJmOTk2MmExNWU4IiwiaWF0IjoxNzQyOTAzMDMzLCJleHAiOjE3NDI5MDY2MzN9.sBcgGcGpHZhqjPWQtLlR0Nf-loVQ-3k6tpvz1e5ERtg
// louis : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMjM3NWRmZGItNWQzNy00ZmI3LTk5YWEtMzZjZjI1YjJlZjNhIiwiaWF0IjoxNzQyOTAzMjYxLCJleHAiOjE3NDI5MDY4NjF9.1vrQMlt5da5qBSMrJ77IPRqAYhQLmZ3GTovdpzHR7E0
//lea : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMGNmODg5MTItMmE1NC00YWUyLTkzOWEtYmQ5ODZiNDY3Y2I0IiwiaWF0IjoxNzQyOTAzNDI5LCJleHAiOjE3NDI5MDcwMjl9.YwHv45kcceX1HAataTy2nu3rhM7uwhBnKbEjVl90CzE
//eric : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMDcyZDZiMDctMzFjNy00ZDExLWFjYTMtNjU4MGZlYTM0NGVmIiwiaWF0IjoxNzQyOTAzNjExLCJleHAiOjE3NDI5MDcyMTF9.alCp2Db2sn7q8jHVzeYFnzjd9WP3CmCcn1SAjL9FVLY
//naf : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiOGI0NWQyMmItODAxZi00MDc1LWJjODgtMWUyNzQ4MmU3NmIwIiwiaWF0IjoxNzQyOTAzNzcyLCJleHAiOjE3NDI5MDczNzJ9.C7h95gx-hd8KJwmdmhrjjr7gRUB_elbqcWKJt7j1DLI
//shasha : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiYzdhMmMzOTYtODFmOS00ZDA1LTgwN2UtMWQxMjFkOTJjOGViIiwiaWF0IjoxNzQyOTAzOTMyLCJleHAiOjE3NDI5MDc1MzJ9.NhzSE12o3W-Vsnf5c3somugHUzXGlPMbcAzNRK5Oepg
// test : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiODcyY2E0OTUtYjMwNS00N2VkLWE5YTEtYzhhNDdkY2JiNWU2IiwiaWF0IjoxNzQyOTA0MDgyLCJleHAiOjE3NDI5MDc2ODJ9.u2MzEbQzaRGWxhX8wl4bpW5OBxotY7FQsO85DxkaZbk
//lara : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiYzMzMjViMmMtNTNhNy00OGNmLTlmYTUtYTk0N2M4YTE2YWY3IiwiaWF0IjoxNzQyOTA4NzI0LCJleHAiOjE3NDI5MTIzMjR9.NnBsMKVRYNi75uybPl5rMflLsCzVoLQF2MNRTScgFiY

// UPDATE_PROFILE
router.post("/update", verifyToken, async (req, res) => {
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

//TAGS 
router.post('/tags/:userId', verifyToken, async (req, res) => {
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

export default router;
