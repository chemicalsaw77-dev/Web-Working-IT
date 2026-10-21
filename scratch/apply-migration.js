const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:local.db' });

client.execute("ALTER TABLE `pm_plans` ADD `department_id` integer;")
  .then(() => {
    console.log("Migration applied successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error applying migration:", err);
    process.exit(1);
  });
