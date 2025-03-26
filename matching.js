import mysql from 'mysql2/promise';
import pool from "./database.js";

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

export async function getCommonTags(pool, userId) {
    
    try {
        console.log(`🔍 Début de getCommonTags pour userId: ${userId}`);

        // 1. Récupérer les tags de l'utilisateur courant
        const userTagsQuery = 'SELECT tagId FROM user_tags WHERE userId = ?';
        const [userTagsRows] = await pool.query(userTagsQuery, [userId]);
        const userTags = userTagsRows.map(row => String(row.tagId));  // Convertir en string (évite problèmes de comparaison)

        console.log(`✅ Tags (ID) de l'utilisateur: ${JSON.stringify(userTags)}`);

        // 2. Récupérer les noms des tags de l'utilisateur
        let userTagsNames = [];
        if (userTags.length > 0) {
            const userTagsNamesQuery = `SELECT name FROM tags WHERE id IN (${userTags.map(() => '?').join(',')})`;
            const [userTagsNamesRows] = await pool.query(userTagsNamesQuery, userTags);
            userTagsNames = userTagsNamesRows.map(row => row.name);
        }
        console.log(`✅ Tags (Noms) de l'utilisateur: ${userTagsNames.join(', ')}`);

        // 3. Récupérer les matchs potentiels
        const matches = await getPotentialMatches(pool, userId);
        if (matches.length === 0) {
            console.log('⚠️ Aucun match trouvé.');
            return [];
        }

        // 4. Parcourir les matchs pour comparer les tags
        const results = [];

        for (let match of matches) {
            //console.log(`\n➡️ Vérification du match:`, match);  // 🔍 Vérification de la structure
        
            // Récupérer l'ID correct du match
            const matchId = match.id;  // Ajusté en fonction du log
        
            if (!matchId) {
                console.log('⚠️ Erreur: Aucun ID trouvé pour ce match, il sera ignoré.');
                continue;
            }
        
            // Récupérer les tags du match
            const matchTagsQuery = 'SELECT tagId FROM user_tags WHERE userId = ?';
            const [matchTagsRows] = await pool.query(matchTagsQuery, [matchId]);
            const matchTags = matchTagsRows.map(row => String(row.tagId));
        
            // Récupérer les noms des tags du match
            let matchTagsNames = [];
            if (matchTags.length > 0) {
                const matchTagsNamesQuery = `SELECT name FROM tags WHERE id IN (${matchTags.map(() => '?').join(',')})`;
                const [matchTagsNamesRows] = await pool.query(matchTagsNamesQuery, matchTags);
                matchTagsNames = matchTagsNamesRows.map(row => row.name);
            }
        
            // Calculer le nombre de tags communs
            const commonTagsCount = matchTags.filter(tag => userTags.includes(tag)).length;
        
            console.log(`🔥 Nombre de tags communs avec ${matchId}: ${commonTagsCount}`);
        
            // Ajouter aux résultats
            results.push({
                ...match,
                userId: matchId,  // Ajout explicite de l'ID
                commonTagsCount,
                matchTagsNames
            });
        }
        
        // 6. Trier les résultats
        results.sort((a, b) => b.commonTagsCount - a.commonTagsCount);

        console.log('✅ Matchs triés par nombre de tags communs:', results.map(r => ({
            userId: r.userId,
            commonTagsCount: r.commonTagsCount
        })));

        return results;
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return [];
    }
}


export default { getCommonTags };
// 1 cas : Homme cherche homme qui est interesser hommes ou  bi
// 2 cas : Homme cherche Femme qui est interesser hommes ou bi
// 3 cas : Homme cherche Bi qui cherche Femme bi et Homme bi

// 4 cas : Femme cherche Homme qui est interesser Femme ou bi
// 5 cas : Femme cherche Femme qui est interesser femmes et bi
// 6 cas : femme cherche bi qui est interesser femme bi et homme bi

// 7 cas : Autre cherche Homme qui est interesser homme ou bi
