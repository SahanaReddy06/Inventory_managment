import './style.css'

// --- Data Layer ---
class InventoryStore {
  constructor() {
    this.key = 'stockpro_inventory';
    this.products = this.load();
  }

  load() {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.products));
  }

  addProduct(product) {
    this.products.push({
      ...product,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  updateProduct(id, updates) {
    this.products = this.products.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    this.save();
  }

  deleteProduct(id) {
    this.products = this.products.filter(p => p.id !== id);
    this.save();
  }

  updateStock(id, delta) {
    const product = this.products.find(p => p.id === id);
    if (product) {
      const newStock = product.stock + delta;
      if (newStock >= 0) {
        product.stock = newStock;
        this.save();
        return true;
      }
    }
    return false;
  }

  getStats() {
    const totalProducts = this.products.length;
    const lowStockItems = this.products.filter(p => p.stock <= p.threshold).length;
    const totalValue = this.products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    return { totalProducts, lowStockItems, totalValue };
  }
}

// --- UI Controller ---
class App {
  constructor() {
    this.store = new InventoryStore();
    this.editingId = null;
    this.filterLowStock = false;

    // Elements
    this.form = document.getElementById('product-form');
    this.tableBody = document.getElementById('products-body');
    this.searchInput = document.getElementById('search-input');
    this.filterBtn = document.getElementById('filter-low-stock');
    this.stats = {
      total: document.getElementById('total-products'),
      low: document.getElementById('low-stock-count'),
      value: document.getElementById('total-inventory-value')
    };

    this.init();
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.searchInput.addEventListener('input', () => this.render());
    this.filterBtn.addEventListener('click', () => {
      this.filterLowStock = !this.filterLowStock;
      this.filterBtn.classList.toggle('secondary');
      this.filterBtn.textContent = this.filterLowStock ? 'Show All Products' : 'Show Low Stock Only';
      this.render();
    });

    this.render();
  }

  handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(this.form);
    const productData = {
      name: formData.get('p-name') || document.getElementById('p-name').value,
      category: document.getElementById('p-category').value,
      price: parseFloat(document.getElementById('p-price').value),
      stock: parseInt(document.getElementById('p-stock').value),
      threshold: parseInt(document.getElementById('p-threshold').value)
    };

    if (this.editingId) {
      this.store.updateProduct(this.editingId, productData);
      this.editingId = null;
      document.getElementById('submit-btn').textContent = 'Add Product';
    } else {
      this.store.addProduct(productData);
    }

    this.form.reset();
    this.render();
  }

  handleEdit(id) {
    const product = this.store.products.find(p => p.id === id);
    if (product) {
      this.editingId = id;
      document.getElementById('p-name').value = product.name;
      document.getElementById('p-category').value = product.category;
      document.getElementById('p-price').value = product.price;
      document.getElementById('p-stock').value = product.stock;
      document.getElementById('p-threshold').value = product.threshold;
      document.getElementById('submit-btn').textContent = 'Update Product';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  handleDelete(id) {
    console.log('Deleting product:', id);
    this.store.deleteProduct(id);
    this.render();
    console.log('Product deleted and UI re-rendered');
  }

  adjustStock(id, delta) {
    const success = this.store.updateStock(id, delta);
    if (!success && delta < 0) {
      alert('Stock cannot be negative!');
    }
    this.render();
  }

  updateDashboard() {
    const { totalProducts, lowStockItems, totalValue } = this.store.getStats();
    this.stats.total.textContent = totalProducts;
    this.stats.low.textContent = lowStockItems;
    this.stats.value.textContent = `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  render() {
    const searchTerm = this.searchInput.value.toLowerCase();
    let displayProducts = this.store.products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) || 
      p.category.toLowerCase().includes(searchTerm)
    );

    if (this.filterLowStock) {
      displayProducts = displayProducts.filter(p => p.stock <= p.threshold);
    }

    this.tableBody.innerHTML = displayProducts.map(p => `
      <tr class="animate-in">
        <td>
          <div style="font-weight: 600;">${p.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Added ${new Date(p.createdAt).toLocaleDateString()}</div>
        </td>
        <td>${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="secondary btn-small" onclick="window.app.adjustStock('${p.id}', -1)">-</button>
            <span style="min-width: 2rem; text-align: center; font-weight: 600;">${p.stock}</span>
            <button class="secondary btn-small" onclick="window.app.adjustStock('${p.id}', 1)">+</button>
          </div>
        </td>
        <td>
          <span class="stock-badge ${p.stock <= p.threshold ? 'stock-low' : 'stock-normal'}">
            ${p.stock <= p.threshold ? 'Low Stock' : 'In Stock'}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="secondary btn-small" onclick="window.app.handleEdit('${p.id}')">Edit</button>
            <button class="btn-danger btn-small" onclick="window.app.handleDelete('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    this.updateDashboard();
  }
}

// Start App
window.app = new App();
