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

    static async getDocumentById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const document = await Document.findOne({
                where: { id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
                    { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email'] }
                ]
            });

            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            // Periksa akses
            const hasAccess = await DocumentController.checkAccess(document, userId, req.user.email);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }

            res.status(200).json(document);
        } catch (error) {
            next(error);
        }
    }

    static async checkDocumentAccess(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userEmail = req.user.email;

            const document = await Document.findOne({ where: { id } });
            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            const documentShare = await DocumentShare.findOne({
                where: {
                    documentId: id,
                    [Op.or]: [
                        { userId },
                        { email: userEmail }
                    ]
                }
            });

            const hasAccess = document.userId === userId || document.isPublic || (documentShare && documentShare.accessLevel === "edit");
            const accessLevel = document.userId === userId ? "edit" : documentShare ? documentShare.accessLevel : document.isPublic ? "view" : null;

            res.status(200).json({ hasAccess, accessLevel });
        } catch (error) {
            next(error);
        }
    }

    static async shareDocument(req, res, next) {
        try {
            const { id } = req.params;
            const { email, accessLevel = "edit" } = req.body;
            const userId = req.user.id;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ message: "Invalid email" });
            }

            const document = await Document.findOne({ where: { id } });
            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            if (document.userId !== userId) {
                return res.status(403).json({ message: "Only the creator can share this document" });
            }

            // Cek apakah pengguna sudah memiliki akses
            const existingShare = await DocumentShare.findOne({
                where: { documentId: id, email }
            });
            if (existingShare) {
                return res.status(400).json({ message: "User already has access" });
            }

            // Cek apakah email terdaftar
            const invitedUser = await User.findOne({ where: { email } });
            const documentShare = await DocumentShare.create({
                documentId: id,
                userId: invitedUser ? invitedUser.id : null,
                email,
                accessLevel
            });

            // Kirim email jika pengguna belum terdaftar
            if (!invitedUser) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: `Undangan Kolaborasi Dokumen: ${document.title}`,
                    html: `
                        <p>Halo,</p>
                        <p>${req.user.username} mengundang Anda untuk berkolaborasi pada dokumen "${document.title}".</p>
                        <p>Untuk mulai, daftar akun menggunakan email ini:</p>
                        <a href="${process.env.CLIENT_URL}/register?email=${encodeURIComponent(email)}&documentId=${id}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Daftar Sekarang</a>
                        <p>Setelah mendaftar, Anda akan menemukan dokumen di tab "Dibagikan" pada daftar dokumen Anda. Anda dapat mengedit dan berkolaborasi secara real-time dengan pengguna lain yang memiliki akses.</p>
                        <p>Jika Anda sudah memiliki akun, login dan periksa tab "Dibagikan" untuk mengakses dokumen.</p>
                        <p>Salam,<br>Tim DocuMindAI</p>
                    `
                };

                await transporter.sendMail(mailOptions);
            }

            // Emit real-time untuk dokumen yang dibagikan
            req.io.emit("documentShared", {
                documentId: id,
                email,
                sharedBy: req.user.username
            });

            res.status(200).json({ message: "Document shared successfully" });
        } catch (error) {
            console.error("!!! shareDocument error:", error);
            next(error);
        }
    }

    static async updateDocument(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { title, content, isPublic } = req.body;

            const document = await Document.findOne({ where: { id } });

            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            // Periksa akses
            const hasAccess = await DocumentController.checkAccess(document, userId, req.user.email);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }

            await document.update({ title, content, isPublic, lastEditedById: userId });

            // Emit update real-time
            req.io.emit("documentUpdated", {
                documentId: id,
                title: document.title,
                content: document.content,
                isPublic: document.isPublic,
                updatedAt: document.updatedAt
            });

            res.status(200).json({
                message: "Document updated successfully",
                document,
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteDocument(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const document = await Document.findOne({
                where: { id, userId },
            });

            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            await document.destroy();

            req.io.emit("documentDeleted", {
                documentId: id,
            });

            res.status(200).json({ message: "Document deleted successfully" });
        } catch (error) {
            next(error);
        }
    }

    // Helper untuk memeriksa akses
    static async checkAccess(document, userId, userEmail) {
        const documentShare = await DocumentShare.findOne({
            where: {
                documentId: document.id,
                [Op.or]: [
                    { userId }, // jika user terdaftar
                    { email: userEmail } // jika user belum terdaftar
                ]
            }
        });
        return (
            document.userId === userId ||          // Pemilik
            document.isPublic ||                  // Dokumen publik
            (documentShare && documentShare.accessLevel === "edit") // Diberi akses edit
        );
    }
}

module.exports = DocumentController;