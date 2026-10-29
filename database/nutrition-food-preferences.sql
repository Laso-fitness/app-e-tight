alter table public.nutrition_preferences
 add column if not exists carb_goal_g numeric check (carb_goal_g > 0 and carb_goal_g <= 1000),
 add column if not exists fat_goal_g numeric check (fat_goal_g > 0 and fat_goal_g <= 1000),
 add column if not exists liked_foods text[] not null default '{}' check(cardinality(liked_foods)<=30),
 add column if not exists disliked_foods text[] not null default '{}' check(cardinality(disliked_foods)<=30),
 add column if not exists allergens text[] not null default '{}' check(cardinality(allergens)<=30),
 add column if not exists dietary_pattern text not null default 'omnivore' check(dietary_pattern in ('omnivore','vegetarian','vegan'));
