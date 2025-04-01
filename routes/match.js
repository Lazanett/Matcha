import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getPotentialMatches, getCommonTags, getFameRatting, calculateDistance } from "../matching.js";
import { applyAgeFilter, filterMatchesByCommonTags } from "../filter.js";

const router = express.Router();

// AJOUTER CONDITION SI PROFILE_COMPLET = 1 
router.get('/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId;

    try {
        // 1. Appeler `getPotentialMatches` directement pour récupérer les matchs potentiels
        let matches = await getPotentialMatches(pool, userId);

        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé' });
        }

        matches.forEach(match => {
            console.log(`AVANT FILTRE : ID: ${match.id}`);
        });
        
        // 2. Vérifier si un filtre d'âge est fourni
        const ageDiff = req.query.ageDiff;  // Récupérer le paramètre ageDiff de la requête

        // 3. Si un filtre d'âge est sélectionné, appliquer le filtrage
        if (ageDiff) {
            const { matches: filteredMatches, message } = await applyAgeFilter(pool, userId, ageDiff, matches);
            
            if (message) {
                return res.status(404).json({ message });  // Renvoyer le message d'erreur si aucun match n'a été trouvé
            }

            // Si des matchs sont trouvés après le filtrage, renvoyer les résultats
            matches = filteredMatches;
            if (matches.length === 0) {
                return res.status(404).json({ message: 'Aucun match dans cette tranche d\'âge' });
            }
            matches.forEach(match => {
                console.log(`ID: ${match.id}`);
            });
            return res.status(200).json(matches);
        }

        // 2. Vérifier si le filtre "tags communs" est activé dans la requête
        const filterTags = req.query.filterTags; // Récupérer le paramètre filterTags
        const minCommonTags =  req.query.minCommonTags ? parseInt(req.query.minCommonTags) : 1;

        if (filterTags === 'true') {
            // Si le filtre des tags communs est activé, appliquer le filtrage
            matches = await filterMatchesByCommonTags(pool, userId, matches, minCommonTags);
            if (matches.length === 0) {
                return res.status(404).json({ message: 'Aucun match trouvé avec les tags communs' });
            }
            matches.forEach(match => {
                console.log(`ID: ${match.id}`);
            });
            return res.status(200).json(matches);
        }

        // 2. Appeler `getCommonTags` pour filtrer les matchs par tags communs
        matches = await getCommonTags(pool, userId, matches);

        // Vérifier si nous avons des matchs après le filtrage des tags
        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé avec les tags communs' });
        }

        // 3. Récupérer les coordonnées (lat, lon) de l'utilisateur actuel
        const [userCoordinatesResult] = await pool.query(
            "SELECT lat, lon FROM utilisateurs WHERE id = ?",
            [userId]
        );

        if (userCoordinatesResult.length === 0) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        const userLat = userCoordinatesResult[0].lat;
        const userLon = userCoordinatesResult[0].lon;

        // 4. Calculer la distance pour chaque match et ajouter la notoriété
        for (let match of matches) {
            const [matchCoordinatesResult] = await pool.query(
                "SELECT lat, lon FROM utilisateurs WHERE id = ?",
                [match.id]
            );

            if (matchCoordinatesResult.length > 0) {
                const matchLat = matchCoordinatesResult[0].lat;
                const matchLon = matchCoordinatesResult[0].lon;
                
                const distance = calculateDistance(userLat, userLon, matchLat, matchLon);
                match.distance = distance; // Ajouter la distance dans le match
            }

            // Ajouter la fameRating (notoriété) pour chaque match
            match.fameRating = await getFameRatting(pool, match.id);
        }

        // 5. Trier les résultats en fonction de la distance, de la notoriété et des tags communs
        if (matches.length > 1) {
            matches.sort((a, b) => {
                const scoreA = ((a.commonTagsCount || 0) * 0.3) + (a.fameRating * 0.3) + ((a.distance > 0 ? (1 / a.distance) : 0) * 0.6);
                const scoreB = ((b.commonTagsCount || 0) * 0.3) + (b.fameRating * 0.3) + ((b.distance > 0 ? (1 / b.distance) : 0) * 0.6);
                
                if (scoreA < scoreB) return 1;
                if (scoreA > scoreB) return -1;
                return 0;
            });
        }

        // Affichage pour débogage
        matches.forEach(match => {
            console.log(`ID: ${match.id}, Score: ${((match.commonTagsCount || 0) * 0.3) + (match.fameRating * 0.3) + ((match.distance > 0 ? (1 / match.distance) : 0) * 0.6)}`);
        });

        // 6. Retourner la réponse avec les matchs
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
