import mysql from 'mysql2/promise';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

// Configuration MySQL
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'matcha_user',
    password: 'matcha_password',
    database: 'matcha',
};

async function connectToDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connecté à la base de données');
        return connection;
    } catch (error) {
        console.error('Erreur de connexion:', error);
        process.exit(1);
    }
}

function generateUser() {
    return [
        uuidv4(),
        faker.internet.email(),
        faker.internet.password(12),
        faker.person.lastName(),
        faker.person.firstName(),
        faker.internet.username(),
        faker.number.int({ min: 18, max: 60 }),
        faker.helpers.arrayElement(['F', 'M', 'O']),
        faker.helpers.arrayElement(['F', 'M', 'O']),
    ];
}


async function insertFakeUsers(n) {
    const connection = await connectToDB();

    const sql = `
        INSERT INTO utilisateurs (uuid, email, mot_de_passe, nom, prenom, pseudo, age, genre, orientation, profil_complet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const users = Array.from({ length: n }, generateUser);

    try {
        for (const user of users) {
            await connection.execute(sql, user);
        }
        console.log(`${n} utilisateurs fictifs ajoutés avec succès`);
    } catch (error) {
        console.error('Erreur lors de l’insertion:', error);
    } finally {
        await connection.end();
    }
}

insertFakeUsers(10);