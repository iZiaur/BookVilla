const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middleware.js");

router.get("/", isAdmin, (req, res) => {
    res.render("admin/dashboard.ejs");
});

module.exports = router;
