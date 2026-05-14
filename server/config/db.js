const sql = require("mssql");
const env = require("./env");

const sqlConfig = {
    user: env.db.user,
    password: env.db.password,
    server: env.db.server,
    database: env.db.database,
    port: env.db.port,
    pool: env.db.pool,
    options: {
        trustServerCertificate: env.db.trustServerCertificate,
        useUTC: false,
        enableArithAbort: true
    }
};

let pool = null;

async function getDbPool() {
    if (pool) {
        if (pool.connected) return pool;
        if (pool.connecting) return pool;
    }

    pool = await new sql.ConnectionPool(sqlConfig).connect();
    return pool;
}

module.exports = {
    sql,
    getDbPool
};