import {describe, it, expect} from 'vitest';
import { getAllCategories } from '../../src/repositories/categoryRepository';

describe('categoryRepository', () => {
    it('should  return an array of all categories', async () =>{
        const categories = await getAllCategories();
        expect(categories).toBeInstanceOf(Array);
        expect(categories.length).toBeGreaterThan(0);
        expect(categories[0]).toHaveProperty('id');
        expect(categories[0]).toHaveProperty('slug');
        expect(categories[0]).toHaveProperty('name');
        expect(categories[0]).toHaveProperty('description');
    })
});