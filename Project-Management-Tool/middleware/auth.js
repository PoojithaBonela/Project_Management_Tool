function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html'); // Redirect to login page if not authenticated
}

function protect(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html'); // Redirect to login page if not authenticated
}

module.exports = { protect };