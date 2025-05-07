// server/middlewares/authenticateJWT.js
const jwt = require("jsonwebtoken");

module.exports = function authenticateJWT(req, res, next) {
<<<<<<< HEAD
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access token required" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: payload.id,
            email: payload.email,
            username: payload.username,
        };
        console.log(req.user);
        next();
    } catch {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
=======
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access token required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
    };
    console.log(req.user);
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
};
