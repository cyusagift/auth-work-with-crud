app.put("/servicerecord/:id", (req, res) => {
    const { ServiceDate, PlateNumber, ServiceCode } = req.body;

    const sql = `
        UPDATE ServiceRecord 
        SET ServiceDate = ?, PlateNumber = ?, ServiceCode = ?
        WHERE RecordNumber = ?
    `;

    db.query(sql, [ServiceDate, PlateNumber, ServiceCode, req.params.id], (err, result) => {
        if (err) return res.json(err);
        res.json("Service record updated");
    });
});