app.post("/servicerecord", (req, res) => {
    const { RecordNumber, ServiceDate, PlateNumber, ServiceCode } = req.body;

    const sql = "INSERT INTO ServiceRecord VALUES (?, ?, ?, ?)";
    db.query(sql, [RecordNumber, ServiceDate, PlateNumber, ServiceCode], (err, result) => {
        if (err) return res.json(err);
        res.json("Service record added");
    });
});