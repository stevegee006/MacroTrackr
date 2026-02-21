import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleFoods = [
  {
    barcode: '5000159484695',
    name: 'Cadbury Dairy Milk Chocolate',
    brand: 'Cadbury',
    servingSizeG: 45,
    caloriesPer100g: 534,
    proteinPer100g: 7.3,
    carbsPer100g: 56.5,
    fatPer100g: 30.2,
    fiberPer100g: 2.1,
    sugarPer100g: 56,
    source: 'OPENFOODFACTS' as const,
  },
  {
    barcode: '0041220576920',
    name: 'Greek Yogurt, Plain',
    brand: 'Fage',
    servingSizeG: 200,
    caloriesPer100g: 97,
    proteinPer100g: 9,
    carbsPer100g: 3.6,
    fatPer100g: 5,
    sugarPer100g: 3.6,
    source: 'OPENFOODFACTS' as const,
  },
  {
    name: 'Chicken Breast, Raw',
    brand: null,
    servingSizeG: 150,
    caloriesPer100g: 120,
    proteinPer100g: 22.5,
    carbsPer100g: 0,
    fatPer100g: 2.6,
    source: 'MANUAL' as const,
  },
  {
    name: 'Brown Rice, Cooked',
    brand: null,
    servingSizeG: 195,
    caloriesPer100g: 123,
    proteinPer100g: 2.7,
    carbsPer100g: 25.6,
    fatPer100g: 1,
    fiberPer100g: 1.6,
    source: 'MANUAL' as const,
  },
  {
    name: 'Whole Egg, Large',
    brand: null,
    servingSizeG: 50,
    caloriesPer100g: 155,
    proteinPer100g: 12.6,
    carbsPer100g: 1.1,
    fatPer100g: 10.6,
    source: 'MANUAL' as const,
  },
  {
    name: 'Banana, Medium',
    brand: null,
    servingSizeG: 118,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    sugarPer100g: 12.2,
    source: 'MANUAL' as const,
  },
];

async function seed() {
  console.log('Seeding database...');

  for (const food of sampleFoods) {
    await prisma.foodItem.upsert({
      where: { barcode: food.barcode ?? `manual_${food.name}` },
      update: {},
      create: food,
    });
  }

  console.log(`Seeded ${sampleFoods.length} food items.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
