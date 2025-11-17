import getDatabase from "../config/database";
import { AppError, NotFoundError } from "../utils/AppError";

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  parent?: {
    id: string;
    name: string;
  };
  children?: Category[];
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parent_id?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  parent_id?: string;
}

export interface CategoryFilters {
  parent_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class CategoryModel {
  // Create new category
  static async createCategory(
    categoryData: CreateCategoryData
  ): Promise<Category> {
    try {
      const query = `
        INSERT INTO categories (name, description, parent_id)
        VALUES (?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        categoryData.name,
        categoryData.description || null,
        categoryData.parent_id || null
      );

      const insertId = (
        db.prepare("SELECT last_insert_rowid() as id").get() as any
      ).id;
      return await this.findCategoryById(insertId.toString());
    } catch (error) {
      throw new AppError("Failed to create category", 500);
    }
  }

  // Find category by ID
  static async findCategoryById(id: string): Promise<Category> {
    try {
      const query = `
        SELECT c.*, p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.id = ?
      `;

      const db = getDatabase();
      const category = db.prepare(query).get(id) as any;

      if (!category) {
        throw new NotFoundError("Category not found");
      }
      return {
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        parent_id: category.parent_id?.toString(),
        parent: category.parent_id
          ? {
              id: category.parent_id.toString(),
              name: category.parent_name,
            }
          : undefined,
        created_at: category.created_at,
        updated_at: category.updated_at,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to find category by ID", 500);
    }
  }

  // Get all categories with filtering
  static async getAllCategories(
    filters: CategoryFilters = {}
  ): Promise<{ categories: Category[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Apply filters
      if (filters.parent_id) {
        whereConditions.push("c.parent_id = ?");
        queryParams.push(filters.parent_id);
      }

      if (filters.search) {
        whereConditions.push("(c.name LIKE ? OR c.description LIKE ?)");
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM categories c
        ${whereClause}
      `;
      const db = getDatabase();

      // Filter out undefined values for count query
      const countParams = queryParams.filter((p) => p !== undefined);
      const countResult = db.prepare(countQuery).get(...countParams) as any;
      const total = countResult.total;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 1000; // Increased default to return all categories
      const offset = (page - 1) * limit;

      const query = `
        SELECT c.*, p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ${whereClause}
        ORDER BY c.name ASC
        LIMIT ? OFFSET ?
      `;

      // Combine query params with limit and offset, filtering out undefined
      const allParams = [
        ...queryParams.filter((p) => p !== undefined),
        limit,
        offset,
      ];
      const categories = db.prepare(query).all(...allParams) as any[];

      const formattedCategories: Category[] = categories.map((category) => ({
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        parent_id: category.parent_id?.toString(),
        parent: category.parent_id
          ? {
              id: category.parent_id.toString(),
              name: category.parent_name,
            }
          : undefined,
        created_at: category.created_at,
        updated_at: category.updated_at,
      }));

      return { categories: formattedCategories, total };
    } catch (error) {
      throw new AppError("Failed to get categories", 500);
    }
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree(): Promise<Category[]> {
    try {
      const query = `
        SELECT c.*, p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY c.parent_id IS NULL DESC, c.name ASC
      `;

      const db = getDatabase();
      const categories = db.prepare(query).all() as any[];

      const categoryMap = new Map<string, Category>();
      const rootCategories: Category[] = [];

      // First pass: create all categories
      categories.forEach((category) => {
        const formattedCategory: Category = {
          id: category.id.toString(),
          name: category.name,
          description: category.description,
          parent_id: category.parent_id?.toString(),
          parent: category.parent_id
            ? {
                id: category.parent_id.toString(),
                name: category.parent_name,
              }
            : undefined,
          children: [],
          created_at: category.created_at,
          updated_at: category.updated_at,
        };
        categoryMap.set(formattedCategory.id, formattedCategory);
      });

      // Second pass: build hierarchy
      categories.forEach((category) => {
        const formattedCategory = categoryMap.get(category.id.toString())!;
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id.toString());
          if (parent) {
            parent.children!.push(formattedCategory);
          }
        } else {
          rootCategories.push(formattedCategory);
        }
      });

      return rootCategories;
    } catch (error) {
      throw new AppError("Failed to get category tree", 500);
    }
  }

  // Update category
  static async updateCategory(
    id: string,
    updateData: UpdateCategoryData
  ): Promise<Category> {
    try {
      const fields = [];
      const values = [];

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new AppError("No fields to update", 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const query = `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findCategoryById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to update category", 500);
    }
  }

  // Delete category (and all its items and subcategories)
  static async deleteCategory(id: string): Promise<void> {
    try {
      const db = getDatabase();

      // Use a transaction to ensure all deletions succeed or none do
      const transaction = db.transaction(() => {
        // First, delete all subcategories (recursively)
        const getSubcategories = db.prepare(
          "SELECT id FROM categories WHERE parent_id = ?"
        );
        const subcategories = getSubcategories.all(id) as any[];
        
        for (const subcategory of subcategories) {
          // Recursively delete subcategories (this will also delete their items)
          this.deleteCategorySync(subcategory.id.toString(), db);
        }

        // Delete all items in this category
        const deleteItems = db.prepare("DELETE FROM items WHERE category_id = ?");
        deleteItems.run(id);

        // Delete the category itself
        const deleteCategory = db.prepare("DELETE FROM categories WHERE id = ?");
        const result = deleteCategory.run(id);

        if (result.changes === 0) {
          throw new NotFoundError("Category not found");
        }
      });

      transaction();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to delete category", 500);
    }
  }

  // Synchronous version for use within transactions
  private static deleteCategorySync(id: string, db: any): void {
    // Delete all subcategories recursively
    const getSubcategories = db.prepare(
      "SELECT id FROM categories WHERE parent_id = ?"
    );
    const subcategories = getSubcategories.all(id) as any[];
    
    for (const subcategory of subcategories) {
      this.deleteCategorySync(subcategory.id.toString(), db);
    }

    // Delete all items in this category
    const deleteItems = db.prepare("DELETE FROM items WHERE category_id = ?");
    deleteItems.run(id);

    // Delete the category itself
    const deleteCategory = db.prepare("DELETE FROM categories WHERE id = ?");
    deleteCategory.run(id);
  }

  // Get category statistics
  static async getCategoryStats(categoryId: string): Promise<{
    totalItems: number;
    activeItems: number;
    totalValue: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(i.id) as total_items,
          COUNT(CASE WHEN i.status = 'Active' THEN 1 END) as active_items,
          COALESCE(SUM(i.price * i.stock_quantity), 0) as total_value
        FROM categories c
        LEFT JOIN items i ON c.id = i.category_id
        WHERE c.id = ?
      `;

      const db = getDatabase();
      const stat = db.prepare(query).get(categoryId) as any;

      return {
        totalItems: stat?.total_items || 0,
        activeItems: stat?.active_items || 0,
        totalValue: stat?.total_value || 0,
      };
    } catch (error) {
      throw new AppError("Failed to get category statistics", 500);
    }
  }
}
