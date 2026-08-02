require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@taskflow.dev',
      password: hashedPassword,
      name: 'Alice Admin',
      role: 'ADMIN',
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'bob@taskflow.dev',
      password: hashedPassword,
      name: 'Bob Developer',
      role: 'MEMBER',
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'carol@taskflow.dev',
      password: hashedPassword,
      name: 'Carol Designer',
      role: 'MEMBER',
    },
  });

  console.log('✅ Users created');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with new brand identity',
      color: '#6366f1',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member1.id, role: 'MEMBER' },
          { userId: member2.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App v2',
      description: 'Next generation mobile application with improved UX',
      color: '#10b981',
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: member1.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✅ Projects created');

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Design new homepage mockups',
        description: 'Create Figma mockups for the new homepage with 3 variation options',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project1.id,
        creatorId: admin.id,
        assigneeId: member2.id,
        tags: ['design', 'figma'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: project1.id,
        creatorId: admin.id,
        assigneeId: member1.id,
        tags: ['devops', 'automation'],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write API documentation',
        description: 'Document all REST endpoints using OpenAPI/Swagger specification',
        status: 'TODO',
        priority: 'LOW',
        projectId: project1.id,
        creatorId: admin.id,
        assigneeId: member1.id,
        tags: ['docs', 'api'],
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement push notifications',
        description: 'Add Firebase push notifications for iOS and Android',
        status: 'IN_REVIEW',
        priority: 'URGENT',
        projectId: project2.id,
        creatorId: admin.id,
        assigneeId: member1.id,
        tags: ['mobile', 'firebase'],
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // overdue
      },
    }),
    prisma.task.create({
      data: {
        title: 'User authentication flow',
        description: 'Implement OAuth2 login with Google and Apple Sign In',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project2.id,
        creatorId: admin.id,
        assigneeId: member1.id,
        tags: ['auth', 'oauth'],
        completedAt: new Date(),
      },
    }),
  ]);

  // Add comments
  await prisma.comment.createMany({
    data: [
      {
        content: 'I have completed the first draft. Please review!',
        taskId: tasks[0].id,
        authorId: member2.id,
      },
      {
        content: 'Looks great! Just a few tweaks needed on mobile.',
        taskId: tasks[0].id,
        authorId: admin.id,
      },
      {
        content: 'This is blocking our deployment. Top priority!',
        taskId: tasks[3].id,
        authorId: admin.id,
      },
    ],
  });

  console.log('✅ Tasks and comments created');
  console.log('\n🎉 Seed complete! Test credentials:');
  console.log('   Admin: admin@taskflow.dev / Password123!');
  console.log('   Member: bob@taskflow.dev / Password123!');
  console.log('   Member: carol@taskflow.dev / Password123!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
