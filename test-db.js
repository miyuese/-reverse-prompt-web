const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_mtz1eXLsxp3k@ep-wild-pine-a1q8chk2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
c.connect()
  .then(() => c.query('SELECT NOW()'))
  .then(r => { console.log('连接成功:', r.rows[0]); c.end(); })
  .catch(e => { console.error('连接失败:', e.message); process.exit(1); });
