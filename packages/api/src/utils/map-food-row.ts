/** Map a raw snake_case food_items row to camelCase matching the Prisma FoodItem model. */
export function mapFoodItemRow(r: any) {
  return {
    id: r.id,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    servingSizeG: r.serving_size_g,
    servingUnit: r.serving_unit,
    caloriesPer100g: r.calories_per_100g,
    proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g,
    fatPer100g: r.fat_per_100g,
    fiberPer100g: r.fiber_per_100g,
    sugarPer100g: r.sugar_per_100g,
    sodiumPer100g: r.sodium_per_100g,
    imageUrl: r.image_url,
    source: r.source,
    offProductJson: r.off_product_json,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
