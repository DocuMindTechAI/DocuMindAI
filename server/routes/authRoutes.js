// authRoutes.js
const express = require("express");
const authenticateJWT = require("../middlewares/authenticateJWT");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

// Google OAuth callback
router.post("/google/callback", AuthController.googleLogin);

// GET /auth/me - return profile of logged-in user
router.get("/me", authenticateJWT, AuthController.getMe);

<<<<<<< HEAD
router.put('/profile', authenticateJWT, AuthController.updateProfile);

module.exports = router;
=======
router.put("/profile", authenticateJWT, AuthController.updateProfile);

module.exports = router;
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
