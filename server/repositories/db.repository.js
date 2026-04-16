const { getDbPool } = require("../config/db");

class DbRepository {
    async executeStoredProcedure(procedureName, inputs = []) {
        const pool = await getDbPool();
        const request = pool.request();

        for (const input of inputs) {
            const type = input.length ? input.type(input.length) : input.type;

            if (input.output) {
                // Đăng ký output (có kèm giá trị khởi tạo nếu có)
                request.output(input.name, type, input.value);
            } else {
                // Đăng ký input thông thường
                request.input(input.name, type, input.value);
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