const jwt = require("jsonwebtoken");
const System = require("../api/v1/Models/system.model");

const createToken = async (payload) => {
  const system = await System.findOne({});
  const secret = system?.iam?.jwtSecret || "FlorenxSecretKey2026_lamchiloc712005_25251325";
  const expires = `${system?.iam?.jwtExpiresIn || 7}d`;

  return jwt.sign(payload, secret, {
    expiresIn: expires
  });
};

const verifyToken = async (token) => {
  try {
    const system = await System.findOne({});
    const secret = system?.iam?.jwtSecret || "FlorenxSecretKey2026_lamchiloc712005_25251325";
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

module.exports = { createToken, verifyToken };