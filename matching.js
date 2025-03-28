import axios from 'axios';

export async function getPotentialMatches(connection, userId) {
    try {
        // Récupérer les informations de l'utilisateur courant
        const [userRows] = await connection.execute(
            'SELECT genre, orientation FROM utilisateurs WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) return [];
        
        const { genre, orientation } = userRows[0];

        console.log(userId);
       
        const query = `
            SELECT u.*
            FROM utilisateurs u,
                (SELECT id, genre, orientation FROM utilisateurs WHERE id = ?) AS currentUser 
            WHERE u.id != currentUser.id
            AND (
                (
                currentUser.genre = 'M'
                AND currentUser.orientation = 'M'
                AND u.genre = 'M'
                AND u.orientation IN ('M', 'O')
                )
                OR
                (
                currentUser.genre = 'M'
                AND currentUser.orientation = 'F'
                AND u.genre = 'F'
                AND u.orientation IN ('M', 'O')
                )
                OR
                (
                currentUser.genre = 'M'
                AND currentUser.orientation = 'O'
                AND (
                    (u.genre = 'O' AND u.orientation IN ('M', 'F', 'O'))
                    OR(u.genre = 'M' AND u.orientation IN ('M', 'O'))
                    OR (u.genre = 'F' AND u.orientation IN ('M', 'O'))
                )
                )
                OR
                (
                currentUser.genre = 'F'
                AND currentUser.orientation = 'M'
                AND u.genre = 'M'
                AND u.orientation IN ('F', 'O')
                )
                OR
                (
                currentUser.genre = 'F'
                AND currentUser.orientation = 'F'
                AND u.genre = 'F'
                AND u.orientation IN ('F', 'O')
                )
                OR
                (
                currentUser.genre = 'F'
                AND currentUser.orientation = 'O'
                AND (
                    (u.genre = 'O' AND u.orientation IN ('M', 'F', 'O'))
                    OR(u.genre = 'F' AND u.orientation IN ('F', 'O'))
                    OR (u.genre = 'M' AND u.orientation IN ('F', 'O'))
                )
                )
                OR
                (
                currentUser.genre = 'O'
                AND currentUser.orientation = 'M'
                AND u.genre = 'M'
                AND u.orientation IN ('M', 'O')
                )
                OR
                (
                currentUser.genre = 'O'
                AND currentUser.orientation = 'F'
                AND u.genre = 'F'
                AND u.orientation IN ('F', 'O')
                )
                OR
                (
                currentUser.genre = 'O'
                AND currentUser.orientation = 'O'
                AND (
                    (u.genre = 'O' AND u.orientation IN ('M', 'F', 'O'))
                    OR (u.genre = 'M' AND u.orientation = 'O')
                    OR (u.genre = 'F' AND u.orientation = 'O')
                )
                )
            )`;

        const params = [userId];

        // console.log("Requête SQL finale:", query);
        // console.log("Params envoyés:", params);

        const [matches] = await connection.execute(query, params);
        return matches;
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return [];
    }
}

export async function getCommonTags(pool, userId, matches) {
    try {
        console.log(`🔍 Début de getCommonTags pour userId: ${userId}`);

        // 1. Récupérer les tags de l'utilisateur courant
        const userTagsQuery = 'SELECT tagId FROM user_tags WHERE userId = ?';
        const [userTagsRows] = await pool.query(userTagsQuery, [userId]);
        const userTags = userTagsRows.map(row => String(row.tagId));  // Convertir en string (évite problèmes de comparaison)

        console.log(`✅ Tags (ID) de l'utilisateur: ${JSON.stringify(userTags)}`);

        // 2. Parcourir les matchs pour comparer les tags
        const results = [];

        for (let match of matches) {
            const matchId = match.id;  // Ajusté en fonction du log

            if (!matchId) {
                console.log('⚠️ Erreur: Aucun ID trouvé pour ce match, il sera ignoré.');
                continue;
            }

            // Récupérer les tags du match
            const matchTagsQuery = 'SELECT tagId FROM user_tags WHERE userId = ?';
            const [matchTagsRows] = await pool.query(matchTagsQuery, [matchId]);
            const matchTags = matchTagsRows.map(row => String(row.tagId));

            // Calculer le nombre de tags communs
            const commonTagsCount = matchTags.filter(tag => userTags.includes(tag)).length;

            console.log(`🔥 Nombre de tags communs avec ${matchId}: ${commonTagsCount}`);

           // Inclure même les matchs sans tags communs
            results.push({
                ...match,
                commonTagsCount
            });
        }

        // 3. Si aucun tag commun n'a été trouvé, ne pas changer l'ordre des matchs
        if (results.length === 0) {
            console.log("⚠️ Aucun tag commun trouvé. Renvoi des matchs sans changement d'ordre.");
            return matches; // Retourner les matchs sans les trier si aucun tag commun
        }

        // 4. Trier les résultats par nombre de tags communs
        results.sort((a, b) => b.commonTagsCount - a.commonTagsCount);

        console.log('✅ Matchs triés par nombre de tags communs:', results.map(r => ({
            userId: r.userId,
            commonTagsCount: r.commonTagsCount
        })));

        return results;
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return matches;  // Retourner les matchs sans les modifier en cas d'erreur
    }
}


export async function getFameRatting(pool, userId) {
    try {
        // Récupération des critères
        const [viewsResult] = await pool.query(
            'SELECT COUNT(*) AS views FROM profile_views WHERE userId = ?',
            [userId]
        );

        const [likesResult] = await pool.query(
            'SELECT COUNT(*) AS likes FROM likes WHERE userId = ?',
            [userId]
        );

        const [blocksResult] = await pool.query(
            'SELECT COUNT(*) AS blocks FROM user_blocks WHERE blockedUserId = ?',
            [userId]
        );

        const connections = await getUserConnections(pool, userId);

        const views = viewsResult[0].views || 0;
        const likes = likesResult[0].likes || 0;
        const blocks = blocksResult[0].blocks || 0;

        // DEBUG Log des valeurs récupérées
        console.log(`Utilisateur ${userId}:`);
        console.log(`Vues: ${views}`);
        console.log(`Likes: ${likes}`);
        console.log(`Bloquages: ${blocks}`);
        console.log(`Connexions: ${connections}`);

        // Augmenter l'influence des connexions (car elles sont rares)
        const maxConnections = 10; // Réduction du max pour donner plus de poids
        const connectionScore = Math.min(connections / maxConnections, 1) * 40; // Score max = 40

        console.log(`Score de connexion (normalisé): ${connectionScore}`);

        // Ajustement des coefficients pour booster les scores
        let fameRating = (views * 0.4) + (likes * 0.5) + (connections * 0.4) - (blocks * 0.25);

        console.log(`Fame Rating brut: ${fameRating}`);

        // Changer la normalisation pour éviter des scores trop bas
        let normalizedFameRating = (fameRating / 20) * 5; // Réduction du diviseur pour booster la note
        console.log(`Fame Rating normalisé avant limitation: ${normalizedFameRating}`);

        // Appliquer une note de base minimale
        normalizedFameRating = Math.max(normalizedFameRating, 0.5);

        // Limitation max à 5
        normalizedFameRating = Math.min(normalizedFameRating, 5);
        console.log(`Fame Rating (limité à 5): ${normalizedFameRating}`);

        // Arrondir à 1 chiffre après la virgule
        normalizedFameRating = parseFloat(normalizedFameRating.toFixed(1));
        console.log(`Fame Rating FINAL: ${normalizedFameRating}`);

        return normalizedFameRating;

    } catch (error) {
        console.error('Erreur lors de la récupération du Fame Rating:', error);
        return 0;
    }
}

async function getUserConnections(pool, userId) {
    try {
        const [connectionsResult] = await pool.query(
            'SELECT COUNT(*) AS connections FROM user_sessions WHERE userId = ? AND sessionDate > NOW() - INTERVAL 1 WEEK',
            [userId]
        );

        return connectionsResult[0].connections;
    } catch (error) {
        console.error("Erreur lors de la récupération des connexions:", error);
        return 0; // Valeur par défaut si erreur
    }
}

// Fonction pour obtenir les coordonnées GPS depuis la ville
export async function getCoordinates(city) {
    const apiKey = '82216e3ae11d446b8d5b0905995e3ede';  // Remplace par ta clé API
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${city}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data.results.length > 0) {
            const lat = data.results[0].geometry.lat;
            const lon = data.results[0].geometry.lng;
            return { lat, lon };
        } else {
            throw new Error('Aucune donnée trouvée pour cette ville');
        }
    } catch (error) {
        console.error('Erreur lors de l\'appel à l\'API OpenCage:', error);
        throw error;
    }
}

export async function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en kilomètres
    return distance;
}


export default { getPotentialMatches, getCommonTags, getFameRatting, getCoordinates, calculateDistance };