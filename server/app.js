if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
    console.log({ env: process.env.NODE_ENV });
}

const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { Sequelize } = require("sequelize");
const config = require('./config/config.json');
const { Document, User, ChatHistory } = require("./models");
const { GoogleGenAI } = require("@google/genai");
const DocumentController = require("./controllers/DocumentController");

// Routes
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documents");
const generateAiRoutes = require("./routes/generateAi");

const app = express();

// —– MIDDLEWARE —–
// Enable CORS untuk HTTP API
app.use(cors());

// —– SETUP SOCKET.IO —–
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(express.json());

// routes
app.use("/auth", authRoutes);
app.use("/documents", documentRoutes);
app.use("/ai", generateAiRoutes);

// Inisialisasi GenAI
const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY
});

// Fungsi untuk menghasilkan warna acak
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

// Track pengguna aktif & debounce save
const activeUsers = new Map();
const saveDebounce = new Map();
const DEBOUNCE_TIME = 2000;

// Socket.IO handlers
io.on("connection", socket => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("joinDocument", async ({ documentId, userId }) => {
        try {
            const doc = await Document.findByPk(documentId);
            if (!doc) return socket.emit("error", { message: "Document not found" });

            // Cek akses menggunakan DocumentController
            const user = await User.findByPk(userId);
            if (!user) return socket.emit("error", { message: "User not found" });

            const hasAccess = await DocumentController.checkAccess(doc, userId, user.email);
            if (!hasAccess) {
                return socket.emit("error", { message: "Access denied" });
            }

            socket.join(`doc:${documentId}`);

            if (!activeUsers.has(documentId)) {
                activeUsers.set(documentId, new Map());
            }

            // Simpan informasi lengkap pengguna
            if (!activeUsers.get(documentId).has(userId)) {
                activeUsers.get(documentId).set(userId, {
                    id: userId,
                    name: user.username || user.email.split('@')[0], // Ambil nama dari username atau email
                    color: getRandomColor(),
                });
            }

            // Konversi Map ke Array untuk dikirim ke frontend
            const usersArray = Array.from(activeUsers.get(documentId).values());

            io.to(`doc:${documentId}`).emit("activeUsers", {
                documentId,
                users: usersArray,
            });
        } catch (err) {
            socket.emit("error", { message: err.message });
        }
    });

    socket.on("updateDocument", async ({ documentId, content, userId }) => {
        try {
            const doc = await Document.findByPk(documentId);
            if (!doc) return socket.emit("error", { message: "Document not found" });

            // Cek akses
            const user = await User.findByPk(userId);
            if (!user) return socket.emit("error", { message: "User not found" });

            const hasAccess = await DocumentController.checkAccess(doc, userId, user.email);
            if (!hasAccess) {
                return socket.emit("error", { message: "Access denied" });
            }

            io.to(`doc:${documentId}`).emit("documentContentUpdated", {
                documentId, content, userId
            });

            // AI suggestion
            const suggestionPrompt = `Beri saran kelanjutan yang ringkas (maksimal 2 kalimat) untuk teks berikut:\n${content.slice(-100)}
            
            ⚠️ Hanya keluarkan teks polos tanpa tanda bintang atau format markdown.
            `.trim();

            const suggestionResult = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: suggestionPrompt,
                config: { temperature: 0.7, maxOutputTokens: 128 }
            });

            const suggestion = suggestionResult.text.trim();
            io.to(`doc:${documentId}`).emit("aiSuggestion", { documentId, suggestion });

            // AI summary
            const summaryPrompt = `Ringkas konten dokumen berikut dalam 3–5 kalimat:\n${content}

            ⚠️ Hanya keluarkan teks polos tanpa tanda bintang atau format markdown.
            `.trim();

            const summaryResult = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: summaryPrompt,
                config: { temperature: 0.5, maxOutputTokens: 256 }
            });

            const summary = summaryResult.text.trim();
            io.to(`doc:${documentId}`).emit("aiSummary", { documentId, summary });

            // Debounce save to DB
            if (saveDebounce.has(documentId)) {
                clearTimeout(saveDebounce.get(documentId));
            }
            saveDebounce.set(documentId, setTimeout(async () => {
                await doc.update({ content });
                console.log(`💾 Document ${documentId} saved`);
            }, DEBOUNCE_TIME));

        } catch (err) {
            socket.emit("error", { message: err.message });
        }
    });

    // Handler untuk userTyping
    socket.on("userTyping", ({ documentId, userId, userName, cursorPos, selection }) => {
        console.log(`User ${userName} (ID: ${userId}) is typing in document ${documentId} at position:`, cursorPos);
        socket.to(`doc:${documentId}`).emit("userTyping", { documentId, userId, userName, cursorPos, selection });
    });

    // Handler untuk userStoppedTyping
    socket.on("userStoppedTyping", ({ documentId, userId }) => {
        console.log(`User (ID: ${userId}) stopped typing in document ${documentId}`);
        socket.to(`doc:${documentId}`).emit("userStoppedTyping", { documentId, userId });
    });

    socket.on("leaveDocument", ({ documentId, userId }) => {
        if (!activeUsers.has(documentId)) return;
        activeUsers.get(documentId).delete(userId);
        if (activeUsers.get(documentId).size === 0) activeUsers.delete(documentId);
        io.to(`doc:${documentId}`).emit("activeUsers", {
            documentId,
            users: Array.from(activeUsers.get(documentId)?.values() || [])
        });
    });

    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
        // cleanup all rooms
        activeUsers.forEach((users, documentId) => {
            users.delete(socket.id);
            if (users.size === 0) activeUsers.delete(documentId);
            io.to(`doc:${documentId}`).emit("activeUsers", {
                documentId, users: Array.from(users)
            });
        });
    });
});

// —– DATABASE & SERVER START —–
(async () => {
    try {
        const env = process.env.NODE_ENV || "development";
        const dbConfig = config[env];
        const sequelize = dbConfig.use_env_variable
            ? new Sequelize(process.env[dbConfig.use_env_variable], {
                dialect: 'postgres',
                protocol: 'postgres',
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
            })
            : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

        await sequelize.authenticate();
        console.log("✅ Database connected");

        httpServer.listen(process.env.PORT || 3000, () => {
            console.log(`🚀 Server listening on http://localhost:${process.env.PORT || 3000}`);
        });
    } catch (err) {
        console.error("❌ Failed to start:", err);
    }
})();