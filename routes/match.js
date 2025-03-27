import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getCommonTags, getFameRatting } from "../matching.js";

const router = express.Router();

// AJOUTER CONDITION SI PROFILE_COMPLET = 1 
router.get('/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId;

    try {
        // Récupérer les matchs triés par orientation sexuelle et tags communs
        let matches = await getCommonTags(pool, userId);

        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé' });
        }

        // Récupérer le FameRating de chaque utilisateur dans le tableau des matchs
        for (let match of matches) {
            match.fameRating = await getFameRatting(pool, match.id); 
        
        }
      
        // tri FameRating/tags à 50/50
        matches.sort((a, b) => {
            // Calculer une combinaison des deux critères (commonTagsCount et fameRating) à 50/50
            const scoreA = (a.commonTagsCount * 0.5) + (a.fameRating * 0.5);
            const scoreB = (b.commonTagsCount * 0.5) + (b.fameRating * 0.5);

            console.log(`scoreA: ${scoreA}, scoreB: ${scoreB}`);
            // Si scoreA est supérieur à scoreB, alors a vient avant b
            if (scoreA < scoreB) return 1;
            if (scoreA > scoreB) return -1;

            // Si les scores sont égaux, on ne change rien
            return 0;
        });
       

        // Retourner les matchs triés avec les tags communs et le FameRating
        res.status(200).json(matches);
    } catch (err) {
        console.error('❌ Erreur lors de la recherche de matchs:', err);
        res.status(500).json({ message: 'Erreur serveur lors de la recherche de matchs' });
    }
});


// FAME RATTING
router.post('/views', async (req, res) => {
    const { userId, viewerId } = req.body; // Récupérer l'ID de l'utilisateur vu et de celui qui a vu
    try {
        // Ajouter l'enregistrement dans la base de données
        await pool.query(
            'INSERT INTO profile_views (userId, viewerId) VALUES (?, ?)',
            [userId, viewerId]
        );
        res.status(201).json({ message: 'Vue enregistrée avec succès.' });
    } catch (err) {
        console.error('Erreur en enregistrant la vue:', err);
        res.status(500).json({ message: 'Erreur du serveur.' });
    }
});

router.post('/likes', async (req, res) => {
    const { userId, likerId } = req.body;  // Récupérer les IDs dans le corps de la requête
    try {
        // Vérification que les IDs sont bien fournis
        if (!userId || !likerId) {
            return res.status(400).json({ message: "userId et likerId sont requis." });
        }

        // Ajouter l'enregistrement du like dans la base de données
        await pool.query(
            'INSERT INTO likes (userId, likerId) VALUES (?, ?)',
            [userId, likerId]
        );
        
        // Répondre que l'action a été effectuée avec succès
        res.status(201).json({ message: 'Like enregistré avec succès.' });
    } catch (err) {
        console.error('Erreur en enregistrant le like:', err);
        res.status(500).json({ message: 'Erreur du serveur lors de l\'enregistrement du like.' });
    }
});

router.post("/block", verifyToken, async (req, res) => {
    const { blockedUserId, blockerUserId } = req.body; // Récupère les deux IDs du body

    if (!blockedUserId || !blockerUserId) {
        return res.status(400).json({ error: "Les IDs de l'utilisateur bloqué et de l'utilisateur qui bloque sont requis." });
    }

    try {
        // Vérifier que l'utilisateur qui bloque existe
        const [blockerExists] = await pool.query('SELECT id FROM utilisateurs WHERE id = ?', [blockerUserId]);
        if (blockerExists.length === 0) {
            return res.status(404).json({ error: "L'utilisateur qui bloque n'existe pas." });
        }

        // Vérifier que l'utilisateur bloqué existe
        const [blockedExists] = await pool.query('SELECT id FROM utilisateurs WHERE id = ?', [blockedUserId]);
        if (blockedExists.length === 0) {
            return res.status(404).json({ error: "L'utilisateur bloqué n'existe pas." });
        }

        // Insérer l'association dans la table `user_blocks`
        await pool.query(
            'INSERT INTO user_blocks (blockedUserId, blockerUserId) VALUES (?, ?)',
            [blockedUserId, blockerUserId]
        );

        res.status(200).json({ message: "Blocage effectué avec succès." });
    } catch (error) {
        console.error("Erreur lors du blocage de l'utilisateur:", error);
        res.status(500).json({ error: 'Erreur lors du blocage de l\'utilisateur.' });
    }
});



export default router;
