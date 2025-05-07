const express = require("express");
const DocumentController = require("../controllers/DocumentController");
const authenticateJWT = require("../middlewares/authenticateJWT");
const router = express.Router();

router.get("/test-email", DocumentController.testEmail);

// 1️⃣ Public endpoint—tidak perlu login
router.get("/public", DocumentController.getPublicDocuments);

// 2️⃣ Barulah semua yang lain pakai auth
// Middleware autentikasi diterapkan ke semua endpoint
router.use(authenticateJWT);

// CRUD Endpoints
router.post("/", DocumentController.createDocument); // Buat dokumen baru
router.get("/", DocumentController.getUserDocuments); // Dapatkan semua dokumen pengguna

// Dapatkan semua dokumen pengguna
router.get("/shared", DocumentController.getSharedDocuments); // Dapatkan dokumen yang dibagikan
router.get("/:id", DocumentController.getDocumentById); // Dapatkan dokumen berdasarkan ID
router.get("/:id/access", DocumentController.checkDocumentAccess); // Periksa hak akses
router.post("/:id/share", DocumentController.shareDocument); // Bagikan dokumen
// router.post("/:id/unshare", DocumentController.unshareDocument); // Batalkan berbagi dokumen
// router.post("/:id/copy", DocumentController.copyDocument); // Salin dokumen
// router.post("/:id/rename", DocumentController.renameDocument); // Ganti nama dokumen
// router.post("/:id/restore", DocumentController.restoreDocument); // Pulihkan dokumen

router.put("/:id", DocumentController.updateDocument); // Perbarui dokumen
router.patch("/:id", DocumentController.updateDocument);
router.delete("/:id", DocumentController.deleteDocument); // Hapus dokumen

module.exports = router;