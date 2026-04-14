require("dotenv").config();

module.exports = {
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || "super-secret-key-change-this",
    db: {
        user: process.env.DB_USER || "",
        password: process.env.DB_PASSWORD || "",
        server: process.env.DB_SERVER || "",
        database: process.env.DB_DATABASE || "",
        port: Number(process.env.DB_PORT || 1433),
        trustServerCertificate: String(process.env.DB_TRUST_CERT || "true") === "true",
        pool: {
            max: Number(process.env.DB_POOL_MAX || 10),
            min: Number(process.env.DB_POOL_MIN || 0),
            idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 30000)
        }
    }
};