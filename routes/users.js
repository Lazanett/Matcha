import express from "express";
import connection from './database.js';
const router = express.Router() // chercher url sur laquelle on est pour traiter ls data

router.get("/", (req, res) => {
    res.status(200).json({message: "Tous les utilisateurs"})
})


router.get("/:id", (req, res) => {
    const id = req.param.id
    res.status(200).json ({
        id: id,
    })
})

router.get("/:id/:status", (req, res) => {
    const id = req.param.id
    const status = req.param.status
    res.status(200).json ({
        id: id,
        status: status
    })
})


export default router;