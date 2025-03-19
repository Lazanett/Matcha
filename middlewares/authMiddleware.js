import jwt from "jsonwebtoken";

// Middleware pour vérifier le token JWT
// const verifyToken = (req, res, next) => {
//     const token = req.headers["authorization"];

//     if (!token) {
//         return res.status(403).json({ message: "Token manquant" });
//     }

//     // Décoder le token et vérifier la validité
//     jwt.verify(token, "ton_secret_jwt", (err, decoded) => {
//         if (err) {
//             return res.status(401).json({ message: "Token invalide" });
//         }

//         // Ajouter les informations de l'utilisateur (ici UUID) au `req` pour les utiliser après
//         req.user = decoded;  // `decoded` contient l'UUID
//         next(); // Continuer la requête
//     });
// };
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) {
        return res.status(403).json({ message: "Accès refusé, token manquant." });
    }

    const tokenValue = token.split(" ")[1];  // On récupère le token après le mot "Bearer"

    jwt.verify(tokenValue, "ton_secret_jwt", (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token invalide" });
        }
        req.user = decoded;  // On stocke les données du token dans req.user
        next();  // On passe à la prochaine étape de la requête
    });
};
export default verifyToken;
