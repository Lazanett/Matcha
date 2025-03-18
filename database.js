import mysql from 'mysql2/promise';


const connection = await mysql.createConnection({
    host : 'localhost',
    port : '3306',
    user : 'matcha_user',
    password : 'matcha_password',
    database : 'matcha',
});


connection.connect((err) => {
  if (err) {
      console.error('Erreur de connexion à MySQL: ' + err.stack);
      return;
  }
  console.log('Connecté à MySQL avec ID ' + connection.threadId);
});

//console.log('✅ Connecté à MySQL !');


export default connection;