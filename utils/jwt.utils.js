const jwt = require("jsonwebtoken");

const createToken = (payload, expires = "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expires
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { createToken, verifyToken };