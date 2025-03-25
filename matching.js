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

export default { getPotentialMatches };
// 1 cas : Homme cherche homme qui est interesser hommes ou  bi
// 2 cas : Homme cherche Femme qui est interesser hommes ou bi
// 3 cas : Homme cherche Bi qui cherche Femme bi et Homme bi

// 4 cas : Femme cherche Homme qui est interesser Femme ou bi
// 5 cas : Femme cherche Femme qui est interesser femmes et bi
// 6 cas : femme cherche bi qui est interesser femme bi et homme bi

// 7 cas : Autre cherche Homme qui est interesser homme ou bi
