import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getPotentialMatches } from "../matching.js";

const router = express.Router();

router.get('/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId;

    try {
        // Appeler la fonction getPotentialMatches et obtenir les résultats
        const matches = await getPotentialMatches(pool, userId);
        
        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé' });
        }

        // Retourner les profils correspondants
        res.status(200).json(matches);
    } catch (err) {
        console.error('Erreur lors de la recherche de matchs:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la recherche de matchs' });
    }
});

export default router;
