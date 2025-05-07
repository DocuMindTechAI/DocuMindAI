const express = require("express");
const { Summary, Document } = require("../models");
const authenticate = require("../middlewares/auth");
const router = express.Router();

router.use(authenticate);

// Mendapatkan semua ringkasan untuk dokumen tertentu
router.get("/document/:documentId", async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.id;

        // Pastikan dokumen milik pengguna
        const document = await Document.findOne({
            where: { id: documentId, userId },
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const summaries = await Summary.findAll({
            where: { documentId },
        });

        res.status(200).json(summaries);
    } catch (error) {
        next(error);
    }
});

// Membuat ringkasan baru untuk dokumen tertentu
router.post("/", async (req, res, next) => {
    try {
        const { documentId, content } = req.body;
        const userId = req.user.id;

        // Validasi input
        if (!documentId || !content) {
            return res.status(400).json({ message: "Document ID and content are required" });
        }

        // Pastikan dokumen milik pengguna
        const document = await Document.findOne({
            where: { id: documentId, userId },
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Buat ringkasan baru
        const newSummary = await Summary.create({
            documentId,
            content,
        });

        res.status(201).json(newSummary);
    } catch (error) {
        next(error);
    }
});

module.exports = router;