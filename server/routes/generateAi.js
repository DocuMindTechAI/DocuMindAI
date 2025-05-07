const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");
const { Summary, Document } = require("../models");
const authenticateJWT = require("../middlewares/authenticateJWT");

const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
});

// Terapkan middleware autentikasi untuk semua rute
router.use(authenticateJWT);

router.post("/generate-title", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res
                .status(400)
                .json({ message: "Prompt is required and must be a string" });
        }

        // 1. Panggil AI
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 32 },
        });

        // 2. Debug: log seluruh result
        console.log("🛠️ RAW AI RESULT:", JSON.stringify(result, null, 2));

        // 3. Coba ambil dari beberapa lokasi
        const candidates =
            result.response?.candidates ||
            result.candidates ||
            result.data?.candidates;

        if (!Array.isArray(candidates) || candidates.length === 0) {
            console.error("❌ No candidates, raw result above");
            return res.status(502).json({ message: "AI returned no candidates" });
        }

        // 4. Ambil teks jawaban
        let text =
            candidates[0].content?.parts?.[0]?.text ||
            candidates[0].text ||
            (typeof candidates[0] === "string" && candidates[0]);

        if (!text) {
            console.error("❌ Candidate format unexpected");
            return res
                .status(502)
                .json({ message: "AI returned invalid title format" });
        }

        res.json({ title: text.trim() });
    } catch (err) {
        console.error("❌ Error generate-title:", err);
        res.status(500).json({ message: "Failed to generate title" });
    }
});

router.post("/process", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ message: "Prompt is required and must be a string" });
        }

        // Panggil AI untuk memproses prompt
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 128 },
        });

        // Ambil hasil dari response AI
        const candidates =
            result.response?.candidates ||
            result.candidates ||
            result.data?.candidates;

        if (!Array.isArray(candidates) || candidates.length === 0) {
            console.error("❌ No candidates, raw result above");
            return res.status(502).json({ message: "AI returned no candidates" });
        }

        const text =
            candidates[0].content?.parts?.[0]?.text ||
            candidates[0].text ||
            (typeof candidates[0] === "string" && candidates[0]);

        if (!text) {
            console.error("❌ Candidate format unexpected");
            return res.status(502).json({ message: "AI returned invalid result format" });
        }

        res.json({ result: text.trim() });
    } catch (err) {
        console.error("❌ Error processing AI request:", err);
        res.status(500).json({ message: "Failed to process AI request" });
    }
});

// Mendapatkan semua ringkasan untuk dokumen tertentu
router.get("/summaries/document/:documentId", async (req, res, next) => {
    try {
        const { documentId } = req.params;

        // Pastikan req.user ada
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
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
        console.error("Error in GET /ai/summaries/document:", error);
        next(error);
    }
});

// Memperbarui atau membuat ringkasan untuk dokumen tertentu
router.post("/summaries", async (req, res, next) => {
    try {
        console.log("Request received at POST /ai/summaries:", req.body);

        // Pastikan req.user ada
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const userId = req.user.id;

        const { documentId, content } = req.body;

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

        // Cari ringkasan yang sudah ada untuk dokumen ini
        let summary = await Summary.findOne({
            where: { documentId },
        });

        if (summary) {
            // Jika ringkasan sudah ada, perbarui
            summary = await summary.update({
                content,
            });
            res.status(200).json(summary); // Status 200 untuk update
        } else {
            // Jika ringkasan belum ada, buat baru
            summary = await Summary.create({
                documentId,
                content,
            });
            res.status(201).json(summary); // Status 201 untuk create
        }
    } catch (error) {
        console.error("Error in POST /ai/summaries:", error);
        next(error);
    }
});

module.exports = router;