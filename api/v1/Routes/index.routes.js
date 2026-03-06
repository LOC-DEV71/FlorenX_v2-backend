const adminRoutes = require("./Admin/admin.routes");
const clientRoutes = require("./Client/client.routes");

module.exports = (app) => {
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/client", clientRoutes);
};