import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import pool from "../database.js";
import { getPotentialMatches } from "../matching.js";

const router = express.Router();

router.get('/test-matching/:userId', verifyToken, async (req, res) => {
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


// const query = `
//   SELECT u.*
//   FROM utilisateurs u,
//        (SELECT id, genre, orientation FROM utilisateurs WHERE id = ?) AS currentUser
//   WHERE u.id != currentUser.id
//   AND (
//     (
//       currentUser.genre = 'H'
//       AND currentUser.orientation = 'M'
//       AND u.genre = 'H'
//       AND u.orientation IN ('M', 'O')
//     )
//     OR
//     (
//       currentUser.genre = 'H'
//       AND currentUser.orientation = 'F'
//       AND u.genre = 'F'
//       AND u.orientation IN ('M', 'O')

//     )
//     OR
//     (
//       currentUser.genre = 'H'
//       AND currentUser.orientation = 'O'
//       AND (
//         (u.genre = 'H' AND u.orientation IN ('M', 'O'))
//         OR (u.genre = 'F' AND u.orientation IN ('M', 'O'))
//       )
//     )
//     OR
//     (
//       currentUser.genre = 'F'
//       AND currentUser.orientation = 'M'
//       AND u.genre = 'H'
//       AND u.orientation IN ('F', 'O')
//     )
//     OR
//     (
//       currentUser.genre = 'F'
//       AND currentUser.orientation = 'F'
//       AND u.genre = 'F'
//       AND u.orientation IN ('F', 'O')
//     )
//     OR
//     (
//       currentUser.genre = 'F'
//       AND currentUser.orientation = 'O'
//       AND (
//         (u.genre = 'F' AND u.orientation IN ('F', 'O'))
//         OR (u.genre = 'H' AND u.orientation IN ('F', 'O'))
//       )
//     )
//     )
// `;