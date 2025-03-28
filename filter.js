import axios from 'axios';

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


export default { applyAgeFilter };