const { getDbPool } = require("../config/db");

class DbRepository {
    async executeStoredProcedure(procedureName, inputs = []) {
        const pool = await getDbPool();
        const request = pool.request();

        for (const input of inputs) {
            if (input.output) {
                if (input.length) {
                    request.output(input.name, input.type(input.length));
                } else {
                    request.output(input.name, input.type);
                }
            } else {
                request.input(input.name, input.type, input.value);
            }
        }

        const result = await request.execute(procedureName);

        return {
            recordsets: result.recordsets || [],
            output: result.output || {}
        };
    }
}

module.exports = DbRepository;