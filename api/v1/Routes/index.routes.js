const adminRoutes = require("./Admin/admin.routes");
const clientRoutes = require("./Client/client.routes");
const ApiRunning = require("./ApiRunning");
module.exports = (app) => {
  app.use("/", ApiRunning);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/client", clientRoutes);
};