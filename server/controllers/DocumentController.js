const { Document, User, DocumentShare } = require("../models");
const { GoogleGenAI } = require("@google/genai");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");

const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY
});

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

class DocumentController {
    static async testEmail(req, res, next) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: "fadhalshulhan.developer@gmail.com", // Ganti dengan email Anda untuk pengujian
                subject: "Tes Email dari Nodemailer",
                text: "Ini adalah email pengujian dari aplikasi Anda."
            };
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: "Email tes berhasil dikirim" });
        } catch (error) {
            console.error("!!! testEmail error:", error);
            next(error);
        }
    }

    static async createDocument(req, res, next) {
        try {
            const { content = "", isPublic = false } = req.body;
            const userId = req.user.id;

            // Generate judul menggunakan AI jika ada konten
            let title = "";
            if (content) {
                const prompt = `
Generate a concise title (max 10 words) for the following document content:
${content}
        `.trim();

                const aiResponse = await genAI.models.generateContent({
                    model: "gemini-2.0-flash",
                    contents: prompt,
                    config: {
                        temperature: 0.5,
                        maxOutputTokens: 32
                    }
                });

                // Ambil teks hasil AI
                title = aiResponse.text.trim();
            }

            const document = await Document.create({
                title,
                content,
                userId,
                isPublic,
                lastEditedById: userId
            });

            // Emit real-time
            req.io.emit("newDocument", {
                id: document.id,
                title: document.title,
                userId: document.userId,
                isPublic: document.isPublic,
                createdAt: document.createdAt,
            });

            res.status(201).json({
                message: "Document created successfully",
                document,
            });
        } catch (error) {
            console.error("!!! createDocument error:", error);
            next(error);
        }
    }

    // Dokumen milik user
    static async getUserDocuments(req, res, next) {
        try {
            const userId = req.user.id;
            const documents = await Document.findAll({
                where: { userId },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'username', 'email']
                    },
                    {
                        model: User,
                        as: 'lastEditor',
                        attributes: ['id', 'username', 'email']
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });
            res.json(documents);
        } catch (error) {
            next(error);
        }
    }

    // Dokumen publik
    static async getPublicDocuments(req, res, next) {
        try {
            const documents = await Document.findAll({
                where: { isPublic: true },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'username', 'email']
                    },
                    {
                        model: User,
                        as: 'lastEditor',
                        attributes: ['id', 'username', 'email']
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });
            res.json(documents);
        } catch (error) {
            next(error);
        }
    }

    static async getSharedDocuments(req, res, next) {
        try {
            const userId = req.user.id;
            const userEmail = req.user.email;
            const sharedDocuments = await DocumentShare.findAll({
                where: {
                    [Op.or]: [
                        { userId },
                        { email: userEmail }
                    ]
                },
                include: [
                    {
                        model: Document,
                        as: 'document',
                        include: [
                            { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                            { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email'] }
                        ]
                    }
                ]
            });

            const documents = sharedDocuments
                .map(ds => ds.document)
                .filter(doc => doc && doc.userId !== userId); // Jangan tampilkan dokumen milik sendiri

            res.json(documents);
        } catch (error) {
            next(error);
        }
    }
