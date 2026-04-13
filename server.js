require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const { query } = require("./db");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.use(
  session({
    name: "crpms.sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/", (_req, res) => {
  res.json({
    name: "CRPMS API",
    ok: true,
    endpoints: {
      health: "GET /health",
      auth: "/api/auth",
      services: "/api/services",
      cars: "/api/cars",
      serviceRecords: "/api/service-records",
      payments: "/api/payments"
    }
  });
});

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    return res.json({ ok: true, db: { ok: true } });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      db: { ok: false, error: err?.code || String(err?.message || err) }
    });
  }
});

// -------------------- AUTH (session-based) --------------------
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  try {
    const result = await query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
      String(username),
      passwordHash
    ]);
    return res.status(201).json({ id: result.insertId, username: String(username) });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "username already exists" });
    }
    return res.status(500).json({ error: "failed to register user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const rows = await query("SELECT id, username, password_hash FROM users WHERE username = ?", [
    String(username)
  ]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  req.session.user = { id: user.id, username: user.username };
  return res.json({ id: user.id, username: user.username });
});

app.post("/api/auth/logout", (req, res) => {
  if (!req.session) return res.status(204).end();
  req.session.destroy(() => res.status(204).end());
});

app.get("/api/auth/me", (req, res) => {
  return res.json({ user: req.session?.user || null });
});

// -------------------- SERVICES (CRUD) --------------------
app.post("/api/services", async (req, res) => {
  const { serviceCode, serviceName, servicePrice } = req.body || {};
  if (!serviceCode || !serviceName || servicePrice == null) {
    return res.status(400).json({ error: "serviceCode, serviceName, servicePrice are required" });
  }

  try {
    await query("INSERT INTO services (service_code, service_name, service_price) VALUES (?, ?, ?)", [
      String(serviceCode),
      String(serviceName),
      Number(servicePrice)
    ]);
    return res.status(201).json({ serviceCode, serviceName, servicePrice: Number(servicePrice) });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "serviceCode already exists" });
    }
    return res.status(500).json({ error: "failed to create service" });
  }
});

app.get("/api/services", async (_req, res) => {
  const rows = await query(
    "SELECT service_code AS serviceCode, service_name AS serviceName, service_price AS servicePrice FROM services ORDER BY service_name"
  );
  return res.json(rows);
});

app.get("/api/services/:serviceCode", async (req, res) => {
  const rows = await query(
    "SELECT service_code AS serviceCode, service_name AS serviceName, service_price AS servicePrice FROM services WHERE service_code = ?",
    [String(req.params.serviceCode)]
  );
  if (!rows[0]) return res.status(404).json({ error: "service not found" });
  return res.json(rows[0]);
});

app.put("/api/services/:serviceCode", async (req, res) => {
  const { serviceName, servicePrice } = req.body || {};
  if (!serviceName || servicePrice == null) {
    return res.status(400).json({ error: "serviceName and servicePrice are required" });
  }

  const result = await query("UPDATE services SET service_name = ?, service_price = ? WHERE service_code = ?", [
    String(serviceName),
    Number(servicePrice),
    String(req.params.serviceCode)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "service not found" });

  return res.json({
    serviceCode: String(req.params.serviceCode),
    serviceName: String(serviceName),
    servicePrice: Number(servicePrice)
  });
});

app.delete("/api/services/:serviceCode", async (req, res) => {
  const result = await query("DELETE FROM services WHERE service_code = ?", [
    String(req.params.serviceCode)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "service not found" });
  return res.status(204).end();
});

// -------------------- CARS (CRUD) --------------------
app.post("/api/cars", async (req, res) => {
  const { plateNumber, type, model, manufacturingYear, driverPhone, mechanicName } = req.body || {};
  if (
    !plateNumber ||
    !type ||
    !model ||
    manufacturingYear == null ||
    !driverPhone ||
    !mechanicName
  ) {
    return res.status(400).json({
      error:
        "plateNumber, type, model, manufacturingYear, driverPhone, mechanicName are required"
    });
  }

  try {
    await query(
      "INSERT INTO cars (plate_number, type, model, manufacturing_year, driver_phone, mechanic_name) VALUES (?, ?, ?, ?, ?, ?)",
      [
        String(plateNumber),
        String(type),
        String(model),
        Number(manufacturingYear),
        String(driverPhone),
        String(mechanicName)
      ]
    );
    return res.status(201).json({
      plateNumber,
      type,
      model,
      manufacturingYear: Number(manufacturingYear),
      driverPhone,
      mechanicName
    });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "plateNumber already exists" });
    }
    return res.status(500).json({ error: "failed to create car" });
  }
});

