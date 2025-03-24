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
        let query;
        // Requête SQL avec logique croisée
        if (orientation === "O")
        {
            query = `
            SELECT * FROM utilisateurs 
            WHERE id != ?
            AND orientation = 'O'
            AND genre IN ('M', 'F', 'O')`;
        }
        else 
        {
            query = `
            SELECT * FROM utilisateurs 
            WHERE id != ? 
            AND orientation = ?
            AND genre = ? `;
        }

        const params = [userId, genre, orientation];

        console.log("User:", userId, " | Genre:", genre, " | Orientation:", orientation);
        // console.log("Requête SQL finale:", query);
        console.log("Params envoyés:", params);

        const [matches] = await connection.execute(query, params);
        return matches;
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return [];
    }
}

// genre "O" courant = orientation M/F(des autres)
// si orientation === "O"
// ==> recommander autre du genre F/M/O
// reciproque si autre orientation O


//orientation = ciblegenre
//genredemandeur = orientation des autres


export default { getPotentialMatches };
