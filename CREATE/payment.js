app.post("/payment", (req, res) => {
    const { PaymentNumber, AmountPaid, PaymentDate, RecordNumber } = req.body;

    const sql = "INSERT INTO Payment VALUES (?, ?, ?, ?)";
    db.query(sql, [PaymentNumber, AmountPaid, PaymentDate, RecordNumber], (err, result) => {
        if (err) return res.json(err);
        res.json("Payment recorded");
    });
});