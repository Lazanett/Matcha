import axios from 'axios';
import {  getFameRatting, calculateDistance } from "./matching.js";

export async function filterMatchesByAge(matches, ageDiff, userAge) {
    try {
        return matches.filter(match => {
            const matchAge = match.age;  // L'âge du match

            // Si l'âge du match ou de l'utilisateur est manquant, on ignore ce match
            if (!userAge || !matchAge) {
                return false;
            }

            // Calculer la différence d'âge
            const ageDifference = Math.abs(userAge - matchAge);

            // Appliquer les conditions de différence d'âge
            if (ageDiff === '2' && ageDifference <= 2) {
                return true;
            }
            if (ageDiff === '5' && ageDifference <= 5) {
                return true;
            }
            if (ageDiff === '10' && ageDifference <= 10) {
                return true;
            }
            if (ageDiff === '20' && ageDifference <= 20) {
                return true;
            }

            return false;
        });
    } catch (err) {
        console.error('Erreur lors du filtrage des matchs par âge:', err);
        return [];
    }
}

// Cette fonction applique le filtre d'âge sur les matchs
export async function applyAgeFilter(pool, userId, ageDiff, matches) {
    try {
        // 1. Récupérer l'âge de l'utilisateur
        const [userAgeResult] = await pool.query(
            "SELECT age FROM utilisateurs WHERE id = ?",
            [userId]
        );

        if (userAgeResult.length === 0) {
            throw new Error("Utilisateur non trouvé");
        }

        const userAge = userAgeResult[0].age;

        // 2. Appliquer le filtre d'âge avec la fonction filterMatchesByAge
        let filteredMatches = await filterMatchesByAge(matches, ageDiff, userAge);

        // 3. Si aucun match n'est trouvé, renvoyer un message
        if (filteredMatches.length === 0) {
            return { matches: [], message: 'Aucun match dans cette tranche d\'âge' };
        }

        return { matches: filteredMatches, message: null };

    } catch (err) {
        console.error("Erreur lors de l'application du filtre d'âge:", err);
        return { matches: [], message: 'Erreur serveur lors de l\'application du filtre d\'âge' };
    }
}


export async function FilterLocalisation(pool, userId, Locdiff, matches){
    try {

        if (Locdiff != '2' && Locdiff != '5' && Locdiff != '10' && Locdiff != '15' && Locdiff != '20'
            && Locdiff != '30' && Locdiff != '50' && Locdiff != '100' && Locdiff != '500'
            && Locdiff != '1000') {
            return res.status(404).json({ error: "Distance non valide" });  
        }
        

        if (matches.length === 0) {
            return res.status(404).json({ message: 'Aucun match trouvé a cette distance' });
        }

        const results = [];

        const [userCoordinatesResult] = await pool.query(
            "SELECT lat, lon FROM utilisateurs WHERE id = ?",
            [userId]
        );

        if (userCoordinatesResult.length === 0) {
            res.status(404).json({ error: "Utilisateur non trouvé." });
            return results;
        }

        const userLat = userCoordinatesResult[0].lat;
        const userLon = userCoordinatesResult[0].lon;

        if (userLat.length < 0 || userLon.length < 0) {
            console.log("userLat", userLat, " || userlon ", userLon)
            return results;
        }
        console.log("FILTRE LOCALISATION");
        for (let match of matches) {

            const [matchCoordinatesResult] = await pool.query(
                "SELECT lat, lon FROM utilisateurs WHERE id = ?",
                [match.id]
            );

            if (matchCoordinatesResult.length > 0) {
                const matchLat = matchCoordinatesResult[0].lat;
                const matchLon = matchCoordinatesResult[0].lon;

                const distance = await calculateDistance(userLat, userLon, matchLat, matchLon);
                match.distance = distance;
                //console.log("match.distance = ", match.distance, " || Locdiff ", Locdiff);
                match.distance = parseFloat(match.distance, 10);
                Locdiff = parseFloat(Locdiff, 10);
                //console.log(typeof Locdiff, " || ", typeof match.distance);
                
                if (match.distance <= Locdiff) {
                    results.push({
                        ...match,
                        distance
                    });
                }
            }
        }

        if (results.length === 0) {
            console.log("⚠️ Aucun match trouvé das ce rayon de km.");
            return results; // Retourner les matchs sans les trier si aucun tag commun
        }

        // 4. Trier les résultats par nombre de tags communs
        results.sort((a, b) => a.distance - b.distance);
        return results;

    } catch (err) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return matches;  // Retourner les matchs sans les modifier en cas d'erreur
    }
}

export async function filterMatchesByCommonTags(pool, userId, matches, minCommonTags) {
    try {
        console.log(`🔍 Début de getCommonTags pour userId: ${userId}`);

        // 1. Récupérer les tags de l'utilisateur courant
        const userTagsQuery = 'SELECT tagId FROM user_tags WHERE userId = ?';
        const [userTagsRows] = await pool.query(userTagsQuery, [userId]);
        const userTags = userTagsRows.map(row => String(row.tagId));  // Convertir en string (évite problèmes de comparaison)

        console.log(`✅ Tags (ID) de l'utilisateur: ${JSON.stringify(userTags)}`);

        // 2. Parcourir les matchs pour comparer les tags
        const results = [];
        console.log("minCommonTags =", minCommonTags);
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
            if (commonTagsCount >= minCommonTags) {
                    results.push({
                        ...match,
                        commonTagsCount
                    });
            }
                
        }
        // 3. Si aucun tag commun n'a été trouvé, ne pas changer l'ordre des matchs
        if (results.length === 0) {
            console.log("⚠️ Aucun tag commun trouvé. Renvoi des matchs sans changement d'ordre.");
            return results; // Retourner les matchs sans les trier si aucun tag commun
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


export async function filterMatchesByFameRating(pool, userId, matches, minFameRating) {

    try {
        const results = [];
        for (let match of matches) {
            const matchId = match.id;  // Ajusté en fonction du log

            if (!matchId) {
                console.log('⚠️ Erreur: Aucun ID trouvé pour ce match, il sera ignoré.');
                continue;
            }

            const rate = await getFameRatting(pool, matchId);
            //console.log(`🔥 Nombre de tags communs avec ${matchId}: ${commonTagsCount}`);
            if (rate >= minFameRating) {
                results.push({
                    ...match,
                    rate
                });
            }
            console.log("rate = ", rate, " || minFameRating = ", minFameRating);
            console.log(typeof rate);
            console.log(typeof minFameRating);
        }
        console.log("FILTRE FAMERATTING");
        if (results.length === 0) {
            console.log("⚠️ Aucun tag commun trouvé. Renvoi des matchs sans changement d'ordre.");
            return results; // Retourner les matchs sans les trier si aucun tag commun
        }

        // 4. Trier les résultats par nombre de tags communs
        results.sort((a, b) => b.rate - a.rate);

        results.forEach(match => {
            console.log(`ID: ${match.id} , rate = ${match.rate}`);
        });
        return results;
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return matches;  // Retourner les matchs sans les modifier en cas d'erreur
    }
}

export default { applyAgeFilter, filterMatchesByCommonTags, filterMatchesByFameRating, FilterLocalisation };