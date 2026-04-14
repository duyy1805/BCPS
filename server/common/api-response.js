function ok(data, message = "OK") {
    return {
        success: true,
        message,
        data,
        errors: []
    };
}

function fail(message, errors = []) {
    return {
        success: false,
        message,
        data: null,
        errors
    };
}

module.exports = {
    ok,
    fail
};