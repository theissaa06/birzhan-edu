const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

async function resetAdminPassword() {
  try {
    console.log("Поиск админа в базе данных...");
    
    // Ищем пользователя с ролью ADMIN
    let admin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    const newPassword = "Test123";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (admin) {
      console.log(`Админ найден: ${admin.email} (${admin.username})`);
      
      // Обновляем пароль
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });
      
      console.log(`Пароль админа успешно изменён на: ${newPassword}`);
    } else {
      console.log("Админ не найден. Создаём нового админа...");
      
      // Создаём нового админа
      admin = await prisma.user.create({
        data: {
          username: "admin",
          email: "admin@birzhan-edu.com",
          password: hashedPassword,
          role: "ADMIN"
        }
      });
      
      console.log(`Новый админ создан: ${admin.email}`);
      console.log(`Логин: ${admin.email}`);
      console.log(`Пароль: ${newPassword}`);
    }

    await prisma.$disconnect();
    console.log("Готово!");
  } catch (error) {
    console.error("Ошибка:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

resetAdminPassword();
