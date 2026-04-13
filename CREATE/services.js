app.post("/services", (req, res) => {
    const { ServiceCode, ServiceName, ServicePrice } = req.body;

    const sql = "INSERT INTO Services VALUES (?, ?, ?)";
    db.query(sql, [ServiceCode, ServiceName, ServicePrice], (err, result) => {
        if (err) return res.json(err);
        res.json("Service added successfully");
    });
});