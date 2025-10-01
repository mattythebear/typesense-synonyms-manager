import mysql from "mysql2/promise";

// Create MySQL connection
async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "typesense_manager",
  });
  return connection;
}

export default async function handler(req, res) {

    const { username, password } = req.body;
    let connection;

    try {
      connection = await getConnection();

      const [rows] = await connection.execute(
        "SELECT id, username, firstname, lastname, active FROM admin WHERE username = ? AND password = ? AND active = 1",
        [username, password]
      );

      if (rows.length === 0) {
        // User not found or wrong password
        return { success: false, error: "Invalid username or password" };
      }

      const user = rows[0];

      // Update last login timestamp
      await connection.execute(
        "UPDATE admin SET last_login = NOW() WHERE id = ?",
        [user.id]
      );

      // Return user data (excluding password)
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.username,
          fullName: user.firstname + ' ' + user.lastname,
          isActive: user.is_active,
        },
      });
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database connection error" });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
}