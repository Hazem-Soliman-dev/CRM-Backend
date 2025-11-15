import getDatabase from '../config/database';
import { AppError, NotFoundError } from '../utils/AppError';

export interface Item {
  id: string;
  item_id: string;
  name: string;
  description?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
  supplier_id?: string;
  supplier?: {
    id: string;
    name: string;
  };
  price: number;
  cost?: number;
  stock_quantity: number;
  min_stock_level: number;
  status: 'Active' | 'Inactive' | 'Discontinued';
  created_at: string;
  updated_at: string;
}

export interface CreateItemData {
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  price: number;
  cost?: number;
  stock_quantity?: number;
  min_stock_level?: number;
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  price?: number;
  cost?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  status?: 'Active' | 'Inactive' | 'Discontinued';
}

export interface ItemFilters {
  category_id?: string;
  supplier_id?: string;
  status?: string;
  search?: string;
  low_stock?: boolean;
  page?: number;
  limit?: number;
}

export class ItemModel {
  // Generate unique item ID
  private static generateItemId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `IT-${timestamp}${random}`;
  }

  // Create new item
  static async createItem(itemData: CreateItemData): Promise<Item> {
    try {
      const item_id = this.generateItemId();
      
      const query = `
        INSERT INTO items (item_id, name, description, category_id, supplier_id, price, cost, stock_quantity, min_stock_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const db = getDatabase();
      db.prepare(query).run(
        item_id,
        itemData.name,
        itemData.description || null,
        itemData.category_id || null,
        itemData.supplier_id || null,
        itemData.price,
        itemData.cost || null,
        itemData.stock_quantity || 0,
        itemData.min_stock_level || 0
      );

      const insertId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
      return await this.findItemById(insertId.toString());
    } catch (error) {
      throw new AppError('Failed to create item', 500);
    }
  }

  // Find item by ID
  static async findItemById(id: string): Promise<Item> {
    try {
      const query = `
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.id = ?
      `;
      
      const db = getDatabase();
      const item = db.prepare(query).get(id) as any;
      
      if (!item) {
        throw new NotFoundError('Item not found');
      }
      return {
        id: item.id.toString(),
        item_id: item.item_id,
        name: item.name,
        description: item.description,
        category_id: item.category_id?.toString(),
        category: item.category_id ? {
          id: item.category_id.toString(),
          name: item.category_name
        } : undefined,
        supplier_id: item.supplier_id?.toString(),
        supplier: item.supplier_id ? {
          id: item.supplier_id.toString(),
          name: item.supplier_name
        } : undefined,
        price: item.price,
        cost: item.cost,
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to find item by ID', 500);
    }
  }

  // Get all items with filtering
  static async getAllItems(filters: ItemFilters = {}): Promise<{ items: Item[]; total: number }> {
    try {
      let whereConditions = [];
      let queryParams = [];

      // Apply filters
      if (filters.category_id) {
        whereConditions.push('i.category_id = ?');
        queryParams.push(filters.category_id);
      }

      if (filters.supplier_id) {
        whereConditions.push('i.supplier_id = ?');
        queryParams.push(filters.supplier_id);
      }

      if (filters.status) {
        whereConditions.push('i.status = ?');
        queryParams.push(filters.status);
      }

      if (filters.search) {
        whereConditions.push('(i.name LIKE ? OR i.description LIKE ? OR i.item_id LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.low_stock) {
        whereConditions.push('i.stock_quantity <= i.min_stock_level');
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM items i
        ${whereClause}
      `;
      const db = getDatabase();
      const countResult = db.prepare(countQuery).get(...queryParams) as any;
      const total = countResult.total;

      // Main query
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const offset = (page - 1) * limit;

      const query = `
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ${whereClause}
        ORDER BY i.name ASC
        LIMIT ? OFFSET ?
      `;

      const items = db.prepare(query).all(...queryParams, limit, offset) as any[];

      const formattedItems: Item[] = items.map(item => ({
        id: item.id.toString(),
        item_id: item.item_id,
        name: item.name,
        description: item.description,
        category_id: item.category_id?.toString(),
        category: item.category_id ? {
          id: item.category_id.toString(),
          name: item.category_name
        } : undefined,
        supplier_id: item.supplier_id?.toString(),
        supplier: item.supplier_id ? {
          id: item.supplier_id.toString(),
          name: item.supplier_name
        } : undefined,
        price: item.price,
        cost: item.cost,
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return { items: formattedItems, total };
    } catch (error) {
      throw new AppError('Failed to get items', 500);
    }
  }

  // Update item
  static async updateItem(id: string, updateData: UpdateItemData): Promise<Item> {
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
        throw new AppError('No fields to update', 400);
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const query = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`;
      const db = getDatabase();
      db.prepare(query).run(...values);

      return await this.findItemById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update item', 500);
    }
  }

  // Delete item
  static async deleteItem(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM items WHERE id = ?';
      const db = getDatabase();
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new NotFoundError('Item not found');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete item', 500);
    }
  }

  // Update item stock
  static async updateItemStock(id: string, quantity: number): Promise<Item> {
    try {
      const query = "UPDATE items SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(quantity, id);

      return await this.findItemById(id);
    } catch (error) {
      throw new AppError('Failed to update item stock', 500);
    }
  }

  // Update item status
  static async updateItemStatus(id: string, status: 'Active' | 'Inactive' | 'Discontinued'): Promise<Item> {
    try {
      const query = "UPDATE items SET status = ?, updated_at = datetime('now') WHERE id = ?";
      const db = getDatabase();
      db.prepare(query).run(status, id);

      return await this.findItemById(id);
    } catch (error) {
      throw new AppError('Failed to update item status', 500);
    }
  }

  // Get low stock items
  static async getLowStockItems(): Promise<Item[]> {
    try {
      const query = `
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.stock_quantity <= i.min_stock_level AND i.status = 'Active'
        ORDER BY (i.stock_quantity - i.min_stock_level) ASC
      `;
      
      const db = getDatabase();
      const items = db.prepare(query).all() as any[];

      return items.map(item => ({
        id: item.id.toString(),
        item_id: item.item_id,
        name: item.name,
        description: item.description,
        category_id: item.category_id?.toString(),
        category: item.category_id ? {
          id: item.category_id.toString(),
          name: item.category_name
        } : undefined,
        supplier_id: item.supplier_id?.toString(),
        supplier: item.supplier_id ? {
          id: item.supplier_id.toString(),
          name: item.supplier_name
        } : undefined,
        price: item.price,
        cost: item.cost,
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      throw new AppError('Failed to get low stock items', 500);
    }
  }

  // Get item statistics
  static async getItemStats(): Promise<{
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    discontinuedItems: number;
    lowStockItems: number;
    totalValue: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_items,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_items,
          COUNT(CASE WHEN status = 'Discontinued' THEN 1 END) as discontinued_items,
          COUNT(CASE WHEN stock_quantity <= min_stock_level AND status = 'Active' THEN 1 END) as low_stock_items,
          COALESCE(SUM(price * stock_quantity), 0) as total_value
        FROM items
      `;
      
      const db = getDatabase();
      const stat = db.prepare(query).get() as any;
      
      return {
        totalItems: stat?.total_items || 0,
        activeItems: stat?.active_items || 0,
        inactiveItems: stat?.inactive_items || 0,
        discontinuedItems: stat?.discontinued_items || 0,
        lowStockItems: stat?.low_stock_items || 0,
        totalValue: stat?.total_value || 0
      };
    } catch (error) {
      throw new AppError('Failed to get item statistics', 500);
    }
  }
}
