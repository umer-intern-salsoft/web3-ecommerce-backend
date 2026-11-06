import bcrypt from 'bcryptjs';

export const ensureDefaultAdmin = async (prisma) => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password === 'replace-with-a-strong-password') {
    console.warn('Default admin was not provisioned: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    return;
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (!existingUser.isAdmin) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { isAdmin: true }
      });
      console.log(`Promoted ${email} to administrator.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      isAdmin: true
    }
  });

  console.log(`Created default administrator: ${email}`);
};
