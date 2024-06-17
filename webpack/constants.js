const devServer = {
    host: "localhost",
    port: 8080,
};

const Env = {
    DEVELOPMENT: "development",
    PRODUCTION: "production",
};

const stats = {
    children: false,
    env: true,
    errors: true,
    errorDetails: true,
    version: true,
};

module.exports = {
    devServer,
    Env,
    stats,
};
