import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getCoordinates } from '../matching.js'; // Assure-toi d'importer la fonction pour récupérer les coordonnées

const router = express.Router();

// lara : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMjQ3NGNmZjQtMmRiZi00ZjVlLWEyZTItNmY0YWQ2M2E0MWRiIiwiaWF0IjoxNzQzMDg4OTExLCJleHAiOjE3NDMwOTI1MTF9.gEztTUvp1obS5vBeDQmh1WNoMUUIOQvsEJ_d6ovDKYo
// AJOUTER (genre, orientation, biographie, tags. 5 photos)// update fonction 
// addparams

router.post("/addparams", verifyToken, async (req, res) => {
    const { age, genre, orientation, tags, location } = req.body; // Ajout du champ 'location'
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

        // Si une ville est fournie, obtenir les coordonnées géographiques
        let lat = null;
        let lon = null;
        if (location) {
            try {
                // Récupérer les coordonnées de la ville
                const coordinates = await getCoordinates(location);
                lat = coordinates.lat;
                lon = coordinates.lon;

                // Mettre à jour la base de données avec les coordonnées géographiques
                await pool.query(
                    "UPDATE utilisateurs SET localisation = ?, lat = ?, lon = ? WHERE id = ?",
                    [location, lat, lon, userId]
                );
            } catch (error) {
                console.error("❌ Erreur lors de l'obtention des coordonnées :", error);
                // Tu peux choisir de continuer sans l'ajout des coordonnées si tu veux
            }
        }

        // Vérifier si les tags existent dans la base de données
        const [tagRows] = await pool.query(
            "SELECT id FROM tags WHERE name IN (?)",
            [tags]
        );

        if (tagRows.length === 0) {
            return res.status(404).json({ error: "Aucun tag trouvé avec ces noms." });
        }

        // Vérifier les doublons avant d'insérer les nouveaux tags
        for (const tag of tagRows) {
            // Vérifier si le tag est déjà associé à l'utilisateur
            const [existingTag] = await pool.query(
                "SELECT * FROM user_tags WHERE userId = ? AND tagId = ?",
                [userId, tag.id]
            );

            if (existingTag.length === 0) {
                // Si ce tag n'existe pas encore pour cet utilisateur, on l'ajoute
                await pool.query(
                    "INSERT INTO user_tags (userId, tagId) VALUES (?, ?)",
                    [userId, tag.id]
                );
            }
        }

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


// router.post("/addparams", verifyToken, async (req, res) => {
//     const { age, genre, orientation, tags, location } = req.body; // Ajout du champ 'location'
//     const uuid = req.user.uuid; // Récupère l'UUID depuis le token

//     // Vérification que tous les champs obligatoires sont remplis
//     if (!age || !genre || !orientation) {
//         return res.status(400).json({ message: "L'âge, le genre et l'orientation sont requis" });
//     }

//     // Vérification des valeurs autorisées pour genre et orientation
//     const genresValides = ["F", "M", "O"];
//     if (!genresValides.includes(genre) || !genresValides.includes(orientation)) {
//         return res.status(400).json({ message: "Valeurs de genre ou orientation invalides" });
//     }

//     if (!tags || !Array.isArray(tags) || tags.length === 0) {
//         return res.status(400).json({ error: "Vous devez fournir une liste de tags." });
//     }

//     try {
//         // Récupérer l'ID de l'utilisateur
//         const [userResult] = await pool.query(
//             "SELECT id FROM utilisateurs WHERE uuid = ?",
//             [uuid]
//         );

//         if (userResult.length === 0) {
//             return res.status(404).json({ error: "Utilisateur non trouvé." });
//         }

//         const userId = userResult[0].id;

//         // Mise à jour des champs modifiables
//         await pool.query(
//             "UPDATE utilisateurs SET age = ?, genre = ?, orientation = ? WHERE id = ?",
//             [age, genre, orientation, userId]
//         );

//         // Si une ville est fournie, obtenir les coordonnées géographiques
//         let lat = null;
//         let lon = null;
//         if (location) {
//             try {
//                 // Récupérer les coordonnées de la ville
//                 const coordinates = await getCoordinates(location);
//                 lat = coordinates.lat;
//                 lon = coordinates.lon;
        
//                 // Mettre à jour la base de données avec les coordonnées géographiques
//                 await pool.query(
//                     "UPDATE utilisateurs SET localisation = ?, lat = ?, lon = ? WHERE id = ?",
//                     [location, lat, lon, userId]
//                 );
//             } catch (error) {
//                 console.error("❌ Erreur lors de l'obtention des coordonnées :", error);
//                 // Tu peux choisir de continuer sans l'ajout des coordonnées si tu veux
//             }
//         }

//                 // Vérifier si les tags existent dans la base de données
//                 const [tagRows] = await pool.query(
//                     "SELECT id FROM tags WHERE name IN (?)",
//                     [tags]
//                 );
        
//                 if (tagRows.length === 0) {
//                     return res.status(404).json({ error: "Aucun tag trouvé avec ces noms." });
//                 }
        
//                 // Insérer l'association dans la table `user_tags`
//                 const values = tagRows.map(tag => [userId, tag.id]);
//                 await pool.query("INSERT INTO user_tags (userId, tagId) VALUES ?", [values]);
        
//                 // Vérifier si l'utilisateur a maintenant des tags associés et mettre à jour profil_complet
//                 const [userTags] = await pool.query(
//                     "SELECT tagId FROM user_tags WHERE userId = ?",
//                     [userId]
//                 );
        
//                 if (userTags.length > 0) {
//                     await pool.query("UPDATE utilisateurs SET profil_complet = TRUE WHERE id = ?", [userId]);
//                 }
        
//                 res.json({ message: "Profil mis à jour avec succès et tags associés." });
//     } catch (err) {
//         console.error("❌ Erreur lors de la mise à jour du profil et de l'ajout des tags:", err);
//         res.status(500).json({ message: "Erreur interne du serveur", details: err.message });
//     }
// });


export default router;
