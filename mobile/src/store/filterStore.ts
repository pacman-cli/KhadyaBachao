import {create} from 'zustand';
import type {FoodType} from '../api/listings';

export type FilterState = {
  radiusKm: number;
  foodType: FoodType | 'ALL';
  minQuantity: number | undefined;
  maxQuantity: number | undefined;

  setRadiusKm: (radiusKm: number) => void;
  setFoodType: (foodType: FoodType | 'ALL') => void;
  setMinQuantity: (minQuantity: number | undefined) => void;
  setMaxQuantity: (maxQuantity: number | undefined) => void;
  resetFilters: () => void;
};

export const useFilterStore = create<FilterState>(set => ({
  radiusKm: 5,
  foodType: 'ALL',
  minQuantity: undefined,
  maxQuantity: undefined,

  setRadiusKm: radiusKm => set({radiusKm}),
  setFoodType: foodType => set({foodType}),
  setMinQuantity: minQuantity => set({minQuantity}),
  setMaxQuantity: maxQuantity => set({maxQuantity}),
  resetFilters: () =>
    set({
      radiusKm: 5,
      foodType: 'ALL',
      minQuantity: undefined,
      maxQuantity: undefined,
    }),
}));
