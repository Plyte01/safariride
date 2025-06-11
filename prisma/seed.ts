// prisma/seed.ts
import { PrismaClient, Prisma, UserRole } from '@prisma/client'; // Added UserRole
import bcrypt from 'bcryptjs'; // Import bcrypt

const prisma = new PrismaClient();

// Platform Settings Data (as you had it)
const platformSettingsData: Prisma.PlatformSettingCreateInput[] = [
  {
    key: 'DEFAULT_CURRENCY',
    value: 'KES',
    label: 'Default Currency Code',
    type: 'string',
    group: 'General',
  },
  {
    key: 'COMMISSION_RATE_PERCENT',
    value: '10',
    label: 'Platform Commission Rate (%)',
    type: 'percentage',
    group: 'Payments',
  },
  {
    key: 'MAINTENANCE_MODE',
    value: 'false',
    label: 'Maintenance Mode',
    type: 'boolean',
    group: 'General',
  },
  {
    key: 'PLATFORM_NAME',
    value: 'SafariRide',
    label: 'Platform Name',
    type: 'string',
    group: 'Branding'
  }
];

async function main() {
  console.log(`Start seeding ...`);

  // --- Seed Platform Settings ---
  console.log('Seeding Platform Settings...');
  for (const setting of platformSettingsData) {
    const existingSetting = await prisma.platformSetting.findUnique({
      where: { key: setting.key },
    });
    if (!existingSetting) {
      await prisma.platformSetting.create({ data: setting });
      console.log(`  Created setting: ${setting.key}`);
    } else {
      // Optionally update existing settings if needed, e.g., ensure label/type/group are correct
      // await prisma.platformSetting.update({
      //   where: { key: setting.key },
      //   data: { label: setting.label, type: setting.type, group: setting.group }, // Only update non-value fields
      // });
      // console.log(`  Setting with key ${setting.key} already exists. Ensured other fields are up-to-date.`);
      console.log(`  Setting with key ${setting.key} already exists. Skipping creation.`);
    }
  }
  console.log('Platform settings seeding finished.');
  console.log('---');


  // --- Seed Admin User ---
  console.log('Seeding Admin User...');
  // It's best to use environment variables for sensitive data like admin credentials
  // Ensure these are set in your .env file (which should be in .gitignore)
  // Example .env:
  // ADMIN_EMAIL=admin@safariride.com
  // ADMIN_PASSWORD=SuperSecurePassword!
  // ADMIN_NAME="SafariRide Admin"
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@safariride.com'; // Fallback email
  const adminPassword = process.env.ADMIN_PASSWORD || '4dminP@ssw0rd123';   // Fallback password - CHANGE THIS!
  const adminName = process.env.ADMIN_NAME || 'Platform Administrator';         // Fallback name

  if (adminPassword === 'AdminP@ssw0rd123' && process.env.NODE_ENV === 'production') {
      console.warn("\n⚠️ WARNING: Using default admin password in production. Please set a strong ADMIN_PASSWORD environment variable.\n");
  }


  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword, // Store the hashed password
        role: UserRole.ADMIN,     // Assign the ADMIN role
        emailVerified: new Date(),// Mark email as verified immediately
        isTrustedOwner: true,     // Admins are typically trusted by default
        // image: '/path/to/default-admin-avatar.png', // Optional: if you have a default avatar
      },
    });
    console.log(`  Created admin user: ${adminName} (${adminEmail})`);
  } else {
    console.log(`  Admin user ${existingAdmin.name} (${adminEmail}) already exists.`);
    // Optionally, update the existing admin to ensure core properties are set
    // For example, ensure their role is ADMIN and email is verified
    const updatesNeeded: Partial<Prisma.UserUpdateInput> = {};
    if (existingAdmin.role !== UserRole.ADMIN) {
        updatesNeeded.role = UserRole.ADMIN;
    }
    if (!existingAdmin.emailVerified) {
        updatesNeeded.emailVerified = new Date();
    }
    if (!existingAdmin.isTrustedOwner) { // Admins should be trusted if they can act as owners
        updatesNeeded.isTrustedOwner = true;
    }
    // Consider if password should be updated. Generally, only if explicitly requested.
    // If you want to reset the admin password every time seed runs AND the password changed:
    // const passwordMatches = existingAdmin.password ? await bcrypt.compare(adminPassword, existingAdmin.password) : false;
    // if (!passwordMatches) {
    //   updatesNeeded.password = await bcrypt.hash(adminPassword, 10);
    //   console.log(`    Password for admin ${adminEmail} will be updated (if it has changed).`);
    // }

    if (Object.keys(updatesNeeded).length > 0) {
        await prisma.user.update({
            where: { email: adminEmail },
            data: updatesNeeded,
        });
        console.log(`    Updated existing admin user ${adminEmail} to ensure core properties (role, verification).`);
    }
  }
  console.log('Admin user seeding finished.');
  console.log('---');

  // --- You can add more seeding logic for other models here ---
  // Example: Seed some car categories if they are dynamic and not just enums used directly
  // console.log('Seeding Car Categories (example)...');
  // const carCategories = Object.values(CarCategory); // Assuming CarCategory is your Prisma enum
  // for (const categoryName of carCategories) {
  //    await prisma.carCategoryDefinition.upsert({ // Assuming you had a CarCategoryDefinition table
  //        where: { name: categoryName },
  //        update: {},
  //        create: { name: categoryName, description: `${categoryName} vehicles` }
  //    });
  // }
  // console.log('Car categories seeding finished.');


  console.log(`\nSeeding process fully completed.`);
}

main()
  .then(async () => {
    console.log('Disconnecting Prisma Client...');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });