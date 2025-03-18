import mysql from 'mysql2/promise';


const pool = mysql.createPool({
    host : 'localhost',
    port : '3306',
    user : 'matcha_user',
    password : 'matcha_password',
    database : 'matcha',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// Vérifier la connexion
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion réussie à MySQL !');
    connection.release();
  } catch (err) {
    console.error('❌ Erreur de connexion à MySQL:', err);
  }
}


checkConnection();

export default pool;
