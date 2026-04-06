const generateOTP = (length) => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += chars[Math.floor(Math.random() * chars.length)];
  }

  return otp;
};

module.exports = generateOTP;