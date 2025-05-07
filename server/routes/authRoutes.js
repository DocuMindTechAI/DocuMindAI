// authRoutes.js
const express = require("express");
const authenticateJWT = require("../middlewares/authenticateJWT");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

// Google OAuth callback
router.post("/google/callback", AuthController.googleLogin);

// GET /auth/me - return profile of logged-in user
router.get("/me", authenticateJWT, AuthController.getMe);

router.put("/profile", authenticateJWT, AuthController.updateProfile);

module.exports = router;
