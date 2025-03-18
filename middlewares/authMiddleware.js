import jwt from "jsonwebtoken";

// Middleware pour vérifier le token JWT
export const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];  // Récupérer le token de l'en-tête "Authorization"

    if (!token) {
        return res.status(403).json({ message: "Token manquant" });
    }

    try {
        const decoded = jwt.verify(token, "ton_secret_jwt");  // Vérification du token
        req.user = decoded;  // Ajouter les informations de l'utilisateur à la requête
        next();  // Passer au prochain middleware ou route
    } catch (err) {
        return res.status(401).json({ message: "Token invalide" });
    }
};

// Middleware pour vérifier si l'utilisateur a le rôle "admin"
export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Accès interdit, vous devez être admin" });
    }
    next();
};
