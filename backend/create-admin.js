const bcrypt = require('bcryptjs');

const email = 'admin@frameschool.kz';
const password = 'FrameSchool2026!';

bcrypt.hash(password, 10).then(hash => {
  console.log('=== НОВЫЙ АДМИН ===');
  console.log('Email:', email);
  console.log('Пароль:', password);
  console.log('Хеш:', hash);
  console.log('');
  console.log('SQL команда для вставки:');
  console.log(`INSERT INTO "User" (username, email, password, role, "createdAt", "updatedAt")`);
  console.log(`VALUES ('admin', '${email}', '${hash}', 'ADMIN', NOW(), NOW());`);
}).catch(err => {
  console.error('Error:', err);
});
