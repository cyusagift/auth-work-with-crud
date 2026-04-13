app.delete("/servicerecord/:id", (req, res) => {
    const sql = "DELETE FROM ServiceRecord WHERE RecordNumber = ?";

    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.json(err);
        res.json("Service record deleted");
    });
});