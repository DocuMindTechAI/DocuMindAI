const { User, DocumentShare } = require("../models");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
  static async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "idToken is required" });
      }

      // Verifikasi token Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      // Upsert user by googleId
      let user = await User.findOne({ where: { googleId: payload.sub } });

      if (!user) {
        user = await User.create({
          googleId: payload.sub,
          email: payload.email,
          username: payload.name,
          password: null,
          phoneNumber: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Perbarui DocumentShare dengan userId pengguna baru
        const sharedDocs = await DocumentShare.findAll({
          where: { email: user.email, userId: null }
        });
        for (const docShare of sharedDocs) {
          await docShare.update({ userId: user.id });
        }
      }

      // Create JWT access token
      const accessToken = AuthController.generateToken(user);

      res.json({
        access_token: accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error("!!! googleLogin error:", error);
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "username", "email", "phoneNumber"]
      });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("!!! getMe error:", error);
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { username, phoneNumber } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update fields if provided
      if (username) user.username = username;
      if (phoneNumber) user.phoneNumber = phoneNumber;

      await user.save();

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
      });
    } catch (error) {
      console.error("!!! updateProfile error:", error);
      next(error);
    }
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }
}

module.exports = AuthController;