app.get("/api/cars", async (_req, res) => {
  const rows = await query(
    "SELECT plate_number AS plateNumber, type, model, manufacturing_year AS manufacturingYear, driver_phone AS driverPhone, mechanic_name AS mechanicName FROM cars ORDER BY plate_number"
  );
  return res.json(rows);
});

app.get("/api/cars/:plateNumber", async (req, res) => {
  const rows = await query(
    "SELECT plate_number AS plateNumber, type, model, manufacturing_year AS manufacturingYear, driver_phone AS driverPhone, mechanic_name AS mechanicName FROM cars WHERE plate_number = ?",
    [String(req.params.plateNumber)]
  );
  if (!rows[0]) return res.status(404).json({ error: "car not found" });
  return res.json(rows[0]);
});

app.put("/api/cars/:plateNumber", async (req, res) => {
  const { type, model, manufacturingYear, driverPhone, mechanicName } = req.body || {};
  if (!type || !model || manufacturingYear == null || !driverPhone || !mechanicName) {
    return res.status(400).json({
      error: "type, model, manufacturingYear, driverPhone, mechanicName are required"
    });
  }

  const result = await query(
    "UPDATE cars SET type = ?, model = ?, manufacturing_year = ?, driver_phone = ?, mechanic_name = ? WHERE plate_number = ?",
    [
      String(type),
      String(model),
      Number(manufacturingYear),
      String(driverPhone),
      String(mechanicName),
      String(req.params.plateNumber)
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "car not found" });

  return res.json({
    plateNumber: String(req.params.plateNumber),
    type: String(type),
    model: String(model),
    manufacturingYear: Number(manufacturingYear),
    driverPhone: String(driverPhone),
    mechanicName: String(mechanicName)
  });
});

app.delete("/api/cars/:plateNumber", async (req, res) => {
  const result = await query("DELETE FROM cars WHERE plate_number = ?", [
    String(req.params.plateNumber)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "car not found" });
  return res.status(204).end();
});

// -------------------- SERVICE RECORDS (CRUD) --------------------
app.post("/api/service-records", async (req, res) => {
  const { serviceDate, plateNumber, serviceCode } = req.body || {};
  if (!serviceDate || !plateNumber || !serviceCode) {
    return res.status(400).json({ error: "serviceDate, plateNumber, serviceCode are required" });
  }

  try {
    const result = await query(
      "INSERT INTO service_records (service_date, plate_number, service_code) VALUES (?, ?, ?)",
      [String(serviceDate), String(plateNumber), String(serviceCode)]
    );
    return res.status(201).json({
      recordNumber: result.insertId,
      serviceDate,
      plateNumber,
      serviceCode
    });
  } catch (err) {
    if (err && err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "plateNumber or serviceCode does not exist" });
    }
    return res.status(500).json({ error: "failed to create service record" });
  }
});

app.get("/api/service-records", async (_req, res) => {
  const rows = await query(
    `SELECT
      sr.record_number AS recordNumber,
      sr.service_date AS serviceDate,
      sr.plate_number AS plateNumber,
      c.model AS carModel,
      sr.service_code AS serviceCode,
      s.service_name AS serviceName,
      s.service_price AS servicePrice
    FROM service_records sr
    JOIN cars c ON c.plate_number = sr.plate_number
    JOIN services s ON s.service_code = sr.service_code
    ORDER BY sr.record_number DESC`
  );
  return res.json(rows);
});

app.get("/api/service-records/:recordNumber", async (req, res) => {
  const rows = await query(
    `SELECT
      sr.record_number AS recordNumber,
      sr.service_date AS serviceDate,
      sr.plate_number AS plateNumber,
      c.model AS carModel,
      sr.service_code AS serviceCode,
      s.service_name AS serviceName,
      s.service_price AS servicePrice
    FROM service_records sr
    JOIN cars c ON c.plate_number = sr.plate_number
    JOIN services s ON s.service_code = sr.service_code
    WHERE sr.record_number = ?`,
    [Number(req.params.recordNumber)]
  );
  if (!rows[0]) return res.status(404).json({ error: "service record not found" });
  return res.json(rows[0]);
});

