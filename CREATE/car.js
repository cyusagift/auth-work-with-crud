app.post("/cars", (req, res) => {
    const { PlateNumber, type, Model, ManufacturingYear, DriverPhone, MechanicName } = req.body;

    const sql = "INSERT INTO Car VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [PlateNumber, type, Model, ManufacturingYear, DriverPhone, MechanicName], (err, result) => {
        if (err) return res.json(err);
        res.json("Car added successfully");
    });
});