require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@frameschool.kz';
    const password = 'FrameSchool2026!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Проверяем, существует ли пользователь
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('Пользователь с email', email, 'уже существует.');
      console.log('Обновляю роль на ADMIN...');
      
      await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          password: hashedPassword
        }
      });
      
      console.log('✅ Пользователь обновлён до ADMIN');
    } else {
      console.log('Создаю нового админа...');
      
      await prisma.user.create({
        data: {
          username: 'admin',
          email,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Новый админ создан');
    }

    console.log('');
    console.log('=== ДАННЫЕ ДЛЯ ВХОДА ===');
    console.log('Email:', email);
    console.log('Пароль:', password);
    console.log('========================');
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