app.put("/api/service-records/:recordNumber", async (req, res) => {
  const { serviceDate, plateNumber, serviceCode } = req.body || {};
  if (!serviceDate || !plateNumber || !serviceCode) {
    return res.status(400).json({ error: "serviceDate, plateNumber, serviceCode are required" });
  }

  try {
    const result = await query(
      "UPDATE service_records SET service_date = ?, plate_number = ?, service_code = ? WHERE record_number = ?",
      [String(serviceDate), String(plateNumber), String(serviceCode), Number(req.params.recordNumber)]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "service record not found" });
    }

    return res.json({
      recordNumber: Number(req.params.recordNumber),
      serviceDate,
      plateNumber,
      serviceCode
    });
  } catch (err) {
    if (err && err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "plateNumber or serviceCode does not exist" });
    }
    return res.status(500).json({ error: "failed to update service record" });
  }
});

app.delete("/api/service-records/:recordNumber", async (req, res) => {
  const result = await query("DELETE FROM service_records WHERE record_number = ?", [
    Number(req.params.recordNumber)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "service record not found" });
  return res.status(204).end();
});

// -------------------- PAYMENTS (CRUD; write requires login) --------------------
app.post("/api/payments", requireAuth, async (req, res) => {
  const { recordNumber, amountPaid, paymentDate } = req.body || {};
  if (recordNumber == null || amountPaid == null || !paymentDate) {
    return res.status(400).json({ error: "recordNumber, amountPaid, paymentDate are required" });
  }

  try {
    const result = await query(
      "INSERT INTO payments (record_number, amount_paid, payment_date, received_by_user_id) VALUES (?, ?, ?, ?)",
      [Number(recordNumber), Number(amountPaid), String(paymentDate), req.session.user.id]
    );
    return res.status(201).json({
      paymentNumber: result.insertId,
      recordNumber: Number(recordNumber),
      amountPaid: Number(amountPaid),
      paymentDate,
      receivedBy: req.session.user.username
    });
  } catch (err) {
    if (err && err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "recordNumber does not exist" });
    }
    return res.status(500).json({ error: "failed to create payment" });
  }
});

app.get("/api/payments", async (_req, res) => {
  const rows = await query(
    `SELECT
      p.payment_number AS paymentNumber,
      p.record_number AS recordNumber,
      p.amount_paid AS amountPaid,
      p.payment_date AS paymentDate,
      u.username AS receivedBy,
      sr.plate_number AS plateNumber,
      s.service_name AS serviceName
    FROM payments p
    JOIN users u ON u.id = p.received_by_user_id
    JOIN service_records sr ON sr.record_number = p.record_number
    JOIN services s ON s.service_code = sr.service_code
    ORDER BY p.payment_number DESC`
  );
  return res.json(rows);
});

app.get("/api/payments/:paymentNumber", async (req, res) => {
  const rows = await query(
    `SELECT
      p.payment_number AS paymentNumber,
      p.record_number AS recordNumber,
      p.amount_paid AS amountPaid,
      p.payment_date AS paymentDate,
      u.username AS receivedBy,
      sr.plate_number AS plateNumber,
      s.service_name AS serviceName
    FROM payments p
    JOIN users u ON u.id = p.received_by_user_id
    JOIN service_records sr ON sr.record_number = p.record_number
    JOIN services s ON s.service_code = sr.service_code
    WHERE p.payment_number = ?`,
    [Number(req.params.paymentNumber)]
  );
  if (!rows[0]) return res.status(404).json({ error: "payment not found" });
  return res.json(rows[0]);
});

app.put("/api/payments/:paymentNumber", requireAuth, async (req, res) => {
  const { amountPaid, paymentDate } = req.body || {};
  if (amountPaid == null || !paymentDate) {
    return res.status(400).json({ error: "amountPaid and paymentDate are required" });
  }

  const result = await query("UPDATE payments SET amount_paid = ?, payment_date = ? WHERE payment_number = ?", [
    Number(amountPaid),
    String(paymentDate),
    Number(req.params.paymentNumber)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "payment not found" });

  const rows = await query(
    `SELECT
      p.payment_number AS paymentNumber,
      p.record_number AS recordNumber,
      p.amount_paid AS amountPaid,
      p.payment_date AS paymentDate,
      u.username AS receivedBy,
      sr.plate_number AS plateNumber,
      s.service_name AS serviceName
    FROM payments p
    JOIN users u ON u.id = p.received_by_user_id
    JOIN service_records sr ON sr.record_number = p.record_number
    JOIN services s ON s.service_code = sr.service_code
    WHERE p.payment_number = ?`,
    [Number(req.params.paymentNumber)]
  );

  return res.json(rows[0]);
});

app.delete("/api/payments/:paymentNumber", requireAuth, async (req, res) => {
  const result = await query("DELETE FROM payments WHERE payment_number = ?", [
    Number(req.params.paymentNumber)
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "payment not found" });
  return res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`CRPMS backend listening on http://localhost:${port}`);
});
