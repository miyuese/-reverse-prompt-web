const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_mtz1eXLsxp3k@ep-wild-pine-a1q8chk2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

c.connect()
  .then(() =>
    c.query('SELECT id, name, "baseUrl", "modelName" FROM "ModelConfig" ORDER BY "createdAt" DESC')
  )
  .then((r) => {
    console.log(JSON.stringify(r.rows, null, 2));
    return c.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
