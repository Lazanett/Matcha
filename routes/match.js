import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getCommonTags } from "../matching.js";

const router = express.Router();

// AJOUTER CONDITION SI PROFILE_COMPLET = 1 
router.get('/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId;

    try {
        // Récupérer les matchs triés par nombre de tags communs
        const matches = await getCommonTags(pool, userId);
        
        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé' });
        }

        // Retourner les matchs triés avec les tags communs
        res.status(200).json(matches);
    } catch (err) {
        console.error('Erreur lors de la recherche de matchs:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la recherche de matchs' });
    }
});

export default router;
